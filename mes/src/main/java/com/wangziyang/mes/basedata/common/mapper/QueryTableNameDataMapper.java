package com.wangziyang.mes.basedata.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.basedata.common.dto.CommonDto;
import com.wangziyang.mes.basedata.common.request.QueryTableNameDataReq;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

public interface QueryTableNameDataMapper extends BaseMapper<SpTableManagerItem> {
    List<Map<String, String>> queryTableNameDataList(QueryTableNameDataReq req);

    List<Map<String, String>> queryTableNameById(CommonDto commonDto);

    void commonInsert(@Param("tableName") String tableName, @Param("data") Map<String, Object> data);

    void commonUpdateById(@Param("tableName") String tableName, @Param("id") String id, @Param("data") Map<String, Object> data);

    void commonDelete(CommonDto commonDto);
}
