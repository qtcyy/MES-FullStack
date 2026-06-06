package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.dto.SpTeamDTO;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.mapper.SpTeamMapper;
import com.wangziyang.mes.system.request.SpTeamPageReq;
import com.wangziyang.mes.system.service.ISpTeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 班组 服务实现类
 * </p>
 *
 * @author SongPeng
 * @since 2021-10-15
 */
@Service
public class SpTeamServiceImpl extends ServiceImpl<SpTeamMapper, SpTeam> implements ISpTeamService {

    @Autowired
    private SpTeamMapper spTeamMapper;

    @Override
    public IPage<SpTeamDTO> pageWithRelations(SpTeamPageReq req) throws Exception {
        Page<SpTeam> page = new Page<>(req.getCurrent(), req.getSize());
        return spTeamMapper.pageWithRelations(page, req.getName(), req.getCode());
    }
}
