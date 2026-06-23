package com.wangziyang.mes.system;

import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.entity.SysUserRole;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.system.mapper.SysUserRoleMapper;
import com.wangziyang.mes.system.service.impl.SysNoticeServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.Silent.class)
public class NoticeRecipientResolveTest {

    @Mock private SysUserMapper sysUserMapper;
    @Mock private SysUserRoleMapper sysUserRoleMapper;
    @InjectMocks private SysNoticeServiceImpl service;

    private SysUser user(String id) { SysUser u = new SysUser(); u.setId(id); return u; }
    private SysUserRole ur(String uid) { SysUserRole r = new SysUserRole(); r.setUserId(uid); return r; }

    @Test
    public void all_returnsAllUsers() {
        when(sysUserMapper.selectList(any())).thenReturn(Arrays.asList(user("1"), user("2")));
        List<String> ids = service.resolveRecipientIds("all", null);
        assertEquals(2, ids.size());
        assertTrue(ids.contains("1") && ids.contains("2"));
    }

    @Test
    public void user_returnsGivenIds() {
        List<String> ids = service.resolveRecipientIds("user", Arrays.asList("7", "8"));
        assertEquals(Arrays.asList("7", "8"), ids);
    }

    @Test
    public void role_dedupesUsersAcrossRoles() {
        when(sysUserRoleMapper.selectList(any()))
            .thenReturn(Arrays.asList(ur("1"), ur("2"), ur("1")));
        List<String> ids = service.resolveRecipientIds("role", Arrays.asList("r1", "r2"));
        assertEquals(2, ids.size());
    }

    @Test
    public void emptyTargetIds_returnsEmpty() {
        assertTrue(service.resolveRecipientIds("user", null).isEmpty());
    }

    @Test
    public void dept_returnsUsersInDepts() {
        when(sysUserMapper.selectList(any())).thenReturn(Arrays.asList(user("3"), user("4")));
        List<String> ids = service.resolveRecipientIds("dept", Arrays.asList("d1"));
        assertEquals(2, ids.size());
        assertTrue(ids.contains("3") && ids.contains("4"));
    }
}
