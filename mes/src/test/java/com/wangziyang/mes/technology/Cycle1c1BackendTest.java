package com.wangziyang.mes.technology;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.service.ISpProcessUnitService;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.controller.SpOperController;
import com.wangziyang.mes.technology.service.ISpFlowOperRelationService;
import com.wangziyang.mes.technology.service.ISpOperService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * 工序删除引用守卫 Mockito 单元测试 (Cycle 1c-1)
 *
 * Result extends HashMap<String,Object>, so we read the "code" key directly.
 * IService.count(Wrapper) returns int in MyBatis-Plus 3.1.2.
 */
@RunWith(MockitoJUnitRunner.class)
public class Cycle1c1BackendTest {

    @Mock
    private ISpOperService iSpOperService;

    @Mock
    private ISpFlowOperRelationService iSpFlowOperRelationService;

    // SpOperController also has @Autowired ISpProcessUnitService — must mock it
    // so @InjectMocks can wire the controller without NPE.
    @Mock
    private ISpProcessUnitService iSpProcessUnitService;

    @InjectMocks
    private SpOperController operController;

    private Map<String, String> idParam(String id) {
        Map<String, String> m = new HashMap<>();
        m.put("id", id);
        return m;
    }

    /**
     * 工序已被工艺路线引用时拒绝删除,返回失败码(非0),且不调用 removeById。
     */
    @Test
    public void delete_rejectsWhenReferenced() {
        // count() returns int in MP 3.1.2
        when(iSpFlowOperRelationService.count(any(QueryWrapper.class))).thenReturn(1);

        Result r = operController.delete(idParam("o1"));

        // Result extends HashMap; success code = 0, failure code = 1
        assertThat(r.get("code")).isNotEqualTo(0);
        verify(iSpOperService, never()).removeById(anyString());
    }

    /**
     * 工序未被任何工艺路线引用时允许删除,返回成功码(0),且调用了 removeById 一次。
     */
    @Test
    public void delete_succeedsWhenNotReferenced() {
        when(iSpFlowOperRelationService.count(any(QueryWrapper.class))).thenReturn(0);
        when(iSpOperService.removeById(anyString())).thenReturn(true);

        Result r = operController.delete(idParam("o1"));

        assertThat(r.get("code")).isEqualTo(0);
        verify(iSpOperService, times(1)).removeById("o1");
    }
}
