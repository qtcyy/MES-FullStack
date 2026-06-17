package com.wangziyang.mes.digitization.service;

import com.wangziyang.mes.digitization.dto.DashboardOverviewVO;

public interface IDashboardService {

    /** 大屏总览聚合(只读) */
    DashboardOverviewVO overview();
}
