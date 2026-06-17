package com.wangziyang.mes.digitization.service.impl;

import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.mapper.SpDeviceMapper;
import com.wangziyang.mes.basedata.mapper.SpMaterileMapper;
import com.wangziyang.mes.digitization.dto.DashboardOverviewVO;
import com.wangziyang.mes.digitization.dto.MonthlyTrendVO;
import com.wangziyang.mes.digitization.dto.NameValueVO;
import com.wangziyang.mes.digitization.mapper.DashboardMapper;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.mapper.SpOrderMapper;
import com.wangziyang.mes.technology.mapper.SpFlowMapper;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.Silent.class)
public class DashboardServiceImplTest {

    @Mock
    private SpOrderMapper spOrderMapper;
    @Mock
    private SpDeviceMapper spDeviceMapper;
    @Mock
    private SpMaterileMapper spMaterileMapper;
    @Mock
    private SpFlowMapper spFlowMapper;
    @Mock
    private DashboardMapper dashboardMapper;

    @InjectMocks
    private DashboardServiceImpl service;

    private SpOrder order(Integer statue, String type) {
        SpOrder o = new SpOrder();
        o.setStatue(statue);
        o.setOrderType(type);
        return o;
    }

    private SpDevice device(String status) {
        SpDevice d = new SpDevice();
        d.setStatus(status);
        return d;
    }

    private NameValueVO find(List<NameValueVO> list, String name) {
        for (NameValueVO nv : list) {
            if (name.equals(nv.getName())) return nv;
        }
        return null;
    }

    // ---------- 订单状态分组 + 0/1/2/3/4 → 中文映射 ----------
    @Test
    public void orderStatusDist_groups_and_maps() {
        List<SpOrder> orders = Arrays.asList(
                order(0, "P"), order(1, "P"), order(1, "A"), order(2, "A"), order(3, "F"), order(4, "P"));
        List<NameValueVO> dist = DashboardServiceImpl.orderStatusDist(orders);
        assertEquals(1L, find(dist, "已下发").getValue());
        assertEquals(2L, find(dist, "已派工").getValue());
        assertEquals(1L, find(dist, "进行中").getValue());
        assertEquals(1L, find(dist, "订单结束").getValue());
        assertEquals(1L, find(dist, "订单终结").getValue());
        assertEquals("已下发", dist.get(0).getName());
    }

    @Test
    public void orderStatusDist_unknown_statue_to_unknown() {
        List<NameValueVO> dist = DashboardServiceImpl.orderStatusDist(
                Arrays.asList(order(9, "P"), order(null, "P")));
        assertEquals(2L, find(dist, "未知").getValue());
    }

    // ---------- 设备状态分组 + 0/1/2/3 → 中文映射 ----------
    @Test
    public void deviceStatusDist_groups_and_maps() {
        List<SpDevice> devices = Arrays.asList(
                device("0"), device("1"), device("1"), device("2"), device("3"));
        List<NameValueVO> dist = DashboardServiceImpl.deviceStatusDist(devices);
        assertEquals(1L, find(dist, "空闲").getValue());
        assertEquals(2L, find(dist, "运行中").getValue());
        assertEquals(1L, find(dist, "维修中").getValue());
        assertEquals(1L, find(dist, "报废").getValue());
    }

    // ---------- 工单类型分组 + P/A/F → 中文映射(剔除空) ----------
    @Test
    public void orderTypeDist_groups_filters_blank() {
        List<SpOrder> orders = Arrays.asList(
                order(1, "P"), order(1, "P"), order(2, "A"), order(3, "F"),
                order(1, null), order(1, "  "));
        List<NameValueVO> dist = DashboardServiceImpl.orderTypeDist(orders);
        assertEquals(2L, find(dist, "批量").getValue());
        assertEquals(1L, find(dist, "验证").getValue());
        assertEquals(1L, find(dist, "返工").getValue());
        assertEquals(3, dist.size()); // null/空白 不计入
    }

    // ---------- 12 月补齐 ----------
    @Test
    public void fillTrailing12Months_fills_missing_with_zero_ascending() {
        MonthlyTrendVO june = new MonthlyTrendVO();
        june.setMonth("2026-06");
        june.setOrderCount(5);
        june.setTotalQty(120);
        june.setCompletedCount(3);
        List<MonthlyTrendVO> filled = DashboardServiceImpl.fillTrailing12Months(
                new ArrayList<>(Arrays.asList(june)), YearMonth.of(2026, 6));
        assertEquals(12, filled.size());
        assertEquals("2025-07", filled.get(0).getMonth()); // 升序起点
        assertEquals("2026-06", filled.get(11).getMonth()); // 终点=当前月
        assertEquals(0L, filled.get(0).getOrderCount());    // 缺月补 0
        assertEquals(5L, filled.get(11).getOrderCount());   // 命中月保留
        assertEquals(3L, filled.get(11).getCompletedCount());
    }

    @Test
    public void fillTrailing12Months_null_rows_all_zero() {
        List<MonthlyTrendVO> filled = DashboardServiceImpl.fillTrailing12Months(null, YearMonth.of(2026, 1));
        assertEquals(12, filled.size());
        assertEquals("2025-02", filled.get(0).getMonth());
        assertEquals("2026-01", filled.get(11).getMonth());
        assertEquals(0L, filled.get(11).getOrderCount());
    }

    // ---------- overview 装配(KPI + 12 月) ----------
    @Test
    public void overview_assembles_kpi_and_12_months() {
        when(spOrderMapper.selectCount(null)).thenReturn(128);
        when(spDeviceMapper.selectCount(null)).thenReturn(36);
        when(spMaterileMapper.selectCount(null)).thenReturn(256);
        when(spFlowMapper.selectCount(null)).thenReturn(18);
        when(spOrderMapper.selectList(null)).thenReturn(Arrays.asList(order(2, "P")));
        when(spDeviceMapper.selectList(null)).thenReturn(Arrays.asList(device("1")));
        when(dashboardMapper.selectMonthlyTrend()).thenReturn(new ArrayList<MonthlyTrendVO>());

        DashboardOverviewVO vo = service.overview();
        assertNotNull(vo.getKpi());
        assertEquals(128L, vo.getKpi().getOrderCount());
        assertEquals(36L, vo.getKpi().getDeviceCount());
        assertEquals(256L, vo.getKpi().getMaterielCount());
        assertEquals(18L, vo.getKpi().getFlowCount());
        assertEquals(12, vo.getMonthlyTrend().size());
        assertEquals(1L, find(vo.getOrderStatus(), "进行中").getValue());
        assertEquals(1L, find(vo.getDeviceStatus(), "运行中").getValue());
        assertEquals(1L, find(vo.getOrderType(), "批量").getValue());
    }
}
