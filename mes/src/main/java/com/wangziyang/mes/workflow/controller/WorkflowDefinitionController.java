package com.wangziyang.mes.workflow.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.workflow.dto.SetEnabledDTO;
import com.wangziyang.mes.workflow.dto.SetFormDTO;
import com.wangziyang.mes.workflow.entity.SpWorkflowDefinition;
import com.wangziyang.mes.workflow.request.DefinitionPageReq;
import com.wangziyang.mes.workflow.service.ISpWorkflowDefinitionService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 流程定义管理(由模型发布动作落库,仅含已发布)
 *
 * @since 周期 2n 后端补齐
 */
@RestController
@RequestMapping("/workflow/definition")
public class WorkflowDefinitionController extends BaseController {

    @Autowired
    private ISpWorkflowDefinitionService definitionService;

    /** 定义分页(form 编码) */
    @PostMapping("/page")
    public Result page(DefinitionPageReq req) {
        QueryWrapper<SpWorkflowDefinition> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getName())) {
            qw.like("process_name", req.getName());
        }
        qw.orderByDesc("create_time");
        IPage result = definitionService.page(req, qw);
        return Result.success(result);
    }

    /** 启用/停用(JSON {id, enabled}) */
    @PostMapping("/set-enabled")
    public Result setEnabled(@RequestBody SetEnabledDTO dto) {
        definitionService.update(new UpdateWrapper<SpWorkflowDefinition>()
                .eq("id", dto.getId())
                .set("enabled", Boolean.TRUE.equals(dto.getEnabled())));
        return Result.success();
    }

    /** 关联/清除流程表单(JSON {id, formKey};formKey 为 null 清除) */
    @PostMapping("/set-form")
    public Result setForm(@RequestBody SetFormDTO dto) {
        definitionService.update(new UpdateWrapper<SpWorkflowDefinition>()
                .eq("id", dto.getId())
                .set("form_key", dto.getFormKey()));
        return Result.success();
    }
}
