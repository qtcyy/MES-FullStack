package com.wangziyang.mes.system;

import com.wangziyang.mes.system.dto.SysRoleDTO;
import com.wangziyang.mes.system.dto.SysUserDTO;
import com.wangziyang.mes.system.mapper.SysRoleMapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.system.service.ISysRoleMenuService;
import com.wangziyang.mes.system.service.ISysUserRoleService;
import com.wangziyang.mes.system.service.impl.SysRoleServiceImpl;
import com.wangziyang.mes.system.service.impl.SysUserServiceImpl;
import org.apache.shiro.crypto.hash.Md5Hash;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * A3 审查修正 — add-or-update 接口真实 Bug 验证测试
 *
 * Bug 1 (用户模块): update() 未处理密码字段
 *   - 空密码时应设为 null（MyBatis-Plus NOT_NULL 策略跳过），不能写空串到 DB
 *   - 非空密码时应重新 MD5×3 加盐（同新增逻辑），不能把明文写入 DB
 *
 * Bug 2 (角色模块): controller 里 saveOrUpdate + rebuild 不在同一事务
 *   - 修正：下沉到 service.saveOrUpdateWithMenus(@Transactional)
 */
@RunWith(MockitoJUnitRunner.Silent.class)
public class SysAddOrUpdateGuardTest {

    // =========================================================
    // 用户模块
    // =========================================================
    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private ISysUserRoleService sysUserRoleService;

    @Mock
    private com.wangziyang.mes.system.service.ISysMenuService sysMenuService;

    @Mock
    private com.wangziyang.mes.system.service.ISysRoleService sysRoleService;

    @InjectMocks
    private SysUserServiceImpl sysUserServiceImpl;

    // =========================================================
    // 角色模块
    // 使用 @Spy 以便对 saveOrUpdate() 打桩，避免触发 MyBatis-Plus TableInfo 缓存查找
    // =========================================================
    @Mock
    private SysRoleMapper sysRoleMapper;

    @Mock
    private ISysRoleMenuService sysRoleMenuService;

    @Spy
    @InjectMocks
    private SysRoleServiceImpl sysRoleServiceImpl;

    // =========================================================
    // NOTE (M-1): @InjectMocks 不注入父类 protected baseMapper 字段，
    // 使用 ReflectionTestUtils.setField 手动注入。
    // =========================================================

    // ---------------------------------------------------------
    // Bug 1a: 新增用户 — 密码应被 MD5×3 加盐，不能存明文
    // ---------------------------------------------------------
    @Test
    public void save_user_passwordIsHashedWithMd5x3() throws Exception {
        ReflectionTestUtils.setField(sysUserServiceImpl, "baseMapper", sysUserMapper);
        when(sysUserMapper.insert(any())).thenReturn(1);
        doNothing().when(sysRoleService).rebuild(any());

        SysUserDTO dto = new SysUserDTO();
        dto.setUsername("testuser");
        dto.setPassword("plaintext123");

        sysUserServiceImpl.save(dto);

        // 验证密码被加盐后，不再是明文
        assertThat(dto.getPassword()).isNotEqualTo("plaintext123");
        // 验证结果与 Shiro Md5Hash(plaintext, username, 3) 一致
        String expected = new Md5Hash("plaintext123", "testuser", 3).toString();
        assertThat(dto.getPassword()).isEqualTo(expected);
    }

    // ---------------------------------------------------------
    // Bug 1b: 编辑用户，空密码 — password 字段应被清为 null，不写 DB
    // ---------------------------------------------------------
    @Test
    public void update_user_emptyPassword_setsPasswordToNull() throws Exception {
        ReflectionTestUtils.setField(sysUserServiceImpl, "baseMapper", sysUserMapper);
        when(sysUserMapper.updateById(any())).thenReturn(1);
        doNothing().when(sysRoleService).rebuild(any());

        SysUserDTO dto = new SysUserDTO();
        dto.setId("U1");
        dto.setUsername("testuser");
        dto.setPassword("");  // 前端未填写密码，传来空字符串

        sysUserServiceImpl.update(dto);

        // 密码字段应为 null，updateById 的 NOT_NULL 策略不会更新该字段
        assertThat(dto.getPassword()).isNull();
        verify(sysUserMapper).updateById(dto);
    }

    // ---------------------------------------------------------
    // Bug 1c: 编辑用户，密码为 null — 同样应保持 null 不改变
    // ---------------------------------------------------------
    @Test
    public void update_user_nullPassword_setsPasswordToNull() throws Exception {
        ReflectionTestUtils.setField(sysUserServiceImpl, "baseMapper", sysUserMapper);
        when(sysUserMapper.updateById(any())).thenReturn(1);
        doNothing().when(sysRoleService).rebuild(any());

        SysUserDTO dto = new SysUserDTO();
        dto.setId("U1");
        dto.setUsername("testuser");
        dto.setPassword(null);

        sysUserServiceImpl.update(dto);

        assertThat(dto.getPassword()).isNull();
        verify(sysUserMapper).updateById(dto);
    }

    // ---------------------------------------------------------
    // Bug 1d: 编辑用户，非空密码 — 应被重新加盐（只加一次，不能对已存密文再加盐）
    // ---------------------------------------------------------
    @Test
    public void update_user_nonEmptyPassword_isHashedExactlyOnce() throws Exception {
        ReflectionTestUtils.setField(sysUserServiceImpl, "baseMapper", sysUserMapper);
        when(sysUserMapper.updateById(any())).thenReturn(1);
        doNothing().when(sysRoleService).rebuild(any());

        SysUserDTO dto = new SysUserDTO();
        dto.setId("U1");
        dto.setUsername("testuser");
        dto.setPassword("newPassword");

        sysUserServiceImpl.update(dto);

        // 密码应被加盐，且结果与一次 MD5×3 加盐一致
        String expected = new Md5Hash("newPassword", "testuser", 3).toString();
        assertThat(dto.getPassword())
                .isNotEqualTo("newPassword")   // 不是明文
                .isEqualTo(expected);           // 恰好是一次 Md5Hash 的结果
    }

    // ---------------------------------------------------------
    // Bug 2: 角色 saveOrUpdateWithMenus — rebuild 在同一事务内执行
    //        验证方式：stub saveOrUpdate OK 时，rebuild 被调用
    //        使用 @Spy + doReturn 避免触发 MyBatis-Plus TableInfo 缓存查找
    // ---------------------------------------------------------
    @Test
    public void saveOrUpdateWithMenus_role_callsRebuildInSameMethod() throws Exception {
        SysRoleDTO dto = new SysRoleDTO();
        dto.setSysMenuIds(new String[]{"M1", "M2"});

        // 用 doReturn 对 @Spy 的 saveOrUpdate(entity) 打桩，模拟成功并填充 id
        doAnswer(inv -> {
            SysRoleDTO r = inv.getArgument(0);
            r.setId("ROLE_NEW");
            return true;
        }).when(sysRoleServiceImpl).saveOrUpdate(dto);
        doNothing().when(sysRoleMenuService).rebuild(any(), any());

        sysRoleServiceImpl.saveOrUpdateWithMenus(dto);

        // rebuild 应被调用一次
        verify(sysRoleMenuService, times(1)).rebuild(any(), eq(new String[]{"M1", "M2"}));
    }

    // ---------------------------------------------------------
    // Bug 2b: saveOrUpdateWithMenus — sysMenuIds 为 null 时不调用 rebuild
    // ---------------------------------------------------------
    @Test
    public void saveOrUpdateWithMenus_role_nullMenuIds_skipsRebuild() throws Exception {
        SysRoleDTO dto = new SysRoleDTO();
        dto.setSysMenuIds(null);

        doReturn(true).when(sysRoleServiceImpl).saveOrUpdate(dto);

        sysRoleServiceImpl.saveOrUpdateWithMenus(dto);

        // sysMenuIds 为 null，不应调用 rebuild
        verify(sysRoleMenuService, never()).rebuild(any(), any());
    }

    // ---------------------------------------------------------
    // Bug 2c: 新增角色后 controller 返回 id 不为 null
    //   saveOrUpdate 之后 id 被填充，saveOrUpdateWithMenus 之后可从 record 取到
    // ---------------------------------------------------------
    @Test
    public void saveOrUpdateWithMenus_newRole_idIsPopulatedAfterSave() throws Exception {
        SysRoleDTO dto = new SysRoleDTO();
        dto.setSysMenuIds(new String[]{"M1"});

        doAnswer(inv -> {
            SysRoleDTO r = inv.getArgument(0);
            r.setId("ROLE_GENERATED");
            return true;
        }).when(sysRoleServiceImpl).saveOrUpdate(dto);
        doNothing().when(sysRoleMenuService).rebuild(any(), any());

        sysRoleServiceImpl.saveOrUpdateWithMenus(dto);

        // controller 会调用 record.getId()，确保不为 null
        assertThat(dto.getId()).isNotNull().isEqualTo("ROLE_GENERATED");
    }
}
