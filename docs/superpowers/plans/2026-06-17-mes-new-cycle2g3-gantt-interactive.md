# 生产甘特图交互升级（拖拽改期 + 执行回填）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把只读生产甘特图升级为可操作工具：拖动计划条改期（写 `plan_*_time`），并支持记录开工/完工/进度/纠正实际时间（写 `actual_*_time` / `progress` / `dispatch_status`）。

**Architecture:** 后端在现有 `SpGanttController`/`ISpGanttService`/`SpGanttServiceImpl` 上新增 5 个语义化写端点（`@RequestBody` JSON），每个自带状态守卫，复用单一 `GanttWriteReq` DTO；零 DB 迁移（列已存在）。前端先 TDD 两个拖拽纯函数进 `ganttUtils`，再给 `GanttChart` 加 pointer 拖拽层、`TaskDetailSheet` 升级为可编辑、`GanttPage` 编排 5 个 `useMutation$` 并在成功后 `refetch()`。

**Tech Stack:** Java 8 / Spring Boot 2.1.7 / MyBatis-Plus 3.1.2 / JUnit4+Mockito（后端）；React 18 + TS + Vite + shadcn(@workspace/ui) + RxJS hooks + vitest（前端 apps/mes-new）。

**关键约束（务必遵守）：**
- 时间列为 `varchar`，标准格式 `yyyy-MM-dd HH:mm:ss`；甘特 seed 为纯日期 `yyyy-MM-dd`。改期纯函数**保留源字符串的时间后缀**；后端默认 now 用 `yyyy-MM-dd HH:mm:ss`。
- `SpOrderDispatchMapper extends BaseMapper<SpOrderDispatch>`，可用 `selectById`/`updateById`；`SpGanttServiceImpl` 注入的字段名是 `spOrderDispatchMapper`（无 `baseMapper`）。
- MyBatis-Plus `updateById` 默认 `NOT_NULL` 策略：先 `selectById` 取全量实体再改字段，null 字段不会被写，不会丢数据。
- `dispatchStatus` 是 `Integer`，与 int 常量比较前**必须先判空**（否则拆箱 NPE）。
- 前端写端点用 JSON（`JSON_HEADERS`），不要走默认 form-encoded。
- RHF 字段名坑：本计划 Sheet 编辑区用普通 `useState` 受控输入（多动作面板更合适），**不引入 RHF**，从根本上规避字段名 DOM 冲突。
- React 纯函数规则：不要在 `useMemo` 体内调用 `Date.now()`（现有代码用 lazy `useState(() => Date.now())`）。

**状态机：** `dispatch_status` `1=已派工 → 2=已开工 → 3=已完工`

---

## 文件清单

**后端（`mes/src/main/java/com/wangziyang/mes/order/`）**
- Create `dto/GanttWriteReq.java` — 写操作统一入参
- Modify `service/ISpGanttService.java` — +5 方法签名
- Modify `service/impl/SpGanttServiceImpl.java` — +5 实现 + 守卫 + 辅助方法
- Modify `controller/SpGanttController.java` — +5 端点
- Create `mes/src/test/java/com/wangziyang/mes/order/service/SpGanttServiceImplTest.java` — Mockito 守卫单测

**前端（`mes/frontend/apps/mes-new/src/`）**
- Modify `pages/order/gantt/ganttUtils.ts` — +`DragMode`/`pxToDays`/`shiftPlanByDays`/内部 `shiftDateStr`
- Modify `pages/order/gantt/__tests__/ganttUtils.test.ts` — +纯函数测试
- Modify `types/order.ts` — +5 请求类型
- Modify `api/order/gantt.ts` — +5 API 函数
- Modify `pages/order/gantt/GanttChart.tsx` — pointer 拖拽层 + 悬停快捷按钮 + 新 props
- Modify `pages/order/gantt/TaskDetailSheet.tsx` — 可编辑操作区 + 新 props
- Modify `pages/order/gantt/GanttPage.tsx` — 编排 5 个 mutation，active 改为按 id 派生

---

## Task 1：后端 DTO `GanttWriteReq`

**Files:** Create `mes/src/main/java/com/wangziyang/mes/order/dto/GanttWriteReq.java`

- [ ] **Step 1: 写文件**

```java
package com.wangziyang.mes.order.dto;

/** 甘特图写操作统一入参(改期/开工/完工/进度/纠时);各端点按需取字段,全部可空 */
public class GanttWriteReq {
    private String id;
    private String planStartTime;
    private String planEndTime;
    private String actualStartTime;
    private String actualEndTime;
    private Integer progress;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPlanStartTime() { return planStartTime; }
    public void setPlanStartTime(String planStartTime) { this.planStartTime = planStartTime; }
    public String getPlanEndTime() { return planEndTime; }
    public void setPlanEndTime(String planEndTime) { this.planEndTime = planEndTime; }
    public String getActualStartTime() { return actualStartTime; }
    public void setActualStartTime(String actualStartTime) { this.actualStartTime = actualStartTime; }
    public String getActualEndTime() { return actualEndTime; }
    public void setActualEndTime(String actualEndTime) { this.actualEndTime = actualEndTime; }
    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }
}
```

- [ ] **Step 2: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/dto/GanttWriteReq.java
git commit -m "✨ feat(order): 甘特图写操作入参 DTO GanttWriteReq"
```

---

## Task 2：后端服务接口 `ISpGanttService` +5 方法

**Files:** Modify `mes/src/main/java/com/wangziyang/mes/order/service/ISpGanttService.java`

- [ ] **Step 1: 替换整个文件为**

```java
package com.wangziyang.mes.order.service;

import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;

import java.util.List;

public interface ISpGanttService {
    List<GanttTaskVO> listGanttTasks(GanttQueryReq req);

    /** 拖拽改期: 写计划起止时间(已完工不可改) */
    void reschedule(String id, String planStartTime, String planEndTime);

    /** 记录开工: 写实际开始时间 + 状态→2(仅已派工可) */
    void recordStart(String id, String actualStartTime);

    /** 记录完工: 写实际结束时间 + progress=100 + 状态→3(仅已开工可) */
    void recordFinish(String id, String actualEndTime);

    /** 更新进度: 0-100(仅已开工可) */
    void updateProgress(String id, Integer progress);

    /** 手动修正实际时间(仅已开工/完工可;不改状态) */
    void adjustActual(String id, String actualStartTime, String actualEndTime);
}
```

- [ ] **Step 2: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/service/ISpGanttService.java
git commit -m "✨ feat(order): ISpGanttService 增甘特写操作方法签名"
```

---

## Task 3：后端服务实现 `SpGanttServiceImpl` +5 实现与守卫

**Files:** Modify `mes/src/main/java/com/wangziyang/mes/order/service/impl/SpGanttServiceImpl.java`

- [ ] **Step 1: 替换整个文件为**

```java
package com.wangziyang.mes.order.service.impl;

import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;
import com.wangziyang.mes.order.entity.SpOrderDispatch;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.service.ISpGanttService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class SpGanttServiceImpl implements ISpGanttService {

    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int STATUS_DISPATCHED = 1; // 已派工
    private static final int STATUS_STARTED = 2;    // 已开工
    private static final int STATUS_FINISHED = 3;   // 已完工

    @Autowired
    private SpOrderDispatchMapper spOrderDispatchMapper;

    @Override
    public List<GanttTaskVO> listGanttTasks(GanttQueryReq req) {
        if (req == null) {
            req = new GanttQueryReq();
        }
        return spOrderDispatchMapper.selectGanttTasks(req);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reschedule(String id, String planStartTime, String planEndTime) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() != null && d.getDispatchStatus() == STATUS_FINISHED) {
            throw new RuntimeException("任务已完工,不可改期");
        }
        if (isBlank(planStartTime) || isBlank(planEndTime)) {
            throw new RuntimeException("计划开始/结束时间不能为空");
        }
        if (planStartTime.compareTo(planEndTime) > 0) {
            throw new RuntimeException("计划开始时间不能晚于结束时间");
        }
        d.setPlanStartTime(planStartTime);
        d.setPlanEndTime(planEndTime);
        spOrderDispatchMapper.updateById(d);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordStart(String id, String actualStartTime) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() == null || d.getDispatchStatus() != STATUS_DISPATCHED) {
            throw new RuntimeException("仅已派工任务可记录开工");
        }
        d.setActualStartTime(isBlank(actualStartTime) ? now() : actualStartTime);
        d.setDispatchStatus(STATUS_STARTED);
        spOrderDispatchMapper.updateById(d);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordFinish(String id, String actualEndTime) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() == null || d.getDispatchStatus() != STATUS_STARTED) {
            throw new RuntimeException("仅已开工任务可记录完工");
        }
        String end = isBlank(actualEndTime) ? now() : actualEndTime;
        if (!isBlank(d.getActualStartTime()) && d.getActualStartTime().compareTo(end) > 0) {
            throw new RuntimeException("实际完工时间不能早于实际开工时间");
        }
        d.setActualEndTime(end);
        d.setProgress(100);
        d.setDispatchStatus(STATUS_FINISHED);
        spOrderDispatchMapper.updateById(d);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateProgress(String id, Integer progress) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() == null || d.getDispatchStatus() != STATUS_STARTED) {
            throw new RuntimeException("仅已开工任务可更新进度");
        }
        if (progress == null || progress < 0 || progress > 100) {
            throw new RuntimeException("进度必须在 0-100 之间");
        }
        d.setProgress(progress);
        spOrderDispatchMapper.updateById(d);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adjustActual(String id, String actualStartTime, String actualEndTime) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() == null || d.getDispatchStatus() < STATUS_STARTED) {
            throw new RuntimeException("仅已开工/完工任务可修正实际时间");
        }
        if (!isBlank(actualStartTime) && !isBlank(actualEndTime)
                && actualStartTime.compareTo(actualEndTime) > 0) {
            throw new RuntimeException("实际开工时间不能晚于实际完工时间");
        }
        if (!isBlank(actualStartTime)) {
            d.setActualStartTime(actualStartTime);
        }
        if (!isBlank(actualEndTime)) {
            d.setActualEndTime(actualEndTime);
        }
        spOrderDispatchMapper.updateById(d);
    }

    private SpOrderDispatch loadOrThrow(String id) {
        if (isBlank(id)) {
            throw new RuntimeException("任务ID不能为空");
        }
        SpOrderDispatch d = spOrderDispatchMapper.selectById(id);
        if (d == null) {
            throw new RuntimeException("派工任务不存在: " + id);
        }
        return d;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String now() {
        return LocalDateTime.now().format(TS_FMT);
    }
}
```

> 注：时间字符串用 `compareTo` 比较，依赖 `yyyy-MM-dd[ HH:mm:ss]` 字典序与时间序一致；纯日期与带时间混比时短串视为该日 00:00，守卫语义仍正确。

- [ ] **Step 2: 提交**（与 Task 4 一起编译验证，故先不单独跑）

```bash
git add mes/src/main/java/com/wangziyang/mes/order/service/impl/SpGanttServiceImpl.java
git commit -m "✨ feat(order): SpGanttServiceImpl 实现改期/开工/完工/进度/纠时 + 状态守卫"
```

---

## Task 4：后端控制器 `SpGanttController` +5 端点

**Files:** Modify `mes/src/main/java/com/wangziyang/mes/order/controller/SpGanttController.java`

- [ ] **Step 1: 替换整个文件为**

```java
package com.wangziyang.mes.order.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttWriteReq;
import com.wangziyang.mes.order.service.ISpGanttService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping("/order/gantt")
public class SpGanttController extends BaseController {

    @Autowired
    private ISpGanttService spGanttService;

    /** 甘特图任务聚合(只读);入参 form-encoded GanttQueryReq */
    @PostMapping("/tasks")
    @ResponseBody
    public Result tasks(GanttQueryReq req) {
        return Result.success(spGanttService.listGanttTasks(req));
    }

    /** 拖拽改期(JSON) */
    @PostMapping("/reschedule")
    @ResponseBody
    public Result reschedule(@RequestBody GanttWriteReq req) {
        spGanttService.reschedule(req.getId(), req.getPlanStartTime(), req.getPlanEndTime());
        return Result.success();
    }

    /** 记录开工(JSON) */
    @PostMapping("/start")
    @ResponseBody
    public Result start(@RequestBody GanttWriteReq req) {
        spGanttService.recordStart(req.getId(), req.getActualStartTime());
        return Result.success();
    }

    /** 记录完工(JSON) */
    @PostMapping("/finish")
    @ResponseBody
    public Result finish(@RequestBody GanttWriteReq req) {
        spGanttService.recordFinish(req.getId(), req.getActualEndTime());
        return Result.success();
    }

    /** 更新进度(JSON) */
    @PostMapping("/progress")
    @ResponseBody
    public Result progress(@RequestBody GanttWriteReq req) {
        spGanttService.updateProgress(req.getId(), req.getProgress());
        return Result.success();
    }

    /** 手动修正实际时间(JSON) */
    @PostMapping("/actual")
    @ResponseBody
    public Result actual(@RequestBody GanttWriteReq req) {
        spGanttService.adjustActual(req.getId(), req.getActualStartTime(), req.getActualEndTime());
        return Result.success();
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS（无编译错误）

- [ ] **Step 3: 提交**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/controller/SpGanttController.java
git commit -m "✨ feat(order): 甘特图 5 个写端点(reschedule/start/finish/progress/actual)"
```

---

## Task 5：后端守卫单测（Mockito，免 DB）

**Files:** Create `mes/src/test/java/com/wangziyang/mes/order/service/SpGanttServiceImplTest.java`

> 先确认现有 `mes/src/test/java/com/wangziyang/mes/SparchetypeApplicationTests.java` 的 JUnit 版本。Spring Boot 2.1.7 默认 JUnit4 + Mockito2。若现有测试用 `org.junit.jupiter`(JUnit5),把下方 `org.junit`→`org.junit.jupiter.api`、`@RunWith(MockitoJUnitRunner.class)`→`@ExtendWith(MockitoExtension.class)`、`assertEquals(expected, actual)` 参数顺序保持、`@Test(expected=...)`→`assertThrows`。默认按 JUnit4 写。

- [ ] **Step 1: 写失败测试（实现已在 Task 3 完成，此处验证守卫）**

```java
package com.wangziyang.mes.order.service;

import com.wangziyang.mes.order.entity.SpOrderDispatch;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.service.impl.SpGanttServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class SpGanttServiceImplTest {

    @Mock
    private SpOrderDispatchMapper mapper;

    @InjectMocks
    private SpGanttServiceImpl service;

    private SpOrderDispatch dispatch(int status) {
        SpOrderDispatch d = new SpOrderDispatch();
        d.setDispatchStatus(status);
        d.setPlanStartTime("2026-06-10");
        d.setPlanEndTime("2026-06-12");
        return d;
    }

    // ---- reschedule ----
    @Test
    public void reschedule_ok() {
        when(mapper.selectById("1")).thenReturn(dispatch(STATUS(1)));
        service.reschedule("1", "2026-06-11", "2026-06-14");
        verify(mapper).updateById(org.mockito.ArgumentMatchers.any());
    }

    @Test(expected = RuntimeException.class)
    public void reschedule_blocked_when_finished() {
        when(mapper.selectById("1")).thenReturn(dispatch(3));
        service.reschedule("1", "2026-06-11", "2026-06-14");
    }

    @Test(expected = RuntimeException.class)
    public void reschedule_start_after_end() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.reschedule("1", "2026-06-20", "2026-06-14");
    }

    @Test(expected = RuntimeException.class)
    public void load_missing_throws() {
        when(mapper.selectById("x")).thenReturn(null);
        service.reschedule("x", "2026-06-11", "2026-06-14");
    }

    // ---- start ----
    @Test
    public void start_ok_sets_status2() {
        SpOrderDispatch d = dispatch(1);
        when(mapper.selectById("1")).thenReturn(d);
        service.recordStart("1", "2026-06-11 08:00:00");
        assertEquals(Integer.valueOf(2), d.getDispatchStatus());
        assertEquals("2026-06-11 08:00:00", d.getActualStartTime());
        verify(mapper).updateById(d);
    }

    @Test(expected = RuntimeException.class)
    public void start_blocked_when_not_dispatched() {
        when(mapper.selectById("1")).thenReturn(dispatch(2));
        service.recordStart("1", null);
    }

    // ---- finish ----
    @Test
    public void finish_ok_sets_status3_progress100() {
        SpOrderDispatch d = dispatch(2);
        d.setActualStartTime("2026-06-11 08:00:00");
        when(mapper.selectById("1")).thenReturn(d);
        service.recordFinish("1", "2026-06-12 17:00:00");
        assertEquals(Integer.valueOf(3), d.getDispatchStatus());
        assertEquals(Integer.valueOf(100), d.getProgress());
        assertEquals("2026-06-12 17:00:00", d.getActualEndTime());
    }

    @Test(expected = RuntimeException.class)
    public void finish_blocked_when_not_started() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.recordFinish("1", null);
    }

    // ---- progress ----
    @Test
    public void progress_ok() {
        SpOrderDispatch d = dispatch(2);
        when(mapper.selectById("1")).thenReturn(d);
        service.updateProgress("1", 60);
        assertEquals(Integer.valueOf(60), d.getProgress());
    }

    @Test(expected = RuntimeException.class)
    public void progress_out_of_range() {
        when(mapper.selectById("1")).thenReturn(dispatch(2));
        service.updateProgress("1", 120);
    }

    @Test(expected = RuntimeException.class)
    public void progress_blocked_when_not_started() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.updateProgress("1", 50);
    }

    // ---- adjustActual ----
    @Test
    public void adjustActual_ok() {
        SpOrderDispatch d = dispatch(2);
        when(mapper.selectById("1")).thenReturn(d);
        service.adjustActual("1", "2026-06-11 08:00:00", "2026-06-12 10:00:00");
        assertEquals("2026-06-11 08:00:00", d.getActualStartTime());
        assertEquals("2026-06-12 10:00:00", d.getActualEndTime());
    }

    @Test(expected = RuntimeException.class)
    public void adjustActual_blocked_when_dispatched() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.adjustActual("1", "2026-06-11 08:00:00", null);
    }

    @Test(expected = RuntimeException.class)
    public void adjustActual_start_after_end() {
        when(mapper.selectById("1")).thenReturn(dispatch(2));
        service.adjustActual("1", "2026-06-15 08:00:00", "2026-06-12 10:00:00");
    }

    private static int STATUS(int s) { return s; } // 可读性占位,等价直接传 1
}
```

> 上面 `STATUS(1)` 只是可读性包装，可直接写 `dispatch(1)`。如嫌多余请删掉该方法并把 `dispatch(STATUS(1))` 改 `dispatch(1)`。

- [ ] **Step 2: 跑测试**

Run: `cd mes && mvn -q -Dtest=SpGanttServiceImplTest test`
Expected: Tests run: 14, Failures: 0, Errors: 0（全绿）

- [ ] **Step 3: 提交**

```bash
git add mes/src/test/java/com/wangziyang/mes/order/service/SpGanttServiceImplTest.java
git commit -m "✅ test(order): SpGanttServiceImpl 守卫单测(Mockito,14 例全绿)"
```

---

## Task 6：前端拖拽纯函数（TDD）

**Files:**
- Modify `mes/frontend/apps/mes-new/src/pages/order/gantt/ganttUtils.ts`
- Test `mes/frontend/apps/mes-new/src/pages/order/gantt/__tests__/ganttUtils.test.ts`

- [ ] **Step 1: 在测试文件追加（先失败）**

在 `__tests__/ganttUtils.test.ts` 顶部 import 增加 `pxToDays, shiftPlanByDays`（与现有 import 合并），文件末尾追加：

```ts
describe('pxToDays', () => {
  it('四舍五入到天', () => {
    expect(pxToDays(0, 44)).toBe(0)
    expect(pxToDays(44, 44)).toBe(1)
    expect(pxToDays(21, 44)).toBe(0)   // <半天 → 0
    expect(pxToDays(23, 44)).toBe(1)   // >半天 → 1
    expect(pxToDays(-44, 44)).toBe(-1)
  })
})

describe('shiftPlanByDays', () => {
  const base = (over: Partial<GanttTask> = {}) =>
    task({ planStartTime: '2026-06-10', planEndTime: '2026-06-12', ...over })

  it('move 平移两端,保持工期', () => {
    expect(shiftPlanByDays(base(), 2, 'move')).toEqual({ planStartTime: '2026-06-12', planEndTime: '2026-06-14' })
  })
  it('move 保留时分秒后缀', () => {
    const r = shiftPlanByDays(base({ planStartTime: '2026-06-10 08:30:00', planEndTime: '2026-06-12 17:00:00' }), 1, 'move')
    expect(r).toEqual({ planStartTime: '2026-06-11 08:30:00', planEndTime: '2026-06-13 17:00:00' })
  })
  it('move 负 delta', () => {
    expect(shiftPlanByDays(base(), -1, 'move')).toEqual({ planStartTime: '2026-06-09', planEndTime: '2026-06-11' })
  })
  it('resize-start 只动开始', () => {
    expect(shiftPlanByDays(base(), 1, 'resize-start')).toEqual({ planStartTime: '2026-06-11', planEndTime: '2026-06-12' })
  })
  it('resize-start clamp 不越过结束(最多到同一天)', () => {
    expect(shiftPlanByDays(base(), 5, 'resize-start')).toEqual({ planStartTime: '2026-06-12', planEndTime: '2026-06-12' })
  })
  it('resize-end 只动结束', () => {
    expect(shiftPlanByDays(base(), 2, 'resize-end')).toEqual({ planStartTime: '2026-06-10', planEndTime: '2026-06-14' })
  })
  it('resize-end clamp 不早于开始', () => {
    expect(shiftPlanByDays(base(), -5, 'resize-end')).toEqual({ planStartTime: '2026-06-10', planEndTime: '2026-06-10' })
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/order/gantt/__tests__/ganttUtils.test.ts`
Expected: FAIL — `pxToDays is not a function` / `shiftPlanByDays is not a function`

- [ ] **Step 3: 在 `ganttUtils.ts` 实现**

在 `ganttUtils.ts` 末尾追加（`parseDay`/`DAY_MS` 已在文件内，可直接用）：

```ts
export type DragMode = 'move' | 'resize-start' | 'resize-end'

/** 像素位移 → 天数(四舍五入) */
export function pxToDays(deltaPx: number, dayWidth: number): number {
  return Math.round(deltaPx / dayWidth)
}

/** 把 'yyyy-MM-dd[ 后缀]' 的日期部分平移 deltaDays 天,保留原后缀;非法/空原样返回 */
function shiftDateStr(s: string | undefined, deltaDays: number): string | undefined {
  if (!s) return s
  const m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(s.trim())
  if (!m) return s
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  dt.setDate(dt.getDate() + deltaDays)
  const y = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${mo}-${d}${m[4]}`
}

/** 拖拽计算新计划起止;move=两端同移,resize-*=单端移并 clamp(起≤止,保留至少 1 天) */
export function shiftPlanByDays(
  task: GanttTask,
  deltaDays: number,
  mode: DragMode,
): { planStartTime?: string; planEndTime?: string } {
  const ps = task.planStartTime
  const pe = task.planEndTime
  if (mode === 'move') {
    return { planStartTime: shiftDateStr(ps, deltaDays), planEndTime: shiftDateStr(pe, deltaDays) }
  }
  const psDay = parseDay(ps)
  const peDay = parseDay(pe)
  if (psDay == null || peDay == null) {
    return { planStartTime: ps, planEndTime: pe }
  }
  if (mode === 'resize-start') {
    const maxDelta = Math.round((peDay - psDay) / DAY_MS) // 起最多前进到止当天
    const d = Math.min(deltaDays, maxDelta)
    return { planStartTime: shiftDateStr(ps, d), planEndTime: pe }
  }
  // resize-end
  const minDelta = Math.round((psDay - peDay) / DAY_MS) // 止最多后退到起当天
  const d = Math.max(deltaDays, minDelta)
  return { planStartTime: ps, planEndTime: shiftDateStr(pe, d) }
}
```

- [ ] **Step 4: 跑测试看全绿**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/order/gantt/__tests__/ganttUtils.test.ts`
Expected: PASS（含原有 + 新增 14+7 例）

- [ ] **Step 5: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/order/gantt/ganttUtils.ts mes/frontend/apps/mes-new/src/pages/order/gantt/__tests__/ganttUtils.test.ts
git commit -m "✅ test(mes-new): 甘特拖拽纯函数 pxToDays/shiftPlanByDays(TDD,平移/缩放/clamp/后缀保留)"
```

---

## Task 7：前端请求类型 + API 函数

**Files:**
- Modify `mes/frontend/apps/mes-new/src/types/order.ts`
- Modify `mes/frontend/apps/mes-new/src/api/order/gantt.ts`

- [ ] **Step 1: `types/order.ts` 末尾追加**

```ts
/** 甘特图写操作入参 */
export interface GanttRescheduleReq { id: string; planStartTime: string; planEndTime: string }
export interface GanttStartReq { id: string; actualStartTime?: string }
export interface GanttFinishReq { id: string; actualEndTime?: string }
export interface GanttProgressReq { id: string; progress: number }
export interface GanttActualReq { id: string; actualStartTime?: string; actualEndTime?: string }
```

- [ ] **Step 2: 替换 `api/order/gantt.ts` 整个文件为**

```ts
import { http } from '@/http/client'
import type {
  GanttTask, GanttQueryParams,
  GanttRescheduleReq, GanttStartReq, GanttFinishReq, GanttProgressReq, GanttActualReq,
} from '@/types/order'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 拉取甘特图任务(只读聚合);默认 form-encoded,后端 GanttQueryReq 绑定 */
export function fetchGanttTasks(params: GanttQueryParams = {}) {
  return http.post<GanttTask[]>('/order/gantt/tasks', params)
}

/** 拖拽改期(JSON) */
export function rescheduleTask(body: GanttRescheduleReq) {
  return http.post<void>('/order/gantt/reschedule', body, JSON_HEADERS)
}

/** 记录开工(JSON);actualStartTime 省略则后端默认当前时间 */
export function startTask(body: GanttStartReq) {
  return http.post<void>('/order/gantt/start', body, JSON_HEADERS)
}

/** 记录完工(JSON);actualEndTime 省略则后端默认当前时间 */
export function finishTask(body: GanttFinishReq) {
  return http.post<void>('/order/gantt/finish', body, JSON_HEADERS)
}

/** 更新进度(JSON) */
export function updateTaskProgress(body: GanttProgressReq) {
  return http.post<void>('/order/gantt/progress', body, JSON_HEADERS)
}

/** 手动修正实际时间(JSON) */
export function adjustTaskActual(body: GanttActualReq) {
  return http.post<void>('/order/gantt/actual', body, JSON_HEADERS)
}
```

- [ ] **Step 3: 提交**

```bash
git add mes/frontend/apps/mes-new/src/types/order.ts mes/frontend/apps/mes-new/src/api/order/gantt.ts
git commit -m "✨ feat(mes-new): 甘特写操作请求类型 + 5 个 API 函数(JSON)"
```

---

## Task 8：GanttChart 拖拽层 + 悬停快捷按钮

**Files:** Modify `mes/frontend/apps/mes-new/src/pages/order/gantt/GanttChart.tsx`

> 先 import 增加 `Button`（从 `@workspace/ui`），ganttUtils import 增加 `pxToDays, shiftPlanByDays, type DragMode`，react import 增加 `useState`。

- [ ] **Step 1: 替换整个文件为**

```tsx
import { Fragment, useMemo, useState } from 'react'
import { Button, HoverCard, HoverCardContent, HoverCardTrigger } from '@workspace/ui'
import type { GanttTask } from '@/types/order'
import {
  enumerateDays, floorDay, getDisplayStatus, taskBars, timeToX,
  pxToDays, shiftPlanByDays,
  type DisplayStatus, type DragMode, type GanttGroup,
} from './ganttUtils'

const LABEL_W = 176
const DAY_W = 44
const ROW_H = 34
const GROUP_H = 30
const HANDLE_W = 6 // 两端缩放句柄宽

const STATUS_BAR: Record<DisplayStatus, string> = {
  notStarted: 'bg-slate-400',
  inProgress: 'bg-amber-500',
  overdue: 'bg-red-500',
  completed: 'bg-green-500',
}
const STATUS_TEXT: Record<DisplayStatus, string> = {
  notStarted: '未开工',
  inProgress: '进行中',
  overdue: '逾期',
  completed: '已完工',
}

function fmtDay(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

interface DragState {
  taskId: string
  mode: DragMode
  startX: number
  task: GanttTask
}

interface Props {
  groups: GanttGroup[]
  rangeStartMs: number
  rangeEndMs: number
  nowMs: number
  onTaskClick: (t: GanttTask) => void
  onReschedule?: (t: GanttTask, planStartTime: string, planEndTime: string) => void
  onQuickStart?: (t: GanttTask) => void
  onQuickFinish?: (t: GanttTask) => void
}

export default function GanttChart({
  groups, rangeStartMs, rangeEndMs, nowMs,
  onTaskClick, onReschedule, onQuickStart, onQuickFinish,
}: Props) {
  const days = useMemo(() => enumerateDays(rangeStartMs, rangeEndMs), [rangeStartMs, rangeEndMs])
  const trackWidth = days.length * DAY_W
  const todayLeft = timeToX(floorDay(nowMs), rangeStartMs, DAY_W)
  const showToday = floorDay(nowMs) >= floorDay(rangeStartMs) && floorDay(nowMs) <= floorDay(rangeEndMs)

  const [drag, setDrag] = useState<DragState | null>(null)
  const [previewDays, setPreviewDays] = useState(0)

  function beginDrag(e: React.PointerEvent<HTMLDivElement>, t: GanttTask) {
    if (!onReschedule) return
    const rect = e.currentTarget.getBoundingClientRect()
    const offset = e.clientX - rect.left
    const mode: DragMode =
      offset < HANDLE_W ? 'resize-start' : offset > rect.width - HANDLE_W ? 'resize-end' : 'move'
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ taskId: t.id, mode, startX: e.clientX, task: t })
    setPreviewDays(0)
  }
  function moveDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    setPreviewDays(pxToDays(e.clientX - drag.startX, DAY_W))
  }
  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const d = pxToDays(e.clientX - drag.startX, DAY_W)
    if (d !== 0 && onReschedule) {
      const r = shiftPlanByDays(drag.task, d, drag.mode)
      onReschedule(drag.task, r.planStartTime ?? '', r.planEndTime ?? '')
    }
    setDrag(null)
    setPreviewDays(0)
  }

  const gridStyle = {
    width: trackWidth,
    backgroundImage:
      `repeating-linear-gradient(to right, transparent, transparent ${DAY_W - 1}px, var(--border) ${DAY_W - 1}px, var(--border) ${DAY_W}px)`,
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
        暂无派工任务数据
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <div style={{ minWidth: LABEL_W + trackWidth }}>
          {/* 表头 */}
          <div className="flex border-b bg-muted/40">
            <div
              className="sticky left-0 z-20 shrink-0 border-r bg-muted/40 px-3 text-xs font-medium text-muted-foreground flex items-center"
              style={{ width: LABEL_W, height: GROUP_H }}
            >
              班组 / 工序
            </div>
            <div className="relative" style={{ width: trackWidth, height: GROUP_H }}>
              {days.map((d, i) => (
                <div
                  key={d}
                  className="absolute top-0 flex h-full items-center justify-center border-r text-[11px] text-muted-foreground"
                  style={{ left: i * DAY_W, width: DAY_W }}
                >
                  {fmtDay(d)}
                </div>
              ))}
              {showToday && (
                <div className="absolute top-0 z-10 h-full w-px bg-red-500/70" style={{ left: todayLeft }} />
              )}
            </div>
          </div>

          {/* 分组 + 行 */}
          {groups.map((g) => (
            <div key={g.key}>
              <div className="flex items-center border-b bg-muted/60" style={{ height: GROUP_H }}>
                <div
                  className="sticky left-0 z-10 shrink-0 truncate border-r bg-muted/60 px-3 text-sm font-semibold"
                  style={{ width: LABEL_W, height: GROUP_H, lineHeight: `${GROUP_H}px` }}
                  title={g.label}
                >
                  {g.label}
                  {g.tag && <span className="ml-1 text-xs font-normal text-muted-foreground">{g.tag}</span>}
                </div>
                <div className="relative" style={{ width: trackWidth, height: GROUP_H }}>
                  {showToday && <div className="absolute top-0 h-full w-px bg-red-500/40" style={{ left: todayLeft }} />}
                </div>
              </div>

              {g.rows.map((row) => (
                <div key={row.key} className="flex border-b last:border-b-0">
                  <div
                    className="sticky left-0 z-10 shrink-0 truncate border-r bg-card px-3 text-sm"
                    style={{ width: LABEL_W, height: ROW_H, lineHeight: `${ROW_H}px` }}
                    title={row.label}
                  >
                    {row.label}
                  </div>
                  <div className="relative" style={{ ...gridStyle, height: ROW_H }}>
                    {showToday && <div className="absolute top-0 z-10 h-full w-px bg-red-500/40" style={{ left: todayLeft }} />}
                    {row.tasks.map((t) => {
                      const isDragging = drag?.taskId === t.id
                      const effTask: GanttTask = isDragging
                        ? { ...t, ...shiftPlanByDays(t, previewDays, drag!.mode) }
                        : t
                      const bars = taskBars(effTask, rangeStartMs, DAY_W, nowMs)
                      const st = getDisplayStatus(t, nowMs)
                      const canDrag = !!onReschedule && st !== 'completed'
                      return (
                        <Fragment key={t.id}>
                          {bars.plan && (
                            <div
                              className={`absolute ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'z-20' : ''}`}
                              style={{ left: bars.plan.left + 2, width: Math.max(bars.plan.width - 4, 6), top: 1, height: 12 }}
                              onPointerDown={canDrag ? (e) => beginDrag(e, t) : undefined}
                              onPointerMove={canDrag ? moveDrag : undefined}
                              onPointerUp={canDrag ? endDrag : undefined}
                              title={canDrag ? '拖动整体平移 · 拖两端缩放' : undefined}
                            >
                              <div className="absolute inset-x-0 rounded bg-slate-300/80 dark:bg-slate-600/70" style={{ top: 3, height: 7 }} />
                              {canDrag && (
                                <>
                                  <div className="absolute left-0 top-0 h-full cursor-ew-resize" style={{ width: HANDLE_W }} />
                                  <div className="absolute right-0 top-0 h-full cursor-ew-resize" style={{ width: HANDLE_W }} />
                                </>
                              )}
                            </div>
                          )}
                          {bars.actual && (
                            <HoverCard openDelay={120} closeDelay={60}>
                              <HoverCardTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onTaskClick(t)}
                                  className={`absolute flex items-center overflow-hidden rounded px-1.5 text-left text-[11px] text-white transition hover:brightness-110 hover:ring-2 hover:ring-ring focus:outline-none focus:ring-2 focus:ring-ring ${STATUS_BAR[st]}`}
                                  style={{ left: bars.actual.left + 2, width: Math.max(bars.actual.width - 4, 14), top: 14, height: ROW_H - 18 }}
                                >
                                  <span className="truncate">
                                    {t.operName}
                                    {t.progress != null ? ` ${t.progress}%` : ''}
                                  </span>
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-64 text-xs" side="top">
                                <div className="mb-1 text-sm font-semibold">
                                  {t.orderCode} · {t.operName}
                                </div>
                                <div className="space-y-0.5 text-muted-foreground">
                                  <div>班组：{t.teamName} / {t.userName}</div>
                                  <div>计划：{t.planStartTime || '—'} ~ {t.planEndTime || '—'}</div>
                                  <div>实际：{t.actualStartTime || '—'} ~ {t.actualEndTime || '进行中'}</div>
                                  <div>进度：{t.progress ?? 0}% · {STATUS_TEXT[st]}</div>
                                </div>
                                {(onQuickStart || onQuickFinish) && (t.dispatchStatus === 1 || t.dispatchStatus === 2) && (
                                  <div className="mt-2 flex gap-2 border-t pt-2">
                                    {t.dispatchStatus === 1 && onQuickStart && (
                                      <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => onQuickStart(t)}>
                                        记录开工
                                      </Button>
                                    )}
                                    {t.dispatchStatus === 2 && onQuickFinish && (
                                      <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => onQuickFinish(t)}>
                                        记录完工
                                      </Button>
                                    )}
                                  </div>
                                )}
                                <div className="mt-1 text-primary">点击查看详情 →</div>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误（若 `Button` 不在 `@workspace/ui` 顶层导出，改从其正确子路径导入；先 `grep -rn "export.*Button" packages` 确认）

- [ ] **Step 3: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/order/gantt/GanttChart.tsx
git commit -m "✨ feat(mes-new): 甘特计划条 pointer 拖拽层(平移/两端缩放/实时预览) + 悬停开工完工快捷按钮"
```

---

## Task 9：TaskDetailSheet 升级为可编辑

**Files:** Modify `mes/frontend/apps/mes-new/src/pages/order/gantt/TaskDetailSheet.tsx`

> 用普通 `useState` 受控输入,不引入 RHF（规避字段名 DOM 冲突）。datetime 复用 `@/utils/datetime` 的 `toDatetimeLocal/fromDatetimeLocal`。

- [ ] **Step 1: 替换整个文件为**

```tsx
import { useEffect, useState } from 'react'
import {
  Button, Input, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@workspace/ui'
import type { GanttTask } from '@/types/order'
import { fromDatetimeLocal, toDatetimeLocal } from '@/utils/datetime'
import { getDisplayStatus, type DisplayStatus } from './ganttUtils'

const STATUS_TEXT: Record<DisplayStatus, string> = {
  notStarted: '未开工',
  inProgress: '进行中',
  overdue: '逾期',
  completed: '已完工',
}
const TYPE_TEXT: Record<string, string> = { P: '量产', A: '验证', F: '返工' }

interface Props {
  task: GanttTask | null
  nowMs: number
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  onStart?: (id: string, actualStartTime: string) => void
  onFinish?: (id: string, actualEndTime: string) => void
  onProgress?: (id: string, progress: number) => void
  onAdjustActual?: (id: string, actualStartTime: string, actualEndTime: string) => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value || '—'}</span>
    </div>
  )
}

export default function TaskDetailSheet({
  task, nowMs, open, onOpenChange, busy,
  onStart, onFinish, onProgress, onAdjustActual,
}: Props) {
  const st = task ? getDisplayStatus(task, nowMs) : 'notStarted'

  // 受控输入(避开 RHF 字段名 DOM 冲突)
  const [actStart, setActStart] = useState('')
  const [actEnd, setActEnd] = useState('')
  const [prog, setProg] = useState(0)

  useEffect(() => {
    if (!task) return
    setActStart(toDatetimeLocal(task.actualStartTime))
    setActEnd(toDatetimeLocal(task.actualEndTime))
    setProg(task.progress ?? 0)
  }, [task?.id, task?.actualStartTime, task?.actualEndTime, task?.progress])

  const status = task?.dispatchStatus
  const canEdit = !!task && (!!onStart || !!onFinish || !!onProgress || !!onAdjustActual)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:max-w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task ? `${task.orderCode} · ${task.operName}` : '任务详情'}</SheetTitle>
          <SheetDescription>派工任务详情与执行回填</SheetDescription>
        </SheetHeader>
        {task && (
          <div className="mt-4">
            <Row label="工单编号" value={task.orderCode} />
            <Row label="物料" value={`${task.materielDesc || task.materiel}${task.qty != null ? ' ×' + task.qty : ''}`} />
            <Row label="订单类型" value={TYPE_TEXT[task.orderType] ?? task.orderType} />
            <Row label="工序" value={task.operName} />
            <Row label="班组 / 作业员" value={`${task.teamName} / ${task.userName}`} />
            <Row label="计划时间" value={`${task.planStartTime || '—'} ~ ${task.planEndTime || '—'}`} />
            <Row label="实际时间" value={`${task.actualStartTime || '—'} ~ ${task.actualEndTime || '进行中'}`} />
            <Row label="完工进度" value={`${task.progress ?? 0}%`} />
            <Row label="显示状态" value={STATUS_TEXT[st]} />

            {canEdit && (
              <div className="mt-5 space-y-4">
                <div className="text-sm font-semibold">执行回填</div>

                {/* 已派工: 记录开工 */}
                {status === 1 && onStart && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">记录实际开工(留空则用当前时间)</div>
                    <Input type="datetime-local" className="h-9" value={actStart} onChange={(e) => setActStart(e.target.value)} />
                    <Button size="sm" disabled={busy} onClick={() => onStart(task.id, fromDatetimeLocal(actStart))}>
                      记录开工
                    </Button>
                  </div>
                )}

                {/* 已开工: 记录完工 + 更新进度 */}
                {status === 2 && (
                  <>
                    {onFinish && (
                      <div className="space-y-2 rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">记录实际完工(留空则用当前时间;完工后进度置 100%)</div>
                        <Input type="datetime-local" className="h-9" value={actEnd} onChange={(e) => setActEnd(e.target.value)} />
                        <Button size="sm" disabled={busy} onClick={() => onFinish(task.id, fromDatetimeLocal(actEnd))}>
                          记录完工
                        </Button>
                      </div>
                    )}
                    {onProgress && (
                      <div className="space-y-2 rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">更新进度(0-100)</div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" min={0} max={100} className="h-9 w-24"
                            value={prog}
                            onChange={(e) => setProg(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onProgress(task.id, prog)}>
                            保存进度
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 已开工/已完工: 手动修正实际时间 */}
                {status != null && status >= 2 && onAdjustActual && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">手动修正实际时间(纠错用)</div>
                    <label className="text-xs text-muted-foreground">实际开工</label>
                    <Input type="datetime-local" className="h-9" value={actStart} onChange={(e) => setActStart(e.target.value)} />
                    <label className="text-xs text-muted-foreground">实际完工</label>
                    <Input type="datetime-local" className="h-9" value={actEnd} onChange={(e) => setActEnd(e.target.value)} />
                    <Button
                      size="sm" variant="outline" disabled={busy}
                      onClick={() => onAdjustActual(task.id, fromDatetimeLocal(actStart), fromDatetimeLocal(actEnd))}
                    >
                      保存修正
                    </Button>
                  </div>
                )}

                {status === 3 && (
                  <div className="text-xs text-muted-foreground">任务已完工。如需纠错可用上方"手动修正实际时间"。</div>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/order/gantt/TaskDetailSheet.tsx
git commit -m "✨ feat(mes-new): TaskDetailSheet 升级可编辑(开工/完工/进度/纠时,按状态显隐,受控输入)"
```

---

## Task 10：GanttPage 编排 5 个 mutation

**Files:** Modify `mes/frontend/apps/mes-new/src/pages/order/gantt/GanttPage.tsx`

- [ ] **Step 1: 替换整个文件为**

```tsx
import { useMemo, useState } from 'react'
import {
  Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, toast,
} from '@workspace/ui'
import PageContainer from '@/components/PageContainer'
import { useMutation$, useQuery$ } from '@/http/hooks'
import {
  fetchGanttTasks, rescheduleTask, startTask, finishTask, updateTaskProgress, adjustTaskActual,
} from '@/api/order/gantt'
import type {
  GanttTask, GanttRescheduleReq, GanttStartReq, GanttFinishReq, GanttProgressReq, GanttActualReq,
} from '@/types/order'
import { computeRange, groupByOrder, groupByResource } from './ganttUtils'
import GanttChart from './GanttChart'
import TaskDetailSheet from './TaskDetailSheet'

const LEGEND: { cls: string; text: string }[] = [
  { cls: 'bg-slate-300 dark:bg-slate-600', text: '计划' },
  { cls: 'bg-slate-400', text: '未开工' },
  { cls: 'bg-amber-500', text: '进行中' },
  { cls: 'bg-green-500', text: '已完工' },
  { cls: 'bg-red-500', text: '逾期' },
]

export default function GanttPage() {
  const { data, loading, refetch } = useQuery$(['gantt', 'tasks'], () => fetchGanttTasks({}))
  const tasks = useMemo(() => data ?? [], [data])
  const [nowMs] = useState(() => Date.now())

  const [orderCode, setOrderCode] = useState('')
  const [teamId, setTeamId] = useState('all')
  const [tab, setTab] = useState('resource')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // active 按 id 从最新 tasks 派生,refetch 后自动反映新状态
  const active = useMemo(() => tasks.find((t) => t.id === activeId) ?? null, [tasks, activeId])

  const reM = useMutation$((b: GanttRescheduleReq) => rescheduleTask(b))
  const stM = useMutation$((b: GanttStartReq) => startTask(b))
  const fiM = useMutation$((b: GanttFinishReq) => finishTask(b))
  const prM = useMutation$((b: GanttProgressReq) => updateTaskProgress(b))
  const acM = useMutation$((b: GanttActualReq) => adjustTaskActual(b))
  const busy = reM.loading || stM.loading || fiM.loading || prM.loading || acM.loading

  const handleReschedule = async (t: GanttTask, planStartTime: string, planEndTime: string) => {
    try {
      await reM.mutate({ id: t.id, planStartTime, planEndTime })
      toast.success('已改期')
      refetch()
    } catch { /* 拦截器已 toast */ }
  }
  const handleStart = async (id: string, actualStartTime: string) => {
    try { await stM.mutate({ id, actualStartTime: actualStartTime || undefined }); toast.success('已记录开工'); refetch() } catch {}
  }
  const handleFinish = async (id: string, actualEndTime: string) => {
    try { await fiM.mutate({ id, actualEndTime: actualEndTime || undefined }); toast.success('已记录完工'); refetch() } catch {}
  }
  const handleProgress = async (id: string, progress: number) => {
    try { await prM.mutate({ id, progress }); toast.success('进度已更新'); refetch() } catch {}
  }
  const handleAdjustActual = async (id: string, actualStartTime: string, actualEndTime: string) => {
    try {
      await acM.mutate({ id, actualStartTime: actualStartTime || undefined, actualEndTime: actualEndTime || undefined })
      toast.success('实际时间已修正')
      refetch()
    } catch {}
  }

  const teamOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of tasks) m.set(t.teamId, t.teamName || '未分组班组')
    return [...m].map(([id, name]) => ({ id, name }))
  }, [tasks])

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!orderCode || (t.orderCode ?? '').toLowerCase().includes(orderCode.toLowerCase())) &&
          (teamId === 'all' || t.teamId === teamId),
      ),
    [tasks, orderCode, teamId],
  )

  const range = useMemo(() => computeRange(filtered, nowMs), [filtered, nowMs])
  const resourceGroups = useMemo(() => groupByResource(filtered), [filtered])
  const orderGroups = useMemo(() => groupByOrder(filtered), [filtered])

  const onTaskClick = (t: GanttTask) => {
    setActiveId(t.id)
    setSheetOpen(true)
  }

  const chartHandlers = {
    onTaskClick,
    onReschedule: handleReschedule,
    onQuickStart: (t: GanttTask) => handleStart(t.id, ''),
    onQuickFinish: (t: GanttTask) => handleFinish(t.id, ''),
  }

  return (
    <PageContainer
      title="生产甘特图"
      description="拖动计划条改期,点击任务回填执行(开工/完工/进度)"
      actions={
        <Button variant="outline" size="sm" onClick={refetch}>
          刷新
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="g-code">工单编号</label>
          <Input
            id="g-code"
            className="h-9 w-48"
            placeholder="按工单编号过滤"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="g-team">班组</label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger id="g-team" className="h-9 w-44">
              <SelectValue placeholder="全部班组" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部班组</SelectItem>
              {teamOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 pb-1.5">
          {LEGEND.map((l) => (
            <span key={l.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-block h-2.5 w-4 rounded-sm ${l.cls}`} />
              {l.text}
            </span>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="resource">资源视角</TabsTrigger>
          <TabsTrigger value="order">订单视角</TabsTrigger>
        </TabsList>
        <TabsContent value="resource" className="pt-3">
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <GanttChart
              groups={resourceGroups}
              rangeStartMs={range.startMs}
              rangeEndMs={range.endMs}
              nowMs={nowMs}
              {...chartHandlers}
            />
          )}
        </TabsContent>
        <TabsContent value="order" className="pt-3">
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <GanttChart
              groups={orderGroups}
              rangeStartMs={range.startMs}
              rangeEndMs={range.endMs}
              nowMs={nowMs}
              {...chartHandlers}
            />
          )}
        </TabsContent>
      </Tabs>

      <TaskDetailSheet
        task={active}
        nowMs={nowMs}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        busy={busy}
        onStart={handleStart}
        onFinish={handleFinish}
        onProgress={handleProgress}
        onAdjustActual={handleAdjustActual}
      />
    </PageContainer>
  )
}
```

- [ ] **Step 2: 类型检查 + lint + 全量前端测试**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit
cd mes/frontend && pnpm --filter mes-new exec vitest run
cd mes/frontend && pnpm lint
```
Expected: tsc 无错误；vitest 全绿；lint 无新增错误。
> 若 `toast` 不在 `@workspace/ui` 顶层导出，按现有用法 `grep -rn "toast" src` 找正确导入路径并改之。

- [ ] **Step 3: 提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/order/gantt/GanttPage.tsx
git commit -m "✨ feat(mes-new): GanttPage 编排改期/开工/完工/进度/纠时 mutation,active 按 id 派生 + 成功 refetch"
```

---

## 验证（实现全部完成后整体跑一遍，贴真实输出）

```bash
# 后端
cd mes && mvn -q -DskipTests compile
cd mes && mvn -q -Dtest=SpGanttServiceImplTest test
# 前端
cd mes/frontend && pnpm --filter mes-new exec vitest run
cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit
cd mes/frontend && pnpm lint
```

**人工联调（无法脚本化:登录需验证码）：** 起 `cd mes && mvn spring-boot:run`(:9090) + `cd mes/frontend && pnpm dev`(:4100)，进 `/order/gantt`：
1. 拖计划条中部 → 整体平移；拖左/右端 → 缩放；松手 toast「已改期」、条位更新。
2. 悬停未开工任务 →「记录开工」→ 条变琥珀；悬停进行中 →「记录完工」→ 条变绿。
3. 点击任务开 Sheet → 进度滑块保存、手动修正实际时间保存均生效且 Sheet 状态随之刷新。
4. 已完工任务计划条不可拖。

---

## Self-Review 结论

- **Spec 覆盖**：5 写操作(改期/开工/完工/进度/纠时)=Task 1-4 端点 + Task 8-10 前端；状态守卫=Task 3/5；拖拽平移+缩放=Task 6/8；回填两处(悬停+Sheet)=Task 8/9；TDD=Task 5/6；零迁移=确认列已存在。无遗漏。
- **类型一致**：服务方法签名(`reschedule/recordStart/recordFinish/updateProgress/adjustActual`)在接口 Task2、实现 Task3、控制器 Task4、单测 Task5 完全一致；前端 API 名(`rescheduleTask/startTask/finishTask/updateTaskProgress/adjustTaskActual`)在 Task7 定义、Task10 调用一致；`DragMode/pxToDays/shiftPlanByDays` 在 Task6 定义、Task8 使用一致。
- **占位符**：无 TBD/TODO；唯一可选清理点是 Task5 的 `STATUS()` 可读性包装(已注明可删)。
- **已知假设**：时间字符串字典序比较；`@workspace/ui` 导出 `Button/toast`(实现时 grep 确认，否则换正确导入路径)。
</content>
