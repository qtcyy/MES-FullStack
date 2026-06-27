package com.wangziyang.mes.technology.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.entity.SpOperStep;
import com.wangziyang.mes.technology.service.ISpOperStepService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/basedata/sp-oper-step")
public class SpOperStepController extends BaseController {

    @Autowired
    private ISpOperStepService iSpOperStepService;

    /** 某工序的步骤列表(按序号升序) */
    @GetMapping("/list")
    @ResponseBody
    public Result list(String operId) {
        if (StringUtils.isEmpty(operId)) {
            return Result.failure("缺少工序ID");
        }
        QueryWrapper<SpOperStep> qw = new QueryWrapper<>();
        qw.eq("oper_id", operId).orderByAsc("step_no").orderByAsc("id");
        return Result.success(iSpOperStepService.list(qw));
    }

    /** 新增/修改单条步骤(新增时 step_no = 该工序当前最大+1) */
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpOperStep record) {
        if (StringUtils.isEmpty(record.getOperId())) {
            return Result.failure("缺少工序ID");
        }
        if (StringUtils.isEmpty(record.getStepTitle())) {
            return Result.failure("步骤标题不能为空");
        }
        if (StringUtils.isEmpty(record.getId())) {
            // 新增:序号取该工序当前最大 step_no + 1(从1开始)
            QueryWrapper<SpOperStep> qw = new QueryWrapper<>();
            qw.eq("oper_id", record.getOperId()).orderByDesc("step_no").last("LIMIT 1");
            SpOperStep last = iSpOperStepService.getOne(qw);
            int next = (last != null && last.getStepNo() != null) ? last.getStepNo() + 1 : 1;
            record.setStepNo(next);
        }
        // 修改路径:前端不传 step_no,MyBatis-Plus 默认 NOT_NULL 更新策略会跳过 null,序号得以保留
        iSpOperStepService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    /** 删除单条步骤 */
    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        iSpOperStepService.removeById(params.get("id"));
        return Result.success(null);
    }

    /** 重排步骤顺序:按给定 id 列表重写 step_no(拖拽 / 上下移统一走这里) */
    @PostMapping("/reorder")
    @ResponseBody
    public Result reorder(@RequestBody Map<String, Object> body) {
        Object operIdObj = body.get("operId");
        String operId = operIdObj == null ? null : operIdObj.toString();
        if (StringUtils.isEmpty(operId)) {
            return Result.failure("缺少工序ID");
        }
        List<String> ids = new ArrayList<>();
        Object idsObj = body.get("ids");
        if (idsObj instanceof List) {
            for (Object o : (List<?>) idsObj) {
                if (o != null) {
                    ids.add(o.toString());
                }
            }
        }
        iSpOperStepService.reorder(operId, ids);
        return Result.success(null);
    }
}
