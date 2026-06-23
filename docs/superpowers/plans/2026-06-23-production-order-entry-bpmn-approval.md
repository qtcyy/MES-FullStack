# 生产订单录入 + 轻量 BPMN 审批 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 vue3 前端 + 后端实现「生产订单录入(需求/预测订单+BOM)→ 提交审核中 → 生产主管签收/提交 → 订单转待运算」,审批由自研轻量 BPMN 运行时驱动。

**Architecture:** 复用 `sp_order` 表(用 `order_source` 区分生产订单)。后端补齐 `SpOrder` 实体字段,新增「轻量 BPMN 运行时」(DOM 解析标准 BPMN2.0 XML + token 推进 + 真实 claim/complete),用按 `business_type` 分发的 Java 钩子在流程结束时把订单置为 APPROVED/待运算。前端在「生产计划中心」下新增「生产订单录入」与「待办任务」两页 + 首页待办卡片。

**Tech Stack:** Java 8 / Spring Boot 2.1.7 / MyBatis-Plus / Shiro / JUnit;Vue3 / Element Plus / TypeScript / Vite。

---

## 重要约定(执行前必读)

- **后端构建**:`./mvnw` 已损坏。编译/测试用系统 mvn(JDK11+):`cd mes && mvn -q compile` / `mvn -q test`。参见记忆 [[backend-build-mvnw-broken]]。
- **后端审查**:历史后端多为 DeepSeek 生成、常含 bug。本计划涉及的既有后端文件改动后需通读确认。参见 [[backend-deepseek-review-each-cycle]]。
- **菜单/权限**:侧边栏由 `sp_sys_menu` 驱动且**不按角色过滤**;前端权限集合从菜单树 `permission` 字段收集 → 所有登录用户拿到相同权限集。因此「计划员只能建、主管只能批」的**真实功能隔离靠后端**:待办列表只返回 `candidate_role_code` 命中当前用户 Shiro 角色的任务。前端 `v-permission` 仅作按钮装饰。参见 [[menu-driven-sidebar-route-mapping]]。
- **路由 path 必须与种子菜单 url 一致**,否则侧边栏点不进去。本计划统一用 `/order/entry`(录入)与 `/order/todo`(待办)。
- **测试策略**:对纯逻辑(BPMN 解析/图导航)用 JUnit 做 TDD;DB/HTTP 相关用「编译通过 + 登录后 curl 验证」;前端用 `tsc --noEmit` + `pnpm build` + 手动验证(本项目无前端测试运行器)。
- **TS 类型检查**:`cd mes/vue3 && pnpm exec vue-tsc --noEmit`(若无该脚本,用 `pnpm build` 代替验证)。
- **dev 已关验证码**,可脚本化登录(admin/123)。

---

## 文件结构(本计划创建/修改)

**后端 `mes/src/main/java/com/wangziyang/mes/`**
- 修改 `order/entity/SpOrder.java` — 补 10 个字段
- 新建 `order/request/ProductionOrderReq.java` — 生产订单分页请求
- 新建 `order/controller/ProductionOrderController.java` — `/plan/order`
- 新建 `workflow/runtime/` 子包:
  - `bpmn/ProcessGraph.java`、`bpmn/BpmnParser.java`、`bpmn/NodeType.java`、`bpmn/UserTaskDef.java` — 纯解析层
  - `entity/SpWorkflowInstance.java`、`entity/SpWorkflowTask.java`、`entity/SpWorkflowEventLog.java`
  - `mapper/SpWorkflowInstanceMapper.java`、`mapper/SpWorkflowTaskMapper.java`、`mapper/SpWorkflowEventLogMapper.java`
  - `service/IWorkflowEngineService.java` + `service/impl/WorkflowEngineServiceImpl.java`
  - `hook/AuditCallback.java`(接口)+ `hook/OrderAuditCallback.java`(实现)
  - `controller/WorkflowTaskController.java` — `/workflow/task`
  - `request/WorkflowTaskPageReq.java`
- 测试 `mes/src/test/java/com/wangziyang/mes/workflow/runtime/bpmn/BpmnParserTest.java`

**SQL `scripts/sql/`**
- 新建 `plan-order-bpmn-seed.sql` — 角色/账号/菜单/角色菜单/台式电脑主机 BOM/订单审批 BPMN 模型

**前端 `mes/vue3/src/`**
- 新建 `types/plan.ts`
- 新建 `api/plan/order-entry.ts`、`api/workflow/task.ts`
- 新建 `views/plan/order-entry/OrderEntryList.vue`、`OrderEntryForm.vue`
- 新建 `views/plan/todo/TodoList.vue`、`TodoApprovalDrawer.vue`
- 新建 `views/welcome/components/MyTodoCard.vue`(若 welcome 目录结构不同则就近放置)
- 修改 `router/index.ts` — 加 2 条路由
- 修改 `views/welcome/WelcomeView.vue` — 挂载待办卡片

---

## Phase 0:准备与实体补齐

### Task 0.1: 建分支 + 基线编译

**Files:** 无(仅 git / 构建)

- [ ] **Step 1: 从 develop 建分支**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git checkout develop && git pull --ff-only 2>/dev/null; git checkout -b feature/plan-order-bpmn
```

- [ ] **Step 2: 基线编译,确认改动前后端可编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS(若失败,先记录原始报错,后续不背锅)

- [ ] **Step 3: 基线前端类型检查**

Run: `cd mes/vue3 && pnpm install --frozen-lockfile && pnpm build`
Expected: 构建成功

---

### Task 0.2: SpOrder 实体补齐 10 个字段

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/order/entity/SpOrder.java`

- [ ] **Step 1: 在 `statue` 字段后追加字段声明**

在 `SpOrder.java` 的 `private Integer statue;` 之后、`public String getOrderCode()` 之前插入:

```java
    /** 订单来源 DEMAND需求订单 FORECAST预测订单 */
    private String orderSource;
    /** 排产方式 FORWARD正向 BACKWARD逆向 */
    private String scheduleMode;
    /** 产品BOM ID */
    private String bomId;
    /** 产品BOM编码 */
    private String bomCode;
    /** BOM版本 */
    private String bomVersion;
    /** 客户名称 */
    private String customerName;
    /** 销售合同号 */
    private String contractNo;
    /** 订单优先级，数字越小优先级越高 */
    private Integer priority;
    /** 审批状态 DRAFT/APPROVING/APPROVED/REJECTED */
    private String auditStatus;
    /** 计划状态 UNCOMPUTED/COMPUTED/RELEASED/CANCELLED/DONE */
    private String planStatus;
```

- [ ] **Step 2: 追加对应 getter/setter**

在 `setStatue(...)` 之后、`toString()` 之前,按 JavaBean 规范为上述 10 个字段补全 getter/setter(类型:String × 8 + Integer priority + String;命名 `getOrderSource/setOrderSource` … `getPlanStatus/setPlanStatus`)。

- [ ] **Step 3: 编译验证**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/entity/SpOrder.java
git commit -m "✨ feat(order): SpOrder 补齐生产订单字段(来源/排产/BOM/审批/计划状态)"
```

---

## Phase 1:BPMN 解析层(TDD,纯逻辑)

### Task 1.1: NodeType 枚举 + UserTaskDef

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/workflow/runtime/bpmn/NodeType.java`
- Create: `mes/src/main/java/com/wangziyang/mes/workflow/runtime/bpmn/UserTaskDef.java`

- [ ] **Step 1: 写 NodeType**

```java
package com.wangziyang.mes.workflow.runtime.bpmn;

public enum NodeType {
    START, USER_TASK, END, UNKNOWN
}
```

- [ ] **Step 2: 写 UserTaskDef**

```java
package com.wangziyang.mes.workflow.runtime.bpmn;

/** 一个 userTask 节点的元数据 */
public class UserTaskDef {
    private final String id;
    private final String name;
    private final String candidateGroups; // 角色编码(可空)
    private final String assignee;        // 指定人(可空)

    public UserTaskDef(String id, String name, String candidateGroups, String assignee) {
        this.id = id;
        this.name = name;
        this.candidateGroups = candidateGroups;
        this.assignee = assignee;
    }
    public String getId() { return id; }
    public String getName() { return name; }
    public String getCandidateGroups() { return candidateGroups; }
    public String getAssignee() { return assignee; }
}
```

- [ ] **Step 3: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

---

### Task 1.2: ProcessGraph(图模型 + 导航)

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/workflow/runtime/bpmn/ProcessGraph.java`

- [ ] **Step 1: 写 ProcessGraph**

```java
package com.wangziyang.mes.workflow.runtime.bpmn;

import java.util.HashMap;
import java.util.Map;

/** 解析后的流程图:节点类型表 + 单出边表 + userTask 元数据。仅支持线性(单出边)流程。 */
public class ProcessGraph {
    private final Map<String, NodeType> nodeTypes = new HashMap<>();
    private final Map<String, String> outgoing = new HashMap<>();   // sourceId -> targetId
    private final Map<String, UserTaskDef> userTasks = new HashMap<>();
    private String startEventId;

    void putNode(String id, NodeType type) {
        nodeTypes.put(id, type);
        if (type == NodeType.START) startEventId = id;
    }
    void putFlow(String sourceId, String targetId) { outgoing.put(sourceId, targetId); }
    void putUserTask(UserTaskDef def) { userTasks.put(def.getId(), def); }

    public String getStartEventId() { return startEventId; }
    public NodeType typeOf(String nodeId) { return nodeTypes.getOrDefault(nodeId, NodeType.UNKNOWN); }
    public String nextNodeId(String fromId) { return outgoing.get(fromId); }
    public UserTaskDef userTask(String nodeId) { return userTasks.get(nodeId); }

    /** 从 startEvent 起沿出边找到的第一个 userTask;无则返回 null */
    public UserTaskDef firstUserTask() {
        String cur = startEventId;
        int guard = 0;
        while (cur != null && guard++ < 100) {
            if (typeOf(cur) == NodeType.USER_TASK) return userTasks.get(cur);
            cur = outgoing.get(cur);
        }
        return null;
    }

    /** 从某节点起,跳过非 userTask 节点,找到下一个 userTask;若先遇 END 或走到尽头返回 null(表示流程应结束) */
    public UserTaskDef nextUserTaskAfter(String fromNodeId) {
        String cur = outgoing.get(fromNodeId);
        int guard = 0;
        while (cur != null && guard++ < 100) {
            NodeType t = typeOf(cur);
            if (t == NodeType.USER_TASK) return userTasks.get(cur);
            if (t == NodeType.END) return null;
            cur = outgoing.get(cur);
        }
        return null;
    }
}
```

- [ ] **Step 2: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

---

### Task 1.3: BpmnParser(TDD)

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/workflow/runtime/bpmn/BpmnParser.java`
- Test: `mes/src/test/java/com/wangziyang/mes/workflow/runtime/bpmn/BpmnParserTest.java`

- [ ] **Step 1: 写失败测试**

```java
package com.wangziyang.mes.workflow.runtime.bpmn;

import org.junit.Assert;
import org.junit.Test;

public class BpmnParserTest {

    private static final String XML =
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
        "<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" " +
        "xmlns:flowable=\"http://flowable.org/bpmn\">" +
        "  <bpmn:process id=\"orderAudit\" name=\"订单审批\" isExecutable=\"true\">" +
        "    <bpmn:startEvent id=\"start\" name=\"开始\"/>" +
        "    <bpmn:userTask id=\"approve\" name=\"审批\" flowable:candidateGroups=\"prod_supervisor\"/>" +
        "    <bpmn:endEvent id=\"end\" name=\"结束\"/>" +
        "    <bpmn:sequenceFlow id=\"f1\" sourceRef=\"start\" targetRef=\"approve\"/>" +
        "    <bpmn:sequenceFlow id=\"f2\" sourceRef=\"approve\" targetRef=\"end\"/>" +
        "  </bpmn:process>" +
        "</bpmn:definitions>";

    @Test
    public void parsesStartUserTaskEnd() {
        ProcessGraph g = BpmnParser.parse(XML);
        Assert.assertEquals("start", g.getStartEventId());
        Assert.assertEquals(NodeType.USER_TASK, g.typeOf("approve"));
        Assert.assertEquals(NodeType.END, g.typeOf("end"));

        UserTaskDef first = g.firstUserTask();
        Assert.assertNotNull(first);
        Assert.assertEquals("approve", first.getId());
        Assert.assertEquals("审批", first.getName());
        Assert.assertEquals("prod_supervisor", first.getCandidateGroups());

        // approve 之后没有别的 userTask(下一站是 end)
        Assert.assertNull(g.nextUserTaskAfter("approve"));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mes && mvn -q -Dtest=BpmnParserTest test`
Expected: 编译失败(BpmnParser 不存在)

- [ ] **Step 3: 写 BpmnParser 实现**

```java
package com.wangziyang.mes.workflow.runtime.bpmn;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/** 解析标准 BPMN 2.0 XML 为 ProcessGraph。忽略命名空间前缀,按元素 localName 识别。 */
public final class BpmnParser {

    private BpmnParser() {}

    public static ProcessGraph parse(String bpmnXml) {
        if (bpmnXml == null || bpmnXml.trim().isEmpty()) {
            throw new IllegalArgumentException("BPMN XML 为空");
        }
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(
                new ByteArrayInputStream(bpmnXml.getBytes(StandardCharsets.UTF_8)));

            ProcessGraph graph = new ProcessGraph();
            NodeList all = doc.getElementsByTagName("*");
            for (int i = 0; i < all.getLength(); i++) {
                Node n = all.item(i);
                if (n.getNodeType() != Node.ELEMENT_NODE) continue;
                Element el = (Element) n;
                String local = localName(el);
                switch (local) {
                    case "startEvent":
                        graph.putNode(el.getAttribute("id"), NodeType.START);
                        break;
                    case "endEvent":
                        graph.putNode(el.getAttribute("id"), NodeType.END);
                        break;
                    case "userTask": {
                        String id = el.getAttribute("id");
                        graph.putNode(id, NodeType.USER_TASK);
                        graph.putUserTask(new UserTaskDef(
                            id,
                            el.getAttribute("name"),
                            attrByLocalName(el, "candidateGroups"),
                            attrByLocalName(el, "assignee")));
                        break;
                    }
                    case "sequenceFlow":
                        graph.putFlow(el.getAttribute("sourceRef"), el.getAttribute("targetRef"));
                        break;
                    default:
                        // 网关/服务任务等本期不支持,忽略
                }
            }
            if (graph.getStartEventId() == null) {
                throw new IllegalStateException("BPMN 缺少 startEvent");
            }
            return graph;
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            throw new IllegalStateException("解析 BPMN 失败: " + e.getMessage(), e);
        }
    }

    private static String localName(Element el) {
        String ln = el.getLocalName();
        if (ln != null) return ln;
        String tag = el.getTagName();
        int idx = tag.indexOf(':');
        return idx >= 0 ? tag.substring(idx + 1) : tag;
    }

    /** 按属性 localName 取值(忽略 flowable:/activiti: 前缀差异);无则空串 */
    private static String attrByLocalName(Element el, String wanted) {
        NamedNodeMap attrs = el.getAttributes();
        for (int i = 0; i < attrs.getLength(); i++) {
            Node a = attrs.item(i);
            String ln = a.getLocalName();
            if (ln == null) {
                String name = a.getNodeName();
                int idx = name.indexOf(':');
                ln = idx >= 0 ? name.substring(idx + 1) : name;
            }
            if (wanted.equals(ln)) return a.getNodeValue();
        }
        return "";
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd mes && mvn -q -Dtest=BpmnParserTest test`
Expected: Tests run: 1, Failures: 0

- [ ] **Step 5: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/workflow/runtime/bpmn/ mes/src/test/java/com/wangziyang/mes/workflow/runtime/bpmn/
git commit -m "✨ feat(workflow): 轻量BPMN解析层(ProcessGraph+BpmnParser)含单测"
```

---

## Phase 2:运行时实体 / Mapper / Service(MyBatis-Plus 样板)

### Task 2.1: 三张运行时表的实体

**Files:**
- Create: `mes/.../workflow/runtime/entity/SpWorkflowInstance.java`
- Create: `mes/.../workflow/runtime/entity/SpWorkflowTask.java`
- Create: `mes/.../workflow/runtime/entity/SpWorkflowEventLog.java`

> 表结构见 `scripts/sql/MySQL-init-all.sql:686-753`。实体均 `extends BaseEntity`(已含 id/create*/update*),仅声明业务列;字段名用驼峰,MyBatis-Plus 默认映射下划线列。

- [ ] **Step 1: SpWorkflowInstance**(`@TableName("sp_workflow_instance")`,字段 + getter/setter)

字段:`String definitionId; String processKey; String businessType; String businessId; String businessCode; String title; String status; String starterUserId; String starterUsername; java.time.LocalDateTime startTime; java.time.LocalDateTime endTime;`

- [ ] **Step 2: SpWorkflowTask**(`@TableName("sp_workflow_task")`)

字段:`String instanceId; String taskName; String taskKey; String businessType; String businessId; String assigneeUserId; String assigneeUsername; String candidateRoleCode; String status; java.time.LocalDateTime claimTime; java.time.LocalDateTime completeTime; String comment;`

- [ ] **Step 3: SpWorkflowEventLog**(`@TableName("sp_workflow_event_log")`)

字段:`String instanceId; String taskId; String businessType; String businessId; String eventType; String operatorUserId; String operatorUsername; java.time.LocalDateTime eventTime; String message;`

为三个类各生成标准 getter/setter,顶部 `import com.wangziyang.mes.common.BaseEntity;` 与 `import com.baomidou.mybatisplus.annotation.TableName;`。

- [ ] **Step 4: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

---

### Task 2.2: 三个 Mapper + 三个 Service

**Files:**
- Create: `mes/.../workflow/runtime/mapper/SpWorkflowInstanceMapper.java`(`extends BaseMapper<SpWorkflowInstance>`)
- Create: `mes/.../workflow/runtime/mapper/SpWorkflowTaskMapper.java`
- Create: `mes/.../workflow/runtime/mapper/SpWorkflowEventLogMapper.java`

> `@MapperScan` 已扫描 `**.mapper*`(见 `SparchetypeApplication`),包名含 `mapper` 即可被扫描。

- [ ] **Step 1: 写三个 Mapper 接口**(每个仅 `extends BaseMapper<对应实体>`,无方法)

```java
package com.wangziyang.mes.workflow.runtime.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.workflow.runtime.entity.SpWorkflowInstance;

public interface SpWorkflowInstanceMapper extends BaseMapper<SpWorkflowInstance> {
}
```

(Task/EventLog 同构)

- [ ] **Step 2: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/workflow/runtime/entity/ mes/src/main/java/com/wangziyang/mes/workflow/runtime/mapper/
git commit -m "✨ feat(workflow): 运行时实例/任务/事件日志 实体与Mapper"
```

> Service:本期运行时数据访问直接在引擎服务里用 Mapper(数据量小、逻辑集中),不再为三表各建 IService/ServiceImpl,避免空壳样板(YAGNI)。

---

## Phase 3:引擎服务 + 业务钩子

### Task 3.1: 业务钩子接口与订单实现

**Files:**
- Create: `mes/.../workflow/runtime/hook/AuditCallback.java`
- Create: `mes/.../workflow/runtime/hook/OrderAuditCallback.java`

- [ ] **Step 1: AuditCallback 接口**

```java
package com.wangziyang.mes.workflow.runtime.hook;

/** 流程终态回调。按 businessType 分发(见引擎)。 */
public interface AuditCallback {
    /** 该回调负责的业务类型,如 ORDER_AUDIT */
    String businessType();
    /** 流程审批通过(走到 endEvent) */
    void onApproved(String businessId);
    /** 流程被驳回 */
    void onRejected(String businessId);
}
```

- [ ] **Step 2: OrderAuditCallback 实现**

```java
package com.wangziyang.mes.workflow.runtime.hook;

import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.service.ISpOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class OrderAuditCallback implements AuditCallback {

    public static final String TYPE = "ORDER_AUDIT";

    @Autowired
    private ISpOrderService orderService;

    @Override
    public String businessType() { return TYPE; }

    @Override
    public void onApproved(String orderId) {
        SpOrder order = orderService.getById(orderId);
        if (order == null) return;
        order.setAuditStatus("APPROVED");
        order.setPlanStatus("UNCOMPUTED"); // 待运算 —— 本周期终点
        orderService.updateById(order);
    }

    @Override
    public void onRejected(String orderId) {
        SpOrder order = orderService.getById(orderId);
        if (order == null) return;
        order.setAuditStatus("REJECTED");
        orderService.updateById(order);
    }
}
```

- [ ] **Step 3: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

---

### Task 3.2: 引擎服务接口

**Files:**
- Create: `mes/.../workflow/runtime/service/IWorkflowEngineService.java`

- [ ] **Step 1: 写接口**

```java
package com.wangziyang.mes.workflow.runtime.service;

import com.wangziyang.mes.workflow.runtime.entity.SpWorkflowEventLog;
import com.wangziyang.mes.workflow.runtime.entity.SpWorkflowTask;

import java.util.List;

public interface IWorkflowEngineService {

    /** 按 processKey 启动一个流程实例,建首个 userTask。返回实例ID。 */
    String start(String processKey, String businessType, String businessId,
                 String businessCode, String title);

    /** 签收:PENDING->CLAIMED,记录签收人 */
    void claim(String taskId);

    /** 提交:CLAIMED->COMPLETED,推进 token;遇 end 则实例完成并触发回调 */
    void complete(String taskId, String comment);

    /** 驳回:任务与实例置 REJECTED,触发回调 */
    void reject(String taskId, String comment);

    /** 当前登录用户的待办任务(候选角色命中其 Shiro 角色的 PENDING + 本人 CLAIMED) */
    List<SpWorkflowTask> myTodo();

    /** 实例的事件轨迹(按时间正序) */
    List<SpWorkflowEventLog> history(String instanceId);
}
```

- [ ] **Step 2: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

---

### Task 3.3: 引擎服务实现

**Files:**
- Create: `mes/.../workflow/runtime/service/impl/WorkflowEngineServiceImpl.java`

依赖:`SpWorkflowModelMapper`(取 bpmnXml,已存在于 `workflow/mapper`)、`SpWorkflowDefinitionMapper`(取 definitionId,已存在)、三个运行时 Mapper、`List<AuditCallback>`(Spring 注入所有钩子)、`BpmnParser`。当前用户与角色用 Shiro。

- [ ] **Step 1: 写实现**

```java
package com.wangziyang.mes.workflow.runtime.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.workflow.entity.SpWorkflowDefinition;
import com.wangziyang.mes.workflow.entity.SpWorkflowModel;
import com.wangziyang.mes.workflow.mapper.SpWorkflowDefinitionMapper;
import com.wangziyang.mes.workflow.mapper.SpWorkflowModelMapper;
import com.wangziyang.mes.workflow.runtime.bpmn.BpmnParser;
import com.wangziyang.mes.workflow.runtime.bpmn.NodeType;
import com.wangziyang.mes.workflow.runtime.bpmn.ProcessGraph;
import com.wangziyang.mes.workflow.runtime.bpmn.UserTaskDef;
import com.wangziyang.mes.workflow.runtime.entity.SpWorkflowEventLog;
import com.wangziyang.mes.workflow.runtime.entity.SpWorkflowInstance;
import com.wangziyang.mes.workflow.runtime.entity.SpWorkflowTask;
import com.wangziyang.mes.workflow.runtime.hook.AuditCallback;
import com.wangziyang.mes.workflow.runtime.mapper.SpWorkflowEventLogMapper;
import com.wangziyang.mes.workflow.runtime.mapper.SpWorkflowInstanceMapper;
import com.wangziyang.mes.workflow.runtime.mapper.SpWorkflowTaskMapper;
import com.wangziyang.mes.workflow.runtime.service.IWorkflowEngineService;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class WorkflowEngineServiceImpl extends BaseController implements IWorkflowEngineService {

    @Autowired private SpWorkflowModelMapper modelMapper;
    @Autowired private SpWorkflowDefinitionMapper definitionMapper;
    @Autowired private SpWorkflowInstanceMapper instanceMapper;
    @Autowired private SpWorkflowTaskMapper taskMapper;
    @Autowired private SpWorkflowEventLogMapper eventLogMapper;
    @Autowired(required = false) private List<AuditCallback> callbacks = new ArrayList<>();

    @Override
    @Transactional
    public String start(String processKey, String businessType, String businessId,
                        String businessCode, String title) {
        SpWorkflowModel model = modelMapper.selectOne(new QueryWrapper<SpWorkflowModel>()
                .eq("model_key", processKey).eq("status", "PUBLISHED")
                .orderByDesc("version").last("limit 1"));
        if (model == null) throw new IllegalStateException("未找到已发布流程模型: " + processKey);

        SpWorkflowDefinition def = definitionMapper.selectOne(new QueryWrapper<SpWorkflowDefinition>()
                .eq("process_key", processKey).orderByDesc("version").last("limit 1"));

        ProcessGraph graph = BpmnParser.parse(model.getBpmnXml());
        UserTaskDef first = graph.firstUserTask();
        if (first == null) throw new IllegalStateException("流程缺少 userTask: " + processKey);

        SysUser me = getSysUser();
        SpWorkflowInstance inst = new SpWorkflowInstance();
        inst.setDefinitionId(def != null ? def.getId() : processKey);
        inst.setProcessKey(processKey);
        inst.setBusinessType(businessType);
        inst.setBusinessId(businessId);
        inst.setBusinessCode(businessCode);
        inst.setTitle(title);
        inst.setStatus("RUNNING");
        inst.setStarterUserId(me != null ? me.getId() : null);
        inst.setStarterUsername(me != null ? me.getUsername() : null);
        inst.setStartTime(LocalDateTime.now());
        instanceMapper.insert(inst);

        createTask(inst, first, businessType, businessId);
        log(inst.getId(), null, businessType, businessId, "START", "发起流程: " + title);
        return inst.getId();
    }

    private void createTask(SpWorkflowInstance inst, UserTaskDef node,
                            String businessType, String businessId) {
        SpWorkflowTask task = new SpWorkflowTask();
        task.setInstanceId(inst.getId());
        task.setTaskName(node.getName());
        task.setTaskKey(node.getId());
        task.setBusinessType(businessType);
        task.setBusinessId(businessId);
        task.setCandidateRoleCode(emptyToNull(node.getCandidateGroups()));
        task.setStatus("PENDING");
        // 若 BPMN 指定了 assignee,则直接预指派(本期一般用 candidateGroups)
        if (node.getAssignee() != null && !node.getAssignee().isEmpty()) {
            task.setAssigneeUsername(node.getAssignee());
        }
        taskMapper.insert(task);
    }

    @Override
    @Transactional
    public void claim(String taskId) {
        SpWorkflowTask task = taskMapper.selectById(taskId);
        if (task == null) throw new IllegalStateException("任务不存在");
        if (!"PENDING".equals(task.getStatus())) throw new IllegalStateException("任务已被处理");
        SysUser me = getSysUser();
        if (task.getCandidateRoleCode() != null && !SecurityUtils.getSubject().hasRole(task.getCandidateRoleCode())) {
            throw new IllegalStateException("无权签收该任务");
        }
        task.setStatus("CLAIMED");
        task.setAssigneeUserId(me.getId());
        task.setAssigneeUsername(me.getUsername());
        task.setClaimTime(LocalDateTime.now());
        taskMapper.updateById(task);
        log(task.getInstanceId(), task.getId(), task.getBusinessType(), task.getBusinessId(),
            "CLAIM", me.getUsername() + " 签收任务: " + task.getTaskName());
    }

    @Override
    @Transactional
    public void complete(String taskId, String comment) {
        SpWorkflowTask task = requireMyClaimed(taskId);
        task.setStatus("COMPLETED");
        task.setComment(comment);
        task.setCompleteTime(LocalDateTime.now());
        taskMapper.updateById(task);

        SpWorkflowInstance inst = instanceMapper.selectById(task.getInstanceId());
        ProcessGraph graph = loadGraph(inst.getProcessKey());
        UserTaskDef next = graph.nextUserTaskAfter(task.getTaskKey());
        log(inst.getId(), task.getId(), task.getBusinessType(), task.getBusinessId(),
            "COMPLETE", getSysUser().getUsername() + " 提交: " + nz(comment));

        if (next != null) {
            createTask(inst, next, task.getBusinessType(), task.getBusinessId());
        } else {
            inst.setStatus("COMPLETED");
            inst.setEndTime(LocalDateTime.now());
            instanceMapper.updateById(inst);
            log(inst.getId(), null, inst.getBusinessType(), inst.getBusinessId(), "END", "流程结束");
            dispatchApproved(inst.getBusinessType(), inst.getBusinessId());
        }
    }

    @Override
    @Transactional
    public void reject(String taskId, String comment) {
        SpWorkflowTask task = requireMyClaimed(taskId);
        task.setStatus("REJECTED");
        task.setComment(comment);
        task.setCompleteTime(LocalDateTime.now());
        taskMapper.updateById(task);

        SpWorkflowInstance inst = instanceMapper.selectById(task.getInstanceId());
        inst.setStatus("REJECTED");
        inst.setEndTime(LocalDateTime.now());
        instanceMapper.updateById(inst);
        log(inst.getId(), task.getId(), inst.getBusinessType(), inst.getBusinessId(),
            "REJECT", getSysUser().getUsername() + " 驳回: " + nz(comment));
        dispatchRejected(inst.getBusinessType(), inst.getBusinessId());
    }

    @Override
    public List<SpWorkflowTask> myTodo() {
        Subject subject = SecurityUtils.getSubject();
        SysUser me = getSysUser();
        List<SpWorkflowTask> pending = taskMapper.selectList(
                new QueryWrapper<SpWorkflowTask>().eq("status", "PENDING").orderByDesc("create_time"));
        List<SpWorkflowTask> result = new ArrayList<>();
        for (SpWorkflowTask t : pending) {
            if (t.getCandidateRoleCode() == null || subject.hasRole(t.getCandidateRoleCode())) {
                result.add(t);
            }
        }
        // 本人已签收但未完成的
        result.addAll(taskMapper.selectList(new QueryWrapper<SpWorkflowTask>()
                .eq("status", "CLAIMED").eq("assignee_user_id", me.getId())
                .orderByDesc("claim_time")));
        return result;
    }

    @Override
    public List<SpWorkflowEventLog> history(String instanceId) {
        return eventLogMapper.selectList(new QueryWrapper<SpWorkflowEventLog>()
                .eq("instance_id", instanceId).orderByAsc("event_time"));
    }

    // —— 私有 ——
    private SpWorkflowTask requireMyClaimed(String taskId) {
        SpWorkflowTask task = taskMapper.selectById(taskId);
        if (task == null) throw new IllegalStateException("任务不存在");
        if (!"CLAIMED".equals(task.getStatus())) throw new IllegalStateException("请先签收任务");
        SysUser me = getSysUser();
        if (me == null || !me.getId().equals(task.getAssigneeUserId())) {
            throw new IllegalStateException("只能处理本人签收的任务");
        }
        return task;
    }

    private ProcessGraph loadGraph(String processKey) {
        SpWorkflowModel model = modelMapper.selectOne(new QueryWrapper<SpWorkflowModel>()
                .eq("model_key", processKey).eq("status", "PUBLISHED")
                .orderByDesc("version").last("limit 1"));
        return BpmnParser.parse(model.getBpmnXml());
    }

    private void dispatchApproved(String businessType, String businessId) {
        for (AuditCallback cb : callbacks)
            if (cb.businessType().equals(businessType)) cb.onApproved(businessId);
    }

    private void dispatchRejected(String businessType, String businessId) {
        for (AuditCallback cb : callbacks)
            if (cb.businessType().equals(businessType)) cb.onRejected(businessId);
    }

    private void log(String instanceId, String taskId, String businessType, String businessId,
                     String eventType, String message) {
        SysUser me = getSysUser();
        SpWorkflowEventLog ev = new SpWorkflowEventLog();
        ev.setInstanceId(instanceId);
        ev.setTaskId(taskId);
        ev.setBusinessType(businessType);
        ev.setBusinessId(businessId);
        ev.setEventType(eventType);
        ev.setOperatorUserId(me != null ? me.getId() : null);
        ev.setOperatorUsername(me != null ? me.getUsername() : null);
        ev.setEventTime(LocalDateTime.now());
        ev.setMessage(message);
        eventLogMapper.insert(ev);
    }

    private static String emptyToNull(String s) { return (s == null || s.isEmpty()) ? null : s; }
    private static String nz(String s) { return s == null ? "" : s; }
}
```

- [ ] **Step 2: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS(若 `SpWorkflowModel`/`SpWorkflowDefinition` 的 getter 名与此处不符,按实体实际 getter 调整)

- [ ] **Step 3: 通读自查**(后端审查约定):确认 `getSysUser()` 在非 Controller 的 `@Service` 里可用——本类继承 `BaseController` 仅为复用 `getSysUser()`,其内部用 `SecurityUtils.getSubject().getPrincipal()`,在已认证请求线程内有效。确认无空指针隐患(start 时 me 可能为空已做判空)。

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/workflow/runtime/hook/ mes/src/main/java/com/wangziyang/mes/workflow/runtime/service/
git commit -m "✨ feat(workflow): 轻量BPMN引擎(start/claim/complete/reject/todo)+订单审批钩子"
```

---

## Phase 4:后端接口

### Task 4.1: 生产订单分页请求 + 控制器

**Files:**
- Create: `mes/.../order/request/ProductionOrderReq.java`
- Create: `mes/.../order/controller/ProductionOrderController.java`

- [ ] **Step 1: ProductionOrderReq**

```java
package com.wangziyang.mes.order.request;

import com.wangziyang.mes.common.BasePageReq;

public class ProductionOrderReq extends BasePageReq {
    private String orderCodeLike;
    private String orderSource;   // DEMAND/FORECAST
    private String auditStatus;   // APPROVING/APPROVED/REJECTED

    public String getOrderCodeLike() { return orderCodeLike; }
    public void setOrderCodeLike(String v) { this.orderCodeLike = v; }
    public String getOrderSource() { return orderSource; }
    public void setOrderSource(String v) { this.orderSource = v; }
    public String getAuditStatus() { return auditStatus; }
    public void setAuditStatus(String v) { this.auditStatus = v; }
}
```

- [ ] **Step 2: ProductionOrderController**

```java
package com.wangziyang.mes.order.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.request.ProductionOrderReq;
import com.wangziyang.mes.order.service.ISpOrderService;
import com.wangziyang.mes.workflow.runtime.hook.OrderAuditCallback;
import com.wangziyang.mes.workflow.runtime.service.IWorkflowEngineService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Controller
@RequestMapping("/plan/order")
public class ProductionOrderController extends BaseController {

    /** 订单审批流程 modelKey,与种子 BPMN 模型一致 */
    private static final String AUDIT_PROCESS_KEY = "orderAudit";

    @Autowired private ISpOrderService orderService;
    @Autowired private IWorkflowEngineService engine;

    @PostMapping("/page")
    @ResponseBody
    public Result page(ProductionOrderReq req) {
        QueryWrapper<SpOrder> qw = new QueryWrapper<>();
        qw.isNotNull("order_source"); // 仅生产订单
        if (StringUtils.isNotEmpty(req.getOrderCodeLike())) qw.like("order_code", req.getOrderCodeLike());
        if (StringUtils.isNotEmpty(req.getOrderSource())) qw.eq("order_source", req.getOrderSource());
        if (StringUtils.isNotEmpty(req.getAuditStatus())) qw.eq("audit_status", req.getAuditStatus());
        qw.orderByDesc("create_time");
        IPage result = orderService.page(req, qw);
        return Result.success(result);
    }

    @GetMapping("/get-by-id")
    @ResponseBody
    public Result getById(String id) {
        return Result.success(orderService.getById(id));
    }

    /** 新增/编辑生产订单。新增时:派生排产方式、置审核中、生成单号、启动审批流。 */
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpOrder record) {
        boolean isCreate = StringUtils.isEmpty(record.getId());
        // 排产方式由订单来源派生
        if ("DEMAND".equals(record.getOrderSource())) record.setScheduleMode("BACKWARD");
        else if ("FORECAST".equals(record.getOrderSource())) record.setScheduleMode("FORWARD");

        if (isCreate) {
            if (StringUtils.isEmpty(record.getOrderCode())) {
                record.setOrderCode("PO" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
            }
            record.setAuditStatus("APPROVING"); // 审核中
            record.setPlanStatus("DRAFT");
            orderService.save(record);
            engine.start(AUDIT_PROCESS_KEY, OrderAuditCallback.TYPE, record.getId(),
                    record.getOrderCode(), "生产订单审批 - " + record.getOrderCode());
        } else {
            orderService.updateById(record);
        }
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(SpOrder req) {
        SpOrder cur = orderService.getById(req.getId());
        if (cur != null && "APPROVING".equals(cur.getAuditStatus())) {
            return Result.failure("审核中的订单不可删除");
        }
        orderService.removeById(req.getId());
        return Result.success();
    }
}
```

- [ ] **Step 3: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

---

### Task 4.2: 待办任务控制器

**Files:**
- Create: `mes/.../workflow/runtime/controller/WorkflowTaskController.java`

> 用 form-encoded 参数(与前端默认编码一致),方法形参直接绑定。

- [ ] **Step 1: 写控制器**

```java
package com.wangziyang.mes.workflow.runtime.controller;

import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.workflow.runtime.service.IWorkflowEngineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/workflow/task")
public class WorkflowTaskController {

    @Autowired private IWorkflowEngineService engine;

    /** 我的待办(不分页,数据量小;前端本地分页/直接展示) */
    @PostMapping("/todo")
    @ResponseBody
    public Result todo() {
        return Result.success(engine.myTodo());
    }

    @PostMapping("/claim")
    @ResponseBody
    public Result claim(String taskId) {
        engine.claim(taskId);
        return Result.success();
    }

    @PostMapping("/complete")
    @ResponseBody
    public Result complete(String taskId, String comment) {
        engine.complete(taskId, comment);
        return Result.success();
    }

    @PostMapping("/reject")
    @ResponseBody
    public Result reject(String taskId, String comment) {
        engine.reject(taskId, comment);
        return Result.success();
    }

    @GetMapping("/history/{instanceId}")
    @ResponseBody
    public Result history(@PathVariable String instanceId) {
        return Result.success(engine.history(instanceId));
    }
}
```

- [ ] **Step 2: 编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

- [ ] **Step 3: 确认 Shiro 放行**:`/plan/**` 与 `/workflow/**` 属于需登录(authc)的普通接口,无需额外配置(只有静态资源与 `/login` 匿名)。若 ShiroConfig 有白名单/特殊 chain,确认未误拦。

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/order/request/ProductionOrderReq.java mes/src/main/java/com/wangziyang/mes/order/controller/ProductionOrderController.java mes/src/main/java/com/wangziyang/mes/workflow/runtime/controller/
git commit -m "✨ feat(api): 生产订单录入 /plan/order 与待办 /workflow/task 接口"
```

---

## Phase 5:种子数据

### Task 5.1: 角色/账号/菜单/BOM/BPMN 模型种子

**Files:**
- Create: `scripts/sql/plan-order-bpmn-seed.sql`

> 密码哈希:MD5×3 + username 盐。`admin` 的已知哈希为 `038bdaf98f7f48c89e7a1d4d5c60cac1`(见 MySQL-init-all.sql:772)。`planner`/`supervisor` 的哈希需用项目算法生成(见 Step 2)。

- [ ] **Step 1: 写种子 SQL(角色/菜单/角色菜单/BOM/BPMN)**

```sql
-- ============================================================
-- 生产订单录入 + 轻量BPMN审批 种子数据
-- 可重复执行(先 DELETE 固定 id 再 INSERT)
-- ============================================================
SET NAMES utf8mb4;

-- 1) 角色:计划员 / 生产主管
DELETE FROM sp_sys_role WHERE id IN ('r_planner','r_supervisor');
INSERT INTO sp_sys_role (id,name,code,descr,is_deleted,is_system,create_time,create_username,update_time,update_username) VALUES
('r_planner','计划员','planner','生产计划录入','0','1',NOW(),'admin',NOW(),'admin'),
('r_supervisor','生产主管','prod_supervisor','生产订单审批','0','1',NOW(),'admin',NOW(),'admin');

-- 2) 账号:planner / supervisor(密码占位,见 Step 2 替换哈希)
DELETE FROM sp_sys_user WHERE id IN ('u_planner','u_supervisor');
INSERT INTO sp_sys_user (id,name,username,password,dept_id,email,mobile,tel,sex,is_deleted,create_time,create_username,update_time,update_username) VALUES
('u_planner','计划员','planner','__HASH_PLANNER__','1','planner@mes.com','13800000001','','1','0',NOW(),'admin',NOW(),'admin'),
('u_supervisor','生产主管','supervisor','__HASH_SUPERVISOR__','1','sup@mes.com','13800000002','','1','0',NOW(),'admin',NOW(),'admin');

-- 3) 用户-角色
DELETE FROM sp_sys_user_role WHERE id IN ('ur_planner','ur_supervisor');
INSERT INTO sp_sys_user_role (id,user_id,role_id,create_time,create_username,update_time,update_username) VALUES
('ur_planner','u_planner','r_planner',NOW(),'admin',NOW(),'admin'),
('ur_supervisor','u_supervisor','r_supervisor',NOW(),'admin',NOW(),'admin');

-- 4) 菜单:生产计划中心 → 生产订单录入 / 待办任务
DELETE FROM sp_sys_menu WHERE id IN ('m_plan','m_plan_order','m_plan_todo');
INSERT INTO sp_sys_menu (id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username) VALUES
('m_plan','planCenter','生产计划中心','/plan','0','1',60,'0','','el-icon-Calendar','',NOW(),'admin',NOW(),'admin'),
('m_plan_order','planOrderEntry','生产订单录入','/plan/order','m_plan','2',1,'1','plan:order:list,plan:order:add','el-icon-Document','',NOW(),'admin',NOW(),'admin'),
('m_plan_todo','planTodo','待办任务','/plan/todo','m_plan','2',2,'1','plan:todo:list,workflow:task:claim,workflow:task:complete','el-icon-Bell','',NOW(),'admin',NOW(),'admin');

-- 5) 角色-菜单(计划员 + 生产主管均授予,侧栏本就不按角色过滤,这里仅为数据完整)
DELETE FROM sp_sys_role_menu WHERE role_id IN ('r_planner','r_supervisor') AND menu_id IN ('m_plan','m_plan_order','m_plan_todo');
INSERT INTO sp_sys_role_menu (id,role_id,menu_id,create_time,create_username,update_time,update_username)
SELECT CONCAT(r.id,'_',m.id), r.id, m.id, NOW(),'admin',NOW(),'admin'
FROM (SELECT 'r_planner' id UNION SELECT 'r_supervisor') r,
     (SELECT 'm_plan' id UNION SELECT 'm_plan_order' UNION SELECT 'm_plan_todo') m;

-- 6) 产品 BOM:台式电脑主机(state=pass,最新版本 V1.0)
DELETE FROM sp_bom WHERE id = 'bom_pc_host';
INSERT INTO sp_bom (id,bom_code,materiel_code,materiel_desc,remark,version_number,state,factory,is_deleted,create_time,create_username,update_time,update_username) VALUES
('bom_pc_host','BOM-PC-HOST','PC-HOST-001','台式电脑主机','示例产品BOM','V1.0','pass','F001','0',NOW(),'admin',NOW(),'admin');

DELETE FROM sp_bom_item WHERE bom_head_id = 'bom_pc_host';
INSERT INTO sp_bom_item (id,bom_head_id,materiel_item_code,materiel_item_desc,line_no,item_num,item_unit,oper_typer,create_time,create_username,update_time,update_username) VALUES
('bi_pc_1','bom_pc_host','PART-CPU','CPU i7','10',1,'个',NULL,NOW(),'admin',NOW(),'admin'),
('bi_pc_2','bom_pc_host','PART-MB','主板','20',1,'块',NULL,NOW(),'admin',NOW(),'admin'),
('bi_pc_3','bom_pc_host','PART-RAM','内存16G','30',2,'条',NULL,NOW(),'admin',NOW(),'admin'),
('bi_pc_4','bom_pc_host','PART-SSD','固态硬盘1T','40',1,'块',NULL,NOW(),'admin',NOW(),'admin');

-- 7) 订单审批 BPMN 模型(start→审批[候选组=prod_supervisor]→end),已发布
DELETE FROM sp_workflow_model WHERE id = 'wfm_order_audit';
INSERT INTO sp_workflow_model (id,model_key,name,category_code,category_name,bpmn_xml,status,version,create_time,create_username,update_time,update_username) VALUES
('wfm_order_audit','orderAudit','订单审批流程','order','订单管理',
'<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:flowable="http://flowable.org/bpmn" targetNamespace="http://flowable.org/processdef"><bpmn:process id="orderAudit" name="订单审批流程" isExecutable="true"><bpmn:startEvent id="start" name="开始"/><bpmn:userTask id="approve" name="生产主管审批" flowable:candidateGroups="prod_supervisor"/><bpmn:endEvent id="end" name="结束"/><bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="approve"/><bpmn:sequenceFlow id="f2" sourceRef="approve" targetRef="end"/></bpmn:process></bpmn:definitions>',
'PUBLISHED',1,NOW(),'admin',NOW(),'admin');

DELETE FROM sp_workflow_definition WHERE id = 'wfd_order_audit';
INSERT INTO sp_workflow_definition (id,category_code,category_name,process_key,process_name,enabled,form_key,version,create_time,create_username,update_time,update_username) VALUES
('wfd_order_audit','order','订单管理','orderAudit','订单审批流程',1,NULL,1,NOW(),'admin',NOW(),'admin');
```

> 每个 BOM 行 12 个值,顺序对应列名 `id,bom_head_id,materiel_item_code,materiel_item_desc,line_no,item_num,item_unit,oper_typer,create_time,create_username,update_time,update_username`(`oper_typer` 用 NULL)。导入前用 `sp_bom_item` 真实建表列再核一遍数量。

- [ ] **Step 2: 生成 planner/supervisor 密码哈希并替换占位符**

项目密码算法:MD5 迭代 3 次,以 username 为盐(见 `SysUserServiceImpl.save()` 与 `HashUtil`)。用项目内算法生成,避免手算出错。临时写一个一次性 main 或 JUnit 打印:

```java
// 放到 mes/src/test/java/.../HashGenTest.java,运行后把输出填回 SQL,再删除此文件
import org.apache.shiro.crypto.hash.SimpleHash;
import org.apache.shiro.util.ByteSource;
public class HashGenTest {
  @org.junit.Test public void gen() {
    for (String u : new String[]{"planner","supervisor"}) {
      // 与 SysUserServiceImpl 保持一致:算法名/盐/迭代次数以源码为准
      String h = new SimpleHash("MD5", "123", ByteSource.Util.bytes(u), 3).toHex();
      System.out.println(u + " => " + h);
    }
  }
}
```

Run: `cd mes && mvn -q -Dtest=HashGenTest test`
**先打开 `SysUserServiceImpl` 确认算法名/盐用法/迭代次数与上面一致**(若盐用的是 username 的某种包装,需对齐)。把输出哈希替换 SQL 中 `__HASH_PLANNER__` / `__HASH_SUPERVISOR__`,然后删除 HashGenTest。

- [ ] **Step 3: 导入种子并人工核对**

Run(按本机 MySQL 连接调整):
```bash
mysql -h 127.0.0.1 -uroot -p sparchetype < scripts/sql/plan-order-bpmn-seed.sql
```
Expected: 无报错。`SELECT username FROM sp_sys_user WHERE username IN('planner','supervisor');` 返回 2 行。

- [ ] **Step 4: Commit**

```bash
git add scripts/sql/plan-order-bpmn-seed.sql
git commit -m "🌱 chore(seed): 生产订单/BPMN审批种子(角色账号菜单+台式电脑主机BOM+审批模型)"
```

---

## Phase 6:前端类型与 API

### Task 6.1: 类型定义

**Files:**
- Create: `mes/vue3/src/types/plan.ts`

- [ ] **Step 1: 写类型**

```ts
import type { IPage } from '@/types/system'

/** 生产订单(复用 sp_order,生产订单相关字段) */
export interface ProductionOrder {
  id?: string
  orderCode?: string
  orderSource?: 'DEMAND' | 'FORECAST'
  scheduleMode?: 'FORWARD' | 'BACKWARD'
  bomId?: string
  bomCode?: string
  bomVersion?: string
  materiel?: string
  materielDesc?: string
  qty?: number
  planStartTime?: string
  planEndTime?: string
  customerName?: string
  contractNo?: string
  priority?: number
  orderDescription?: string
  auditStatus?: 'DRAFT' | 'APPROVING' | 'APPROVED' | 'REJECTED'
  planStatus?: 'UNCOMPUTED' | 'COMPUTED' | 'RELEASED' | 'CANCELLED' | 'DONE'
  createTime?: string
}

export interface ProductionOrderPageReq {
  current: number
  size: number
  orderCodeLike?: string
  orderSource?: string
  auditStatus?: string
}

/** 待办任务(运行时 sp_workflow_task) */
export interface WorkflowTask {
  id: string
  instanceId: string
  taskName: string
  taskKey: string
  businessType: string
  businessId: string
  assigneeUserId?: string
  assigneeUsername?: string
  candidateRoleCode?: string
  status: 'PENDING' | 'CLAIMED' | 'COMPLETED' | 'REJECTED'
  claimTime?: string
  completeTime?: string
  comment?: string
  createTime?: string
}

/** 事件轨迹 */
export interface WorkflowEvent {
  id: string
  instanceId: string
  eventType: string
  operatorUsername?: string
  eventTime?: string
  message?: string
}

export type { IPage }
```

> 若 `@/types/system` 无 `IPage`,改从 `@/types/api` 或现有分页类型导入(参考 `api/order/order.ts` 的 import 来源)。

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm build`
Expected: 构建成功(此步仅新增文件,未被引用前不影响)

---

### Task 6.2: API 封装

**Files:**
- Create: `mes/vue3/src/api/plan/order-entry.ts`
- Create: `mes/vue3/src/api/workflow/task.ts`

- [ ] **Step 1: 生产订单 API**

```ts
import { http } from '@/api/request'
import type { IPage } from '@/types/system'
import type { ProductionOrder, ProductionOrderPageReq } from '@/types/plan'

export const productionOrderPage = (req: ProductionOrderPageReq) =>
  http.post<IPage<ProductionOrder>>('/plan/order/page', req)

export const productionOrderGetById = (id: string) =>
  http.get<ProductionOrder>('/plan/order/get-by-id', { id })

export const productionOrderSave = (record: Partial<ProductionOrder>) =>
  http.post<string>('/plan/order/add-or-update', record)

export const productionOrderDelete = (id: string) =>
  http.post<void>('/plan/order/delete', { id })
```

- [ ] **Step 2: 待办任务 API**

```ts
import { http } from '@/api/request'
import type { WorkflowTask, WorkflowEvent } from '@/types/plan'

export const taskTodo = () => http.post<WorkflowTask[]>('/workflow/task/todo', {})
export const taskClaim = (taskId: string) => http.post<void>('/workflow/task/claim', { taskId })
export const taskComplete = (taskId: string, comment: string) =>
  http.post<void>('/workflow/task/complete', { taskId, comment })
export const taskReject = (taskId: string, comment: string) =>
  http.post<void>('/workflow/task/reject', { taskId, comment })
export const taskHistory = (instanceId: string) =>
  http.get<WorkflowEvent[]>(`/workflow/task/history/${instanceId}`)
```

- [ ] **Step 3: 类型检查**

Run: `cd mes/vue3 && pnpm build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/src/types/plan.ts mes/vue3/src/api/plan/ mes/vue3/src/api/workflow/
git commit -m "✨ feat(vue3): 生产订单/待办任务 类型与API封装"
```

---

## Phase 7:生产订单录入页

### Task 7.1: 录入表单 OrderEntryForm.vue

**Files:**
- Create: `mes/vue3/src/views/plan/order-entry/OrderEntryForm.vue`

> 复用 `FormDialog`(props: model-value/title/width/loading;events: update:model-value/submit),BOM 下拉取 `state=pass` 最新版本。BOM 列表 API:复用现有 `@/api/technology/*` 的 BOM 列表;若无,用 `http` 直接调 `/technology/bom/page`。落地前先看 `src/api/technology/` 是否已有 bom 列表函数并优先复用。

- [ ] **Step 1: 写组件**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    title="新增生产订单"
    width="680px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="订单类型" prop="orderSource">
            <el-radio-group v-model="form.orderSource">
              <el-radio-button value="DEMAND">需求订单</el-radio-button>
              <el-radio-button value="FORECAST">预测订单</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="排产方式">
            <el-tag :type="form.orderSource === 'DEMAND' ? 'warning' : 'success'">
              {{ form.orderSource === 'DEMAND' ? '逆向排产(按交付日期)' : '正向排产(按开工日期)' }}
            </el-tag>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="产品BOM" prop="bomId">
        <el-select v-model="form.bomId" placeholder="请选择产品BOM" filterable clearable style="width:100%" @change="onBomChange">
          <el-option v-for="b in boms" :key="b.id" :label="`${b.bomCode} / ${b.materielDesc}`" :value="b.id!">
            <span>{{ b.bomCode }} / {{ b.materielDesc }}</span>
            <el-tag size="small" style="margin-left:8px" :type="b.id === latestBomId(b.bomCode) ? 'success' : 'info'">
              {{ b.versionNumber }}{{ b.id === latestBomId(b.bomCode) ? ' · 最新' : '' }}
            </el-tag>
          </el-option>
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="需求数量" prop="qty">
            <el-input-number v-model="form.qty" :min="1" :precision="0" controls-position="right" style="width:100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item v-if="form.orderSource === 'DEMAND'" label="计划交付" prop="planEndTime">
            <el-date-picker v-model="form.planEndTime" type="date" value-format="YYYY-MM-DD HH:mm:ss" placeholder="计划交付日期" style="width:100%" />
          </el-form-item>
          <el-form-item v-else label="计划开工" prop="planStartTime">
            <el-date-picker v-model="form.planStartTime" type="date" value-format="YYYY-MM-DD HH:mm:ss" placeholder="计划开工日期" style="width:100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="客户名称"><el-input v-model="form.customerName" clearable /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="销售合同号"><el-input v-model="form.contractNo" clearable /></el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="优先级">
        <el-input-number v-model="form.priority" :min="1" :precision="0" controls-position="right" />
        <span style="margin-left:8px;color:var(--el-text-color-secondary)">数字越小优先级越高</span>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.orderDescription" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { http } from '@/api/request'
import type { ProductionOrder } from '@/types/plan'
import type { IPage } from '@/types/system'

interface BomRow { id?: string; bomCode?: string; materielCode?: string; materielDesc?: string; versionNumber?: string; state?: string }

const props = defineProps<{ modelValue: boolean; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [Partial<ProductionOrder>] }>()

const formRef = ref<FormInstance>()
const form = reactive<Partial<ProductionOrder>>({})

// BOM 列表:取已审核通过的(state=pass),前 200 条本地过滤
const { data: bomPage } = useRequest(
  () => http.post<IPage<BomRow>>('/technology/bom/page', { current: 1, size: 200 }),
  { immediate: true },
)
const boms = computed<BomRow[]>(() => (bomPage.value?.records ?? []).filter((b) => b.state === 'pass'))

/** 同一 bomCode 下版本号最大的那条 id(简单按 versionNumber 字符串比较) */
function latestBomId(bomCode?: string): string | undefined {
  const same = boms.value.filter((b) => b.bomCode === bomCode)
  if (!same.length) return undefined
  return same.reduce((a, b) => ((b.versionNumber ?? '') > (a.versionNumber ?? '') ? b : a)).id
}

function onBomChange(id: string) {
  const hit = boms.value.find((b) => b.id === id)
  if (!hit) return
  form.bomCode = hit.bomCode
  form.bomVersion = hit.versionNumber
  form.materiel = hit.materielCode
  form.materielDesc = hit.materielDesc
  if (hit.id !== latestBomId(hit.bomCode)) {
    ElMessage.warning(`所选 BOM 非最新版本,最新版本请确认后再下单`)
  }
}

/** 当前日期顺延 5 个工作日(跳过周末),返回 'YYYY-MM-DD 00:00:00' */
function plusWorkdays(days: number): string {
  const d = new Date()
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) added++
  }
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 00:00:00`
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      Object.keys(form).forEach((k) => delete (form as Record<string, unknown>)[k])
      Object.assign(form, { orderSource: 'DEMAND', qty: 10, planEndTime: plusWorkdays(5) })
    }
  },
)

const rules: FormRules = {
  orderSource: [{ required: true, message: '请选择订单类型', trigger: 'change' }],
  bomId: [{ required: true, message: '请选择产品BOM', trigger: 'change' }],
  qty: [{ required: true, message: '请输入需求数量', trigger: 'change' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  if (form.orderSource === 'DEMAND' && !form.planEndTime) { ElMessage.warning('请填写计划交付日期'); return }
  if (form.orderSource === 'FORECAST' && !form.planStartTime) { ElMessage.warning('请填写计划开工日期'); return }
  emit('submit', { ...form })
}
</script>
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm build`
Expected: 构建成功(若 `/technology/bom/page` 字段名与 BomRow 不符,按真实接口调整)

---

### Task 7.2: 录入列表 OrderEntryList.vue

**Files:**
- Create: `mes/vue3/src/views/plan/order-entry/OrderEntryList.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="订单编号">
        <el-input v-model="search.orderCodeLike" placeholder="订单编号" clearable />
      </el-form-item>
      <el-form-item label="审批状态">
        <el-select v-model="search.auditStatus" placeholder="全部" clearable style="width:140px">
          <el-option label="审核中" value="APPROVING" />
          <el-option label="审核通过" value="APPROVED" />
          <el-option label="已驳回" value="REJECTED" />
        </el-select>
      </el-form-item>
    </SearchForm>

    <DataTable :data="tableData" :loading="loading" :columns="columns" :pager="pager"
      @page-change="onPage" @size-change="onSize">
      <template #toolbar>
        <el-button v-permission="'plan:order:add'" type="primary" :icon="Plus" @click="openCreate">新增需求订单</el-button>
      </template>
      <template #col-orderSource="{ row }">
        <el-tag size="small" :type="row.orderSource === 'DEMAND' ? 'warning' : 'success'">
          {{ row.orderSource === 'DEMAND' ? '需求订单' : '预测订单' }}
        </el-tag>
      </template>
      <template #col-auditStatus="{ row }">
        <el-tag size="small" :type="auditTag(row.auditStatus)">{{ auditLabel(row.auditStatus) }}</el-tag>
      </template>
      <template #col-planStatus="{ row }">
        <el-tag v-if="row.planStatus" size="small" :type="row.planStatus === 'UNCOMPUTED' ? 'primary' : 'info'">
          {{ planLabel(row.planStatus) }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button type="danger" link size="small" @click="onDelete(row as ProductionOrder)">删除</el-button>
      </template>
    </DataTable>

    <OrderEntryForm v-model="dialogVisible" :loading="submitLoading" @submit="onSubmit" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import OrderEntryForm from './OrderEntryForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { productionOrderPage, productionOrderSave, productionOrderDelete } from '@/api/plan/order-entry'
import type { ProductionOrder } from '@/types/plan'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ orderCodeLike: '', auditStatus: '' })

const { data: pageData, loading, run } = useRequest(
  () => productionOrderPage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)
const tableData = computed<ProductionOrder[]>(() => {
  const r = pageData.value
  if (r) setTotal(r.total)
  return r?.records ?? []
})

const columns: Column[] = [
  { prop: 'orderCode', label: '订单编号', width: 180 },
  { prop: 'orderSource', label: '类型', width: 100 },
  { prop: 'bomCode', label: '产品BOM', minWidth: 140 },
  { prop: 'materielDesc', label: '产品', minWidth: 120 },
  { prop: 'qty', label: '数量', width: 80 },
  { prop: 'planEndTime', label: '计划交付', minWidth: 120 },
  { prop: 'auditStatus', label: '审批状态', width: 100 },
  { prop: 'planStatus', label: '计划状态', width: 100 },
]

function auditLabel(s?: string) { return ({ DRAFT: '草稿', APPROVING: '审核中', APPROVED: '审核通过', REJECTED: '已驳回' } as Record<string, string>)[s ?? ''] ?? s }
function auditTag(s?: string) { return ({ APPROVING: 'warning', APPROVED: 'success', REJECTED: 'danger' } as Record<string, string>)[s ?? ''] ?? 'info' }
function planLabel(s?: string) { return ({ UNCOMPUTED: '待运算', COMPUTED: '已运算', RELEASED: '已下发' } as Record<string, string>)[s ?? ''] ?? s }

const dialogVisible = ref(false)
const submitLoading = ref(false)
function openCreate() { dialogVisible.value = true }
function onPage(p: number) { pager.current = p; run() }
function onSize(s: number) { pager.size = s; reset(); run() }
function handleSearch() { reset(); run() }
function handleReset() { search.orderCodeLike = ''; search.auditStatus = ''; reset(); run() }

async function onSubmit(dto: Partial<ProductionOrder>) {
  submitLoading.value = true
  try {
    await productionOrderSave(dto)
    ElMessage.success('订单已提交,进入审核中')
    dialogVisible.value = false
    run()
  } finally { submitLoading.value = false }
}

async function onDelete(row: ProductionOrder) {
  try {
    await ElMessageBox.confirm(`确认删除订单「${row.orderCode}」?`, '提示', { type: 'warning' })
  } catch { return }
  try { await productionOrderDelete(row.id!); ElMessage.success('删除成功'); run() } catch { /* 已提示 */ }
}
</script>
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm build`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/plan/order-entry/
git commit -m "✨ feat(vue3): 生产订单录入页(需求/预测+BOM选择+排产派生)"
```

---

## Phase 8:待办任务页 + 审批抽屉

### Task 8.1: 审批抽屉 TodoApprovalDrawer.vue

**Files:**
- Create: `mes/vue3/src/views/plan/todo/TodoApprovalDrawer.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <el-drawer :model-value="modelValue" title="订单审批" size="560px"
    @update:model-value="(v) => emit('update:modelValue', v)">
    <div v-if="task" class="approval">
      <el-steps :active="stepActive" finish-status="success" align-center style="margin-bottom:24px">
        <el-step title="开始" />
        <el-step title="审批" />
        <el-step title="结束" />
      </el-steps>

      <el-descriptions :column="1" border title="订单信息">
        <el-descriptions-item label="任务">{{ task.taskName }}</el-descriptions-item>
        <el-descriptions-item label="订单编号">{{ order?.orderCode }}</el-descriptions-item>
        <el-descriptions-item label="订单类型">{{ order?.orderSource === 'DEMAND' ? '需求订单' : '预测订单' }}</el-descriptions-item>
        <el-descriptions-item label="产品BOM">{{ order?.bomCode }} / {{ order?.materielDesc }}（{{ order?.bomVersion }}）</el-descriptions-item>
        <el-descriptions-item label="需求数量">{{ order?.qty }}</el-descriptions-item>
        <el-descriptions-item label="计划交付">{{ order?.planEndTime || order?.planStartTime }}</el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <el-tag :type="task.status === 'PENDING' ? 'warning' : 'primary'">
            {{ task.status === 'PENDING' ? '待签收' : '已签收' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-form style="margin-top:16px">
        <el-form-item label="审批意见">
          <el-input v-model="comment" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
      </el-form>

      <el-timeline v-if="events.length" style="margin-top:8px">
        <el-timeline-item v-for="ev in events" :key="ev.id" :timestamp="ev.eventTime" placement="top">
          {{ ev.message }}
        </el-timeline-item>
      </el-timeline>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button v-if="task?.status === 'PENDING'" type="primary" :loading="busy" @click="onClaim">签收</el-button>
      <el-button v-if="task?.status === 'CLAIMED'" type="danger" :loading="busy" @click="onReject">驳回</el-button>
      <el-button v-if="task?.status === 'CLAIMED'" type="primary" :loading="busy" @click="onComplete">提交</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { taskClaim, taskComplete, taskReject, taskHistory } from '@/api/workflow/task'
import { productionOrderGetById } from '@/api/plan/order-entry'
import type { WorkflowTask, WorkflowEvent, ProductionOrder } from '@/types/plan'

const props = defineProps<{ modelValue: boolean; task: WorkflowTask | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; done: [] }>()

const order = ref<ProductionOrder | null>(null)
const events = ref<WorkflowEvent[]>([])
const comment = ref('')
const busy = ref(false)

const stepActive = computed(() => {
  if (!props.task) return 1
  return props.task.status === 'PENDING' ? 1 : 1 // 审批进行中停在「审批」
})

watch(
  () => props.modelValue,
  async (open) => {
    if (open && props.task) {
      comment.value = ''
      order.value = await productionOrderGetById(props.task.businessId).catch(() => null)
      events.value = await taskHistory(props.task.instanceId).catch(() => [])
    }
  },
)

async function onClaim() {
  if (!props.task) return
  busy.value = true
  try { await taskClaim(props.task.id); ElMessage.success('签收成功'); emit('update:modelValue', false); emit('done') }
  finally { busy.value = false }
}
async function onComplete() {
  if (!props.task) return
  busy.value = true
  try { await taskComplete(props.task.id, comment.value); ElMessage.success('审批通过,订单转待运算'); emit('update:modelValue', false); emit('done') }
  finally { busy.value = false }
}
async function onReject() {
  if (!props.task) return
  busy.value = true
  try { await taskReject(props.task.id, comment.value); ElMessage.success('已驳回'); emit('update:modelValue', false); emit('done') }
  finally { busy.value = false }
}
</script>
```

> 注:签收后任务状态从 PENDING→CLAIMED,需重新打开任务才出现「提交/驳回」。为简化交互,本期签收后关闭抽屉并刷新列表;用户在列表里该任务变为「已签收」,再次点击即可提交。

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm build`
Expected: 构建成功

---

### Task 8.2: 待办列表 TodoList.vue

**Files:**
- Create: `mes/vue3/src/views/plan/todo/TodoList.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <PageContainer>
    <el-card shadow="never">
      <template #header>
        <span style="font-weight:600">我的待办任务</span>
        <el-badge :value="rows.length" :max="99" type="warning" style="margin-left:8px" />
        <el-button style="float:right" :icon="Refresh" circle @click="run" />
      </template>

      <el-table :data="rows" v-loading="loading" empty-text="暂无待办">
        <el-table-column prop="taskName" label="任务" min-width="160">
          <template #default="{ row }">
            <el-link type="primary" @click="open(row)">{{ row.taskName }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="businessId" label="业务单号" min-width="160">
          <template #default="{ row }">{{ row.businessId }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PENDING' ? 'warning' : 'primary'">
              {{ row.status === 'PENDING' ? '待签收' : '已签收' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="发起时间" width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="open(row)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <TodoApprovalDrawer v-model="drawer" :task="current" @done="run" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import TodoApprovalDrawer from './TodoApprovalDrawer.vue'
import { useRequest } from '@/composables/useRequest'
import { taskTodo } from '@/api/workflow/task'
import type { WorkflowTask } from '@/types/plan'

const { data, loading, run } = useRequest(() => taskTodo(), { immediate: true, initialData: [] })
const rows = computed<WorkflowTask[]>(() => data.value ?? [])

const drawer = ref(false)
const current = ref<WorkflowTask | null>(null)
function open(row: WorkflowTask) { current.value = row; drawer.value = true }
</script>
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm build`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/plan/todo/
git commit -m "✨ feat(vue3): 待办任务列表+审批抽屉(签收/提交/驳回+轨迹)"
```

---

## Phase 9:路由 + 首页待办卡片

### Task 9.1: 注册路由

**Files:**
- Modify: `mes/vue3/src/router/index.ts`

- [ ] **Step 1: 在 AdminLayout 的 children 中(现有业务子路由块,如 order/release 附近)追加**

```ts
{
  path: 'plan/order',
  name: 'plan-order',
  component: () => import('@/views/plan/order-entry/OrderEntryList.vue'),
  meta: { title: '生产订单录入', perm: 'plan:order:list' },
},
{
  path: 'plan/todo',
  name: 'plan-todo',
  component: () => import('@/views/plan/todo/TodoList.vue'),
  meta: { title: '待办任务', perm: 'plan:todo:list' },
},
```

> 确认 path 不带前导斜杠(与现有子路由一致),最终 URL = `/plan/order`、`/plan/todo`,与种子菜单 url 对齐。

- [ ] **Step 2: 类型检查**

Run: `cd mes/vue3 && pnpm build`
Expected: 构建成功

---

### Task 9.2: 首页「我的待办」卡片

**Files:**
- Create: `mes/vue3/src/views/welcome/components/MyTodoCard.vue`
- Modify: `mes/vue3/src/views/welcome/WelcomeView.vue`

> 落地前先读 `WelcomeView.vue` 确认插槽位置与样式风格;卡片点标题跳 `/plan/todo`。

- [ ] **Step 1: MyTodoCard.vue**

```vue
<template>
  <el-card shadow="hover" class="todo-card">
    <template #header>
      <span>我的待办</span>
      <el-badge :value="rows.length" :max="99" type="warning" style="margin-left:8px" />
      <el-link type="primary" style="float:right" @click="goAll">全部 →</el-link>
    </template>
    <el-empty v-if="!rows.length" description="暂无待办" :image-size="60" />
    <ul v-else class="todo-list">
      <li v-for="t in rows.slice(0, 5)" :key="t.id">
        <el-link type="primary" @click="goAll">{{ t.taskName }}</el-link>
        <span class="biz">{{ t.businessId }}</span>
        <el-tag size="small" :type="t.status === 'PENDING' ? 'warning' : 'primary'">
          {{ t.status === 'PENDING' ? '待签收' : '已签收' }}
        </el-tag>
      </li>
    </ul>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRequest } from '@/composables/useRequest'
import { taskTodo } from '@/api/workflow/task'
import type { WorkflowTask } from '@/types/plan'

const router = useRouter()
const { data } = useRequest(() => taskTodo(), { immediate: true, initialData: [] })
const rows = computed<WorkflowTask[]>(() => data.value ?? [])
function goAll() { router.push('/plan/todo') }
</script>

<style scoped>
.todo-list { list-style: none; margin: 0; padding: 0; }
.todo-list li { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.todo-list .biz { flex: 1; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
```

- [ ] **Step 2: 在 WelcomeView.vue 引入并挂载**(问候横幅下方插入)

```vue
<!-- 在 <script setup> 中追加 -->
import MyTodoCard from './components/MyTodoCard.vue'

<!-- 在模板问候横幅之后插入 -->
<section class="welcome__todos">
  <MyTodoCard />
</section>
```

- [ ] **Step 3: 类型检查**

Run: `cd mes/vue3 && pnpm build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/src/router/index.ts mes/vue3/src/views/welcome/
git commit -m "✨ feat(vue3): 注册生产计划中心路由+首页我的待办卡片"
```

---

## Phase 10:端到端验证

### Task 10.1: 后端全量编译 + 单测

**Files:** 无

- [ ] **Step 1: 全量编译**

Run: `cd mes && mvn -q -DskipTests compile`
Expected: BUILD SUCCESS

- [ ] **Step 2: 跑单测**

Run: `cd mes && mvn -q -Dtest=BpmnParserTest test`
Expected: Tests run: 1, Failures: 0

---

### Task 10.2: 手动端到端(对照 spec 第 10 节判据)

**Files:** 无。前置:导入种子 SQL、后端启动(`cd mes && mvn spring-boot:run`)、前端启动(`cd mes/vue3 && pnpm dev`)。

- [ ] **Step 1: 计划员建单**

用 `planner/123` 登录 → 生产计划中心 → 生产订单录入 → 新增需求订单(BOM=台式电脑主机、数量 10、计划交付默认=当前+5 工作日)→ 提交。
Expected: 列表出现新订单,审批状态=审核中;DB `sp_workflow_instance` 有 1 条 RUNNING、`sp_workflow_task` 有 1 条 PENDING(candidate_role_code=prod_supervisor)。

- [ ] **Step 2: 主管看到待办**

用 `supervisor/123` 登录 → 首页「我的待办」卡片与「待办任务」菜单均显示该任务。用 `planner` 登录则待办为空(角色隔离生效)。

- [ ] **Step 3: 签收 + 提交**

主管点任务标题进抽屉 → 签收(任务→CLAIMED)→ 重新打开 → 提交。
Expected: 任务 COMPLETED、实例 COMPLETED;`sp_workflow_event_log` 有 START/CLAIM/COMPLETE/END。

- [ ] **Step 4: 验证终态**

回到生产订单录入。
Expected: 该订单 `audit_status=APPROVED`、`plan_status=UNCOMPUTED`(列表显示 审核通过 + 待运算)。

- [ ] **Step 5: 派生校验**

新建一个预测订单。
Expected: DB 该行 `schedule_mode=FORWARD`;需求订单 `schedule_mode=BACKWARD`。

- [ ] **Step 6: 收尾提交(若验证中有小修)**

```bash
git add -A && git commit -m "✅ test(plan): 生产订单录入+BPMN审批端到端联调修正"
```

---

## 完成标准

- spec 第 10 节 7 条判据全部满足。
- 后端编译通过、BpmnParser 单测通过。
- 前端 `pnpm build` 通过。
- 涉及的既有后端文件(SpOrder)与新增后端代码经通读无明显 bug。

## 不在本计划

MRP 排产运算;多级/会签/网关;事件规则脚本引擎;同步到 mes-new(下一周期)。
