package com.wangziyang.mes.workflow.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.workflow.dto.IdDTO;
import com.wangziyang.mes.workflow.entity.SpWorkflowCategory;
import com.wangziyang.mes.workflow.request.CategoryPageReq;
import com.wangziyang.mes.workflow.service.ISpWorkflowCategoryService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 流程分类管理
 *
 * @since 周期 2n 后端补齐
 */
@RestController
@RequestMapping("/workflow/category")
public class WorkflowCategoryController extends BaseController {

    @Autowired
    private ISpWorkflowCategoryService categoryService;

    /** 分类分页(form 编码) */
    @PostMapping("/page")
    public Result page(CategoryPageReq req) {
        QueryWrapper<SpWorkflowCategory> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getCode())) {
            qw.like("code", req.getCode());
        }
        if (StringUtils.isNotEmpty(req.getName())) {
            qw.like("name", req.getName());
        }
        qw.orderByDesc("create_time");
        IPage result = categoryService.page(req, qw);
        return Result.success(result);
    }

    /** 全部分类(下拉用) */
    @PostMapping("/list")
    public Result list() {
        List<SpWorkflowCategory> list = categoryService.list(
                new QueryWrapper<SpWorkflowCategory>().orderByDesc("create_time"));
        return Result.success(list);
    }

    /** 新增/编辑(form 编码;空 id 走新增) */
    @PostMapping("/add-or-update")
    public Result addOrUpdate(SpWorkflowCategory record) {
        if (StringUtils.isEmpty(record.getCode())) {
            return Result.failure("分类编码不能为空");
        }
        QueryWrapper<SpWorkflowCategory> dup = new QueryWrapper<SpWorkflowCategory>()
                .eq("code", record.getCode())
                .ne(StringUtils.isNotEmpty(record.getId()), "id", record.getId());
        if (categoryService.count(dup) > 0) {
            return Result.failure("分类编码已存在");
        }
        categoryService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    /** 删除(JSON {id}) */
    @PostMapping("/delete")
    public Result delete(@RequestBody IdDTO dto) {
        categoryService.removeById(dto.getId());
        return Result.success();
    }
}
