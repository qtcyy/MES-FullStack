package com.wangziyang.mes.order.service;

import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;

import java.util.List;

public interface ISpGanttService {
    List<GanttTaskVO> listGanttTasks(GanttQueryReq req);

    /** 拖拽改期: 写计划起止时间(已完工不可改) */
    void reschedule(String id, String planStartTime, String planEndTime);

    /** 记录开工: 写实际开始时间 + 状态→2(仅已派工可) */
    void recordStart(String id, String actualStartTime);

    /** 记录完工: 写实际结束时间 + progress=100 + 状态→3(仅已开工可) */
    void recordFinish(String id, String actualEndTime);

    /** 更新进度: 0-100(仅已开工可) */
    void updateProgress(String id, Integer progress);

    /** 手动修正实际时间(仅已开工/完工可;不改状态) */
    void adjustActual(String id, String actualStartTime, String actualEndTime);
}
