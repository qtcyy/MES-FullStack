package com.wangziyang.mes.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangziyang.mes.system.dto.SpTeamDTO;
import com.wangziyang.mes.system.entity.SpTeam;
import org.apache.ibatis.annotations.Param;

/**
 * <p>
 * 班组 Mapper 接口
 * </p>
 *
 * @author SongPeng
 * @since 2021-10-15
 */
public interface SpTeamMapper extends BaseMapper<SpTeam> {

    IPage<SpTeamDTO> pageWithRelations(Page<SpTeam> page, @Param("name") String name, @Param("code") String code);
}
