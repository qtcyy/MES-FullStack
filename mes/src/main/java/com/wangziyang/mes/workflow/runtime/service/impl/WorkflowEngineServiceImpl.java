package com.wangziyang.mes.workflow.runtime.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.workflow.entity.SpWorkflowDefinition;
import com.wangziyang.mes.workflow.entity.SpWorkflowModel;
import com.wangziyang.mes.workflow.mapper.SpWorkflowDefinitionMapper;
import com.wangziyang.mes.workflow.mapper.SpWorkflowModelMapper;
import com.wangziyang.mes.workflow.runtime.bpmn.BpmnParser;
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
