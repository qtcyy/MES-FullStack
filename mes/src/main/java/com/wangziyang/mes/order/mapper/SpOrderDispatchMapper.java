package com.wangziyang.mes.order.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttTaskVO;
import com.wangziyang.mes.order.entity.SpOrderDispatch;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * @author WangZiYang
 * @since 2020-07-01
 */
public interface SpOrderDispatchMapper extends BaseMapper<SpOrderDispatch> {

    List<GanttTaskVO> selectGanttTasks(@Param("req") GanttQueryReq req);
}
