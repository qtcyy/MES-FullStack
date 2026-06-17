package com.wangziyang.mes.digitization.service.impl;

import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.mapper.SpDeviceMapper;
import com.wangziyang.mes.basedata.mapper.SpMaterileMapper;
import com.wangziyang.mes.digitization.dto.DashboardKpiVO;
import com.wangziyang.mes.digitization.dto.DashboardOverviewVO;
import com.wangziyang.mes.digitization.dto.MonthlyTrendVO;
import com.wangziyang.mes.digitization.dto.NameValueVO;
import com.wangziyang.mes.digitization.mapper.DashboardMapper;
import com.wangziyang.mes.digitization.service.IDashboardService;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.mapper.SpOrderMapper;
import com.wangziyang.mes.technology.mapper.SpFlowMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 数字化大屏聚合(只读)。
 *
 * 注:订单/设备状态、工单类型分布采用 selectList(null) 全表加载后内存分组,
 * 依赖本系统数据量较小的假设;若订单/设备量显著增长,应改为 SQL GROUP BY 聚合。
 */
@Service
public class DashboardServiceImpl implements IDashboardService {

    private static final DateTimeFormatter YM = DateTimeFormatter.ofPattern("yyyy-MM");

    private static final String[] ORDER_STATUS_LABELS = {"已下发", "已派工", "进行中", "订单结束", "订单终结"};
    private static final String[] DEVICE_STATUS_LABELS = {"空闲", "运行中", "维修中", "报废"};
    private static final String[] ORDER_TYPE_LABELS = {"批量", "验证", "返工"};

    @Autowired
    private SpOrderMapper spOrderMapper;
    @Autowired
    private SpDeviceMapper spDeviceMapper;
    @Autowired
    private SpMaterileMapper spMaterileMapper;
    @Autowired
    private SpFlowMapper spFlowMapper;
    @Autowired
    private DashboardMapper dashboardMapper;

    @Override
    public DashboardOverviewVO overview() {
        DashboardOverviewVO vo = new DashboardOverviewVO();

        DashboardKpiVO kpi = new DashboardKpiVO();
        long orderCount = spOrderMapper.selectCount(null);
        long deviceCount = spDeviceMapper.selectCount(null);
        long materielCount = spMaterileMapper.selectCount(null);
        long flowCount = spFlowMapper.selectCount(null);
        kpi.setOrderCount(orderCount);
        kpi.setDeviceCount(deviceCount);
        kpi.setMaterielCount(materielCount);
        kpi.setFlowCount(flowCount);
        vo.setKpi(kpi);

        List<SpOrder> orders = spOrderMapper.selectList(null);
        vo.setOrderStatus(orderStatusDist(orders));
        vo.setOrderType(orderTypeDist(orders));
        vo.setDeviceStatus(deviceStatusDist(spDeviceMapper.selectList(null)));
        vo.setMonthlyTrend(fillTrailing12Months(dashboardMapper.selectMonthlyTrend(), YearMonth.now()));
        return vo;
    }

    // ===================== 纯逻辑(包级静态,供单测直接调用) =====================

    static String orderStatueLabel(Integer s) {
        if (s == null) {
            return "未知";
        }
        switch (s) {
            case 0: return "已下发";
            case 1: return "已派工";
            case 2: return "进行中";
            case 3: return "订单结束";
            case 4: return "订单终结";
            default: return "未知";
        }
    }

    static String deviceStatusLabel(String s) {
        if (s == null) {
            return "未知";
        }
        switch (s) {
            case "0": return "空闲";
            case "1": return "运行中";
            case "2": return "维修中";
            case "3": return "报废";
            default: return "未知";
        }
    }

    static String orderTypeLabel(String t) {
        if (t == null) {
            return "未知";
        }
        switch (t) {
            case "P": return "批量";
            case "A": return "验证";
            case "F": return "返工";
            default: return "未知";
        }
    }

    static List<NameValueVO> orderStatusDist(List<SpOrder> orders) {
        Map<String, Long> counts = new HashMap<>();
        if (orders != null) {
            for (SpOrder o : orders) {
                String label = orderStatueLabel(o.getStatue());
                counts.merge(label, 1L, Long::sum);
            }
        }
        return orderedNameValues(ORDER_STATUS_LABELS, counts);
    }

    static List<NameValueVO> deviceStatusDist(List<SpDevice> devices) {
        Map<String, Long> counts = new HashMap<>();
        if (devices != null) {
            for (SpDevice d : devices) {
                String label = deviceStatusLabel(d.getStatus());
                counts.merge(label, 1L, Long::sum);
            }
        }
        return orderedNameValues(DEVICE_STATUS_LABELS, counts);
    }

    static List<NameValueVO> orderTypeDist(List<SpOrder> orders) {
        Map<String, Long> counts = new HashMap<>();
        if (orders != null) {
            for (SpOrder o : orders) {
                String t = o.getOrderType();
                if (t == null || t.trim().isEmpty()) {
                    continue;
                }
                counts.merge(orderTypeLabel(t), 1L, Long::sum);
            }
        }
        return orderedNameValues(ORDER_TYPE_LABELS, counts);
    }

    /** 规范标签优先按给定顺序输出(仅 value>0),其余非规范标签(如"未知")附在后面 */
    static List<NameValueVO> orderedNameValues(String[] labels, Map<String, Long> counts) {
        List<NameValueVO> list = new ArrayList<>();
        Map<String, Long> remaining = new LinkedHashMap<>(counts);
        for (String label : labels) {
            Long v = remaining.remove(label);
            if (v != null && v > 0) {
                list.add(new NameValueVO(label, v));
            }
        }
        for (Map.Entry<String, Long> e : remaining.entrySet()) {
            if (e.getValue() != null && e.getValue() > 0) {
                list.add(new NameValueVO(e.getKey(), e.getValue()));
            }
        }
        return list;
    }

    /** 补齐"截至 current 的连续 12 个自然月"(含 current),缺月补 0,按月升序 */
    static List<MonthlyTrendVO> fillTrailing12Months(List<MonthlyTrendVO> rows, YearMonth current) {
        Map<String, MonthlyTrendVO> byMonth = new HashMap<>();
        if (rows != null) {
            for (MonthlyTrendVO r : rows) {
                if (r != null && r.getMonth() != null) {
                    byMonth.put(r.getMonth(), r);
                }
            }
        }
        List<MonthlyTrendVO> result = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            String key = current.minusMonths(i).format(YM);
            MonthlyTrendVO hit = byMonth.get(key);
            if (hit != null) {
                result.add(hit);
            } else {
                MonthlyTrendVO zero = new MonthlyTrendVO();
                zero.setMonth(key);
                zero.setOrderCount(0);
                zero.setTotalQty(0);
                zero.setCompletedCount(0);
                result.add(zero);
            }
        }
        return result;
    }
}
