package com.wangziyang.mes.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.system.dto.SysNoticeInboxDTO;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.request.SysNoticeInboxPageReq;
import org.apache.ibatis.annotations.Param;

public interface SysNoticeUserMapper extends BaseMapper<SysNoticeUser> {

    IPage<SysNoticeInboxDTO> selectInboxPage(IPage<SysNoticeInboxDTO> page,
                                             @Param("req") SysNoticeInboxPageReq req,
                                             @Param("userId") String userId);
}
