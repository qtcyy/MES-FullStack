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

    /** 上移/下移:与同工序内相邻步骤交换 step_no */
    @PostMapping("/move")
    @ResponseBody
    public Result move(String id, String direction) {
        SpOperStep cur = iSpOperStepService.getById(id);
        if (cur == null) {
            return Result.failure("步骤不存在");
        }
        boolean up = "up".equals(direction);
        QueryWrapper<SpOperStep> qw = new QueryWrapper<>();
        qw.eq("oper_id", cur.getOperId());
        if (up) {
            qw.lt("step_no", cur.getStepNo()).orderByDesc("step_no");
        } else {
            qw.gt("step_no", cur.getStepNo()).orderByAsc("step_no");
        }
        qw.last("LIMIT 1");
        SpOperStep neighbor = iSpOperStepService.getOne(qw);
        if (neighbor == null) {
            // 已在顶部/底部,无需交换
            return Result.success(null);
        }
        Integer tmp = cur.getStepNo();
        cur.setStepNo(neighbor.getStepNo());
        neighbor.setStepNo(tmp);
        iSpOperStepService.updateById(cur);
        iSpOperStepService.updateById(neighbor);
        return Result.success(null);
    }
}
