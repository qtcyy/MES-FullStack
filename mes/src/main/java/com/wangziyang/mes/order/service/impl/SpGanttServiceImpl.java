package com.wangziyang.mes.order.service.impl;

import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.service.ISpGanttService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpGanttServiceImpl implements ISpGanttService {

    @Autowired
    private SpOrderDispatchMapper spOrderDispatchMapper;

    @Override
    public List<GanttTaskVO> listGanttTasks(GanttQueryReq req) {
        if (req == null) {
            req = new GanttQueryReq();
        }
        return spOrderDispatchMapper.selectGanttTasks(req);
    }
}
