package com.wangziyang.mes.technology.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.basedata.entity.SpProcessUnit;
import com.wangziyang.mes.basedata.service.ISpProcessUnitService;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.entity.SpOper;
import com.wangziyang.mes.technology.request.SpOperReq;
import com.wangziyang.mes.technology.service.ISpOperService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Controller
@RequestMapping("/basedata/sp-oper")
public class SpOperController extends BaseController {

    @Autowired
    private ISpOperService iSpOperService;

    @Autowired
    private ISpProcessUnitService iSpProcessUnitService;

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpOperReq req) {
        QueryWrapper<SpOper> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getOperDescLike())) {
            qw.like("oper_desc", req.getOperDescLike());
        }
        qw.orderByDesc("create_time");
        IPage<SpOper> result = iSpOperService.page(req, qw);
        return Result.success(result);
    }

    @GetMapping("/list")
    @ResponseBody
    public Result list() {
        QueryWrapper<SpOper> qw = new QueryWrapper<>();
        qw.orderByAsc("oper_code");
        return Result.success(iSpOperService.list(qw));
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpOper record) {
        if (StringUtils.isEmpty(record.getId())) {
            // New record: auto-generate oper_code
            record.setId(UUID.randomUUID().toString().replace("-", ""));
            String code = generateOperCode();
            record.setOperCode(code);
            record.setOper(code);
            if (StringUtils.isEmpty(record.getGeneratePlan())) {
                record.setGeneratePlan("1");
            }
        }
        // Validate: manufacturing_cycle > labor_hours
        if (record.getLaborHours() != null && record.getManufacturingCycle() != null
                && record.getManufacturingCycle() <= record.getLaborHours()) {
            return Result.failure("制造周期必须大于工时");
        }
        iSpOperService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    private String generateOperCode() {
        QueryWrapper<SpOper> qw = new QueryWrapper<>();
        qw.likeRight("oper_code", "OPR-").orderByDesc("oper_code").last("LIMIT 1");
        SpOper last = iSpOperService.getOne(qw);
        int next = 1;
        if (last != null && last.getOperCode() != null) {
            String numStr = last.getOperCode().replace("OPR-", "");
            try { next = Integer.parseInt(numStr) + 1; } catch (NumberFormatException e) { /* keep 1 */ }
        }
        return "OPR-" + String.format("%03d", next);
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        iSpOperService.removeById(params.get("id"));
        return Result.success(null);
    }

    @GetMapping("/process-units")
    @ResponseBody
    public Result getProcessUnits() {
        QueryWrapper<SpProcessUnit> qw = new QueryWrapper<>();
        qw.eq("is_deleted", "0");
        return Result.success(iSpProcessUnitService.list(qw));
    }
}
