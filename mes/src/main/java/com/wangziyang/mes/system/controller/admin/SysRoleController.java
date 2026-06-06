package com.wangziyang.mes.system.controller.admin;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.system.dto.SysRoleDTO;
import com.wangziyang.mes.system.entity.SysRole;
import com.wangziyang.mes.system.entity.SysRoleMenu;
import com.wangziyang.mes.system.request.SysRolePageReq;
import com.wangziyang.mes.system.service.ISysRoleMenuService;
import com.wangziyang.mes.system.service.ISysRoleService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;
import java.util.stream.Collectors;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 * @author SongPeng
 * @since 2019-10-16
 */
@Controller("adminSysRoleController")
@RequestMapping("/admin/sys/role")
public class SysRoleController extends BaseController {

    @Autowired
    private ISysRoleService sysRoleService;

    @Autowired
    private ISysRoleMenuService sysRoleMenuService;

    @GetMapping("/list-ui")
    public String listUI(Model model) {
        return "admin/system/role/list";
    }

    @PostMapping("/page")
    @ResponseBody
    public Result page(SysRolePageReq req) {
        QueryWrapper qw = new QueryWrapper();
        qw.orderByDesc(req.getOrderBy());
        IPage result = sysRoleService.page(req, qw);
        return Result.success(result);
    }

    @GetMapping("/add-or-update-ui")
    public String addOrUpdateUI(Model model, SysRole record) {
        if (StringUtils.isNotEmpty(record.getId())) {
            SysRole result = sysRoleService.getById(record.getId());
            model.addAttribute("result", result);
        }
        return "admin/system/role/addOrUpdate";
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SysRoleDTO record) throws Exception {
        sysRoleService.saveOrUpdate(record);
        if (record.getSysMenuIds() != null) {
            sysRoleMenuService.rebuild(record.getId(), record.getSysMenuIds());
        }
        return Result.success(record.getId());
    }

    @GetMapping("/tree/{roleId}")
    @ResponseBody
    public Result tree(@PathVariable String roleId) {
        QueryWrapper<SysRoleMenu> qw = new QueryWrapper<>();
        qw.eq("role_id", roleId);
        List<SysRoleMenu> list = sysRoleMenuService.list(qw);
        List<String> menuIds = list.stream()
                .map(SysRoleMenu::getMenuId)
                .collect(Collectors.toList());
        return Result.success(menuIds);
    }
}
