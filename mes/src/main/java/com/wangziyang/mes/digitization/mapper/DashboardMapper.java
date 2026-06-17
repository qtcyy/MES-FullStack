package com.wangziyang.mes.digitization.mapper;

import com.wangziyang.mes.digitization.dto.MonthlyTrendVO;

import java.util.List;

/**
 * 数字化大屏聚合查询 Mapper(只读)
 */
public interface DashboardMapper {

    /** 按 create_time 月份聚合订单数/数量/完成数(仅含有订单的月份,缺月由 service 补齐) */
    List<MonthlyTrendVO> selectMonthlyTrend();
}
