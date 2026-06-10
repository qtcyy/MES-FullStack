package com.wangziyang.mes.system.agent.service;

import com.wangziyang.mes.system.agent.dto.AiToolDefinition;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.*;

/**
 * MES AI Agent 工具注册中心
 * <p>
 * 定义所有可供 AI 调用的只读查询工具及其 JSON Schema 参数。
 * 工具清单会在启动时收集，注入 DeepSeek API 的 tools 参数。
 * </p>
 */
@Component
public class ToolRegistry {

    private final List<AiToolDefinition> allTools = new ArrayList<>();

    @PostConstruct
    public void init() {
        registerTools();
    }

    public List<AiToolDefinition> getAllTools() {
        return Collections.unmodifiableList(allTools);
    }

    private void registerTools() {
        // 1. 查询生产工单
        allTools.add(new AiToolDefinition(
            "get_production_orders",
            "查询生产工单列表，可按订单类型、日期范围过滤。返回工单列表及按状态（statue字段：1=创建 2=进行中 3=订单结束 4=订单终结）的分布统计。",
            jsonSchema(
                opt("orderType", "string", "订单类型：P=量产 A=验证 F=返工", false),
                opt("startDate", "string", "计划开始日期，格式 yyyy-MM-dd", false),
                opt("endDate", "string", "计划结束日期，格式 yyyy-MM-dd", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 2. 查询物料信息
        allTools.add(new AiToolDefinition(
            "get_materials",
            "查询物料主数据，可按关键字搜索物料编码或描述，或按物料类型筛选。返回物料列表及按物料类型（matType）的分布统计。",
            jsonSchema(
                opt("keyword", "string", "搜索关键字（匹配物料编码 materiel 或描述 materielDesc）", false),
                opt("matType", "string", "物料类型，如：原材料、成品、半成品、辅料", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 3. 查询设备信息
        allTools.add(new AiToolDefinition(
            "get_devices",
            "查询设备信息，可按产线（lineId）或运行状态筛选。返回设备列表及状态分布统计。",
            jsonSchema(
                opt("lineId", "string", "产线ID", false),
                opt("status", "string", "设备状态：运行中、停机、维修、空闲", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 4. 查询 BOM 清单
        allTools.add(new AiToolDefinition(
            "get_bom_list",
            "查询物料清单（BOM）头表，可按物料编码或BOM编号搜索。",
            jsonSchema(
                opt("materielCode", "string", "物料编码", false),
                opt("keyword", "string", "BOM 编号搜索关键字", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 5. 查询产品 BOM 结构
        allTools.add(new AiToolDefinition(
            "get_product_bom_structure",
            "查询产品 BOM 树形结构，返回指定节点的子件层级关系。",
            jsonSchema(
                req("productId", "string", "产品 BOM 记录 ID")
            )
        ));

        // 6. 查询仓库库位
        allTools.add(new AiToolDefinition(
            "get_warehouse_locations",
            "查询仓库库位信息，可按仓库筛选。返回库位列表（含库位编码、组/行/层/列号）。注意：库位表仅定义位置信息，不含库存数量。",
            jsonSchema(
                opt("warehouseId", "string", "仓库ID", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 7. 查询工序信息
        allTools.add(new AiToolDefinition(
            "get_process_units",
            "查询生产工艺工序单元，可按关键字搜索工序编码或名称。",
            jsonSchema(
                opt("keyword", "string", "工序编码或名称搜索关键字", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 8. 查询工艺流程路线
        allTools.add(new AiToolDefinition(
            "get_flow_routes",
            "查询产品的工艺流程路线（Flow），可按流程编码或描述搜索。返回流程列表及关联的工序步骤关系（前后道工序）。",
            jsonSchema(
                opt("keyword", "string", "流程编码（flow）或描述（flowDesc）搜索关键字", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 9. 生产看板总览
        allTools.add(new AiToolDefinition(
            "get_dashboard_summary",
            "获取生产看板总览统计数据：工单总数及状态分布、设备状态分布、物料总数、工艺流程数、用户总数等汇总信息。无需参数。",
            jsonSchema()
        ));

        // 10. 查询用户信息
        allTools.add(new AiToolDefinition(
            "get_users",
            "查询系统用户信息，可按部门或姓名/用户名搜索。",
            jsonSchema(
                opt("deptId", "string", "部门ID", false),
                opt("keyword", "string", "姓名或用户名搜索关键字", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));
    }

    // ================================================================
    //  JSON Schema 辅助方法
    // ================================================================

    @SafeVarargs
    private static Map<String, Object> jsonSchema(Map<String, Object>... props) {
        List<Map<String, Object>> list = Arrays.asList(props);
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");

        Map<String, Object> properties = new LinkedHashMap<>();
        List<String> required = new ArrayList<>();

        for (Map<String, Object> prop : props) {
            String name = (String) prop.remove("name");
            boolean isRequired = (boolean) prop.remove("_required");
            properties.put(name, prop);
            if (isRequired) {
                required.add(name);
            }
        }

        schema.put("properties", properties);
        if (!required.isEmpty()) {
            schema.put("required", required);
        }
        return schema;
    }

    private static Map<String, Object> req(String name, String type, String description) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("type", type);
        m.put("description", description);
        m.put("_required", true);
        return m;
    }

    private static Map<String, Object> opt(String name, String type, String description, boolean unused) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("type", type);
        m.put("description", description);
        m.put("_required", false);
        return m;
    }
}
