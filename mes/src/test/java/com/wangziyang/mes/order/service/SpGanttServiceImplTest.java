package com.wangziyang.mes.order.service;

import com.wangziyang.mes.order.entity.SpOrderDispatch;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.service.impl.SpGanttServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class SpGanttServiceImplTest {

    @Mock
    private SpOrderDispatchMapper mapper;

    @InjectMocks
    private SpGanttServiceImpl service;

    private SpOrderDispatch dispatch(int status) {
        SpOrderDispatch d = new SpOrderDispatch();
        d.setDispatchStatus(status);
        d.setPlanStartTime("2026-06-10");
        d.setPlanEndTime("2026-06-12");
        return d;
    }

    // ---- reschedule ----
    @Test
    public void reschedule_ok() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.reschedule("1", "2026-06-11", "2026-06-14");
        verify(mapper).updateById(org.mockito.ArgumentMatchers.any());
    }

    @Test(expected = RuntimeException.class)
    public void reschedule_blocked_when_finished() {
        when(mapper.selectById("1")).thenReturn(dispatch(3));
        service.reschedule("1", "2026-06-11", "2026-06-14");
    }

    @Test(expected = RuntimeException.class)
    public void reschedule_start_after_end() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.reschedule("1", "2026-06-20", "2026-06-14");
    }

    @Test(expected = RuntimeException.class)
    public void load_missing_throws() {
        when(mapper.selectById("x")).thenReturn(null);
        service.reschedule("x", "2026-06-11", "2026-06-14");
    }

    // ---- start ----
    @Test
    public void start_ok_sets_status2() {
        SpOrderDispatch d = dispatch(1);
        when(mapper.selectById("1")).thenReturn(d);
        service.recordStart("1", "2026-06-11 08:00:00");
        assertEquals(Integer.valueOf(2), d.getDispatchStatus());
        assertEquals("2026-06-11 08:00:00", d.getActualStartTime());
        verify(mapper).updateById(d);
    }

    @Test(expected = RuntimeException.class)
    public void start_blocked_when_not_dispatched() {
        when(mapper.selectById("1")).thenReturn(dispatch(2));
        service.recordStart("1", null);
    }

    // ---- finish ----
    @Test
    public void finish_ok_sets_status3_progress100() {
        SpOrderDispatch d = dispatch(2);
        d.setActualStartTime("2026-06-11 08:00:00");
        when(mapper.selectById("1")).thenReturn(d);
        service.recordFinish("1", "2026-06-12 17:00:00");
        assertEquals(Integer.valueOf(3), d.getDispatchStatus());
        assertEquals(Integer.valueOf(100), d.getProgress());
        assertEquals("2026-06-12 17:00:00", d.getActualEndTime());
    }

    @Test(expected = RuntimeException.class)
    public void finish_blocked_when_not_started() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.recordFinish("1", null);
    }

    @Test(expected = RuntimeException.class)
    public void finish_blocked_when_end_before_start() {
        SpOrderDispatch d = dispatch(2);
        d.setActualStartTime("2026-06-12 17:00:00");
        when(mapper.selectById("1")).thenReturn(d);
        service.recordFinish("1", "2026-06-11 08:00:00");
    }

    // ---- progress ----
    @Test
    public void progress_ok() {
        SpOrderDispatch d = dispatch(2);
        when(mapper.selectById("1")).thenReturn(d);
        service.updateProgress("1", 60);
        assertEquals(Integer.valueOf(60), d.getProgress());
    }

    @Test(expected = RuntimeException.class)
    public void progress_out_of_range() {
        when(mapper.selectById("1")).thenReturn(dispatch(2));
        service.updateProgress("1", 120);
    }

    @Test(expected = RuntimeException.class)
    public void progress_blocked_when_not_started() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.updateProgress("1", 50);
    }

    // ---- adjustActual ----
    @Test
    public void adjustActual_ok() {
        SpOrderDispatch d = dispatch(2);
        when(mapper.selectById("1")).thenReturn(d);
        service.adjustActual("1", "2026-06-11 08:00:00", "2026-06-12 10:00:00");
        assertEquals("2026-06-11 08:00:00", d.getActualStartTime());
        assertEquals("2026-06-12 10:00:00", d.getActualEndTime());
    }

    @Test(expected = RuntimeException.class)
    public void adjustActual_blocked_when_dispatched() {
        when(mapper.selectById("1")).thenReturn(dispatch(1));
        service.adjustActual("1", "2026-06-11 08:00:00", null);
    }

    @Test(expected = RuntimeException.class)
    public void adjustActual_start_after_end() {
        when(mapper.selectById("1")).thenReturn(dispatch(2));
        service.adjustActual("1", "2026-06-15 08:00:00", "2026-06-12 10:00:00");
    }
}
