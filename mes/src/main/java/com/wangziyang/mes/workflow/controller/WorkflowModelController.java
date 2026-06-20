package com.wangziyang.mes.workflow.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.workflow.dto.IdDTO;
import com.wangziyang.mes.workflow.dto.ModelPublishDTO;
import com.wangziyang.mes.workflow.dto.ModelSaveDTO;
import com.wangziyang.mes.workflow.entity.SpWorkflowDefinition;
import com.wangziyang.mes.workflow.entity.SpWorkflowEventRule;
import com.wangziyang.mes.workflow.entity.SpWorkflowModel;
import com.wangziyang.mes.workflow.request.ModelPageReq;
import com.wangziyang.mes.workflow.service.ISpWorkflowDefinitionService;
import com.wangziyang.mes.workflow.service.ISpWorkflowEventRuleService;
import com.wangziyang.mes.workflow.service.ISpWorkflowModelService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * 流程模型设计
 *
 * @since 周期 2n 后端补齐
 */
@RestController
@RequestMapping("/workflow/model")
public class WorkflowModelController extends BaseController {

    @Autowired
    private ISpWorkflowModelService modelService;
    @Autowired
    private ISpWorkflowDefinitionService definitionService;
    @Autowired
    private ISpWorkflowEventRuleService eventRuleService;

    /** 模型分页(form 编码) */
    @PostMapping("/page")
    public Result page(ModelPageReq req) {
        QueryWrapper<SpWorkflowModel> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getName())) {
            qw.like("name", req.getName());
        }
        if (StringUtils.isNotEmpty(req.getModelKey())) {
            qw.like("model_key", req.getModelKey());
        }
        qw.orderByDesc("update_time");
        IPage result = modelService.page(req, qw);
        return Result.success(result);
    }

    /** 取单个模型(含 bpmnXml) */
    @GetMapping("/{id}")
    public Result get(@PathVariable("id") String id) {
        return Result.success(modelService.getById(id));
    }

    /** 新建/保存设计(JSON;空 id 走新建,状态 DRAFT) */
    @PostMapping("/save")
    public Result save(@RequestBody ModelSaveDTO dto) {
        if (StringUtils.isEmpty(dto.getModelKey())) {
            return Result.failure("模型key不能为空");
        }
        QueryWrapper<SpWorkflowModel> dup = new QueryWrapper<SpWorkflowModel>()
                .eq("model_key", dto.getModelKey())
                .ne(StringUtils.isNotEmpty(dto.getId()), "id", dto.getId());
        if (modelService.count(dup) > 0) {
            return Result.failure("模型key已存在");
        }
        SpWorkflowModel model;
        if (StringUtils.isNotEmpty(dto.getId())) {
            model = modelService.getById(dto.getId());
            if (model == null) {
                return Result.failure("模型不存在");
            }
            // 仅更新名称/key/XML;保留 status/version/分类(发布不可逆)
            model.setModelKey(dto.getModelKey());
            model.setName(dto.getName());
            model.setBpmnXml(dto.getBpmnXml());
        } else {
            model = new SpWorkflowModel();
            model.setModelKey(dto.getModelKey());
            model.setName(dto.getName());
            model.setBpmnXml(dto.getBpmnXml());
            model.setStatus("DRAFT");
            model.setVersion(1);
        }
        modelService.saveOrUpdate(model);
        return Result.success(model.getId());
    }

    /** 删除(JSON {id});已发布则级联清理派生的流程定义及其事件规则 */
    @PostMapping("/delete")
    @Transactional
    public Result delete(@RequestBody IdDTO dto) {
        modelService.removeById(dto.getId());
        // 派生定义 id = 模型 id;一并清理避免孤儿定义/事件规则
        if (definitionService.getById(dto.getId()) != null) {
            eventRuleService.remove(
                    new QueryWrapper<SpWorkflowEventRule>().eq("definition_id", dto.getId()));
            definitionService.removeById(dto.getId());
        }
        return Result.success();
    }

    /** 发布到分类(JSON;置 PUBLISHED + 回填分类 + upsert 流程定义) */
    @PostMapping("/publish")
    @Transactional
    public Result publish(@RequestBody ModelPublishDTO dto) {
        SpWorkflowModel model = modelService.getById(dto.getId());
        if (model == null) {
            return Result.failure("模型不存在");
        }
        model.setStatus("PUBLISHED");
        model.setCategoryCode(dto.getCategoryCode());
        model.setCategoryName(dto.getCategoryName());
        modelService.updateById(model);

        SpWorkflowDefinition def = definitionService.getById(model.getId());
        if (def == null) {
            def = new SpWorkflowDefinition();
            def.setId(model.getId());
            def.setEnabled(true);
        }
        def.setProcessKey(model.getModelKey());
        def.setProcessName(model.getName());
        def.setCategoryCode(model.getCategoryCode());
        def.setCategoryName(model.getCategoryName());
        def.setVersion(model.getVersion());
        definitionService.saveOrUpdate(def);
        return Result.success();
    }
}
