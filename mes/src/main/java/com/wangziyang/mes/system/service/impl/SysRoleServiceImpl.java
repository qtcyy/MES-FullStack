package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.common.enums.CommonEnum;
import com.wangziyang.mes.common.util.SoftDeleteUtil;
import com.wangziyang.mes.system.dto.SysRoleDTO;
import com.wangziyang.mes.system.dto.SysUserDTO;
import com.wangziyang.mes.system.entity.SysRole;
import com.wangziyang.mes.system.entity.SysUserRole;
import com.wangziyang.mes.system.enums.SysRoleEnum;
import com.wangziyang.mes.system.mapper.SysRoleMapper;
import com.wangziyang.mes.system.service.ISysRoleMenuService;
import com.wangziyang.mes.system.service.ISysRoleService;
import com.wangziyang.mes.system.service.ISysUserRoleService;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * @author SongPeng
 * @since 2019-10-16
 */
@Service
public class SysRoleServiceImpl extends ServiceImpl<SysRoleMapper, SysRole> implements ISysRoleService {

    @Autowired
    private SysRoleMapper sysRoleMapper;

    @Autowired
    private ISysUserRoleService sysUserRoleService;

    @Autowired
    private ISysRoleMenuService sysRoleMenuService;

    /**
     * 根据用户ID获取角色列表信息
     *
     * @param userId 系统用户ID
     * @return 角色列表
     * @throws Exception 异常
     */
    @Override
    public List<SysRoleDTO> listByUserId(String userId) throws Exception {
        List<SysRoleDTO> result = new ArrayList<>();

        List<SysRole> sysRoles = sysRoleMapper.listByUserId(userId);

        QueryWrapper<SysRole> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq(CommonEnum.FIELD_NAME_IS_DELETED.getCode(), SysRoleEnum.DELETED_NORMAL.getCode());
        List<SysRole> sysRolesAll = sysRoleMapper.selectList(queryWrapper);

        for (SysRole role : sysRolesAll) {
            SysRoleDTO roleDTO = new SysRoleDTO();
            BeanUtils.copyProperties(role, roleDTO);
            for (SysRole r : sysRoles) {
                if (role.getId().equals(r.getId())) {
                    roleDTO.setChecked(true);
                }
            }
            result.add(roleDTO);
        }
        return result;
    }

    /**
     * BUG-FIX: 新增或更新角色，并同步重建角色-菜单关系（在同一事务内）
     * 原来 controller 直接分两步调用 saveOrUpdate + rebuild，两步不在同一事务，
     * rebuild 失败时 saveOrUpdate 已提交，导致数据不一致。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveOrUpdateWithMenus(SysRoleDTO record) throws Exception {
        // 未删除角色中校验 name / code 唯一，给出友好提示，避免命中唯一索引抛原始 SQL 异常
        assertUnique("name", record.getName(), record.getId(), "角色名称");
        assertUnique("code", record.getCode(), record.getId(), "角色编码");
        this.saveOrUpdate(record);
        if (record.getSysMenuIds() != null) {
            sysRoleMenuService.rebuild(record.getId(), record.getSysMenuIds());
        }
    }

    /** 校验未删除角色中 column 值唯一（编辑时排除自身），冲突则抛出友好异常 */
    private void assertUnique(String column, String value, String selfId, String label) {
        if (StringUtils.isEmpty(value)) {
            throw new RuntimeException(label + "不能为空");
        }
        QueryWrapper<SysRole> qw = new QueryWrapper<>();
        qw.eq(column, value).ne("is_deleted", "1");
        if (StringUtils.isNotEmpty(selfId)) {
            qw.ne("id", selfId);
        }
        if (this.count(qw) > 0) {
            throw new RuntimeException(label + "已存在：" + value);
        }
    }

    /**
     * 软删除角色（is_deleted = '1'，同时释放 name / code 唯一索引避免冲突）
     *
     * @param id 角色ID
     * @return 是否成功
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean softDelete(String id) {
        if (id == null || id.trim().isEmpty()) throw new RuntimeException("id 不能为空");
        SysRole role = this.getById(id);
        if (role == null) return false;
        // name(varchar64) / code(varchar32) 均为 NOT NULL 唯一索引，软删除时改名释放，
        // 避免再新增同名/同编码角色触发唯一键冲突
        UpdateWrapper<SysRole> uw = new UpdateWrapper<>();
        uw.eq("id", id)
          .set("is_deleted", "1")
          .set("name", SoftDeleteUtil.freeUniqueValue(role.getName(), id, 64))
          .set("code", SoftDeleteUtil.freeUniqueValue(role.getCode(), id, 32));
        return this.update(uw);
    }

    /**
     * 重新建立用户角色关系
     *
     * @param sysUserDTO 系统用户DTO
     * @throws Exception 异常
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void rebuild(SysUserDTO sysUserDTO) throws Exception {
        if (StringUtils.isNotEmpty(sysUserDTO.getId())) {
            QueryWrapper<SysUserRole> deleteWrapper = new QueryWrapper<>();
            deleteWrapper.eq("user_id", sysUserDTO.getId());
            sysUserRoleService.remove(deleteWrapper);
        }
        if (ArrayUtils.isNotEmpty(sysUserDTO.getSysRoleIds())) {
            for (String roleId : sysUserDTO.getSysRoleIds()) {
                if (StringUtils.isEmpty(roleId)) {
                    continue;
                }
                SysUserRole sysUserRole = new SysUserRole();
                sysUserRole.setUserId(sysUserDTO.getId());
                sysUserRole.setRoleId(roleId);
                sysUserRoleService.save(sysUserRole);
            }
        }
    }
}
