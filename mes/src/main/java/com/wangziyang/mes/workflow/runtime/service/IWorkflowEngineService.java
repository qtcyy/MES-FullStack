package com.wangziyang.mes.workflow.runtime.service;

import com.wangziyang.mes.workflow.runtime.entity.SpWorkflowEventLog;
import com.wangziyang.mes.workflow.runtime.entity.SpWorkflowTask;

import java.util.List;

public interface IWorkflowEngineService {
    String start(String processKey, String businessType, String businessId,
                 String businessCode, String title);
    void claim(String taskId);
    void complete(String taskId, String comment);
    void reject(String taskId, String comment);
    List<SpWorkflowTask> myTodo();
    List<SpWorkflowEventLog> history(String instanceId);
}
