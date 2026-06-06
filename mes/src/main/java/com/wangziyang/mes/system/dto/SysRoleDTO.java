package com.wangziyang.mes.system.dto;

import com.wangziyang.mes.system.entity.SysRole;

import java.util.List;

/**
 * <p>
 *
 * </p>
 *
 * @author SongPeng
 * @since 2019-10-16
 */
public class SysRoleDTO extends SysRole {

    /**
     * 角色是否选中
     */
    private boolean checked;

    /**
     * 菜单列表
     */
    List<SysMenuDTO> sysMenuDtos;

    /**
     * 角色拥有的菜单ID数组
     */
    private String[] sysMenuIds;

    public String[] getSysMenuIds() {
        return sysMenuIds;
    }

    public void setSysMenuIds(String[] sysMenuIds) {
        this.sysMenuIds = sysMenuIds;
    }

    public boolean getChecked() {
        return checked;
    }

    public void setChecked(boolean checked) {
        this.checked = checked;
    }

    public List<SysMenuDTO> getSysMenuDtos() {
        return sysMenuDtos;
    }

    public void setSysMenuDtos(List<SysMenuDTO> sysMenuDtos) {
        this.sysMenuDtos = sysMenuDtos;
    }
}
