package com.wangziyang.mes.workflow.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.workflow.dto.IdDTO;
import com.wangziyang.mes.workflow.entity.SpWorkflowForm;
import com.wangziyang.mes.workflow.request.FormPageReq;
import com.wangziyang.mes.workflow.service.ISpWorkflowFormService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 流程表单管理
 *
 * @since 周期 2n 后端补齐
 */
@RestController
@RequestMapping("/workflow/form")
public class WorkflowFormController extends BaseController {

    @Autowired
    private ISpWorkflowFormService formService;

    /** 表单分页(form 编码) */
    @PostMapping("/page")
    public Result page(FormPageReq req) {
        QueryWrapper<SpWorkflowForm> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getName())) {
            qw.like("name", req.getName());
        }
        if (StringUtils.isNotEmpty(req.getFormKey())) {
            qw.like("form_key", req.getFormKey());
        }
        qw.orderByDesc("create_time");
        IPage result = formService.page(req, qw);
        return Result.success(result);
    }

    /** 全部表单(下拉用) */
    @PostMapping("/list")
    public Result list() {
        List<SpWorkflowForm> list = formService.list(
                new QueryWrapper<SpWorkflowForm>().orderByDesc("create_time"));
        return Result.success(list);
    }

    /** 新增/编辑(form 编码;空 id 走新增) */
    @PostMapping("/add-or-update")
    public Result addOrUpdate(SpWorkflowForm record) {
        if (StringUtils.isEmpty(record.getFormKey())) {
            return Result.failure("表单key不能为空");
        }
        if (StringUtils.isEmpty(record.getFormType())) {
            record.setFormType("URL");
        }
        if (record.getSkipSameAssignee() == null) {
            record.setSkipSameAssignee(false);
        }
        QueryWrapper<SpWorkflowForm> dup = new QueryWrapper<SpWorkflowForm>()
                .eq("form_key", record.getFormKey())
                .ne(StringUtils.isNotEmpty(record.getId()), "id", record.getId());
        if (formService.count(dup) > 0) {
            return Result.failure("表单key已存在");
        }
        formService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    /** 删除(JSON {id}) */
    @PostMapping("/delete")
    public Result delete(@RequestBody IdDTO dto) {
        formService.removeById(dto.getId());
        return Result.success();
    }
}
