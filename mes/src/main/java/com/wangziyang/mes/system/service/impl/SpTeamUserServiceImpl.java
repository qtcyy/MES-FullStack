package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.entity.SpTeamUser;
import com.wangziyang.mes.system.mapper.SpTeamUserMapper;
import com.wangziyang.mes.system.service.ISpTeamUserService;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 班组用户关联 服务实现类
 * </p>
 *
 * @author SongPeng
 * @since 2021-10-15
 */
@Service
public class SpTeamUserServiceImpl extends ServiceImpl<SpTeamUserMapper, SpTeamUser> implements ISpTeamUserService {
}
