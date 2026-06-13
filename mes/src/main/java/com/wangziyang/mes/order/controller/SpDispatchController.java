package com.wangziyang.mes.order.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.dto.SpDispatchDTO;
import com.wangziyang.mes.order.request.SpDispatchPageReq;
import com.wangziyang.mes.order.service.ISpDispatchService;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.entity.SpTeamUser;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.service.ISpTeamService;
import com.wangziyang.mes.system.service.ISpTeamUserService;
import com.wangziyang.mes.system.service.ISysUserService;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/order/dispatch")
public class SpDispatchController extends BaseController {

    @Autowired
    private ISpDispatchService spDispatchService;

    @Autowired
    private ISpTeamService spTeamService;

    @Autowired
    private ISpTeamUserService spTeamUserService;

    @Autowired
    private ISysUserService sysUserService;

    /**
     * 分页查询待派工工单 — form-encoded 风格，匹配现有模式
     */
    @ApiOperation("分页查询待派工工单")
    @PostMapping("/page")
    @ResponseBody
    public Result page(SpDispatchPageReq req) {
        IPage<Map<String, Object>> result = spDispatchService.pageOrdersForDispatch(req, req.getOrderCode());
        return Result.success(result);
    }

    /**
     * 执行派工 — JSON 请求体（前端显式设 Content-Type: application/json）
     */
    @ApiOperation("执行派工")
    @PostMapping("/assign")
    @ResponseBody
    public Result assign(@RequestBody SpDispatchDTO dto) {
        spDispatchService.assignWorker(dto);
        return Result.success();
    }

    /**
     * 查询工单派工详情
     */
    @ApiOperation("查询工单派工详情")
    @GetMapping("/get-by-order/{orderId}")
    @ResponseBody
    public Result getByOrderId(@PathVariable String orderId) {
        Map<String, Object> dispatch = spDispatchService.getDispatchByOrderId(orderId);
        return Result.success(dispatch);
    }

    /**
     * 获取可用班组列表
     */
    @ApiOperation("获取可用班组列表")
    @GetMapping("/teams")
    @ResponseBody
    public Result getTeams() {
        List<SpTeam> teams = spTeamService.list(
                new QueryWrapper<SpTeam>().eq("is_deleted", "0"));
        return Result.success(teams);
    }

    /**
     * 获取班组下的作业员列表
     */
    @ApiOperation("获取班组下的作业员列表")
    @GetMapping("/team-users/{teamId}")
    @ResponseBody
    public Result getTeamUsers(@PathVariable String teamId) {
        List<SpTeamUser> teamUsers = spTeamUserService.list(
                new QueryWrapper<SpTeamUser>().eq("team_id", teamId));

        if (teamUsers.isEmpty()) {
            return Result.success(Collections.emptyList());
        }

        List<String> userIds = teamUsers.stream()
                .map(SpTeamUser::getUserId)
                .collect(Collectors.toList());
        List<SysUser> users = (List<SysUser>) sysUserService.listByIds(userIds);
        return Result.success(users);
    }
}
