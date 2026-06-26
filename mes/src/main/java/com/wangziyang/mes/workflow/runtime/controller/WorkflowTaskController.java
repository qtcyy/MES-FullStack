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
