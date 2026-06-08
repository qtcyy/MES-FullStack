package com.wangziyang.mes.system.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wangziyang.mes.system.dto.AiMessage;
import com.wangziyang.mes.system.service.IAiChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * AI 对话服务实现 — DeepSeek API 代理
 */
@Service
public class AiChatServiceImpl implements IAiChatService {

    private static final Logger logger = LoggerFactory.getLogger(AiChatServiceImpl.class);

    private static final String SYSTEM_PROMPT =
        "你是 MES 章鱼师兄平台的 AI 助手，帮助用户了解和使用该制造执行系统。\n\n" +
        "平台包含以下功能模块：\n\n" +
        "1. 系统管理：用户管理（新增/编辑/删除用户，管理用户角色）、角色权限（定义角色并分配菜单权限）、" +
        "菜单配置（管理侧边栏导航菜单，支持目录/菜单/按钮三级）、部门管理（组织架构树）、" +
        "数据字典（管理系统中的枚举值和代码表）、团队管理（管理团队及成员工作日历）\n\n" +
        "2. 基础数据：物料管理（原材料/成品/半成品等物料主数据）、通用管理（动态表配置，自定义业务数据表结构）、" +
        "通用管理项（动态表的行数据管理）、设备组（管理设备分组和设备信息）、" +
        "工序单元（定义生产工序）、仓库管理、组件管理\n\n" +
        "3. 工艺技术：BOM 管理（物料清单）、产品 BOM 编辑器（可视化编辑产品 BOM 结构）、" +
        "工艺流程（定义产品的生产流程路线）、流程工序（Transfer Shuttle — 为流程分配工序步骤）、" +
        "工序管理、工艺流程图（可视化查看流程）、工艺内容、工艺查询\n\n" +
        "4. 生产订单：创建和管理生产订单，跟踪生产进度\n\n" +
        "5. 数字化看板：计划仪表盘（ECharts 数据可视化大屏）、3D 仿真（Three.js 工厂 3D 场景）\n\n" +
        "6. 系统工具：图标选择器、颜色选择器、富文本编辑器、分步表单\n\n" +
        "回答风格：简洁、准确。当用户询问某个功能在哪里时，给出明确的导航路径（例如：'系统管理 → 用户管理'）。" +
        "当用户询问如何操作时，给出步骤说明。如果不确定某个细节，诚实告知并建议用户查阅官方文档。";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${deepseek.api-key}")
    private String apiKey;

    @Value("${deepseek.base-url}")
    private String baseUrl;

    @Value("${deepseek.model}")
    private String model;

    public AiChatServiceImpl() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setBufferRequestBody(false);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public void streamChat(List<AiMessage> messages, Consumer<String> onChunk) throws Exception {
        String url = baseUrl + "/v1/chat/completions";

        // 构建完整消息列表（系统提示词 + 用户消息）
        List<Map<String, String>> fullMessages = new ArrayList<>();
        Map<String, String> systemMsg = new HashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", SYSTEM_PROMPT);
        fullMessages.add(systemMsg);

        for (AiMessage msg : messages) {
            Map<String, String> m = new HashMap<>();
            m.put("role", msg.getRole());
            m.put("content", msg.getContent());
            fullMessages.add(m);
        }

        // 构建请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", fullMessages);
        requestBody.put("stream", true);

        // 发起流式请求
        restTemplate.execute(url, HttpMethod.POST, request -> {
            request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            request.getHeaders().set("Authorization", "Bearer " + apiKey);
            objectMapper.writeValue(request.getBody(), requestBody);
        }, response -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.getBody()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("data: ")) {
                        String data = line.substring(6).trim();
                        if ("[DONE]".equals(data)) {
                            break;
                        }
                        try {
                            onChunk.accept(data);
                        } catch (Exception e) {
                            logger.warn("Error processing chunk: {}", e.getMessage());
                        }
                    }
                }
            }
            return null;
        });
    }
}
