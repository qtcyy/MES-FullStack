package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.dto.NoticePublishReq;
import com.wangziyang.mes.system.entity.SysNotice;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.entity.SysUserRole;
import com.wangziyang.mes.system.mapper.SysNoticeMapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.system.mapper.SysUserRoleMapper;
import com.wangziyang.mes.system.service.ISysNoticeService;
import com.wangziyang.mes.system.service.ISysNoticeUserService;
import com.wangziyang.mes.system.vo.NoticeReadStatVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SysNoticeServiceImpl
        extends ServiceImpl<SysNoticeMapper, SysNotice>
        implements ISysNoticeService {

    @Autowired private SysUserMapper sysUserMapper;
    @Autowired private SysUserRoleMapper sysUserRoleMapper;
    @Autowired private ISysNoticeUserService noticeUserService;

    @Override
    public List<String> resolveRecipientIds(String targetType, List<String> targetIds) {
        Set<String> ids = new LinkedHashSet<>();
        String t = targetType == null ? "all" : targetType;
        switch (t) {
            case "all": {
                QueryWrapper<SysUser> qw = new QueryWrapper<>();
                qw.select("id").ne("is_deleted", "1");
                sysUserMapper.selectList(qw).forEach(u -> ids.add(u.getId()));
                break;
            }
            case "user": {
                if (!CollectionUtils.isEmpty(targetIds)) ids.addAll(targetIds);
                break;
            }
            case "role": {
                if (!CollectionUtils.isEmpty(targetIds)) {
                    QueryWrapper<SysUserRole> qw = new QueryWrapper<>();
                    qw.in("role_id", targetIds);
                    sysUserRoleMapper.selectList(qw).forEach(ur -> ids.add(ur.getUserId()));
                }
                break;
            }
            case "dept": {
                if (!CollectionUtils.isEmpty(targetIds)) {
                    QueryWrapper<SysUser> qw = new QueryWrapper<>();
                    qw.select("id").in("dept_id", targetIds).ne("is_deleted", "1");
                    sysUserMapper.selectList(qw).forEach(u -> ids.add(u.getId()));
                }
                break;
            }
            default: break;
        }
        return new ArrayList<>(ids);
    }

    private String buildTargetDesc(String targetType, int count) {
        switch (targetType == null ? "all" : targetType) {
            case "all":  return "全体用户";
            case "user": return "指定用户(" + count + "人)";
            case "role": return "指定角色(" + count + "人)";
            case "dept": return "指定部门(" + count + "人)";
            default:     return "";
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String publish(NoticePublishReq req, String sender) {
        if (!StringUtils.hasText(req.getTitle())) throw new RuntimeException("标题不能为空");
        List<String> recipients = resolveRecipientIds(req.getTargetType(), req.getTargetIds());
        if (recipients.isEmpty()) throw new RuntimeException("收件人为空，请检查推送目标");

        SysNotice notice = new SysNotice();
        notice.setTitle(req.getTitle());
        notice.setContent(req.getContent());
        notice.setType(StringUtils.hasText(req.getType()) ? req.getType() : "info");
        notice.setTargetType(StringUtils.hasText(req.getTargetType()) ? req.getTargetType() : "all");
        notice.setTargetIds(CollectionUtils.isEmpty(req.getTargetIds()) ? "" :
                req.getTargetIds().stream().collect(Collectors.joining(",")));
        notice.setTargetDesc(buildTargetDesc(req.getTargetType(), recipients.size()));
        notice.setSender(sender);
        notice.setStatus("1");
        notice.setRecipientCount(recipients.size());
        notice.setDeleted("0");
        this.save(notice);

        List<SysNoticeUser> inbox = new ArrayList<>();
        for (String uid : recipients) {
            SysNoticeUser nu = new SysNoticeUser();
            nu.setNoticeId(notice.getId());
            nu.setUserId(uid);
            nu.setIsRead("0");
            nu.setDeleted("0");
            inbox.add(nu);
        }
        noticeUserService.saveBatch(inbox);
        return notice.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteNotice(String noticeId) {
        UpdateWrapper<SysNotice> uw = new UpdateWrapper<>();
        uw.eq("id", noticeId).set("is_deleted", "1");
        this.update(uw);
        noticeUserService.softDeleteByNoticeId(noticeId);
        return true;
    }

    @Override
    public NoticeReadStatVO readStat(String noticeId) {
        QueryWrapper<SysNoticeUser> total = new QueryWrapper<>();
        total.eq("notice_id", noticeId).ne("is_deleted", "1");
        QueryWrapper<SysNoticeUser> read = new QueryWrapper<>();
        read.eq("notice_id", noticeId).eq("is_read", "1").ne("is_deleted", "1");
        int t = (int) noticeUserService.count(total);
        int r = (int) noticeUserService.count(read);
        return new NoticeReadStatVO(t, r);
    }
}
