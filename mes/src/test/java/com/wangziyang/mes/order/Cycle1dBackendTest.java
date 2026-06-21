package com.wangziyang.mes.order;

import com.wangziyang.mes.order.dto.SpDispatchDTO;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.entity.SpOrderDispatch;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.mapper.SpOrderMapper;
import com.wangziyang.mes.order.service.impl.SpDispatchServiceImpl;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 派工(assignWorker)批量正确性守卫 (Cycle 1d)。
 *
 * 验证内容(对应后端审查 area #2):
 *  - 批量 orderIds 全部被处理(每个都 insert 一条 dispatch),不是只处理第一个;
 *  - 每条 dispatch 落库时 dispatchStatus=1(已派工);
 *  - 每个工单 statue 被翻转 0->1;
 *  - 非 statue=0 工单会抛异常拦截(状态守卫)。
 *
 * 另一条回归断言记录甘特图空白 bug 的根因:
 *  - 订单级派工创建的 dispatch 记录 operId 为 NULL。
 *    SpOrderDispatchMapper.xml 的甘特查询曾用 WHERE d.oper_id IS NOT NULL
 *    把这些记录全部排除,导致正常派工后的甘特图空白。该过滤已移除。
 *
 * Result extends HashMap<String,Object>;此处直接断言 service 行为。
 */
@RunWith(MockitoJUnitRunner.class)
public class Cycle1dBackendTest {

    @Mock
    private SpOrderMapper spOrderMapper;

    @Mock
    private SpOrderDispatchMapper spOrderDispatchMapper;

    @InjectMocks
    private SpDispatchServiceImpl service;

    /**
     * ServiceImpl.baseMapper 是父类受保护字段,@InjectMocks 不一定能按 SpOrderDispatchMapper
     * 类型注入到该字段(它声明类型为 BaseMapper)。assignWorker 内部用 baseMapper.insert,
     * 故用反射把 mock 写入 baseMapper,保证 verify 命中同一对象。
     */
    @Before
    public void wireBaseMapper() throws Exception {
        java.lang.reflect.Field f =
                com.baomidou.mybatisplus.extension.service.impl.ServiceImpl.class
                        .getDeclaredField("baseMapper");
        f.setAccessible(true);
        f.set(service, spOrderDispatchMapper);
    }

    private SpOrder order(String id, int statue) {
        SpOrder o = new SpOrder();
        o.setId(id);
        o.setOrderCode("WO-" + id);
        o.setStatue(statue);
        return o;
    }

    private SpDispatchDTO dto(List<String> orderIds) {
        SpDispatchDTO d = new SpDispatchDTO();
        d.setOrderIds(orderIds);
        d.setTeamId("t1");
        d.setUserId("u1");
        d.setLaborHours(new BigDecimal("8"));
        d.setPlanStartTime("2026-06-10 08:00:00");
        d.setPlanEndTime("2026-06-12 17:00:00");
        return d;
    }

    /** 批量派工:每个工单都建一条 dispatch(status=1) 且 statue 翻为 1。 */
    @Test
    public void assign_processesEveryOrder_andFlipsStatus() {
        when(spOrderMapper.selectById("o1")).thenReturn(order("o1", 0));
        when(spOrderMapper.selectById("o2")).thenReturn(order("o2", 0));

        service.assignWorker(dto(Arrays.asList("o1", "o2")));

        // 两条 dispatch 都被插入,且 dispatchStatus 都是 1
        ArgumentCaptor<SpOrderDispatch> dCap = ArgumentCaptor.forClass(SpOrderDispatch.class);
        verify(spOrderDispatchMapper, times(2)).insert(dCap.capture());
        assertThat(dCap.getAllValues())
                .extracting(SpOrderDispatch::getDispatchStatus)
                .containsExactly(1, 1);

        // 两个工单都被 updateById,statue 都翻成 1
        ArgumentCaptor<SpOrder> oCap = ArgumentCaptor.forClass(SpOrder.class);
        verify(spOrderMapper, times(2)).updateById(oCap.capture());
        assertThat(oCap.getAllValues())
                .extracting(SpOrder::getStatue)
                .containsExactly(1, 1);
    }

    /** 回归:订单级派工写入的 dispatch operId 必须为 NULL(甘特查询不可再以此过滤)。 */
    @Test
    public void assign_writesNullOperId_orderLevelDispatch() {
        when(spOrderMapper.selectById("o1")).thenReturn(order("o1", 0));

        service.assignWorker(dto(Arrays.asList("o1")));

        ArgumentCaptor<SpOrderDispatch> dCap = ArgumentCaptor.forClass(SpOrderDispatch.class);
        verify(spOrderDispatchMapper).insert(dCap.capture());
        assertThat(dCap.getValue().getOperId()).isNull();
    }

    /** 状态守卫:工单非 statue=0 时抛异常(事务回滚,不会部分写)。 */
    @Test
    public void assign_rejectsWhenOrderNotReleased() {
        when(spOrderMapper.selectById("o1")).thenReturn(order("o1", 1)); // 已派工

        Throwable t = org.assertj.core.api.Assertions.catchThrowable(
                () -> service.assignWorker(dto(Arrays.asList("o1"))));

        assertThat(t).isInstanceOf(RuntimeException.class);
        verify(spOrderDispatchMapper, never()).insert(any());
    }
}
