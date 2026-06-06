package com.wangziyang.mes.system.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.entity.SpTeamUser;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.request.SpTeamPageReq;
import com.wangziyang.mes.system.service.ISpTeamService;
import com.wangziyang.mes.system.service.ISpTeamUserService;
import com.wangziyang.mes.system.service.ISysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * <p>
 * 班组 前端控制器
 * </p>
 *
 * @author SongPeng
 * @since 2021-10-15
 */
@Controller("adminSpTeamController")
@RequestMapping("/admin/sys/team")
public class SpTeamController extends BaseController {

    @Autowired
    private ISpTeamService spTeamService;

    @Autowired
    private ISpTeamUserService spTeamUserService;

    @Autowired
    private ISysUserService sysUserService;

    @GetMapping("/list-ui")
    public String listUI() {
        return "forward:/index.html";
    }

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpTeamPageReq req) throws Exception {
        return Result.success(spTeamService.pageWithRelations(req));
    }

    @GetMapping("/{id}")
    @ResponseBody
    public Result getById(@PathVariable String id) {
        SpTeam team = spTeamService.getById(id);
        return Result.success(team);
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpTeam record) {
        spTeamService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        SpTeam team = new SpTeam();
        team.setId(id);
        team.setDeleted("1");
        spTeamService.updateById(team);
        return Result.success(null);
    }

    @GetMapping("/users/{teamId}")
    @ResponseBody
    public Result getTeamUsers(@PathVariable String teamId) {
        QueryWrapper<SpTeamUser> qw = new QueryWrapper<>();
        qw.eq("team_id", teamId);
        List<SpTeamUser> teamUsers = spTeamUserService.list(qw);
        List<String> userIds = teamUsers.stream()
                .map(SpTeamUser::getUserId)
                .collect(Collectors.toList());
        if (userIds.isEmpty()) {
            return Result.success(Collections.emptyList());
        }
        List<SysUser> users = (List<SysUser>) sysUserService.listByIds(userIds);
        return Result.success(users);
    }

    @PostMapping("/users/add")
    @ResponseBody
    public Result addTeamUsers(@RequestBody Map<String, Object> params) {
        String teamId = (String) params.get("teamId");
        @SuppressWarnings("unchecked")
        List<String> userIds = (List<String>) params.get("userIds");
        if (userIds != null) {
            for (String userId : userIds) {
                QueryWrapper<SpTeamUser> qw = new QueryWrapper<>();
                qw.eq("team_id", teamId).eq("user_id", userId);
                SpTeamUser existing = spTeamUserService.getOne(qw);
                if (existing == null) {
                    SpTeamUser tu = new SpTeamUser();
                    tu.setTeamId(teamId);
                    tu.setUserId(userId);
                    spTeamUserService.save(tu);
                }
            }
        }
        return Result.success(null);
    }

    @PostMapping("/users/remove")
    @ResponseBody
    public Result removeTeamUser(@RequestBody Map<String, String> params) {
        String teamId = params.get("teamId");
        String userId = params.get("userId");
        QueryWrapper<SpTeamUser> qw = new QueryWrapper<>();
        qw.eq("team_id", teamId).eq("user_id", userId);
        spTeamUserService.remove(qw);
        return Result.success(null);
    }

    @GetMapping("/available-users")
    @ResponseBody
    public Result getAvailableUsers() {
        QueryWrapper<SysUser> qw = new QueryWrapper<>();
        qw.eq("is_deleted", "0");
        List<SysUser> allUsers = sysUserService.list(qw);
        return Result.success(allUsers);
    }
}
