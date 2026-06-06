package com.wangziyang.mes.basedata.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.entity.SpProcessUnit;
import com.wangziyang.mes.basedata.entity.SpProcessUnitTeam;
import com.wangziyang.mes.basedata.request.SpProcessUnitPageReq;
import com.wangziyang.mes.basedata.service.ISpProcessUnitService;
import com.wangziyang.mes.basedata.service.ISpProcessUnitTeamService;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.service.ISpTeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
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
        spProcessUnitService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        SpProcessUnit pu = new SpProcessUnit();
        pu.setId(params.get("id"));
        pu.setDeleted("1");
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
