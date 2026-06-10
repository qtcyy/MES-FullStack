package com.wangziyang.mes.system.agent.service;

import com.wangziyang.mes.basedata.mapper.SpDeviceMapper;
import com.wangziyang.mes.basedata.mapper.SpMaterileMapper;
import com.wangziyang.mes.basedata.mapper.SpProcessUnitMapper;
import com.wangziyang.mes.basedata.mapper.SpWarehouseLocationMapper;
import com.wangziyang.mes.basedata.mapper.SpWarehouseMapper;
import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.entity.SpMaterile;
import com.wangziyang.mes.basedata.entity.SpProcessUnit;
import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.mapper.SpOrderMapper;
import com.wangziyang.mes.system.entity.SysDepartment;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.mapper.SysDepartmentMapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.technology.entity.SpBom;
import com.wangziyang.mes.technology.entity.SpFlow;
import com.wangziyang.mes.technology.entity.SpFlowOperRelation;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.entity.SpProductBomItem;
import com.wangziyang.mes.technology.mapper.SpBomMapper;
import com.wangziyang.mes.technology.mapper.SpFlowMapper;
import com.wangziyang.mes.technology.mapper.SpFlowOperRelationMapper;
import com.wangziyang.mes.technology.mapper.SpProductBomItemMapper;
import com.wangziyang.mes.technology.mapper.SpProductBomMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * MES AI Agent 工具执行器
 * <p>
 * 接收 AI 下发的工具调用（tool name + arguments），
 * 调度到对应的 Mapper 执行数据库查询，返回结构化 JSON 字符串。
 * </p>
 *
 * @author MES Team
 */
@Component
public class ToolExecutor {

    private static final Logger logger = LoggerFactory.getLogger(ToolExecutor.class);

    private static final int DEFAULT_LIMIT = 50;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    // ======================== Mapper 注入 ========================

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

    // ======================== 公开入口 ========================

    /**
     * 执行工具调用。
     *
     * @param toolName  工具名称
     * @param arguments 参数 Map
     * @return JSON 字符串，失败时返回 {"error":"..."}
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

    // ======================== 工具方法实现 ========================

    // ---------- 1. 查询生产工单 ----------

    private String executeGetProductionOrders(Map<String, Object> args) {
        if (spOrderMapper == null) {
            return "{\"error\": \"工单模块未加载\"}";
        }

        String orderType = str(args.get("orderType"));
        String startDate = str(args.get("startDate"));
        String endDate = str(args.get("endDate"));
        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);

        QueryWrapper<SpOrder> qw = new QueryWrapper<>();
        if (orderType != null) {
            qw.eq("order_type", orderType);
        }
        if (startDate != null) {
            qw.ge("plan_start_time", startDate);
        }
        if (endDate != null) {
            qw.le("plan_end_time", endDate);
        }
        qw.last("LIMIT " + limit);

        List<SpOrder> orders = spOrderMapper.selectList(qw);

        List<Map<String, Object>> list = orders.stream().map(this::orderToMap).collect(Collectors.toList());

        // 状态分布统计: 1=创建 2=进行中 3=订单结束 4=订单终结
        Map<String, Long> statueDist = orders.stream()
                .collect(Collectors.groupingBy(
                        o -> {
                            Integer s = o.getStatue();
                            if (s == null) return "未知";
                            switch (s) {
                                case 1: return "创建";
                                case 2: return "进行中";
                                case 3: return "订单结束";
                                case 4: return "订单终结";
                                default: return "未知(" + s + ")";
                            }
                        },
                        Collectors.counting()
                ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", orders.size());
        result.put("limit", limit);
        result.put("orders", list);
        result.put("statueDistribution", statueDist);

        return toJsonString(result);
    }

    private Map<String, Object> orderToMap(SpOrder o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("orderCode", o.getOrderCode());
        m.put("orderDescription", o.getOrderDescription());
        m.put("qty", o.getQty());
        m.put("orderType", o.getOrderType());
        m.put("materiel", o.getMateriel());
        m.put("materielDesc", o.getMaterielDesc());
        m.put("statue", o.getStatue());
        m.put("planStartTime", o.getPlanStartTime());
        m.put("planEndTime", o.getPlanEndTime());
        m.put("createTime", fmtLocalDateTime(o.getCreateTime()));
        return m;
    }

    // ---------- 2. 查询物料信息 ----------

    private String executeGetMaterials(Map<String, Object> args) {
        if (spMaterileMapper == null) {
            return "{\"error\": \"物料模块未加载\"}";
        }

        String keyword = str(args.get("keyword"));
        String matType = str(args.get("matType"));
        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);

        QueryWrapper<SpMaterile> qw = new QueryWrapper<>();
        if (keyword != null) {
            qw.and(w -> w.like("materiel", keyword).or().like("materiel_desc", keyword));
        }
        if (matType != null) {
            qw.eq("mat_type", matType);
        }
        qw.last("LIMIT " + limit);

        List<SpMaterile> list = spMaterileMapper.selectList(qw);

        List<Map<String, Object>> items = list.stream().map(this::materileToMap).collect(Collectors.toList());

        // matType 分布统计
        Map<String, Long> typeDist = list.stream()
                .collect(Collectors.groupingBy(
                        m -> safe(m.getMatType()),
                        Collectors.counting()
                ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("limit", limit);
        result.put("materials", items);
        result.put("matTypeDistribution", typeDist);

        return toJsonString(result);
    }

    private Map<String, Object> materileToMap(SpMaterile m) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", m.getId());
        item.put("materiel", m.getMateriel());
        item.put("materielDesc", m.getMaterielDesc());
        item.put("matType", m.getMatType());
        item.put("model", m.getModel());
        item.put("size", m.getSize());
        item.put("unit", m.getUnit());
        item.put("productGroup", m.getProductGroup());
        item.put("source", m.getSource());
        item.put("safetyStock", m.getSafetyStock());
        return item;
    }

    // ---------- 3. 查询设备信息 ----------

    private String executeGetDevices(Map<String, Object> args) {
        if (spDeviceMapper == null) {
            return "{\"error\": \"设备模块未加载\"}";
        }

        String lineId = str(args.get("lineId"));
        String status = str(args.get("status"));
        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);

        QueryWrapper<SpDevice> qw = new QueryWrapper<>();
        if (lineId != null) {
            qw.eq("line_id", lineId);
        }
        if (status != null) {
            qw.eq("status", status);
        }
        qw.last("LIMIT " + limit);

        List<SpDevice> list = spDeviceMapper.selectList(qw);

        List<Map<String, Object>> items = list.stream().map(this::deviceToMap).collect(Collectors.toList());

        // 状态分布统计
        Map<String, Long> statusDist = list.stream()
                .collect(Collectors.groupingBy(
                        d -> safe(d.getStatus()),
                        Collectors.counting()
                ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("limit", limit);
        result.put("devices", items);
        result.put("statusDistribution", statusDist);

        return toJsonString(result);
    }

    private Map<String, Object> deviceToMap(SpDevice d) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", d.getId());
        item.put("code", d.getCode());
        item.put("name", d.getName());
        item.put("type", d.getType());
        item.put("model", d.getModel());
        item.put("specs", d.getSpecs());
        item.put("lineId", d.getLineId());
        item.put("location", d.getLocation());
        item.put("status", d.getStatus());
        return item;
    }

    // ---------- 4. 查询 BOM 清单 ----------

    private String executeGetBomList(Map<String, Object> args) {
        if (spBomMapper == null) {
            return "{\"error\": \"BOM模块未加载\"}";
        }

        String materielCode = str(args.get("materielCode"));
        String keyword = str(args.get("keyword"));
        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);

        QueryWrapper<SpBom> qw = new QueryWrapper<>();
        if (materielCode != null) {
            qw.eq("materiel_code", materielCode);
        }
        if (keyword != null) {
            qw.like("bom_code", keyword);
        }
        qw.last("LIMIT " + limit);

        List<SpBom> list = spBomMapper.selectList(qw);

        List<Map<String, Object>> items = list.stream().map(this::bomToMap).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("limit", limit);
        result.put("bomList", items);

        return toJsonString(result);
    }

    private Map<String, Object> bomToMap(SpBom b) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", b.getId());
        item.put("bomCode", b.getBomCode());
        item.put("materielCode", b.getMaterielCode());
        item.put("materielDesc", b.getMaterielDesc());
        item.put("versionNumber", b.getVersionNumber());
        item.put("state", b.getState());
        item.put("factory", b.getFactory());
        return item;
    }

    // ---------- 5. 查询产品 BOM 结构 ----------

    private String executeGetProductBomStructure(Map<String, Object> args) {
        if (spProductBomMapper == null || spProductBomItemMapper == null) {
            return "{\"error\": \"产品BOM模块未加载\"}";
        }

        String productId = str(args.get("productId"));
        if (productId == null) {
            return "{\"error\": \"缺少必要参数: productId\"}";
        }

        // 查询产品 BOM 头
        SpProductBom productBom = spProductBomMapper.selectById(productId);
        if (productBom == null) {
            return "{\"error\": \"未找到产品BOM记录: " + productId + "\"}";
        }

        // 查询子件明细
        QueryWrapper<SpProductBomItem> qw = new QueryWrapper<>();
        qw.eq("bom_id", productId);
        qw.orderByAsc("sort_order");
        List<SpProductBomItem> items = spProductBomItemMapper.selectList(qw);

        List<Map<String, Object>> itemList = items.stream().map(this::productBomItemToMap).collect(Collectors.toList());

        Map<String, Object> bomMap = new LinkedHashMap<>();
        bomMap.put("id", productBom.getId());
        bomMap.put("bomCode", productBom.getBomCode());
        bomMap.put("productCode", productBom.getProductCode());
        bomMap.put("nodeName", productBom.getNodeName());
        bomMap.put("level", productBom.getLevel());
        bomMap.put("version", productBom.getVersion());
        bomMap.put("status", productBom.getStatus());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("productBom", bomMap);
        result.put("totalItems", items.size());
        result.put("items", itemList);

        return toJsonString(result);
    }

    private Map<String, Object> productBomItemToMap(SpProductBomItem i) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", i.getId());
        item.put("bomId", i.getBomId());
        item.put("itemType", i.getItemType());
        item.put("materialCode", i.getMaterialCode());
        item.put("materialDesc", i.getMaterialDesc());
        item.put("quantity", i.getQuantity());
        item.put("unit", i.getUnit());
        item.put("sortOrder", i.getSortOrder());
        return item;
    }

    // ---------- 6. 查询仓库库位 ----------

    private String executeGetWarehouseLocations(Map<String, Object> args) {
        if (spWarehouseLocationMapper == null) {
            return "{\"error\": \"仓库库位模块未加载\"}";
        }

        String warehouseId = str(args.get("warehouseId"));
        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);

        QueryWrapper<SpWarehouseLocation> qw = new QueryWrapper<>();
        if (warehouseId != null) {
            qw.eq("warehouse_id", warehouseId);
        }
        qw.last("LIMIT " + limit);

        List<SpWarehouseLocation> list = spWarehouseLocationMapper.selectList(qw);

        // 获取仓库名称映射
        Map<String, String> warehouseNameMap = new HashMap<>();
        if (spWarehouseMapper != null) {
            List<SpWarehouse> warehouses = spWarehouseMapper.selectList(null);
            if (warehouses != null) {
                for (SpWarehouse w : warehouses) {
                    warehouseNameMap.put(w.getId(), w.getName());
                }
            }
        }

        List<Map<String, Object>> items = list.stream().map(loc -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", loc.getId());
            item.put("warehouseId", loc.getWarehouseId());
            item.put("warehouseName", warehouseNameMap.getOrDefault(loc.getWarehouseId(), ""));
            item.put("code", loc.getCode());
            item.put("groupNo", loc.getGroupNo());
            item.put("rowNo", loc.getRowNo());
            item.put("layerNo", loc.getLayerNo());
            item.put("colNo", loc.getColNo());
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("limit", limit);
        result.put("locations", items);

        return toJsonString(result);
    }

    // ---------- 7. 查询工序信息 ----------

    private String executeGetProcessUnits(Map<String, Object> args) {
        if (spProcessUnitMapper == null) {
            return "{\"error\": \"工序模块未加载\"}";
        }

        String keyword = str(args.get("keyword"));
        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);

        QueryWrapper<SpProcessUnit> qw = new QueryWrapper<>();
        if (keyword != null) {
            qw.and(w -> w.like("code", keyword).or().like("name", keyword));
        }
        qw.last("LIMIT " + limit);

        List<SpProcessUnit> list = spProcessUnitMapper.selectList(qw);

        List<Map<String, Object>> items = list.stream().map(this::processUnitToMap).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("limit", limit);
        result.put("processUnits", items);

        return toJsonString(result);
    }

    private Map<String, Object> processUnitToMap(SpProcessUnit pu) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", pu.getId());
        item.put("code", pu.getCode());
        item.put("name", pu.getName());
        item.put("type", pu.getType());
        item.put("hasLineWarehouse", pu.getHasLineWarehouse());
        item.put("descr", pu.getDescr());
        return item;
    }

    // ---------- 8. 查询工艺流程路线 ----------

    private String executeGetFlowRoutes(Map<String, Object> args) {
        if (spFlowMapper == null || spFlowOperRelationMapper == null) {
            return "{\"error\": \"工艺流程模块未加载\"}";
        }

        String keyword = str(args.get("keyword"));
        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);

        QueryWrapper<SpFlow> qw = new QueryWrapper<>();
        if (keyword != null) {
            qw.and(w -> w.like("flow", keyword).or().like("flow_desc", keyword));
        }
        qw.last("LIMIT " + limit);

        List<SpFlow> flows = spFlowMapper.selectList(qw);

        List<Map<String, Object>> flowList = flows.stream().map(f -> {
            // 查询每个 flow 的工序步骤
            QueryWrapper<SpFlowOperRelation> relQw = new QueryWrapper<>();
            relQw.eq("flow_id", f.getId());
            relQw.orderByAsc("sort_num");
            List<SpFlowOperRelation> steps = spFlowOperRelationMapper.selectList(relQw);

            List<Map<String, Object>> stepList = steps.stream().map(s -> {
                Map<String, Object> step = new LinkedHashMap<>();
                step.put("operId", s.getOperId());
                step.put("oper", s.getOper());
                step.put("operType", s.getOperType());
                step.put("sortNum", s.getSortNum());
                step.put("perOper", s.getPerOper());
                step.put("nextOper", s.getNextOper());
                return step;
            }).collect(Collectors.toList());

            Map<String, Object> flowMap = new LinkedHashMap<>();
            flowMap.put("id", f.getId());
            flowMap.put("flow", f.getFlow());
            flowMap.put("flowDesc", f.getFlowDesc());
            flowMap.put("process", f.getProcess());
            flowMap.put("stepCount", steps.size());
            flowMap.put("steps", stepList);
            return flowMap;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", flows.size());
        result.put("limit", limit);
        result.put("flows", flowList);

        return toJsonString(result);
    }

    // ---------- 9. 生产看板总览 ----------

    private String executeGetDashboardSummary(Map<String, Object> args) {
        Map<String, Object> result = new LinkedHashMap<>();

        // 工单统计
        if (spOrderMapper != null) {
            long orderTotal = spOrderMapper.selectCount(null);
            List<SpOrder> allOrders = spOrderMapper.selectList(null);
            Map<String, Long> statueDist = allOrders.stream()
                    .collect(Collectors.groupingBy(
                            o -> {
                                Integer s = o.getStatue();
                                if (s == null) return "未知";
                                switch (s) {
                                    case 1: return "创建";
                                    case 2: return "进行中";
                                    case 3: return "订单结束";
                                    case 4: return "订单终结";
                                    default: return "未知(" + s + ")";
                                }
                            },
                            Collectors.counting()
                    ));
            result.put("orderCount", orderTotal);
            result.put("orderStatueDistribution", statueDist);
        } else {
            result.put("orderCount", 0);
        }

        // 设备统计
        if (spDeviceMapper != null) {
            long deviceTotal = spDeviceMapper.selectCount(null);
            List<SpDevice> allDevices = spDeviceMapper.selectList(null);
            Map<String, Long> statusDist = allDevices.stream()
                    .collect(Collectors.groupingBy(
                            d -> safe(d.getStatus()),
                            Collectors.counting()
                    ));
            result.put("deviceCount", deviceTotal);
            result.put("deviceStatusDistribution", statusDist);
        } else {
            result.put("deviceCount", 0);
        }

        // 物料统计
        if (spMaterileMapper != null) {
            long matCount = spMaterileMapper.selectCount(null);
            result.put("materialCount", matCount);
        } else {
            result.put("materialCount", 0);
        }

        // 工艺路线统计
        if (spFlowMapper != null) {
            long flowCount = spFlowMapper.selectCount(null);
            result.put("flowCount", flowCount);
        } else {
            result.put("flowCount", 0);
        }

        // 用户统计
        if (sysUserMapper != null) {
            long userCount = sysUserMapper.selectCount(null);
            result.put("userCount", userCount);
        } else {
            result.put("userCount", 0);
        }

        return toJsonString(result);
    }

    // ---------- 10. 查询用户信息 ----------

    private String executeGetUsers(Map<String, Object> args) {
        if (sysUserMapper == null) {
            return "{\"error\": \"用户模块未加载\"}";
        }

        String keyword = str(args.get("keyword"));
        String deptId = str(args.get("deptId"));
        int limit = intOpt(args.get("limit"), DEFAULT_LIMIT);

        QueryWrapper<SysUser> qw = new QueryWrapper<>();
        if (keyword != null) {
            qw.and(w -> w.like("username", keyword).or().like("name", keyword));
        }
        if (deptId != null) {
            qw.eq("dept_id", deptId);
        }
        qw.last("LIMIT " + limit);

        List<SysUser> list = sysUserMapper.selectList(qw);

        // 部门名称映射
        Map<String, String> deptNameMap = new HashMap<>();
        if (sysDepartmentMapper != null) {
            List<SysDepartment> depts = sysDepartmentMapper.selectList(null);
            if (depts != null) {
                for (SysDepartment d : depts) {
                    deptNameMap.put(d.getId(), d.getName());
                }
            }
        }

        List<Map<String, Object>> items = list.stream().map(u -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", u.getId());
            item.put("username", u.getUsername());
            item.put("name", u.getName());
            item.put("deptId", u.getDeptId());
            item.put("deptName", deptNameMap.getOrDefault(u.getDeptId(), ""));
            item.put("email", u.getEmail());
            item.put("mobile", u.getMobile());
            item.put("sex", u.getSex());
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", list.size());
        result.put("limit", limit);
        result.put("users", items);

        return toJsonString(result);
    }

    // ======================== 辅助方法 ========================

    /**
     * 将 Object 转为非空 String，null/空串返回 null。
     */
    private static String str(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    /**
     * 将 Object 转为 int，失败时返回默认值。
     */
    private static int intOpt(Object v, int defaultValue) {
        if (v == null) return defaultValue;
        try {
            return Integer.parseInt(v.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * 安全的字符串，null 转空串。
     */
    private static String safe(String s) {
        return s != null ? s : "";
    }

    /**
     * 格式化 LocalDateTime 为 "yyyy-MM-dd HH:mm:ss"。
     */
    private static String fmtLocalDateTime(LocalDateTime dt) {
        if (dt == null) return "";
        return dt.format(DT_FMT);
    }

    /**
     * 将 Map 转为 JSON 字符串。
     */
    private String toJsonString(Map<String, Object> map) {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                if (!first) {
                    sb.append(',');
                }
                first = false;
                sb.append('"').append(entry.getKey()).append('"');
                sb.append(':');
                appendValue(sb, entry.getValue());
            }
            sb.append('}');
            return sb.toString();
        } catch (Exception e) {
            logger.error("Failed to serialize to JSON", e);
            return "{\"error\": \"JSON序列化失败: " + e.getMessage().replace("\"", "\\\"") + "\"}";
        }
    }

    /**
     * 递归追加 JSON 值到 StringBuilder。
     */
    @SuppressWarnings("unchecked")
    private void appendValue(StringBuilder sb, Object value) {
        if (value == null) {
            sb.append("null");
        } else if (value instanceof String) {
            String s = (String) value;
            sb.append('"');
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                switch (c) {
                    case '"':  sb.append("\\\""); break;
                    case '\\': sb.append("\\\\"); break;
                    case '\n': sb.append("\\n"); break;
                    case '\r': sb.append("\\r"); break;
                    case '\t': sb.append("\\t"); break;
                    default:   sb.append(c);
                }
            }
            sb.append('"');
        } else if (value instanceof Number || value instanceof Boolean) {
            sb.append(value);
        } else if (value instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) value;
            sb.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                sb.append('"').append(entry.getKey()).append('"');
                sb.append(':');
                appendValue(sb, entry.getValue());
            }
            sb.append('}');
        } else if (value instanceof Collection) {
            Collection<?> coll = (Collection<?>) value;
            sb.append('[');
            boolean first = true;
            for (Object item : coll) {
                if (!first) sb.append(',');
                first = false;
                appendValue(sb, item);
            }
            sb.append(']');
        } else if (value instanceof Long) {
            sb.append(value);
        } else {
            sb.append('"').append(value.toString().replace("\"", "\\\"")).append('"');
        }
    }
}
