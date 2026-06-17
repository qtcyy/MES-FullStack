package com.wangziyang.mes.order.service;

import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;

import java.util.List;

public interface ISpGanttService {
    List<GanttTaskVO> listGanttTasks(GanttQueryReq req);
}
