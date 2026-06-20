package com.wangziyang.mes.system;

import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.system.service.impl.SysUserServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class SysDeleteGuardTest {

    @Mock
    private SysUserMapper sysUserMapper;

    @InjectMocks
    private SysUserServiceImpl sysUserService;

    @Test
    public void softDelete_setsIsDeletedToOne() {
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
}
