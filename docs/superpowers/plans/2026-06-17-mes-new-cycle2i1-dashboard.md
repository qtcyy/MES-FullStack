# 智慧大屏(周期 2i-1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 新建一个全屏深色数字化大屏页面 `/digitization/plan`,展示生产经营核心指标(真实聚合 + 演示数据混合),并新增最小、纯新增、只读的后端聚合端点 `GET /digitization/dashboard/overview`。

**Architecture:** 后端在 `digitization` 模块纯新增 `DashboardController`(REST) + `DashboardServiceImpl`(聚合,复用各模块 mapper) + `DashboardMapper`(月度趋势 SQL) + DTO,零生产代码改动;前端新增 `echarts` 依赖、`EChart` 容器、纯函数 option 构造器(vitest)、深空蓝主题大屏页面,路由挂在 `PrivateRoute` 下、`AdminLayout` 平级以实现全屏无侧边栏。

**Tech Stack:** 后端 Java 8 / Spring Boot 2.1.7 / MyBatis-Plus 3.1.2 / JUnit4 + Mockito 2.23.4;前端 React 19 / TS / Vite / @ngify/http + 自研 useQuery$ / ECharts 6 / vitest(node)。

设计依据:`docs/superpowers/specs/2026-06-17-mes-new-cycle2i1-dashboard-design.md`

> **审查落地修正记录(2026-06-17,实现+多 agent 审查后回填):**
> 1. **订单状态码映射改用实体权威语义**:本计划 Task 3/4 的代码块原写 `1→创建`(沿用 ToolExecutor),代码审查发现该口径有误且漏 statue=0。实现已更正为 `SpOrder.statue` 权威语义 **0→已下发 / 1→已派工 / 2→进行中 / 3→订单结束 / 4→订单终结**,`ORDER_STATUS_LABELS` 与对应单测同步(commit 7305da0)。**以实现为准**。
> 2. **echarts 实际为 ^6.1.0**(非 Task 6 写的 ^5.x);v6 仍导出 `EChartsCoreOption`/`ECharts` 类型,EChart.tsx 原样通过,按需 import 路径不变。
> 3. **后端单测实际 7 例**(非 Task 4/5 写的 8;计划笔误,场景无遗漏),全绿。
> 4. **UI 性能收口**(commit 06e56b5):时钟抽为独立 `Clock` 组件(消除每秒整屏重渲染)、大屏路由 `React.lazy`+`Suspense`(echarts 拆独立 chunk)、空数组兜底提为模块常量、<1280px 两列媒体查询。
> 5. **真实面板空态**(commit 64474d1):数据为空时显示"暂无数据"占位(落实设计 §6)。

---

## 文件结构

**后端(全部纯新增,`mes/src/main/java/com/wangziyang/mes/digitization/`)**
```
dto/NameValueVO.java              # {name:String, value:long}
dto/MonthlyTrendVO.java           # {month, orderCount, totalQty, completedCount}
dto/DashboardKpiVO.java           # {orderCount, deviceCount, materielCount, flowCount}
dto/DashboardOverviewVO.java      # {kpi, orderStatus[], deviceStatus[], orderType[], monthlyTrend[]}
mapper/DashboardMapper.java       # selectMonthlyTrend() (不继承 BaseMapper)
service/IDashboardService.java    # overview()
service/impl/DashboardServiceImpl.java  # 聚合 + 静态纯helper(分组/映射/12月补齐)
controller/DashboardController.java     # GET /digitization/dashboard/overview
```
```
mes/src/main/resources/mapper/digitization/DashboardMapper.xml   # 月度趋势聚合 SQL
mes/src/test/java/com/wangziyang/mes/digitization/service/impl/DashboardServiceImplTest.java  # Mockito
```

**前端(全部纯新增,`mes/frontend/apps/mes-new/src/`)**
```
types/digitization.ts             # DashboardOverview + 子类型 + NameValue + MonthlyTrendPoint
api/digitization/dashboard.ts     # fetchOverview()
pages/digitization/dashboardOptions.ts          # 纯函数:transforms + ECharts option 构造器
pages/digitization/__tests__/dashboardOptions.test.ts  # vitest
components/EChart.tsx              # 通用 ECharts 容器(init/dispose/ResizeObserver)
pages/digitization/dashboard.css  # 深空蓝主题(scoped .mes-dashboard)
pages/digitization/dashboardMock.ts             # 演示面板数据
pages/digitization/useCountUp.ts  # KPI 滚动数字 hook
pages/digitization/panels/PanelFrame.tsx
pages/digitization/panels/KpiStrip.tsx
pages/digitization/panels/OrderStatusPanel.tsx   # 真实
pages/digitization/panels/DeviceStatusPanel.tsx  # 真实
pages/digitization/panels/OrderTrendPanel.tsx    # 真实(主视觉)
pages/digitization/panels/OrderTypePanel.tsx     # 真实
pages/digitization/panels/OeeGaugePanel.tsx      # 演示
pages/digitization/panels/QualityTrendPanel.tsx  # 演示
pages/digitization/panels/WorkshopOutputPanel.tsx# 演示
pages/digitization/PlanDashboard.tsx             # 编排 + useQuery$ + 30s 轮询 + 时钟 + 返回
```
修改:`src/router.tsx`(新增 1 路由 + 1 import);`package.json`(echarts 依赖,由 pnpm add 自动写入)。

---

## Phase A — 后端只读聚合端点

### Task 1: 后端 DTO(4 个 POJO)

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/digitization/dto/NameValueVO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/digitization/dto/MonthlyTrendVO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/digitization/dto/DashboardKpiVO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/digitization/dto/DashboardOverviewVO.java`

- [ ] **Step 1: 写 `NameValueVO.java`**(项目风格:显式 getter/setter,无 Lombok)

```java
package com.wangziyang.mes.digitization.dto;

/** 通用 名称-数值 项(饼/柱图 series 用) */
public class NameValueVO {

    private String name;
    private long value;

    public NameValueVO() {
    }

    public NameValueVO(String name, long value) {
        this.name = name;
        this.value = value;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getValue() {
        return value;
    }

    public void setValue(long value) {
        this.value = value;
    }
}
```

- [ ] **Step 2: 写 `MonthlyTrendVO.java`**

```java
package com.wangziyang.mes.digitization.dto;

/** 月度订单趋势项;month 格式 yyyy-MM */
public class MonthlyTrendVO {

    private String month;
    private long orderCount;
    private long totalQty;
    private long completedCount;

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public long getOrderCount() {
        return orderCount;
    }

    public void setOrderCount(long orderCount) {
        this.orderCount = orderCount;
    }

    public long getTotalQty() {
        return totalQty;
    }

    public void setTotalQty(long totalQty) {
        this.totalQty = totalQty;
    }

    public long getCompletedCount() {
        return completedCount;
    }

    public void setCompletedCount(long completedCount) {
        this.completedCount = completedCount;
    }
}
```

- [ ] **Step 3: 写 `DashboardKpiVO.java`**

```java
package com.wangziyang.mes.digitization.dto;

/** 顶部 KPI 计数 */
public class DashboardKpiVO {

    private long orderCount;
    private long deviceCount;
    private long materielCount;
    private long flowCount;

    public long getOrderCount() {
        return orderCount;
    }

    public void setOrderCount(long orderCount) {
        this.orderCount = orderCount;
    }

    public long getDeviceCount() {
        return deviceCount;
    }

    public void setDeviceCount(long deviceCount) {
        this.deviceCount = deviceCount;
    }

    public long getMaterielCount() {
        return materielCount;
    }

    public void setMaterielCount(long materielCount) {
        this.materielCount = materielCount;
    }

    public long getFlowCount() {
        return flowCount;
    }

    public void setFlowCount(long flowCount) {
        this.flowCount = flowCount;
    }
}
```

- [ ] **Step 4: 写 `DashboardOverviewVO.java`**

```java
package com.wangziyang.mes.digitization.dto;

import java.util.List;

/** 大屏总览聚合返回 */
public class DashboardOverviewVO {

    private DashboardKpiVO kpi;
    private List<NameValueVO> orderStatus;
    private List<NameValueVO> deviceStatus;
    private List<NameValueVO> orderType;
    private List<MonthlyTrendVO> monthlyTrend;

    public DashboardKpiVO getKpi() {
        return kpi;
    }

    public void setKpi(DashboardKpiVO kpi) {
        this.kpi = kpi;
    }

    public List<NameValueVO> getOrderStatus() {
        return orderStatus;
    }

    public void setOrderStatus(List<NameValueVO> orderStatus) {
        this.orderStatus = orderStatus;
    }

    public List<NameValueVO> getDeviceStatus() {
        return deviceStatus;
    }

    public void setDeviceStatus(List<NameValueVO> deviceStatus) {
        this.deviceStatus = deviceStatus;
    }

    public List<NameValueVO> getOrderType() {
        return orderType;
    }

    public void setOrderType(List<NameValueVO> orderType) {
        this.orderType = orderType;
    }

    public List<MonthlyTrendVO> getMonthlyTrend() {
        return monthlyTrend;
    }

    public void setMonthlyTrend(List<MonthlyTrendVO> monthlyTrend) {
        this.monthlyTrend = monthlyTrend;
    }
}
```

(无独立提交;与 Task 2-5 一起在 Task 5 末提交。)

---

### Task 2: 月度趋势 Mapper + XML

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/digitization/mapper/DashboardMapper.java`
- Create: `mes/src/main/resources/mapper/digitization/DashboardMapper.xml`

- [ ] **Step 1: 写 `DashboardMapper.java`**(不继承 `BaseMapper`,只有自定义查询;包名含 `mapper` → 被 `@MapperScan("com.wangziyang.mes.**.mapper*")` 自动扫描)

```java
package com.wangziyang.mes.digitization.mapper;

import com.wangziyang.mes.digitization.dto.MonthlyTrendVO;

import java.util.List;

/**
 * 数字化大屏聚合查询 Mapper(只读)
 */
public interface DashboardMapper {

    /** 按 create_time 月份聚合订单数/数量/完成数(仅含有订单的月份,缺月由 service 补齐) */
    List<MonthlyTrendVO> selectMonthlyTrend();
}
```

- [ ] **Step 2: 写 `DashboardMapper.xml`**(放 `resources/mapper/digitization/`,与既有 `mapper/order/*.xml` 同级,被 mybatis `mapper-locations` 覆盖;`resultType` 列别名用驼峰直接映射 VO 字段)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.wangziyang.mes.digitization.mapper.DashboardMapper">

    <select id="selectMonthlyTrend" resultType="com.wangziyang.mes.digitization.dto.MonthlyTrendVO">
        SELECT DATE_FORMAT(create_time, '%Y-%m')                AS month,
               COUNT(*)                                          AS orderCount,
               COALESCE(SUM(qty), 0)                             AS totalQty,
               SUM(CASE WHEN statue IN (3, 4) THEN 1 ELSE 0 END) AS completedCount
        FROM sp_order
        WHERE create_time IS NOT NULL
        GROUP BY DATE_FORMAT(create_time, '%Y-%m')
    </select>
</mapper>
```

- [ ] **Step 3: 确认 mybatis mapper-locations 覆盖新目录**

Run: `grep -rn "mapper-locations" mes/src/main/resources/application*.yml`
Expected: 形如 `mapper-locations: classpath*:/mapper/**/*.xml`(含 `**`,自动覆盖 `mapper/digitization/`)。若输出为空或不含 `**`,在计划执行时报告并调整(预期已覆盖,因 `mapper/order/*.xml` 已工作)。

---

### Task 3: 服务接口 + Mockito 测试(test-first)

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/digitization/service/IDashboardService.java`
- Test: `mes/src/test/java/com/wangziyang/mes/digitization/service/impl/DashboardServiceImplTest.java`

- [ ] **Step 1: 写服务接口 `IDashboardService.java`**

```java
package com.wangziyang.mes.digitization.service;

import com.wangziyang.mes.digitization.dto.DashboardOverviewVO;

public interface IDashboardService {

    /** 大屏总览聚合(只读) */
    DashboardOverviewVO overview();
}
```

- [ ] **Step 2: 写 Mockito 测试(test-first;引用尚未创建的 `DashboardServiceImpl` 及其静态 helper)**

测试放在与实现**同包** `...digitization.service.impl`,以便调用包级静态 helper。沿用项目范式:JUnit4 + `@RunWith(MockitoJUnitRunner.Silent.class)` + `@Mock`/`@InjectMocks` + `org.junit.Assert`。

```java
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

    // ---------- 订单状态分组 + 1/2/3/4 → 中文映射 ----------
    @Test
    public void orderStatusDist_groups_and_maps() {
        List<SpOrder> orders = Arrays.asList(
                order(1, "P"), order(1, "P"), order(2, "A"), order(3, "F"), order(4, "P"));
        List<NameValueVO> dist = DashboardServiceImpl.orderStatusDist(orders);
        assertEquals(2L, find(dist, "创建").getValue());
        assertEquals(1L, find(dist, "进行中").getValue());
        assertEquals(1L, find(dist, "订单结束").getValue());
        assertEquals(1L, find(dist, "订单终结").getValue());
        // 规范顺序:创建 在 进行中 之前
        assertEquals("创建", dist.get(0).getName());
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
```

- [ ] **Step 3: 运行测试,确认"红"(编译失败:`DashboardServiceImpl` 不存在)**

Run: `cd mes && mvn test -Dtest=DashboardServiceImplTest`
Expected: BUILD FAILURE,编译错误 `cannot find symbol ... DashboardServiceImpl`(预期失败——实现尚未写)。

---

### Task 4: 实现 `DashboardServiceImpl`,测试转绿

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/digitization/service/impl/DashboardServiceImpl.java`

- [ ] **Step 1: 写 `DashboardServiceImpl.java`**(普通 `@Service implements`,不继承 `ServiceImpl`;纯逻辑为包级静态 helper 便于单测;只读不加事务)

```java
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

@Service
public class DashboardServiceImpl implements IDashboardService {

    private static final DateTimeFormatter YM = DateTimeFormatter.ofPattern("yyyy-MM");

    private static final String[] ORDER_STATUS_LABELS = {"创建", "进行中", "订单结束", "订单终结"};
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
            case 1: return "创建";
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
```

- [ ] **Step 2: 运行测试,确认"绿"**

Run: `cd mes && mvn test -Dtest=DashboardServiceImplTest`
Expected: `Tests run: 8, Failures: 0, Errors: 0, Skipped: 0` + `BUILD SUCCESS`。
(注:用系统 `mvn` + JDK 11+;`./mvnw` 已坏。)

---

### Task 5: REST 控制器 + 后端提交

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/digitization/controller/DashboardController.java`

- [ ] **Step 1: 写 `DashboardController.java`**(`@Controller` + 方法级 `@ResponseBody` + `@GetMapping`,返回原始 `Result`)

```java
package com.wangziyang.mes.digitization.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.digitization.service.IDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 数字化大屏聚合(只读)
 */
@Controller
@RequestMapping("/digitization/dashboard")
public class DashboardController extends BaseController {

    @Autowired
    private IDashboardService dashboardService;

    /** 大屏总览:KPI + 订单/设备状态分布 + 工单类型 + 近12月趋势 */
    @GetMapping("/overview")
    @ResponseBody
    public Result overview() {
        return Result.success(dashboardService.overview());
    }
}
```

- [ ] **Step 2: 编译全模块,确认通过**

Run: `cd mes && mvn test-compile -q`
Expected: `BUILD SUCCESS`(无编译错误)。

- [ ] **Step 3: 再跑一次单测确保整体绿**

Run: `cd mes && mvn test -Dtest=DashboardServiceImplTest`
Expected: `Tests run: 8, Failures: 0, Errors: 0` + `BUILD SUCCESS`。

- [ ] **Step 4: 提交后端**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/digitization mes/src/main/resources/mapper/digitization mes/src/test/java/com/wangziyang/mes/digitization
git commit -m "✨ feat(mes): 数字化大屏只读聚合端点 /digitization/dashboard/overview

纯新增 DashboardController+Service+Mapper+DTO:KPI计数/订单状态/设备状态/工单类型分布+近12月订单趋势聚合,复用各模块 mapper,零生产代码改动。Mockito 单测 8 例(分组/中文映射/12月补齐/装配)全绿。"
```

---

## Phase B — 前端全屏大屏

### Task 6: 新增 echarts 依赖

**Files:**
- Modify: `mes/frontend/apps/mes-new/package.json`(由 pnpm 自动写入)

- [ ] **Step 1: 安装 echarts**

Run: `cd mes/frontend && pnpm --filter mes-new add echarts`
Expected: 安装成功,`apps/mes-new/package.json` 的 `dependencies` 新增形如 `"echarts": "^5.x.x"`。

- [ ] **Step 2: 确认写入**

Run: `grep '"echarts"' mes/frontend/apps/mes-new/package.json`
Expected: 输出 `"echarts": "^5...."` 一行。
(echarts 自带类型声明,无需 `@types/echarts`。)

---

### Task 7: 前端类型 `types/digitization.ts`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/types/digitization.ts`

- [ ] **Step 1: 写类型**(与后端 VO 对齐;`verbatimModuleSyntax` 开启,纯类型文件用 `interface`)

```ts
/** 名称-数值项(饼/柱图) */
export interface NameValue {
  name: string
  value: number
}

/** 月度趋势点;month 为 yyyy-MM */
export interface MonthlyTrendPoint {
  month: string
  orderCount: number
  totalQty: number
  completedCount: number
}

/** 顶部 KPI 计数 */
export interface DashboardKpi {
  orderCount: number
  deviceCount: number
  materielCount: number
  flowCount: number
}

/** 大屏总览聚合(对应后端 DashboardOverviewVO) */
export interface DashboardOverview {
  kpi: DashboardKpi
  orderStatus: NameValue[]
  deviceStatus: NameValue[]
  orderType: NameValue[]
  monthlyTrend: MonthlyTrendPoint[]
}
```

---

### Task 8: 纯函数 option 构造器(TDD)

**Files:**
- Test: `mes/frontend/apps/mes-new/src/pages/digitization/__tests__/dashboardOptions.test.ts`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/dashboardOptions.ts`

- [ ] **Step 1: 写测试(test-first)**(沿用项目约定:`__tests__/` 子目录,显式 `import { describe, it, expect } from 'vitest'`,`*.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import {
  formatCount,
  pickPalette,
  trendMonthLabel,
  trendMonths,
  trendOrderCounts,
  trendCompletedCounts,
  formatClock,
  buildPieOption,
  buildBarOption,
  buildOrderTrendOption,
  buildGaugeOption,
  buildAreaOption,
} from '../dashboardOptions'
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

const trend: MonthlyTrendPoint[] = [
  { month: '2026-05', orderCount: 10, totalQty: 100, completedCount: 6 },
  { month: '2026-06', orderCount: 12, totalQty: 130, completedCount: 9 },
]
const items: NameValue[] = [
  { name: '创建', value: 3 },
  { name: '进行中', value: 5 },
]

describe('formatCount', () => {
  it('千分位', () => { expect(formatCount(1234567)).toBe('1,234,567') })
  it('0', () => { expect(formatCount(0)).toBe('0') })
  it('小于千', () => { expect(formatCount(999)).toBe('999') })
  it('取整', () => { expect(formatCount(1234.7)).toBe('1,235') })
})

describe('pickPalette', () => {
  it('索引取色', () => { expect(pickPalette(0)).toBe('#2fe0ff') })
  it('循环取色', () => { expect(pickPalette(8)).toBe(pickPalette(0)) })
})

describe('trend transforms', () => {
  it('trendMonthLabel: 2026-06 → 6月', () => { expect(trendMonthLabel('2026-06')).toBe('6月') })
  it('trendMonthLabel: 2026-01 → 1月', () => { expect(trendMonthLabel('2026-01')).toBe('1月') })
  it('trendMonths', () => { expect(trendMonths(trend)).toEqual(['5月', '6月']) })
  it('trendOrderCounts', () => { expect(trendOrderCounts(trend)).toEqual([10, 12]) })
  it('trendCompletedCounts', () => { expect(trendCompletedCounts(trend)).toEqual([6, 9]) })
})

describe('formatClock', () => {
  it('补零格式化', () => {
    expect(formatClock(new Date(2026, 5, 17, 14, 3, 8))).toBe('2026-06-17 14:03:08')
  })
})

describe('option builders', () => {
  it('buildPieOption: series data 长度=输入', () => {
    const opt = buildPieOption(items) as { series: { data: unknown[] }[] }
    expect(opt.series[0].data).toHaveLength(2)
  })
  it('buildBarOption: xAxis data 长度=输入', () => {
    const opt = buildBarOption(items) as { xAxis: { data: unknown[] } }
    expect(opt.xAxis.data).toHaveLength(2)
  })
  it('buildOrderTrendOption: 双 series + x轴12项映射', () => {
    const opt = buildOrderTrendOption(trend) as { series: unknown[]; xAxis: { data: unknown[] } }
    expect(opt.series).toHaveLength(2)
    expect(opt.xAxis.data).toHaveLength(2)
  })
  it('buildGaugeOption: 值落入 series.data[0].value', () => {
    const opt = buildGaugeOption(87.2, 'OEE') as { series: { data: { value: number }[] }[] }
    expect(opt.series[0].data[0].value).toBe(87.2)
  })
  it('buildAreaOption: series 数=传入条数', () => {
    const opt = buildAreaOption(['1月', '2月'], [
      { name: '良品率', data: [98, 99], color: '#46d68a' },
    ]) as { series: unknown[] }
    expect(opt.series).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 运行测试,确认"红"**

Run: `cd mes/frontend && pnpm --filter mes-new test`
Expected: FAIL — 无法解析 `../dashboardOptions`(文件不存在)。

- [ ] **Step 3: 写实现 `dashboardOptions.ts`**(纯函数;不 import echarts 运行时,option 返回 `EChartOption = Record<string, unknown>`,保证 node 测试零依赖)

```ts
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

/** ECharts option(松散结构,EChart 容器内 cast 为 echarts 类型) */
export type EChartOption = Record<string, unknown>

const PALETTE = ['#2fe0ff', '#46d68a', '#f5a623', '#f0506e', '#9775fa', '#3bc9db', '#5fd8ff', '#ffd43b']
const AXIS_COLOR = '#3a6ea5'
const TEXT_COLOR = '#9fd2ff'
const SPLIT_COLOR = 'rgba(30,90,158,0.25)'

export function pickPalette(index: number): string {
  return PALETTE[index % PALETTE.length]
}

/** 整数千分位 */
export function formatCount(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 'yyyy-MM' → 'M月' */
export function trendMonthLabel(month: string): string {
  return `${Number(month.slice(5))}月`
}

export function trendMonths(trend: MonthlyTrendPoint[]): string[] {
  return trend.map((t) => trendMonthLabel(t.month))
}

export function trendOrderCounts(trend: MonthlyTrendPoint[]): number[] {
  return trend.map((t) => t.orderCount)
}

export function trendCompletedCounts(trend: MonthlyTrendPoint[]): number[] {
  return trend.map((t) => t.completedCount)
}

/** Date → 'yyyy-MM-dd HH:mm:ss'(补零) */
export function formatClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const baseGrid = { left: 8, right: 12, top: 28, bottom: 8, containLabel: true }
const catAxis = (data: string[]) => ({
  type: 'category',
  data,
  axisLine: { lineStyle: { color: AXIS_COLOR } },
  axisLabel: { color: TEXT_COLOR, fontSize: 10 },
})
const valAxis = (extra: Record<string, unknown> = {}) => ({
  type: 'value',
  axisLine: { lineStyle: { color: AXIS_COLOR } },
  axisLabel: { color: TEXT_COLOR, fontSize: 10 },
  splitLine: { lineStyle: { color: SPLIT_COLOR } },
  ...extra,
})

/** 环形饼图 */
export function buildPieOption(items: NameValue[]): EChartOption {
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: TEXT_COLOR, fontSize: 10 } },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '44%'],
        label: { color: TEXT_COLOR, fontSize: 10 },
        data: items.map((it, i) => ({
          name: it.name,
          value: it.value,
          itemStyle: { color: pickPalette(i) },
        })),
      },
    ],
  }
}

/** 竖柱图 */
export function buildBarOption(items: NameValue[]): EChartOption {
  return {
    tooltip: { trigger: 'axis' },
    grid: { ...baseGrid, top: 16 },
    xAxis: catAxis(items.map((it) => it.name)),
    yAxis: valAxis(),
    series: [
      {
        type: 'bar',
        barWidth: '50%',
        data: items.map((it, i) => ({ value: it.value, itemStyle: { color: pickPalette(i) } })),
      },
    ],
  }
}

/** 月度订单趋势:订单数(柱) + 完成数(线) */
export function buildOrderTrendOption(trend: MonthlyTrendPoint[]): EChartOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['订单数', '完成数'], top: 0, textStyle: { color: TEXT_COLOR, fontSize: 10 } },
    grid: baseGrid,
    xAxis: catAxis(trendMonths(trend)),
    yAxis: valAxis(),
    series: [
      { name: '订单数', type: 'bar', barWidth: '40%', itemStyle: { color: '#1366b0' }, data: trendOrderCounts(trend) },
      {
        name: '完成数',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#2fe0ff' },
        areaStyle: { color: 'rgba(47,224,255,0.12)' },
        data: trendCompletedCounts(trend),
      },
    ],
  }
}

/** 仪表盘 0-100 */
export function buildGaugeOption(value: number, title: string): EChartOption {
  return {
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        radius: '90%',
        center: ['50%', '58%'],
        progress: { show: true, width: 10 },
        axisLine: { lineStyle: { width: 10, color: [[0.6, '#f0506e'], [0.85, '#f5a623'], [1, '#46d68a']] } },
        axisLabel: { color: TEXT_COLOR, fontSize: 8 },
        pointer: { width: 4 },
        detail: { valueAnimation: true, formatter: '{value}%', color: '#5fd8ff', fontSize: 16, offsetCenter: [0, '72%'] },
        title: { color: TEXT_COLOR, fontSize: 10, offsetCenter: [0, '92%'] },
        data: [{ value, name: title }],
      },
    ],
  }
}

/** 面积折线图(多条) */
export function buildAreaOption(
  months: string[],
  series: { name: string; data: number[]; color: string }[],
): EChartOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: series.map((s) => s.name), top: 0, textStyle: { color: TEXT_COLOR, fontSize: 10 } },
    grid: baseGrid,
    xAxis: { ...catAxis(months), boundaryGap: false },
    yAxis: valAxis({ max: 100 }),
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      itemStyle: { color: s.color },
      areaStyle: { color: `${s.color}22` },
      data: s.data,
    })),
  }
}
```

- [ ] **Step 4: 运行测试,确认"绿"**

Run: `cd mes/frontend && pnpm --filter mes-new test`
Expected: 全部通过(本文件约 18 个 it 全 PASS)。

---

### Task 9: API 模块 `api/digitization/dashboard.ts`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/digitization/dashboard.ts`

- [ ] **Step 1: 写 API**(返回 Observable;只读 GET,无需 JSON_HEADERS)

```ts
import { http } from '@/http/client'
import type { DashboardOverview } from '@/types/digitization'

/** 数字化大屏总览(只读聚合) */
export function fetchOverview() {
  return http.get<DashboardOverview>('/digitization/dashboard/overview')
}
```

---

### Task 10: ECharts 容器组件 `EChart.tsx`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/components/EChart.tsx`

- [ ] **Step 1: 写 `EChart.tsx`**(按需注册图表/组件/渲染器;init + ResizeObserver + dispose;option 变更 setOption)

```tsx
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartOption } from '@/pages/digitization/dashboardOptions'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
])

interface EChartProps {
  option: EChartOption
  className?: string
}

/** 通用 ECharts 容器:容器尺寸自适应,卸载自动销毁。父级须给定高度。 */
export default function EChart({ option, className }: EChartProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!elRef.current) return
    const chart = echarts.init(elRef.current)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(elRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option as echarts.EChartsCoreOption, true)
  }, [option])

  return <div ref={elRef} className={className} />
}
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误(若 `echarts/core` 的 `EChartsCoreOption` 类型名在所装版本不存在,改用 `echarts.EChartsOption`;执行时以 `pnpm` 报错为准修正)。

---

### Task 11: 演示数据 + 滚动数字 hook

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/dashboardMock.ts`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/useCountUp.ts`

- [ ] **Step 1: 写 `dashboardMock.ts`**(演示面板数据,明确语义)

```ts
import type { NameValue } from '@/types/digitization'

/** 演示:设备综合效率 OEE(%) */
export const mockOeeValue = 87.2

/** 演示:良品率/不良率 12 月趋势 */
export const mockQuality: { months: string[]; yieldRate: number[]; defectRate: number[] } = {
  months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  yieldRate: [97.2, 97.8, 98.1, 97.5, 98.4, 98.0, 98.6, 98.2, 98.9, 98.5, 99.0, 98.7],
  defectRate: [2.8, 2.2, 1.9, 2.5, 1.6, 2.0, 1.4, 1.8, 1.1, 1.5, 1.0, 1.3],
}

/** 演示:各车间产量 */
export const mockWorkshop: NameValue[] = [
  { name: '冲压', value: 180 },
  { name: '焊接', value: 145 },
  { name: '涂装', value: 168 },
  { name: '总装', value: 205 },
  { name: '机加', value: 132 },
]
```

- [ ] **Step 2: 写 `useCountUp.ts`**(rAF 缓动滚动到目标值;浏览器 only,不被 `*.test.ts` 收录)

```ts
import { useEffect, useRef, useState } from 'react'

/** 数字从上次值缓动滚动到 target;返回当前显示值 */
export function useCountUp(target: number, durationMs = 1200): number {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(from + (target - from) * eased)
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return val
}
```

---

### Task 12: 深空蓝主题 CSS + 面板外框

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/dashboard.css`
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/panels/PanelFrame.tsx`

- [ ] **Step 1: 写 `dashboard.css`**(全部类作用域在 `.mes-dashboard` 下,不污染全站)

```css
.mes-dashboard {
  min-height: 100vh;
  width: 100%;
  padding: 18px 22px 22px;
  box-sizing: border-box;
  background: radial-gradient(ellipse at 50% -10%, #0c2444 0%, #050b16 72%);
  color: #cfe6ff;
  font-family: system-ui, "PingFang SC", sans-serif;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}

.mes-dashboard .ds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mes-dashboard .ds-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 4px;
  color: #5fd8ff;
  text-shadow: 0 0 14px rgba(47, 224, 255, 0.55);
  margin: 0;
}
.mes-dashboard .ds-header__right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.mes-dashboard .ds-clock {
  font-size: 14px;
  color: #6ea3d8;
  font-variant-numeric: tabular-nums;
}

.mes-dashboard .ds-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.mes-dashboard .ds-kpi {
  position: relative;
  border: 1px solid #1e5a9e;
  border-radius: 10px;
  padding: 14px 18px;
  background: linear-gradient(160deg, rgba(14, 43, 77, 0.55), rgba(10, 28, 51, 0.55));
  box-shadow: inset 0 0 18px rgba(30, 90, 158, 0.28);
}
.mes-dashboard .ds-kpi__num {
  font-size: 30px;
  font-weight: 800;
  color: #5fd8ff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.mes-dashboard .ds-kpi__label {
  margin-top: 8px;
  font-size: 12px;
  color: #8fb6e0;
}

.mes-dashboard .ds-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 14px;
  min-height: 0;
}
.mes-dashboard .ds-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.mes-dashboard .ds-panel {
  position: relative;
  flex: 1;
  border: 1px solid rgba(30, 90, 158, 0.55);
  border-radius: 10px;
  padding: 12px 14px;
  background: rgba(10, 28, 51, 0.42);
  box-shadow: inset 0 0 16px rgba(30, 90, 158, 0.22);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.mes-dashboard .ds-panel::before {
  content: "";
  position: absolute;
  top: -1px;
  left: -1px;
  width: 14px;
  height: 14px;
  border-top: 2px solid #2fe0ff;
  border-left: 2px solid #2fe0ff;
  border-top-left-radius: 4px;
}
.mes-dashboard .ds-panel__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #9fd2ff;
  margin-bottom: 6px;
}
.mes-dashboard .ds-panel__body {
  flex: 1;
  min-height: 0;
}
.mes-dashboard .ds-tag {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 4px;
  font-weight: 500;
}
.mes-dashboard .ds-tag--real {
  background: rgba(13, 58, 94, 0.9);
  color: #5fd8ff;
}
.mes-dashboard .ds-tag--mock {
  background: rgba(58, 46, 13, 0.9);
  color: #f5c451;
}
.mes-dashboard .ds-loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #6ea3d8;
}
```

- [ ] **Step 2: 写 `PanelFrame.tsx`**

```tsx
import type { ReactNode } from 'react'

interface PanelFrameProps {
  title: string
  badge?: 'real' | 'mock'
  children: ReactNode
}

/** 大屏玻璃面板外框:标题 + 真实/演示角标 + 科技边角 */
export default function PanelFrame({ title, badge = 'real', children }: PanelFrameProps) {
  return (
    <div className="ds-panel">
      <div className="ds-panel__title">
        <span>{title}</span>
        <span className={badge === 'real' ? 'ds-tag ds-tag--real' : 'ds-tag ds-tag--mock'}>
          {badge === 'real' ? '真实' : '演示'}
        </span>
      </div>
      <div className="ds-panel__body">{children}</div>
    </div>
  )
}
```

---

### Task 13: 8 个面板组件 + KPI 条

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/panels/KpiStrip.tsx`
- Create: `.../panels/OrderStatusPanel.tsx`、`DeviceStatusPanel.tsx`、`OrderTrendPanel.tsx`、`OrderTypePanel.tsx`
- Create: `.../panels/OeeGaugePanel.tsx`、`QualityTrendPanel.tsx`、`WorkshopOutputPanel.tsx`

- [ ] **Step 1: 写 `KpiStrip.tsx`**

```tsx
import { useCountUp } from '../useCountUp'
import { formatCount } from '../dashboardOptions'
import type { DashboardKpi } from '@/types/digitization'

function KpiCard({ label, value }: { label: string; value: number }) {
  const n = useCountUp(value)
  return (
    <div className="ds-kpi">
      <div className="ds-kpi__num">{formatCount(n)}</div>
      <div className="ds-kpi__label">{label}</div>
    </div>
  )
}

export default function KpiStrip({ kpi }: { kpi: DashboardKpi }) {
  return (
    <div className="ds-kpis">
      <KpiCard label="订单总数" value={kpi.orderCount} />
      <KpiCard label="设备总数" value={kpi.deviceCount} />
      <KpiCard label="物料总数" value={kpi.materielCount} />
      <KpiCard label="工艺路线" value={kpi.flowCount} />
    </div>
  )
}
```

- [ ] **Step 2: 写 `OrderStatusPanel.tsx`**(真实)

```tsx
import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildPieOption } from '../dashboardOptions'
import type { NameValue } from '@/types/digitization'

export default function OrderStatusPanel({ data }: { data: NameValue[] }) {
  return (
    <PanelFrame title="订单状态分布" badge="real">
      <EChart option={buildPieOption(data)} className="h-full w-full min-h-[150px]" />
    </PanelFrame>
  )
}
```

- [ ] **Step 3: 写 `DeviceStatusPanel.tsx`**(真实)

```tsx
import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildPieOption } from '../dashboardOptions'
import type { NameValue } from '@/types/digitization'

export default function DeviceStatusPanel({ data }: { data: NameValue[] }) {
  return (
    <PanelFrame title="设备状态分布" badge="real">
      <EChart option={buildPieOption(data)} className="h-full w-full min-h-[150px]" />
    </PanelFrame>
  )
}
```

- [ ] **Step 4: 写 `OrderTrendPanel.tsx`**(真实,主视觉)

```tsx
import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildOrderTrendOption } from '../dashboardOptions'
import type { MonthlyTrendPoint } from '@/types/digitization'

export default function OrderTrendPanel({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <PanelFrame title="月度订单趋势" badge="real">
      <EChart option={buildOrderTrendOption(data)} className="h-full w-full min-h-[200px]" />
    </PanelFrame>
  )
}
```

- [ ] **Step 5: 写 `OrderTypePanel.tsx`**(真实)

```tsx
import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildBarOption } from '../dashboardOptions'
import type { NameValue } from '@/types/digitization'

export default function OrderTypePanel({ data }: { data: NameValue[] }) {
  return (
    <PanelFrame title="工单类型分布" badge="real">
      <EChart option={buildBarOption(data)} className="h-full w-full min-h-[140px]" />
    </PanelFrame>
  )
}
```

- [ ] **Step 6: 写 `OeeGaugePanel.tsx`**(演示)

```tsx
import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildGaugeOption } from '../dashboardOptions'
import { mockOeeValue } from '../dashboardMock'

export default function OeeGaugePanel() {
  return (
    <PanelFrame title="设备综合效率 OEE" badge="mock">
      <EChart option={buildGaugeOption(mockOeeValue, 'OEE')} className="h-full w-full min-h-[150px]" />
    </PanelFrame>
  )
}
```

- [ ] **Step 7: 写 `QualityTrendPanel.tsx`**(演示)

```tsx
import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildAreaOption } from '../dashboardOptions'
import { mockQuality } from '../dashboardMock'

export default function QualityTrendPanel() {
  const option = buildAreaOption(mockQuality.months, [
    { name: '良品率', data: mockQuality.yieldRate, color: '#46d68a' },
    { name: '不良率', data: mockQuality.defectRate, color: '#f0506e' },
  ])
  return (
    <PanelFrame title="良品率 / 不良率趋势" badge="mock">
      <EChart option={option} className="h-full w-full min-h-[160px]" />
    </PanelFrame>
  )
}
```

- [ ] **Step 8: 写 `WorkshopOutputPanel.tsx`**(演示)

```tsx
import EChart from '@/components/EChart'
import PanelFrame from './PanelFrame'
import { buildBarOption } from '../dashboardOptions'
import { mockWorkshop } from '../dashboardMock'

export default function WorkshopOutputPanel() {
  return (
    <PanelFrame title="各车间产量" badge="mock">
      <EChart option={buildBarOption(mockWorkshop)} className="h-full w-full min-h-[140px]" />
    </PanelFrame>
  )
}
```

---

### Task 14: 大屏主页面 `PlanDashboard.tsx`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/digitization/PlanDashboard.tsx`

- [ ] **Step 1: 写 `PlanDashboard.tsx`**(编排 + `useQuery$` + 30s 轮询 + 实时时钟 + 返回;真实面板用 `data?.x ?? []` 兜底,演示面板恒渲染)

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@workspace/ui'
import { ArrowLeft } from 'lucide-react'
import { useQuery$ } from '@/http/hooks'
import { fetchOverview } from '@/api/digitization/dashboard'
import { formatClock } from './dashboardOptions'
import type { DashboardKpi } from '@/types/digitization'
import KpiStrip from './panels/KpiStrip'
import OrderStatusPanel from './panels/OrderStatusPanel'
import DeviceStatusPanel from './panels/DeviceStatusPanel'
import OrderTrendPanel from './panels/OrderTrendPanel'
import OrderTypePanel from './panels/OrderTypePanel'
import OeeGaugePanel from './panels/OeeGaugePanel'
import QualityTrendPanel from './panels/QualityTrendPanel'
import WorkshopOutputPanel from './panels/WorkshopOutputPanel'
import './dashboard.css'

const REFRESH_MS = 30000
const EMPTY_KPI: DashboardKpi = { orderCount: 0, deviceCount: 0, materielCount: 0, flowCount: 0 }

export default function PlanDashboard() {
  const navigate = useNavigate()
  const { data, loading, refetch } = useQuery$(['digitization', 'overview'], fetchOverview)
  const [now, setNow] = useState<Date>(() => new Date())

  // 实时时钟
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // 30s 轮询刷新真实数据
  useEffect(() => {
    const t = setInterval(() => refetch(), REFRESH_MS)
    return () => clearInterval(t)
  }, [refetch])

  return (
    <div className="mes-dashboard">
      <header className="ds-header">
        <h1 className="ds-title">章鱼师兄 · 生产数字化大屏</h1>
        <div className="ds-header__right">
          <span className="ds-clock">{formatClock(now)}</span>
          <Button variant="outline" size="sm" onClick={() => navigate('/welcome')}>
            <ArrowLeft className="size-4" />
            返回
          </Button>
        </div>
      </header>

      <KpiStrip kpi={data?.kpi ?? EMPTY_KPI} />

      <div className="ds-grid">
        <div className="ds-col">
          <OrderStatusPanel data={data?.orderStatus ?? []} />
          <DeviceStatusPanel data={data?.deviceStatus ?? []} />
        </div>
        <div className="ds-col">
          <OrderTrendPanel data={data?.monthlyTrend ?? []} />
          <QualityTrendPanel />
        </div>
        <div className="ds-col">
          <OeeGaugePanel />
          <OrderTypePanel data={data?.orderType ?? []} />
          <WorkshopOutputPanel />
        </div>
      </div>

      {loading && !data && <div className="ds-loading">加载中…</div>}
    </div>
  )
}
```

---

### Task 15: 路由接入(全屏,AdminLayout 平级)

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1: 加 import**(在现有 import 区,放 `NotFound`/`Forbidden` 之前)

```tsx
import PlanDashboard from '@/pages/digitization/PlanDashboard'
```

- [ ] **Step 2: 在 `PrivateRoute` 的 children 里、`AdminLayout` 节点之后新增全屏路由**

把 router.tsx 中:
```tsx
        children: [
          { index: true, element: <Navigate to="/welcome" replace /> },
```
所在的 `AdminLayout` 对象整体保留不变,在它的**闭合 `}` 之后**(即 `element: <PrivateRoute />` 的 `children` 数组内、`AdminLayout` 对象之后)新增一项:

```tsx
      {
        path: '/',
        element: <PrivateRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              // ... 现有所有 AdminLayout 子路由保持不变 ...
              { path: '403', element: <Forbidden /> },
              { path: '*', element: <NotFound /> },
            ],
          },
          { path: 'digitization/plan', element: <PlanDashboard /> },
        ],
      },
```

说明:`digitization/plan` 是静态路径,排序优先于 AdminLayout 子级的 `*` 通配,故匹配到这条全屏路由(无 AdminLayout 外壳);仍在 `PrivateRoute` 内,保留登录保护。侧边栏菜单 url `/digitization/plan/plan-ui` 经 `urlMap` 已映射为 `/digitization/plan`,点击即进入。

---

### Task 16: 前端整体验证 + 提交

- [ ] **Step 1: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无输出/无错误(注意 `verbatimModuleSyntax` 要求类型用 `import type`;`noUnusedLocals` 不允许未用变量)。

- [ ] **Step 2: Lint**

Run: `cd mes/frontend && pnpm --filter mes-new lint`
Expected: 0 errors。

- [ ] **Step 3: 测试**

Run: `cd mes/frontend && pnpm --filter mes-new test`
Expected: 全绿(含本周期 `dashboardOptions.test.ts` + 既有测试)。

- [ ] **Step 4: 构建**

Run: `cd mes/frontend && pnpm --filter mes-new build`
Expected: `tsc -b` 通过 + `vite build` 成功产出 dist(留意 echarts 引入后 bundle 体积,异常增大在审查记录)。

- [ ] **Step 5: 提交前端**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src mes/frontend/apps/mes-new/package.json mes/frontend/pnpm-lock.yaml
git commit -m "✨ feat(mes-new): 数字化智慧大屏(全屏深空蓝 kiosk)

新增 /digitization/plan 全屏大屏(挂 PrivateRoute 下/AdminLayout 平级,无侧边栏):
- 真实面板:KPI×4/订单状态环/设备状态环/月度订单趋势/工单类型,对接 GET /digitization/dashboard/overview,30s 轮询
- 演示面板:OEE 仪表盘/良品率趋势/车间产量(角标明示)
- ECharts 按需引入 + 自研 EChart 容器(ResizeObserver/dispose);纯函数 option 构造器 + vitest;深空蓝主题 scoped CSS;KPI 滚动数字"
```

---

## 验证计划(总)

- 前端:`check-types` / `lint` / `test` / `build` 全绿(Task 16,贴实际输出)。
- 后端:`mvn test -Dtest=DashboardServiceImplTest` 8 例全绿 + `mvn test-compile` 通过(Task 4/5,贴输出)。
- 多 agent 审查:每任务 spec 合规审查 → fix → re-review → 代码质量审查 → fix → re-review;周期末终审。
- **人工双端联调待做**(后端登录需图形验证码,无法脚本化,见 [[backend-build-mvnw-broken]]):后端 :9090 + 前端 :4100,登录后侧边栏点"智慧大屏"→ 全屏大屏铺满(无侧边栏)→ KPI/订单状态/设备状态/工单类型/月度趋势显示真实数据 → 演示面板正常 → 等 30s 见自动刷新 → 点"返回"回到带外壳的 /welcome。

## Self-Review 备注(已自检)

- **Spec 覆盖**:形态/路由(Task15)、深空蓝视觉(Task12)、三列布局(Task14)、单一只读 overview 端点+数据来源(Task1-5)、EChart 封装(Task10)、useQuery$+30s 轮询(Task14)、纯函数测试(Task8)、演示数据角标(Task12/13)、错误/空态(Task14 兜底)、后端 Mockito(Task3-4)。均有对应任务。
- **类型一致**:后端 `materielCount` ↔ 前端 `DashboardKpi.materielCount`;`NameValue{name,value}` ↔ `NameValueVO{name,value:long}`;`MonthlyTrendPoint` ↔ `MonthlyTrendVO`;option 构造器名(`buildPieOption`/`buildBarOption`/`buildOrderTrendOption`/`buildGaugeOption`/`buildAreaOption`)在 Task8 定义、Task13 调用一致。
- **无占位符**:每步均含完整代码与确切命令。
