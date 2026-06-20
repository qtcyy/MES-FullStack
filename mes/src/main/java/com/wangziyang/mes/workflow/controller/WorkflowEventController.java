package com.wangziyang.mes.workflow.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.workflow.dto.EventListDTO;
import com.wangziyang.mes.workflow.dto.IdDTO;
import com.wangziyang.mes.workflow.entity.SpWorkflowEventRule;
import com.wangziyang.mes.workflow.service.ISpWorkflowEventRuleService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 流程事件规则配置
 *
 * @since 周期 2n 后端补齐
 */
@RestController
@RequestMapping("/workflow/event")
public class WorkflowEventController extends BaseController {

    @Autowired
    private ISpWorkflowEventRuleService eventRuleService;

    /** 某定义下的全部事件规则(JSON {definitionId}) */
    @PostMapping("/list")
    public Result list(@RequestBody EventListDTO dto) {
        List<SpWorkflowEventRule> list = eventRuleService.list(
                new QueryWrapper<SpWorkflowEventRule>()
                        .eq("definition_id", dto.getDefinitionId())
                        .orderByAsc("create_time"));
        return Result.success(list);
    }

    /** 新增/编辑事件规则(JSON;空 id 走新增) */
    @PostMapping("/save")
    public Result save(@RequestBody SpWorkflowEventRule rule) {
        if (StringUtils.isEmpty(rule.getDefinitionId())) {
            return Result.failure("流程定义ID不能为空");
        }
        if (rule.getEnabled() == null) {
            rule.setEnabled(true);
        }
        eventRuleService.saveOrUpdate(rule);
        return Result.success(rule.getId());
    }

    /** 删除事件规则(JSON {id}) */
    @PostMapping("/delete")
    public Result delete(@RequestBody IdDTO dto) {
        eventRuleService.removeById(dto.getId());
        return Result.success();
    }
}
