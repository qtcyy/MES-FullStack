# AI Agent 功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 MES AI 助手增加 Agent 数据库查询能力，AI 可自主调用 10 个只读工具查询数据库并给出分析建议。

**Architecture:** 纯自研方案，基于现有 RestTemplate + SSE。分三层：ToolRegistry（工具定义注册）、ToolExecutor（工具调度执行）、Agent Loop（在 AiChatServiceImpl 中编排推理↔工具调用循环）。SSE 协议升级为结构化 JSON 事件。

**Tech Stack:** Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2, RestTemplate, DeepSeek API, React 18 + TypeScript + Zustand

**Design doc:** `docs/superpowers/specs/2026-06-10-ai-agent-design.md`

---

### Task 1: AiToolDefinition DTO

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/agent/dto/AiToolDefinition.java`

- [ ] **Step 1: 创建 Tool 定义 DTO**

```java
package com.wangziyang.mes.system.agent.dto;

import java.util.Map;

/**
 * AI Tool 定义 — 对应 DeepSeek/OpenAI Function Calling 的 tools 参数项
 */
public class AiToolDefinition {

    private String type = "function";

    private Function function;

    public AiToolDefinition() {}

    public AiToolDefinition(String name, String description, Map<String, Object> parameters) {
        this.function = new Function(name, description, parameters);
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Function getFunction() { return function; }
    public void setFunction(Function function) { this.function = function; }

    public static class Function {
        private String name;
        private String description;
        private Map<String, Object> parameters;

        public Function() {}

        public Function(String name, String description, Map<String, Object> parameters) {
            this.name = name;
            this.description = description;
            this.parameters = parameters;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Map<String, Object> getParameters() { return parameters; }
        public void setParameters(Map<String, Object> parameters) { this.parameters = parameters; }
    }
}
```

- [ ] **Step 2: 创建 agent 包目录并提交**

```bash
mkdir -p mes/src/main/java/com/wangziyang/mes/system/agent/dto
mkdir -p mes/src/main/java/com/wangziyang/mes/system/agent/service
git add mes/src/main/java/com/wangziyang/mes/system/agent/
git commit -m "feat: 新增 AiToolDefinition DTO"
```

---

### Task 2: ToolRegistry — 工具注册中心

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/agent/service/ToolRegistry.java`

- [ ] **Step 1: 创建 ToolRegistry**

> **注意：工具参数基于实际 Entity 字段设计。SpDevice 无 groupId，SpWarehouseLocation 无 quantity/materialCode，取值请严格对齐真实字段。**

```java
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
            "查询设备信息，可按产线或运行状态筛选。返回设备列表及状态统计。",
            jsonSchema(
                opt("lineId", "string", "产线ID", false),
                opt("status", "string", "设备状态：运行中、停机、维修、空闲", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 4. 查询 BOM 清单
        allTools.add(new AiToolDefinition(
            "get_bom_list",
            "查询物料清单（BOM）头表，可按物料编码或版本号搜索。",
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
            "查询仓库库位信息，可按仓库筛选。返回库位列表。",
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
            "查询产品的工艺流程路线（Flow），可按流程编码或描述搜索。返回流程列表及关联的工序步骤关系。",
            jsonSchema(
                opt("keyword", "string", "流程编码（flow）或描述（flowDesc）搜索关键字", false),
                opt("limit", "integer", "返回条数上限，默认 50", false)
            )
        ));

        // 9. 生产看板总览
        allTools.add(new AiToolDefinition(
            "get_dashboard_summary",
            "获取生产看板总览统计数据：今日工单数量、设备运行状态分布、物料总数等汇总信息。无需参数。",
            jsonSchema(Collections.emptyMap())
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

    private static Map<String, Object> jsonSchema(List<Map<String, Object>> props) {
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
```

- [ ] **Step 2: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/agent/service/ToolRegistry.java
git commit -m "feat: 新增 ToolRegistry — AI Agent 工具注册中心"
```

---

### Task 3: ToolExecutor — 工具执行器

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/agent/service/ToolExecutor.java`

- [ ] **Step 1: 创建 ToolExecutor（第一部分：注入 Mapper + execute 调度）**

```java
package com.wangziyang.mes.system.agent.service;

import com.wangziyang.mes.basedata.mapper.*;
import com.wangziyang.mes.basedata.entity.*;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.mapper.SpOrderMapper;
import com.wangziyang.mes.system.mapper.SysDepartmentMapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.system.entity.SysDepartment;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.technology.mapper.*;
import com.wangziyang.mes.technology.entity.*;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

/**
 * MES AI Agent 工具执行器
 * <p>
 * 接收工具名称和参数，调用对应 Mapper 查询数据库，
 * 返回结构化 JSON 结果供 AI 分析。
 * </p>
 * <p>
 * <b>关键约定：</b>所有查询基于真实 Entity 字段，不凭空假设字段名。
 * </p>
 */
@Component
public class ToolExecutor {

    private static final Logger logger = LoggerFactory.getLogger(ToolExecutor.class);
    private static final int DEFAULT_LIMIT = 50;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired(required = false)
    private SpOrderMapper spOrderMapper;

    @Autowired(required = false)
    private SpMaterileMapper spMaterileMapper;

    @Autowired(required = false)
    private SpDeviceMapper spDeviceMapper;

    @Autowired(required = false)
    private SpWarehouseMapper spWarehouseMapper;

    @Autowired(required = false)
    private SpWarehouseLocationMapper spWarehouseLocationMapper;

    @Autowired(required = false)
    private SpBomMapper spBomMapper;

    @Autowired(required = false)
    private SpBomItemMapper spBomItemMapper;

    @Autowired(required = false)
    private SpProductBomMapper spProductBomMapper;

    @Autowired(required = false)
    private SpProductBomItemMapper spProductBomItemMapper;

    @Autowired(required = false)
    private SpProcessUnitMapper spProcessUnitMapper;

    @Autowired(required = false)
    private SpFlowMapper spFlowMapper;

    @Autowired(required = false)
    private SpFlowOperRelationMapper spFlowOperRelationMapper;

    @Autowired(required = false)
    private SysUserMapper sysUserMapper;

    @Autowired(required = false)
    private SysDepartmentMapper sysDepartmentMapper;

    /**
     * 执行工具调用
     *
     * @param toolName  工具名称
     * @param arguments 工具参数字典
     * @return 工具执行结果（JSON 字符串），出错时返回 {"error":"..."} 
     */
    public String execute(String toolName, Map<String, Object> arguments) {
        try {
            logger.info("Executing tool: {} with args: {}", toolName, arguments);
            switch (toolName) {
                case "get_production_orders":
                    return executeGetProductionOrders(arguments);
                case "get_materials":
                    return executeGetMaterials(arguments);
                case "get_devices":
                    return executeGetDevices(arguments);
                case "get_bom_list":
                    return executeGetBomList(arguments);
                case "get_product_bom_structure":
                    return executeGetProductBomStructure(arguments);
                case "get_warehouse_locations":
                    return executeGetWarehouseLocations(arguments);
                case "get_process_units":
                    return executeGetProcessUnits(arguments);
                case "get_flow_routes":
                    return executeGetFlowRoutes(arguments);
                case "get_dashboard_summary":
                    return executeGetDashboardSummary(arguments);
                case "get_users":
                    return executeGetUsers(arguments);
                default:
                    return "{\"error\": \"Unknown tool: " + toolName + "\"}";
            }
        } catch (Exception e) {
            logger.error("Error executing tool: {}", toolName, e);
            return "{\"error\": \"" + e.getMessage().replace("\"", "\\\"") + "\"}";
        }
    }
```

- [ ] **Step 2: 创建 ToolExecutor（第二部分：工单查询）**

```java
    // ================================================================
    //  1. get_production_orders — SpOrder 表
    //     字段: orderCode, orderDescription, qty, orderType(P/A/F),
    //           materiel, materielDesc, planStartTime, planEndTime, statue(1/2/3/4)
    // ================================================================

    private String executeGetProductionOrders(Map<String, Object> args) throws Exception {
        if (spOrderMapper == null) return "{\"error\": \"订单模块未加载\"}";

        QueryWrapper<SpOrder> qw = new QueryWrapper<>();
        qw.orderByDesc("create_time");

        String orderType = str(args.get("orderType"));
        String startDate = str(args.get("startDate"));
        String endDate = str(args.get("endDate"));

        if (orderType != null) qw.eq("order_type", orderType);
        if (startDate != null) qw.ge("plan_start_time", startDate);
        if (endDate != null) qw.le("plan_end_time", endDate);

        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);
        qw.last("LIMIT " + limit);

        List<SpOrder> orders = spOrderMapper.selectList(qw);

        // 按 statue 统计：1=创建 2=进行中 3=订单结束 4=订单终结
        Map<Integer, Long> statueStats = orders.stream()
            .collect(Collectors.groupingBy(o -> o.getStatue() != null ? o.getStatue() : 0, Collectors.counting()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", orders.size());
        result.put("statueDistribution", Map.of(
            "创建(1)", statueStats.getOrDefault(1, 0L),
            "进行中(2)", statueStats.getOrDefault(2, 0L),
            "订单结束(3)", statueStats.getOrDefault(3, 0L),
            "订单终结(4)", statueStats.getOrDefault(4, 0L)
        ));
        result.put("orders", orders.stream().map(o -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("orderCode", safe(o.getOrderCode()));
            m.put("orderDescription", safe(o.getOrderDescription()));
            m.put("qty", o.getQty());
            m.put("orderType", safe(o.getOrderType()));
            m.put("materiel", safe(o.getMateriel()));
            m.put("materielDesc", safe(o.getMaterielDesc()));
            m.put("statue", o.getStatue());
            m.put("planStartTime", safe(o.getPlanStartTime()));
            m.put("planEndTime", safe(o.getPlanEndTime()));
            m.put("createTime", fmtDate(o.getCreateTime()));
            return m;
        }).collect(Collectors.toList()));
        return objectMapper.writeValueAsString(result);
    }
```

- [ ] **Step 3: 创建 ToolExecutor（第三部分：物料查询）**

```java
    // ================================================================
    //  2. get_materials — SpMaterile 表
    //     字段: materiel(编码), materielDesc(描述), matType(类型),
    //           model(型号), size(尺寸), unit(单位), productGroup, source, safetyStock
    // ================================================================

    private String executeGetMaterials(Map<String, Object> args) throws Exception {
        if (spMaterileMapper == null) return "{\"error\": \"物料模块未加载\"}";

        QueryWrapper<SpMaterile> qw = new QueryWrapper<>();
        qw.orderByAsc("materiel");

        String keyword = str(args.get("keyword"));
        String matType = str(args.get("matType"));

        if (keyword != null) {
            qw.and(w -> w.like("materiel", keyword).or().like("materiel_desc", keyword));
        }
        if (matType != null) qw.like("mat_type", matType);

        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);
        qw.last("LIMIT " + limit);

        List<SpMaterile> list = spMaterileMapper.selectList(qw);

        Map<String, Long> typeStats = list.stream()
            .collect(Collectors.groupingBy(
                m -> m.getMatType() != null ? m.getMatType() : "未分类",
                Collectors.counting()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("typeDistribution", typeStats);
        result.put("materials", list.stream().map(m -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getId());
            item.put("materiel", safe(m.getMateriel()));
            item.put("materielDesc", safe(m.getMaterielDesc()));
            item.put("matType", safe(m.getMatType()));
            item.put("model", safe(m.getModel()));
            item.put("size", safe(m.getSize()));
            item.put("unit", safe(m.getUnit()));
            item.put("productGroup", safe(m.getProductGroup()));
            item.put("source", safe(m.getSource()));
            item.put("safetyStock", m.getSafetyStock());
            return item;
        }).collect(Collectors.toList()));
        return objectMapper.writeValueAsString(result);
    }
```

- [ ] **Step 4: 创建 ToolExecutor（第四部分：设备查询）**

```java
    // ================================================================
    //  3. get_devices — SpDevice 表
    //     字段: code, name, type, model, specs, lineId, location, status, descr
    //     注意：SpDevice 没有 groupId 字段，用 lineId 替代
    // ================================================================

    private String executeGetDevices(Map<String, Object> args) throws Exception {
        if (spDeviceMapper == null) return "{\"error\": \"设备模块未加载\"}";

        QueryWrapper<SpDevice> qw = new QueryWrapper<>();
        qw.orderByAsc("code");

        String lineId = str(args.get("lineId"));
        String status = str(args.get("status"));

        if (lineId != null) qw.eq("line_id", lineId);
        if (status != null) qw.eq("status", status);

        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);
        qw.last("LIMIT " + limit);

        List<SpDevice> list = spDeviceMapper.selectList(qw);

        Map<String, Long> statusStats = list.stream()
            .collect(Collectors.groupingBy(
                d -> d.getStatus() != null ? d.getStatus() : "未知",
                Collectors.counting()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("statusDistribution", statusStats);
        result.put("devices", list.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("code", safe(d.getCode()));
            m.put("name", safe(d.getName()));
            m.put("type", safe(d.getType()));
            m.put("model", safe(d.getModel()));
            m.put("specs", safe(d.getSpecs()));
            m.put("lineId", safe(d.getLineId()));
            m.put("location", safe(d.getLocation()));
            m.put("status", safe(d.getStatus()));
            return m;
        }).collect(Collectors.toList()));
        return objectMapper.writeValueAsString(result);
    }
```

- [ ] **Step 5: 创建 ToolExecutor（第五部分：BOM 查询）**

```java
    // ================================================================
    //  4. get_bom_list — SpBom 表
    //     字段: bomCode, materielCode, materielDesc, versionNumber, state, factory
    //  5. get_product_bom_structure — SpProductBom + SpProductBomItem
    //     字段: SpProductBom{bomCode, productCode, nodeName, parentId, level, version, status}
    //          SpProductBomItem{bomId, itemType, materialCode, materialDesc, quantity(BigDecimal), unit, sortOrder}
    // ================================================================

    private String executeGetBomList(Map<String, Object> args) throws Exception {
        if (spBomMapper == null) return "{\"error\": \"BOM模块未加载\"}";

        QueryWrapper<SpBom> qw = new QueryWrapper<>();
        qw.orderByDesc("create_time");

        String materielCode = str(args.get("materielCode"));
        String keyword = str(args.get("keyword"));

        if (materielCode != null) qw.eq("materiel_code", materielCode);
        if (keyword != null) qw.like("bom_code", keyword);

        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);
        qw.last("LIMIT " + limit);

        List<SpBom> list = spBomMapper.selectList(qw);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("boms", list.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("bomCode", safe(b.getBomCode()));
            m.put("materielCode", safe(b.getMaterielCode()));
            m.put("materielDesc", safe(b.getMaterielDesc()));
            m.put("versionNumber", safe(b.getVersionNumber()));
            m.put("state", safe(b.getState()));
            m.put("factory", safe(b.getFactory()));
            return m;
        }).collect(Collectors.toList()));
        return objectMapper.writeValueAsString(result);
    }

    private String executeGetProductBomStructure(Map<String, Object> args) throws Exception {
        if (spProductBomMapper == null) return "{\"error\": \"产品BOM模块未加载\"}";

        String productId = str(args.get("productId"));
        if (productId == null) return "{\"error\": \"缺少必需参数 productId\"}";

        SpProductBom bom = spProductBomMapper.selectById(productId);
        if (bom == null) return "{\"error\": \"未找到该产品BOM记录\"}";

        // 查询子件
        QueryWrapper<SpProductBomItem> itemQw = new QueryWrapper<>();
        itemQw.eq("bom_id", productId).orderByAsc("sort_order");
        List<SpProductBomItem> items = spProductBomItemMapper.selectList(itemQw);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("productBom", Map.of(
            "id", bom.getId(),
            "bomCode", safe(bom.getBomCode()),
            "productCode", safe(bom.getProductCode()),
            "nodeName", safe(bom.getNodeName()),
            "parentId", safe(bom.getParentId()),
            "level", bom.getLevel(),
            "version", safe(bom.getVersion()),
            "status", safe(bom.getStatus())
        ));
        result.put("totalItems", items.size());
        result.put("items", items.stream().map(item -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", item.getId());
            m.put("bomId", item.getBomId());
            m.put("itemType", safe(item.getItemType()));
            m.put("materialCode", safe(item.getMaterialCode()));
            m.put("materialDesc", safe(item.getMaterialDesc()));
            m.put("quantity", item.getQuantity());
            m.put("unit", safe(item.getUnit()));
            m.put("sortOrder", item.getSortOrder());
            return m;
        }).collect(Collectors.toList()));
        return objectMapper.writeValueAsString(result);
    }
```

- [ ] **Step 6: 创建 ToolExecutor（第六部分：仓库 + 工序 + 工艺流程）**

```java
    // ================================================================
    //  6. get_warehouse_locations — SpWarehouseLocation 表
    //     字段: warehouseId, code, groupNo, rowNo, layerNo, colNo
    //     注意：该表是库位定义，无 quantity/materialCode 字段，不能做库存统计
    // ================================================================

    private String executeGetWarehouseLocations(Map<String, Object> args) throws Exception {
        if (spWarehouseLocationMapper == null) return "{\"error\": \"仓库模块未加载\"}";

        QueryWrapper<SpWarehouseLocation> qw = new QueryWrapper<>();
        qw.orderByAsc("code");

        String warehouseId = str(args.get("warehouseId"));
        if (warehouseId != null) qw.eq("warehouse_id", warehouseId);

        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);
        qw.last("LIMIT " + limit);

        List<SpWarehouseLocation> list = spWarehouseLocationMapper.selectList(qw);

        // 获取仓库名称
        Map<String, String> warehouseNames = new HashMap<>();
        if (spWarehouseMapper != null && !list.isEmpty()) {
            Set<String> ids = list.stream()
                .map(SpWarehouseLocation::getWarehouseId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
            if (!ids.isEmpty()) {
                spWarehouseMapper.selectBatchIds(ids)
                    .forEach(w -> warehouseNames.put(w.getId(), safe(w.getName())));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("locations", list.stream().map(loc -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", loc.getId());
            m.put("warehouseId", loc.getWarehouseId());
            m.put("warehouseName", warehouseNames.getOrDefault(loc.getWarehouseId(), ""));
            m.put("code", safe(loc.getCode()));
            m.put("groupNo", loc.getGroupNo());
            m.put("rowNo", loc.getRowNo());
            m.put("layerNo", loc.getLayerNo());
            m.put("colNo", loc.getColNo());
            return m;
        }).collect(Collectors.toList()));
        return objectMapper.writeValueAsString(result);
    }

    // ================================================================
    //  7. get_process_units — SpProcessUnit 表
    //     字段: code, name, type, hasLineWarehouse, descr
    // ================================================================

    private String executeGetProcessUnits(Map<String, Object> args) throws Exception {
        if (spProcessUnitMapper == null) return "{\"error\": \"工序模块未加载\"}";

        QueryWrapper<SpProcessUnit> qw = new QueryWrapper<>();
        qw.orderByAsc("code");

        String keyword = str(args.get("keyword"));
        if (keyword != null) {
            qw.and(w -> w.like("code", keyword).or().like("name", keyword));
        }

        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);
        qw.last("LIMIT " + limit);

        List<SpProcessUnit> list = spProcessUnitMapper.selectList(qw);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("processUnits", list.stream().map(pu -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", pu.getId());
            m.put("code", safe(pu.getCode()));
            m.put("name", safe(pu.getName()));
            m.put("type", safe(pu.getType()));
            m.put("hasLineWarehouse", safe(pu.getHasLineWarehouse()));
            m.put("descr", safe(pu.getDescr()));
            return m;
        }).collect(Collectors.toList()));
        return objectMapper.writeValueAsString(result);
    }

    // ================================================================
    //  8. get_flow_routes — SpFlow + SpFlowOperRelation
    //     SpFlow: flow(编码), flowDesc(描述), process(时序)
    //     SpFlowOperRelation: flowId, flow, operId, oper, sortNum, operType
    // ================================================================

    private String executeGetFlowRoutes(Map<String, Object> args) throws Exception {
        if (spFlowMapper == null) return "{\"error\": \"工艺流程模块未加载\"}";

        QueryWrapper<SpFlow> qw = new QueryWrapper<>();
        qw.orderByAsc("flow");

        String keyword = str(args.get("keyword"));
        if (keyword != null) {
            qw.and(w -> w.like("flow", keyword).or().like("flow_desc", keyword));
        }

        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);
        qw.last("LIMIT " + limit);

        List<SpFlow> flows = spFlowMapper.selectList(qw);

        List<Map<String, Object>> flowList = flows.stream().map(flow -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", flow.getId());
            m.put("flow", safe(flow.getFlow()));
            m.put("flowDesc", safe(flow.getFlowDesc()));
            m.put("process", safe(flow.getProcess()));

            // 获取关联工序步骤
            if (spFlowOperRelationMapper != null) {
                try {
                    QueryWrapper<SpFlowOperRelation> relQw = new QueryWrapper<>();
                    relQw.eq("flow_id", flow.getId()).orderByAsc("sort_num");
                    List<SpFlowOperRelation> relations = spFlowOperRelationMapper.selectList(relQw);
                    m.put("stepCount", relations.size());
                    m.put("steps", relations.stream().map(rel -> {
                        Map<String, Object> s = new LinkedHashMap<>();
                        s.put("operId", rel.getOperId());
                        s.put("oper", safe(rel.getOper()));
                        s.put("operType", safe(rel.getOperType()));
                        s.put("sortNum", rel.getSortNum());
                        s.put("perOper", safe(rel.getPerOper()));
                        s.put("nextOper", safe(rel.getNextOper()));
                        return s;
                    }).collect(Collectors.toList()));
                } catch (Exception e) {
                    m.put("stepCount", 0);
            m.put("steps", Collections.emptyList());
                }
            } else {
                m.put("stepCount", 0);
        m.put("steps", Collections.emptyList());
            }
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", flowList.size());
        result.put("flows", flowList);
        return objectMapper.writeValueAsString(result);
    }
```

- [ ] **Step 7: 创建 ToolExecutor（第七部分：看板总览 + 用户查询 + 辅助方法）**

```java
    // ================================================================
    //  9. get_dashboard_summary — 汇总各模块关键数据
    // ================================================================

    private String executeGetDashboardSummary(Map<String, Object> args) throws Exception {
        Map<String, Object> result = new LinkedHashMap<>();

        // 工单总数 + 按 statue 分布
        if (spOrderMapper != null) {
            List<SpOrder> allOrders = spOrderMapper.selectList(null);
            Map<Integer, Long> statueStats = allOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getStatue() != null ? o.getStatue() : 0,
                    Collectors.counting()));
            result.put("orders", Map.of(
                "total", allOrders.size(),
                "statueDistribution", statueStats
            ));
        }

        // 设备状态分布
        if (spDeviceMapper != null) {
            List<SpDevice> allDevices = spDeviceMapper.selectList(null);
            Map<String, Long> statusStats = allDevices.stream()
                .collect(Collectors.groupingBy(d -> d.getStatus() != null ? d.getStatus() : "未知",
                    Collectors.counting()));
            result.put("devices", Map.of(
                "total", allDevices.size(),
                "statusDistribution", statusStats
            ));
        }

        // 物料总数
        if (spMaterileMapper != null) {
            int materialCount = spMaterileMapper.selectCount(null);
            result.put("totalMaterials", materialCount);
        }

        // 工艺流程数量
        if (spFlowMapper != null) {
            int flowCount = spFlowMapper.selectCount(null);
            result.put("totalFlows", flowCount);
        }

        // 用户总数
        if (sysUserMapper != null) {
            int userCount = sysUserMapper.selectCount(null);
            result.put("totalUsers", userCount);
        }

        return objectMapper.writeValueAsString(result);
    }

    // ================================================================
    //  10. get_users — SysUser 表
    //      字段: name(姓名), username(用户名), deptId, email, mobile, sex, deleted
    // ================================================================

    private String executeGetUsers(Map<String, Object> args) throws Exception {
        if (sysUserMapper == null) return "{\"error\": \"用户模块未加载\"}";

        QueryWrapper<SysUser> qw = new QueryWrapper<>();
        qw.orderByAsc("username");

        String keyword = str(args.get("keyword"));
        String deptId = str(args.get("deptId"));

        if (keyword != null) {
            qw.and(w -> w.like("username", keyword).or().like("name", keyword));
        }
        if (deptId != null) qw.eq("dept_id", deptId);

        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);
        qw.last("LIMIT " + limit);

        List<SysUser> users = sysUserMapper.selectList(qw);

        // 获取部门名称
        Map<String, String> deptNames = new HashMap<>();
        if (sysDepartmentMapper != null && !users.isEmpty()) {
            Set<String> deptIds = users.stream()
                .map(SysUser::getDeptId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
            if (!deptIds.isEmpty()) {
                sysDepartmentMapper.selectBatchIds(deptIds)
                    .forEach(d -> deptNames.put(d.getId(), safe(d.getName())));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", users.size());
        result.put("users", users.stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("username", safe(u.getUsername()));
            m.put("name", safe(u.getName()));
            m.put("deptId", safe(u.getDeptId()));
            m.put("deptName", deptNames.getOrDefault(u.getDeptId(), ""));
            m.put("email", safe(u.getEmail()));
            m.put("mobile", safe(u.getMobile()));
            m.put("sex", safe(u.getSex()));
            return m;
        }).collect(Collectors.toList()));
        return objectMapper.writeValueAsString(result);
    }

    // ================================================================
    //  辅助方法
    // ================================================================

    private static String str(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static int intOpt(Object v, int defaultValue) {
        if (v == null) return defaultValue;
        try {
            return Integer.parseInt(v.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private static String safe(String s) {
        return s != null ? s : "";
    }

    private static String fmtDate(Date date) {
        if (date == null) return "";
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(date);
    }
}
```

- [ ] **Step 8: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/agent/service/ToolExecutor.java
git commit -m "feat: 新增 ToolExecutor — AI Agent 工具执行器（10个只读查询工具）"
```

---

### Task 4: 重写 AiChatServiceImpl — Agent 循环

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/system/service/impl/AiChatServiceImpl.java`

- [ ] **Step 1: 重写为 Agent 循环模式**

> **当前文件（约 117 行）需要完全重写。** 新增：Agent 循环逻辑、结构化 SSE 事件输出、工具调用检测与执行。

```java
package com.wangziyang.mes.system.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
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

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.*;
import java.util.function.Consumer;

/**
 * AI 对话服务实现 — Agent 模式
 * <p>
 * 支持 Function Calling（工具调用）：AI 可自主决策查询 MES 数据库，
 * 获取真实数据并进行分析和建议。
 * </p>
 * <p>
 * <b>Agent 循环（混合模式）：</b>
 * 1. 发送非流式请求检测工具调用
 * 2. 有 tool_calls → 执行工具，推送进度事件，加入历史，回第1步
 * 3. 无 tool_calls → 流式请求输出最终分析
 * 4. 最多 5 轮
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
        "- **查询生产工单**：获取工单列表、统计各类状态分布、按日期和订单类型筛选\n" +
        "- **查询物料信息**：搜索原材料/成品/半成品，查看规格型号、安全库存\n" +
        "- **查询设备信息**：查看设备运行状态分布、按产线筛选\n" +
        "- **查询 BOM 清单和结构**：查看物料清单和产品 BOM 树形结构及子件\n" +
        "- **查询仓库库位**：查看仓库库位信息\n" +
        "- **查询工序单元**：查看工序定义和类型\n" +
        "- **查询工艺流程**：查看流程路线及各工序步骤关系\n" +
        "- **查询用户信息**：查看系统用户和部门信息\n" +
        "- **生产看板总览**：获取工单、设备、物料、流程等汇总数据\n\n" +
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

        // 构建完整消息列表（系统提示 + 用户历史），使用 Object 值类型以支持 tool_calls
        List<Map<String, Object>> fullMessages = buildFullMessages(messages);

        // 获取可用工具列表
        List<AiToolDefinition> tools = toolRegistry.getAllTools();

        // Agent 循环：最多 MAX_AGENT_ROUNDS 轮
        for (int round = 0; round < MAX_AGENT_ROUNDS; round++) {
            logger.info("Agent round {}/{}", round + 1, MAX_AGENT_ROUNDS);

            // 非流式请求检测工具调用
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

            // 无工具调用 — 最终回复，流式输出
            if (toolCalls == null || toolCalls.isEmpty()) {
                streamFinalResponse(url, fullMessages, tools, onEvent);
                return;
            }

            // 有工具调用 — 执行并反馈进度
            for (ToolCall tc : toolCalls) {
                logger.info("Agent calling tool: {} with args: {}", tc.name, tc.arguments);
                emitEvent(onEvent, "thinking", "正在查询数据...", null, null, null);
                emitEvent(onEvent, "tool_start", null, tc.name, tc.arguments, null);

                String resultJson = toolExecutor.execute(tc.name, tc.arguments);

                // 解析结果获取摘要
                String summary = buildToolResultSummary(tc.name, resultJson);
                emitEvent(onEvent, "tool_result", null, tc.name, null, summary);

                // 将工具执行结果加入对话历史
                Map<String, Object> toolMsg = new HashMap<>();
                toolMsg.put("role", "tool");
                toolMsg.put("tool_call_id", tc.id);
                toolMsg.put("content", resultJson);
                fullMessages.add(toolMsg);
            }
        }

        // 超过最大轮数
        emitEvent(onEvent, "content", "我已经查询了相关数据，但由于查询范围较广，建议您进一步细化条件。需要我帮您查什么具体信息？", null, null, null);
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
            err.content = "{\"error\":\"" + e.getMessage().replace("\"", "\\\"") + "\"}";
            return err;
        }
    }

    /**
     * 流式输出最终分析
     */
    private void streamFinalResponse(String url, List<Map<String, Object>> messages,
                                      List<AiToolDefinition> tools, Consumer<String> onEvent) {
        Map<String, Object> requestBody = createRequestBody(messages, tools, true);

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
                        if ("[DONE]".equals(data)) break;
                        try {
                            // 解析 DeepSeek 流式 chunk，提取 delta.content
                            Map<String, Object> chunk = objectMapper.readValue(data, Map.class);
                            @SuppressWarnings("unchecked")
                            List<Map<String, Object>> choices = (List<Map<String, Object>>) chunk.get("choices");
                            if (choices != null && !choices.isEmpty()) {
                                Map<String, Object> choice = choices.get(0);
                                @SuppressWarnings("unchecked")
                                Map<String, Object> delta = (Map<String, Object>) choice.get("delta");
                                if (delta != null) {
                                    Object content = delta.get("content");
                                    if (content != null && !content.toString().isEmpty()) {
                                        emitEvent(onEvent, "content", content.toString(), null, null, null);
                                    }
                                }
                            }
                        } catch (Exception e) {
                            // 跳过无法解析的 chunk
                        }
                    }
                }
            }
            return null;
        });

        emitEvent(onEvent, "done", null, null, null, null);
    }

    // ================================================================
    //  响应解析
    // ================================================================

    @SuppressWarnings("unchecked")
    private NonStreamResponse parseNonStreamResponse(String jsonBody) throws JsonProcessingException {
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
    //  SSE 事件发射
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

    /**
     * 从工具执行结果 JSON 提取简短摘要，用于前端展示
     */
    @SuppressWarnings("unchecked")
    private String buildToolResultSummary(String toolName, String resultJson) {
        try {
            Map<String, Object> result = objectMapper.readValue(resultJson, Map.class);
            if (result.containsKey("error")) return "查询失败";

            Object total = result.get("total");
            if (total != null) {
                switch (toolName) {
                    case "get_production_orders":
                        return "查询到 " + total + " 条工单记录";
                    case "get_materials":
                        return "查询到 " + total + " 条物料记录";
                    case "get_devices":
                        return "查询到 " + total + " 条设备记录";
                    case "get_bom_list":
                        return "查询到 " + total + " 条 BOM 记录";
                    case "get_product_bom_structure":
                        return "BOM 结构含 " + total + " 个子件";
                    case "get_warehouse_locations":
                        return "查询到 " + total + " 个库位";
                    case "get_process_units":
                        return "查询到 " + total + " 个工序单元";
                    case "get_flow_routes":
                        return "查询到 " + total + " 条工艺流程";
                    case "get_users":
                        return "查询到 " + total + " 个用户";
                    case "get_dashboard_summary":
                        return "看板数据汇总完成";
                    default:
                        return "返回 " + total + " 条记录";
                }
            }
            return "工具执行完成";
        } catch (Exception e) {
            return "数据查询完成";
        }
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/service/impl/AiChatServiceImpl.java
git commit -m "feat: 重写 AiChatServiceImpl 为 Agent 循环模式（混合模式，最多5轮）"
```

---

### Task 5: 前端类型定义更新

**Files:**
- Modify: `mes/frontend/src/types/ai.ts`

- [ ] **Step 1: 新增 SSE 事件类型**

```typescript
/** 快捷提示词 */
export interface QuickPrompt {
  /** 唯一标识 */
  id: string
  /** 实际发送给 AI 的完整问题文本 */
  text: string
  /** 便利贴上显示的简短文本 */
  displayText: string
  /** emoji 图标 */
  icon?: string
}

/** SSE 事件类型 */
export type SseEventType =
  | 'thinking'
  | 'tool_start'
  | 'tool_result'
  | 'content'
  | 'done'
  | 'error'

/** 结构化 SSE 事件 */
export interface SseEvent {
  type: SseEventType
  content?: string
  tool?: string
  args?: Record<string, unknown>
  summary?: string
}
```

- [ ] **Step 2: 提交**

```bash
git add mes/frontend/src/types/ai.ts
git commit -m "feat: 新增 SseEvent 类型定义，支持结构化 SSE 事件"
```

---

### Task 6: 前端 API 层升级

**Files:**
- Modify: `mes/frontend/src/api/ai.ts`

- [ ] **Step 1: 升级 SSE 解析 + 更新快捷提示词为数据库查询导向**

```typescript
import type { QuickPrompt, SseEvent } from '@/types/ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 发送消息到 AI 助手（Agent 模式 SSE 流式）
 *
 * @param messages 当前对话消息列表
 * @param onEvent  每收到一个结构化事件的回调
 * @param signal   AbortController signal
 */
export async function streamChat(
  messages: ChatMessage[],
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/admin/ai/chat', {
    method: 'POST',
    credentials: 'include',
    redirect: 'error',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Stream not supported')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          const event = JSON.parse(data) as SseEvent
          onEvent(event)
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  } finally {
    reader.cancel()
  }
}

/** 默认快捷提示词 — 与 Agent 工具能力对齐 */
const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: '1',
    text: '帮我分析一下当前生产工单的整体情况，各状态分布如何？',
    displayText: '分析工单情况',
    icon: '📋',
  },
  {
    id: '2',
    text: '查看当前设备运行状态，有哪些设备？状态分布怎样？',
    displayText: '查看设备状态',
    icon: '🏭',
  },
  {
    id: '3',
    text: '查一下物料数据，各类物料有多少？给我一个概览',
    displayText: '统计物料数据',
    icon: '📦',
  },
  {
    id: '4',
    text: '查询 BOM 清单，有哪些物料清单？',
    displayText: '查看BOM清单',
    icon: '📊',
  },
  {
    id: '5',
    text: '获取生产看板总览，包括工单、设备、物料的汇总数据',
    displayText: '生产看板总览',
    icon: '📈',
  },
]

/**
 * 获取快捷提示词列表
 */
export function fetchQuickPrompts(): Promise<QuickPrompt[]> {
  return Promise.resolve(DEFAULT_QUICK_PROMPTS)
}
```

- [ ] **Step 2: 提交**

```bash
git add mes/frontend/src/api/ai.ts
git commit -m "feat: 升级前端 SSE 解析为结构化事件 + 更新快捷提示词"
```

---

### Task 7: 前端 Zustand Store 升级

**Files:**
- Modify: `mes/frontend/src/stores/aiChatStore.ts`

- [ ] **Step 1: 适配 SseEvent，新增 thinking/toolCall 状态**

```typescript
import { create } from 'zustand'
import { streamChat } from '@/api/ai'
import type { SseEvent } from '@/types/ai'

export interface ToolCallState {
  status: 'running' | 'done' | 'error'
  tool?: string
  summary?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** 工具调用步骤（仅 assistant 消息可能有） */
  toolCalls?: ToolCallState[]
}

interface AIChatState {
  isOpen: boolean
  messages: Message[]
  isLoading: boolean
  /** 当前思考中的提示文案（thinking 事件） */
  thinkingText: string | null
  error: string | null

  toggle: () => void
  open: () => void
  close: () => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  clearError: () => void
}

let abortController: AbortController | null = null

const useAIChatStore = create<AIChatState>((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  thinkingText: null,
  error: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  open: () => set({ isOpen: true }),

  close: () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    set({ isOpen: false, isLoading: false, thinkingText: null })
  },

  sendMessage: async (content: string) => {
    const { messages, isLoading } = get()
    if (isLoading || !content.trim()) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      toolCalls: [],
    }

    set({
      messages: [...messages, userMsg, assistantMsg],
      isLoading: true,
      thinkingText: null,
      error: null,
    })

    const chatMessages = [...get().messages]
      .filter((m) => m.content !== '' || (m.toolCalls && m.toolCalls.length > 0))
      .map((m) => ({ role: m.role, content: m.content }))

    abortController = new AbortController()

    try {
      await streamChat(
        chatMessages,
        (event: SseEvent) => {
          switch (event.type) {
            case 'thinking':
              set({ thinkingText: event.content || '正在思考...' })
              break

            case 'tool_start':
              set((s) => {
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last && last.role === 'assistant') {
                  const calls = last.toolCalls || []
                  msgs[msgs.length - 1] = {
                    ...last,
                    toolCalls: [...calls, {
                      status: 'running' as const,
                      tool: event.tool,
                    }],
                  }
                }
                return { messages: msgs }
              })
              break

            case 'tool_result':
              set((s) => {
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last && last.role === 'assistant') {
                  const calls = [...(last.toolCalls || [])]
                  // 更新最后一个 matching running tool
                  for (let i = calls.length - 1; i >= 0; i--) {
                    if (calls[i].status === 'running' && calls[i].tool === event.tool) {
                      calls[i] = {
                        ...calls[i],
                        status: event.summary?.includes('失败') ? 'error' : 'done',
                        summary: event.summary,
                      }
                      break
                    }
                  }
                  msgs[msgs.length - 1] = {
                    ...last,
                    toolCalls: calls,
                  }
                }
                return { messages: msgs }
              })
              break

            case 'content':
              set((s) => {
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last && last.role === 'assistant') {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: last.content + (event.content || ''),
                  }
                }
                return { messages: msgs, thinkingText: null }
              })
              break

            case 'done':
              set({ isLoading: false, thinkingText: null })
              break

            case 'error':
              set((s) => {
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last && last.role === 'assistant' && last.content === '') {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: `⚠️ ${event.content || '服务异常，请稍后重试'}`,
                  }
                }
                return {
                  messages: msgs,
                  isLoading: false,
                  thinkingText: null,
                  error: event.content || '服务异常',
                }
              })
              break
          }
        },
        abortController.signal,
      )
    } catch (err: unknown) {
      const errName = (err as any)?.name
      if (errName === 'AbortError') return

      const errorMsg =
        err instanceof Error ? err.message : '网络连接失败，请稍后重试'
      set((s) => {
        const msgs = [...s.messages]
        const last = msgs[msgs.length - 1]
        if (last && last.role === 'assistant' && last.content === '') {
          msgs[msgs.length - 1] = {
            ...last,
            content: `⚠️ ${errorMsg}`,
          }
        }
        return { messages: msgs, isLoading: false, thinkingText: null, error: errorMsg }
      })
    } finally {
      abortController = null
      set({ isLoading: false, thinkingText: null })
    }
  },

  clearMessages: () => set({ messages: [], error: null, thinkingText: null }),

  clearError: () => set({ error: null }),
}))

export default useAIChatStore
```

- [ ] **Step 2: 提交**

```bash
git add mes/frontend/src/stores/aiChatStore.ts
git commit -m "feat: 升级 aiChatStore 支持 SseEvent 结构化事件和工具调用状态"
```

---

### Task 8: 前端 AIChatPanel 展示工具调用进度

**Files:**
- Modify: `mes/frontend/src/components/ai/AIChatPanel.tsx`
- Read: `mes/frontend/src/components/ai/ChatMessage.tsx` (确认现有结构)

- [ ] **Step 1: 更新 ChatMessage 组件以显示工具调用步骤**

先读取当前 ChatMessage.tsx 内容，然后修改。

如果 ChatMessage 当前仅显示 `{message.content}`，新增 toolCalls 步骤展示：

```tsx
// 在现有 ChatMessage 渲染中添加 toolCalls 展示
{message.toolCalls && message.toolCalls.length > 0 && (
  <div style={{ marginBottom: 8 }}>
    {message.toolCalls.map((tc, i) => (
      <div key={i} style={{
        fontSize: 12,
        color: '#666',
        padding: '4px 8px',
        background: '#f5f5f5',
        borderRadius: 4,
        marginTop: 4,
      }}>
        {tc.status === 'running' && <span>⏳ 正在查询：{tc.tool}</span>}
        {tc.status === 'done' && <span>✅ {tc.summary}</span>}
        {tc.status === 'error' && <span>❌ {tc.summary || tc.tool}</span>}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 2: 更新 AIChatPanel 显示 thinking 状态**

在输入框上方或消息列表底部显示 loading 指示器：

```tsx
{thinkingText && (
  <div style={{
    padding: '8px 16px',
    color: '#1677ff',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }}>
    <LoadingOutlined spin />
    {thinkingText}
  </div>
)}
```

- [ ] **Step 3: 提交**

```bash
git add mes/frontend/src/components/ai/ChatMessage.tsx mes/frontend/src/components/ai/AIChatPanel.tsx
git commit -m "feat: 前端展示 Agent 工具调用进度和思考状态"
```

---

### Task 9: 构建验证

**Files:**
- 无新文件

- [ ] **Step 1: 编译后端**

```bash
cd mes && mvn compile -DskipTests
```

预期：BUILD SUCCESS

- [ ] **Step 2: 编译前端**

```bash
cd mes/frontend && npx tsc --noEmit
```

预期：无类型错误

- [ ] **Step 3: 前端构建**

```bash
cd mes/frontend && npm run build
```

预期：Build success

- [ ] **Step 4: 启动后端验证 Agent 逻辑**

```bash
cd mes && mvn spring-boot:run
```

验证：
- 日志输出中 ToolRegistry 初始化成功
- POST `/admin/ai/chat` 端点可访问
- SSE 连接正常

- [ ] **Step 5: 完整构建**

```bash
cd mes && mvn clean package -DskipTests
```

预期：BUILD SUCCESS

- [ ] **Step 6: 提交构建产物（如 static 目录有变更）**

```bash
git add -A
git commit -m "chore: 构建产物更新（AI Agent 前端）"
```

---

## 验证清单

- [ ] 后端编译无错误
- [ ] 前端类型检查无错误
- [ ] 前端构建成功
- [ ] 完整打包成功
- [ ] 启动后 ToolRegistry 日志正常
- [ ] 发送消息 → 工具调用 → 数据分析流程正常
- [ ] SSE 结构化事件前端正常解析
- [ ] 前端展示工具调用进度
