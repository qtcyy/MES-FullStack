package com.wangziyang.mes.order.service.impl;

import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;
import com.wangziyang.mes.order.entity.SpOrderDispatch;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.service.ISpGanttService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class SpGanttServiceImpl implements ISpGanttService {

    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int STATUS_DISPATCHED = 1; // 已派工
    private static final int STATUS_STARTED = 2;    // 已开工
    private static final int STATUS_FINISHED = 3;   // 已完工

    @Autowired
    private SpOrderDispatchMapper spOrderDispatchMapper;

    @Override
    public List<GanttTaskVO> listGanttTasks(GanttQueryReq req) {
        if (req == null) {
            req = new GanttQueryReq();
        }
        return spOrderDispatchMapper.selectGanttTasks(req);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reschedule(String id, String planStartTime, String planEndTime) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() != null && d.getDispatchStatus() == STATUS_FINISHED) {
            throw new RuntimeException("任务已完工,不可改期");
        }
        if (isBlank(planStartTime) || isBlank(planEndTime)) {
            throw new RuntimeException("计划开始/结束时间不能为空");
        }
        if (planStartTime.compareTo(planEndTime) > 0) {
            throw new RuntimeException("计划开始时间不能晚于结束时间");
        }
        d.setPlanStartTime(planStartTime);
        d.setPlanEndTime(planEndTime);
        spOrderDispatchMapper.updateById(d);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordStart(String id, String actualStartTime) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() == null || d.getDispatchStatus() != STATUS_DISPATCHED) {
            throw new RuntimeException("仅已派工任务可记录开工");
        }
        d.setActualStartTime(isBlank(actualStartTime) ? now() : actualStartTime);
        d.setDispatchStatus(STATUS_STARTED);
        spOrderDispatchMapper.updateById(d);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordFinish(String id, String actualEndTime) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() == null || d.getDispatchStatus() != STATUS_STARTED) {
            throw new RuntimeException("仅已开工任务可记录完工");
        }
        String end = isBlank(actualEndTime) ? now() : actualEndTime;
        if (!isBlank(d.getActualStartTime()) && d.getActualStartTime().compareTo(end) > 0) {
            throw new RuntimeException("实际完工时间不能早于实际开工时间");
        }
        d.setActualEndTime(end);
        d.setProgress(100);
        d.setDispatchStatus(STATUS_FINISHED);
        spOrderDispatchMapper.updateById(d);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateProgress(String id, Integer progress) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() == null || d.getDispatchStatus() != STATUS_STARTED) {
            throw new RuntimeException("仅已开工任务可更新进度");
        }
        if (progress == null || progress < 0 || progress > 100) {
            throw new RuntimeException("进度必须在 0-100 之间");
        }
        d.setProgress(progress);
        spOrderDispatchMapper.updateById(d);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adjustActual(String id, String actualStartTime, String actualEndTime) {
        SpOrderDispatch d = loadOrThrow(id);
        if (d.getDispatchStatus() == null || d.getDispatchStatus() < STATUS_STARTED) {
            throw new RuntimeException("仅已开工/完工任务可修正实际时间");
        }
        if (!isBlank(actualStartTime) && !isBlank(actualEndTime)
                && actualStartTime.compareTo(actualEndTime) > 0) {
            throw new RuntimeException("实际开工时间不能晚于实际完工时间");
        }
        if (!isBlank(actualStartTime)) {
            d.setActualStartTime(actualStartTime);
        }
        if (!isBlank(actualEndTime)) {
            d.setActualEndTime(actualEndTime);
        }
        spOrderDispatchMapper.updateById(d);
    }

    private SpOrderDispatch loadOrThrow(String id) {
        if (isBlank(id)) {
            throw new RuntimeException("任务ID不能为空");
        }
        SpOrderDispatch d = spOrderDispatchMapper.selectById(id);
        if (d == null) {
            throw new RuntimeException("派工任务不存在: " + id);
        }
        return d;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String now() {
        return LocalDateTime.now().format(TS_FMT);
    }
}
