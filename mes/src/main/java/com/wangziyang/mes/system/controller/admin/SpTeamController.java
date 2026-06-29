package com.wangziyang.mes.system.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.common.util.SoftDeleteUtil;
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
        if (record.getCode() == null || record.getCode().trim().isEmpty()) {
            return Result.failure("班组代码不能为空");
        }
        // 未删除记录中校验 code 唯一，给出友好提示，避免命中唯一索引抛原始 SQL 异常
        QueryWrapper<SpTeam> dup = new QueryWrapper<>();
        dup.eq("code", record.getCode()).ne("is_deleted", "1");
        if (record.getId() != null && !record.getId().trim().isEmpty()) {
            dup.ne("id", record.getId());
        }
        if (spTeamService.count(dup) > 0) {
            return Result.failure("班组代码已存在：" + record.getCode());
        }
        spTeamService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        SpTeam existing = spTeamService.getById(id);
        if (existing == null) {
            return Result.failure("班组不存在");
        }
        SpTeam team = new SpTeam();
        team.setId(id);
        team.setDeleted("1");
        // 释放 code 唯一索引，避免软删除后再新增同代码班组触发唯一键冲突（code 列 varchar(32)）
        team.setCode(SoftDeleteUtil.freeUniqueValue(existing.getCode(), id, 32));
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
