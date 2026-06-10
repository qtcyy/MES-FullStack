package com.wangziyang.mes.system.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wangziyang.mes.system.agent.dto.AiToolDefinition;
import com.wangziyang.mes.system.agent.service.ToolExecutor;
import com.wangziyang.mes.system.agent.service.ToolRegistry;
import com.wangziyang.mes.system.dto.AiMessage;
import com.wangziyang.mes.system.service.IAiChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;


import java.util.*;
import java.util.function.Consumer;

/**
 * AI 对话服务实现 — Agent 模式
 * <p>
 * 支持 Function Calling（工具调用）：AI 可自主决策查询 MES 数据库，
 * 获取真实数据并进行分析和建议。
 * </p>
 */
@Service
public class AiChatServiceImpl implements IAiChatService {

    private static final Logger logger = LoggerFactory.getLogger(AiChatServiceImpl.class);

    private static final int MAX_AGENT_ROUNDS = 5;

    private static final String SYSTEM_PROMPT =
        "你是 MES 章鱼师兄平台的智能 AI 助手，具备数据分析能力，能查询系统数据库并给出专业建议。\n\n" +
        "## 你的能力\n\n" +
        "你可以调用以下工具查询 MES 系统的实时数据：\n" +
        "- **查询生产工单（get_production_orders）**：获取工单列表、统计各状态分布（statue: 1=创建 2=进行中 3=订单结束 4=订单终结）、按日期和订单类型筛选\n" +
        "- **查询物料信息（get_materials）**：搜索原材料/成品/半成品，查看规格型号、安全库存、按物料类型（matType）统计\n" +
        "- **查询设备信息（get_devices）**：查看设备运行状态分布、按产线（lineId）筛选\n" +
        "- **查询 BOM 清单（get_bom_list）**：查看物料清单（BOM）头表，按物料编码搜索\n" +
        "- **查询产品 BOM 结构（get_product_bom_structure）**：查看产品 BOM 树形结构及子件清单（需提供 productId）\n" +
        "- **查询仓库库位（get_warehouse_locations）**：查看仓库库位信息\n" +
        "- **查询工序单元（get_process_units）**：查看工序定义、类型、是否线边仓\n" +
        "- **查询工艺流程（get_flow_routes）**：查看流程路线及各工序步骤关系（前后道工序）\n" +
        "- **查询用户信息（get_users）**：查看系统用户，可按部门或姓名搜索\n" +
        "- **生产看板总览（get_dashboard_summary）**：获取工单、设备、物料、流程、用户等汇总数据\n\n" +
        "## 行为准则\n\n" +
        "1. **主动查数据**：当用户询问业务数据时，先调用对应的工具查询数据库，不要凭想象回答。\n" +
        "2. **数据分析**：对查询到的数据进行统计分析，得出有意义的结论。\n" +
        "3. **给出建议**：基于数据给出可操作的建议和改进方向。\n" +
        "4. **简洁专业**：回答要结构清晰，用数据说话。\n" +
        "5. **不懂就问**：如果用户问题不明确，主动询问细节后再查。\n\n" +
        "## 平台功能模块\n\n" +
        "1. 系统管理：用户管理、角色权限、菜单配置、部门管理、数据字典、团队管理\n" +
        "2. 基础数据：物料管理、通用管理、设备组、工序单元、仓库管理、组件管理\n" +
        "3. 工艺技术：BOM 管理、产品 BOM 编辑器、工艺流程、工序管理、工艺内容查询\n" +
        "4. 生产订单：创建和管理生产订单，跟踪进度（statue: 1=创建 2=进行中 3=订单结束 4=订单终结）\n" +
        "5. 数字化看板：计划仪表盘（ECharts）、3D 仿真（Three.js）\n\n" +
        "回答风格：简洁、准确、用数据说话。";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${deepseek.api-key}")
    private String apiKey;

    @Value("${deepseek.base-url}")
    private String baseUrl;

    @Value("${deepseek.model}")
    private String model;

    @Autowired
    private ToolRegistry toolRegistry;

    @Autowired
    private ToolExecutor toolExecutor;

    public AiChatServiceImpl() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setBufferRequestBody(false);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public void streamChat(List<AiMessage> messages, Consumer<String> onEvent) throws Exception {
        String url = baseUrl + "/v1/chat/completions";

        List<Map<String, Object>> fullMessages = buildFullMessages(messages);
        List<AiToolDefinition> tools = toolRegistry.getAllTools();

        for (int round = 0; round < MAX_AGENT_ROUNDS; round++) {
            logger.info("Agent round {}/{}", round + 1, MAX_AGENT_ROUNDS);

            // 非流式请求检测 tool calls
            Map<String, Object> requestBody = createRequestBody(fullMessages, tools, false);
            NonStreamResponse response = sendNonStreamRequest(url, requestBody);

            if (response == null) {
                emitEvent(onEvent, "error", "AI 服务响应为空", null, null, null);
                return;
            }

            String content = response.content;
            List<ToolCall> toolCalls = response.toolCalls;

            // 将 AI 响应加入历史
            Map<String, Object> assistantMsg = new HashMap<>();
            assistantMsg.put("role", "assistant");
            assistantMsg.put("content", content != null ? content : "");
            if (toolCalls != null && !toolCalls.isEmpty()) {
                assistantMsg.put("tool_calls", serializeToolCalls(toolCalls));
            }
            fullMessages.add(assistantMsg);

            // 无 tool call → 直接输出非流式响应中的内容
            if (toolCalls == null || toolCalls.isEmpty()) {
                if (content != null && !content.isEmpty()) {
                    emitEvent(onEvent, "content", content, null, null, null);
                }
                emitEvent(onEvent, "done", null, null, null, null);
                return;
            }

            // 有 tool call → 执行并推送进度
            for (ToolCall tc : toolCalls) {
                logger.info("Agent calling tool: {} with args: {}", tc.name, tc.arguments);
                emitEvent(onEvent, "thinking", "正在查询数据...", null, null, null);
                emitEvent(onEvent, "tool_start", null, tc.name, tc.arguments, null);

                String resultJson = toolExecutor.execute(tc.name, tc.arguments);
                String summary = buildToolResultSummary(tc.name, resultJson);
                emitEvent(onEvent, "tool_result", null, tc.name, null, summary);

                Map<String, Object> toolMsg = new HashMap<>();
                toolMsg.put("role", "tool");
                toolMsg.put("tool_call_id", tc.id);
                toolMsg.put("content", resultJson);
                fullMessages.add(toolMsg);
            }
        }

        // 超限
        emitEvent(onEvent, "content", "我已经查询了相关数据，但由于查询范围较广，建议您进一步细化条件。", null, null, null);
        emitEvent(onEvent, "done", null, null, null, null);
    }

    // ================================================================
    //  内部数据结构
    // ================================================================

    private static class ToolCall {
        String id;
        String name;
        Map<String, Object> arguments;
    }

    private static class NonStreamResponse {
        String content;
        List<ToolCall> toolCalls;
    }

    // ================================================================
    //  消息构建
    // ================================================================

    private List<Map<String, Object>> buildFullMessages(List<AiMessage> messages) {
        List<Map<String, Object>> result = new ArrayList<>();

        Map<String, Object> sysMsg = new HashMap<>();
        sysMsg.put("role", "system");
        sysMsg.put("content", SYSTEM_PROMPT);
        result.add(sysMsg);

        for (AiMessage msg : messages) {
            Map<String, Object> m = new HashMap<>();
            m.put("role", msg.getRole());
            m.put("content", msg.getContent());
            result.add(m);
        }

        return result;
    }

    // ================================================================
    //  API 请求
    // ================================================================

    private Map<String, Object> createRequestBody(
            List<Map<String, Object>> messages,
            List<AiToolDefinition> tools,
            boolean stream) {

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("stream", stream);
        body.put("tools", tools.stream().map(t -> {
            try {
                return objectMapper.convertValue(t, Map.class);
            } catch (Exception e) {
                logger.warn("Failed to convert tool definition", e);
                return null;
            }
        }).filter(Objects::nonNull).collect(ArrayList::new, ArrayList::add, ArrayList::addAll));

        return body;
    }

    /**
     * 发送非流式请求，解析 content 和 tool_calls
     */
    private NonStreamResponse sendNonStreamRequest(String url, Map<String, Object> requestBody) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            String body = response.getBody();
            if (body == null || body.isEmpty()) return null;

            return parseNonStreamResponse(body);
        } catch (Exception e) {
            logger.error("DeepSeek API request failed", e);
            NonStreamResponse err = new NonStreamResponse();
            err.content = "请求失败: " + e.getMessage();
            return err;
        }
    }


    // ================================================================
    //  响应解析
    // ================================================================

    @SuppressWarnings("unchecked")
    private NonStreamResponse parseNonStreamResponse(String jsonBody) {
        try {
            Map<String, Object> root = objectMapper.readValue(jsonBody, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) root.get("choices");

            if (choices == null || choices.isEmpty()) return null;

            Map<String, Object> choice = choices.get(0);
            Map<String, Object> message = (Map<String, Object>) choice.get("message");

            if (message == null) return null;

            NonStreamResponse resp = new NonStreamResponse();
            resp.content = (String) message.get("content");
            resp.toolCalls = new ArrayList<>();

            List<Map<String, Object>> rawToolCalls = (List<Map<String, Object>>) message.get("tool_calls");
            if (rawToolCalls != null) {
                for (Map<String, Object> rawTc : rawToolCalls) {
                    ToolCall tc = new ToolCall();
                    tc.id = (String) rawTc.get("id");

                    Map<String, Object> func = (Map<String, Object>) rawTc.get("function");
                    if (func != null) {
                        tc.name = (String) func.get("name");
                        String argsJson = (String) func.get("arguments");
                        if (argsJson != null) {
                            try {
                                tc.arguments = objectMapper.readValue(argsJson,
                                    new TypeReference<Map<String, Object>>() {});
                            } catch (Exception e) {
                                tc.arguments = new HashMap<>();
                                tc.arguments.put("raw", argsJson);
                            }
                        } else {
                            tc.arguments = new HashMap<>();
                        }
                    }
                    resp.toolCalls.add(tc);
                }
            }

            return resp;
        } catch (Exception e) {
            logger.error("Failed to parse non-stream response", e);
            return null;
        }
    }

    private List<Map<String, Object>> serializeToolCalls(List<ToolCall> toolCalls) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (ToolCall tc : toolCalls) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", tc.id);
            m.put("type", "function");
            Map<String, Object> func = new LinkedHashMap<>();
            func.put("name", tc.name);
            try {
                func.put("arguments", objectMapper.writeValueAsString(tc.arguments));
            } catch (Exception e) {
                func.put("arguments", "{}");
            }
            m.put("function", func);
            result.add(m);
        }
        return result;
    }

    // ================================================================
    //  SSE 事件
    // ================================================================

    private void emitEvent(Consumer<String> onEvent, String type, String content,
                           String tool, Map<String, Object> args, String summary) {
        try {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("type", type);
            if (content != null) event.put("content", content);
            if (tool != null) event.put("tool", tool);
            if (args != null) event.put("args", args);
            if (summary != null) event.put("summary", summary);
            onEvent.accept(objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            logger.warn("Error emitting SSE event", e);
        }
    }

    @SuppressWarnings("unchecked")
    private String buildToolResultSummary(String toolName, String resultJson) {
        try {
            Map<String, Object> result = objectMapper.readValue(resultJson, Map.class);
            if (result.containsKey("error")) return "查询失败";

            Object total = result.get("total");
            if (total != null) {
                return "查询到 " + total + " 条记录";
            }
            return "查询完成";
        } catch (Exception e) {
            return "查询完成";
        }
    }
}
