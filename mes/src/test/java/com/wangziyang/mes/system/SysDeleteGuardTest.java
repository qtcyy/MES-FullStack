package com.wangziyang.mes.system;

import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.wangziyang.mes.system.mapper.SysDepartmentMapper;
import com.wangziyang.mes.system.mapper.SysDictMapper;
import com.wangziyang.mes.system.mapper.SysRoleMapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.system.service.impl.SysDepartmentServiceImpl;
import com.wangziyang.mes.system.service.impl.SysDictServiceImpl;
import com.wangziyang.mes.system.service.impl.SysRoleServiceImpl;
import com.wangziyang.mes.system.service.impl.SysUserServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class SysDeleteGuardTest {

    // --- User ---
    @Mock
    private SysUserMapper sysUserMapper;

    @InjectMocks
    private SysUserServiceImpl sysUserService;

    // --- Role ---
    @Mock
    private SysRoleMapper sysRoleMapper;

    @InjectMocks
    private SysRoleServiceImpl sysRoleService;

    // --- Dict ---
    @Mock
    private SysDictMapper sysDictMapper;

    @InjectMocks
    private SysDictServiceImpl sysDictService;

    // --- Department ---
    @Mock
    private SysDepartmentMapper sysDepartmentMapper;

    @InjectMocks
    private SysDepartmentServiceImpl sysDepartmentService;

    // =========================================================
    // NOTE (M-1): @InjectMocks does NOT inject into the protected
    // baseMapper field of ServiceImpl in this version of Mockito
    // (the field is declared in the parent class, not the concrete
    // class, so property-injection misses it).
    // ReflectionTestUtils.setField is therefore kept intentionally
    // to wire baseMapper before each test that calls this.update().
    // =========================================================

    @Test
    public void softDelete_user_setsIsDeletedToOne() {
        // inject baseMapper (parent class field in ServiceImpl)
        ReflectionTestUtils.setField(sysUserService, "baseMapper", sysUserMapper);
        when(sysUserMapper.update(isNull(), any(UpdateWrapper.class))).thenReturn(1);

        boolean ok = sysUserService.softDelete("U1");

        assertThat(ok).isTrue();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<UpdateWrapper> cap = ArgumentCaptor.forClass(UpdateWrapper.class);
        verify(sysUserMapper).update(isNull(), cap.capture());
        String sql = cap.getValue().getSqlSet();
        assertThat(sql).contains("is_deleted");
        assertThat(sql).contains("1");
    }

    // =========================================================
    // Fix M-2: null/empty id guard tests
    // =========================================================

    @Test
    public void softDelete_nullId_throwsRuntimeException() {
        assertThatThrownBy(() -> sysUserService.softDelete(null))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    public void softDelete_emptyId_throwsRuntimeException() {
        assertThatThrownBy(() -> sysUserService.softDelete("  "))
                .isInstanceOf(RuntimeException.class);
    }

    // =========================================================
    // Fix M-2: happy-path tests for Role, Dict, Department
    // =========================================================

    @Test
    public void softDelete_role_setsIsDeletedToOne() {
        ReflectionTestUtils.setField(sysRoleService, "baseMapper", sysRoleMapper);
        when(sysRoleMapper.update(isNull(), any(UpdateWrapper.class))).thenReturn(1);

        boolean ok = sysRoleService.softDelete("R1");

        assertThat(ok).isTrue();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<UpdateWrapper> cap = ArgumentCaptor.forClass(UpdateWrapper.class);
        verify(sysRoleMapper).update(isNull(), cap.capture());
        String sql = cap.getValue().getSqlSet();
        assertThat(sql).contains("is_deleted");
        assertThat(sql).contains("1");
    }

    @Test
    public void softDelete_dict_setsIsDeletedToOne() {
        ReflectionTestUtils.setField(sysDictService, "baseMapper", sysDictMapper);
        when(sysDictMapper.update(isNull(), any(UpdateWrapper.class))).thenReturn(1);

        boolean ok = sysDictService.softDelete("D1");

        assertThat(ok).isTrue();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<UpdateWrapper> cap = ArgumentCaptor.forClass(UpdateWrapper.class);
        verify(sysDictMapper).update(isNull(), cap.capture());
        String sql = cap.getValue().getSqlSet();
        assertThat(sql).contains("is_deleted");
        assertThat(sql).contains("1");
    }

    @Test
    public void softDelete_department_setsIsDeletedToOne() {
        ReflectionTestUtils.setField(sysDepartmentService, "baseMapper", sysDepartmentMapper);
        when(sysDepartmentMapper.update(isNull(), any(UpdateWrapper.class))).thenReturn(1);

        boolean ok = sysDepartmentService.softDelete("DEPT1");

        assertThat(ok).isTrue();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<UpdateWrapper> cap = ArgumentCaptor.forClass(UpdateWrapper.class);
        verify(sysDepartmentMapper).update(isNull(), cap.capture());
        String sql = cap.getValue().getSqlSet();
        assertThat(sql).contains("is_deleted");
        assertThat(sql).contains("1");
    }
}
