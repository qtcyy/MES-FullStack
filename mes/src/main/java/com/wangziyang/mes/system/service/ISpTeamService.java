package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.dto.SpTeamDTO;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.request.SpTeamPageReq;

/**
 * <p>
 * 班组 服务接口
 * </p>
 *
 * @author SongPeng
 * @since 2021-10-15
 */
public interface ISpTeamService extends IService<SpTeam> {

    IPage<SpTeamDTO> pageWithRelations(SpTeamPageReq req) throws Exception;
}
