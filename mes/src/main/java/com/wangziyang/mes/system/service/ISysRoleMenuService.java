package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.entity.SysRoleMenu;

/**
 * <p>
 * 服务类
 * </p>
 *
 * @author SongPeng
 * @since 2020-03-05
 */
public interface ISysRoleMenuService extends IService<SysRoleMenu> {

    /**
     * 重新建立角色菜单关系
     *
     * @param roleId  角色ID
     * @param menuIds 菜单ID数组
     * @throws Exception 异常
     */
    void rebuild(String roleId, String[] menuIds) throws Exception;
}
