package com.wangziyang.mes.basedata.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.entity.SpProcessUnit;
import com.wangziyang.mes.basedata.entity.SpProcessUnitTeam;
import com.wangziyang.mes.basedata.request.SpProcessUnitPageReq;
import com.wangziyang.mes.basedata.service.ISpProcessUnitService;
import com.wangziyang.mes.basedata.service.ISpProcessUnitTeamService;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.common.util.SoftDeleteUtil;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.service.ISpTeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller("adminSpProcessUnitController")
@RequestMapping("/basedata/process-unit")
public class SpProcessUnitController {

    @Autowired
    private ISpProcessUnitService spProcessUnitService;

    @Autowired
    private ISpProcessUnitTeamService spProcessUnitTeamService;

    @Autowired
    private ISpTeamService spTeamService;

    @GetMapping("/list-ui")
    public String listUI() { return "forward:/index.html"; }

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpProcessUnitPageReq req) {
        QueryWrapper<SpProcessUnit> qw = new QueryWrapper<>();
        qw.ne("is_deleted", "1");
        if (req.getName() != null && !req.getName().isEmpty())
            qw.like("name", req.getName());
        if (req.getCode() != null && !req.getCode().isEmpty())
            qw.like("code", req.getCode());
        qw.orderByDesc("create_time");
        return Result.success(spProcessUnitService.page(req, qw));
    }

    @GetMapping("/{id}")
    @ResponseBody
    public Result getById(@PathVariable String id) {
        return Result.success(spProcessUnitService.getById(id));
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(@RequestBody SpProcessUnit record) {
        if (!StringUtils.hasText(record.getCode())) {
            return Result.failure("加工单元代码不能为空");
        }
        // 未删除记录中校验 code 唯一，给出友好提示，避免命中唯一索引抛原始 SQL 异常
        QueryWrapper<SpProcessUnit> dup = new QueryWrapper<>();
        dup.eq("code", record.getCode()).ne("is_deleted", "1");
        if (StringUtils.hasText(record.getId())) {
            dup.ne("id", record.getId());
        }
        if (spProcessUnitService.count(dup) > 0) {
            return Result.failure("加工单元代码已存在：" + record.getCode());
        }
        spProcessUnitService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        SpProcessUnit existing = spProcessUnitService.getById(id);
        if (existing == null) {
            return Result.failure("加工单元不存在");
        }
        SpProcessUnit pu = new SpProcessUnit();
        pu.setId(id);
        pu.setDeleted("1");
        // 释放 code 唯一索引，避免软删除后再新增同代码加工单元触发唯一键冲突（code 列 varchar(32)）
        pu.setCode(SoftDeleteUtil.freeUniqueValue(existing.getCode(), id, 32));
        spProcessUnitService.updateById(pu);
        return Result.success(null);
    }

    @GetMapping("/teams/{unitId}")
    @ResponseBody
    public Result getTeams(@PathVariable String unitId) {
        QueryWrapper<SpProcessUnitTeam> qw = new QueryWrapper<>();
        qw.eq("unit_id", unitId);
        List<SpProcessUnitTeam> items = spProcessUnitTeamService.list(qw);
        if (items.isEmpty()) return Result.success(Collections.emptyList());
        List<String> teamIds = items.stream().map(SpProcessUnitTeam::getTeamId).collect(Collectors.toList());
        return Result.success(spTeamService.listByIds(teamIds));
    }

    @PostMapping("/teams/add")
    @ResponseBody
    public Result addTeam(@RequestBody Map<String, String> params) {
        String unitId = params.get("unitId");
        String teamId = params.get("teamId");
        SpProcessUnitTeam existing = spProcessUnitTeamService.getOne(
            new QueryWrapper<SpProcessUnitTeam>().eq("unit_id", unitId).eq("team_id", teamId)
        );
        if (existing == null) {
            SpProcessUnitTeam item = new SpProcessUnitTeam();
            item.setUnitId(unitId);
            item.setTeamId(teamId);
            spProcessUnitTeamService.save(item);
        }
        return Result.success(null);
    }

    @PostMapping("/teams/remove")
    @ResponseBody
    public Result removeTeam(@RequestBody Map<String, String> params) {
        QueryWrapper<SpProcessUnitTeam> qw = new QueryWrapper<>();
        qw.eq("unit_id", params.get("unitId")).eq("team_id", params.get("teamId"));
        spProcessUnitTeamService.remove(qw);
        return Result.success(null);
    }
}
