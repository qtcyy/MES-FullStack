package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.entity.SysRoleMenu;
import com.wangziyang.mes.system.mapper.SysRoleMenuMapper;
import com.wangziyang.mes.system.service.ISysRoleMenuService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * @author SongPeng
 * @since 2020-03-05
 */
@Service
public class SysRoleMenuServiceImpl extends ServiceImpl<SysRoleMenuMapper, SysRoleMenu> implements ISysRoleMenuService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void rebuild(String roleId, String[] menuIds) throws Exception {
        // Remove all existing role-menu mappings
        QueryWrapper<SysRoleMenu> deleteWrapper = new QueryWrapper<>();
        deleteWrapper.eq("role_id", roleId);
        remove(deleteWrapper);

        // Insert new role-menu mappings
        if (menuIds != null && menuIds.length > 0) {
            for (String menuId : menuIds) {
                if (StringUtils.isEmpty(menuId)) {
                    continue;
                }
                SysRoleMenu sysRoleMenu = new SysRoleMenu();
                sysRoleMenu.setRoleId(roleId);
                sysRoleMenu.setMenuId(menuId);
                save(sysRoleMenu);
            }
        }
    }
}
