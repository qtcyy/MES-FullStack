package com.wangziyang.mes.order.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.order.dto.SpDispatchDTO;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.entity.SpOrderDispatch;
import com.wangziyang.mes.order.mapper.SpOrderDispatchMapper;
import com.wangziyang.mes.order.mapper.SpOrderMapper;
import com.wangziyang.mes.order.service.ISpDispatchService;
import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.mapper.SpTeamMapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class SpDispatchServiceImpl extends ServiceImpl<SpOrderDispatchMapper, SpOrderDispatch>
        implements ISpDispatchService {

    private static final Logger logger = LoggerFactory.getLogger(SpDispatchServiceImpl.class);

    @Autowired
    private SpOrderMapper spOrderMapper;

    @Autowired
    private SpTeamMapper spTeamMapper;

    @Autowired
    private SysUserMapper sysUserMapper;

    @Override
    public IPage<Map<String, Object>> pageOrdersForDispatch(IPage<?> page, String orderCode) {
        QueryWrapper<SpOrder> qw = new QueryWrapper<>();
        qw.eq("statue", 0);
        if (StringUtils.isNotEmpty(orderCode)) {
            qw.like("order_code", orderCode);
        }
        qw.orderByDesc("create_time");

        IPage<SpOrder> orderPage = spOrderMapper.selectPage(
                new Page<>(page.getCurrent(), page.getSize()), qw);

        // Build result with dispatch info
        List<Map<String, Object>> records = new ArrayList<>();
        for (SpOrder order : orderPage.getRecords()) {
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("id", order.getId());
            record.put("orderCode", order.getOrderCode());
            record.put("orderDescription", order.getOrderDescription());
            record.put("qty", order.getQty());
            record.put("orderType", order.getOrderType());
            record.put("materiel", order.getMateriel());
            record.put("materielDesc", order.getMaterielDesc());
            record.put("planStartTime", order.getPlanStartTime());
            record.put("planEndTime", order.getPlanEndTime());
            record.put("statue", order.getStatue());

            // Check if already dispatched
            QueryWrapper<SpOrderDispatch> dq = new QueryWrapper<>();
            dq.eq("order_id", order.getId());
            List<SpOrderDispatch> dispatches = baseMapper.selectList(dq);
            if (!dispatches.isEmpty()) {
                SpOrderDispatch dispatch = dispatches.get(0);
                record.put("dispatchStatus", dispatch.getDispatchStatus());
                record.put("laborHours", dispatch.getLaborHours());

                // Get worker name
                SysUser user = sysUserMapper.selectById(dispatch.getUserId());
                record.put("workerName", user != null ? user.getName() : "-");

                // Get team name
                SpTeam team = spTeamMapper.selectById(dispatch.getTeamId());
                record.put("teamName", team != null ? team.getName() : "-");
            } else {
                record.put("dispatchStatus", null);
                record.put("workerName", null);
                record.put("teamName", null);
            }

            records.add(record);
        }

        IPage<Map<String, Object>> result = new Page<>(orderPage.getCurrent(), orderPage.getSize(), orderPage.getTotal());
        result.setRecords(records);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignWorker(SpDispatchDTO dto) {
        for (String orderId : dto.getOrderIds()) {
            // Check order exists and is in statue=0
            SpOrder order = spOrderMapper.selectById(orderId);
            if (order == null) {
                throw new RuntimeException("工单不存在: " + orderId);
            }
            if (order.getStatue() != 0) {
                throw new RuntimeException("工单 " + order.getOrderCode() + " 状态不是已下发，无法派工");
            }

            // Create dispatch record - BaseEntity handles id, createTime, createUsername via auto-fill
            SpOrderDispatch dispatch = new SpOrderDispatch();
            dispatch.setOrderId(orderId);
            dispatch.setTeamId(dto.getTeamId());
            dispatch.setUserId(dto.getUserId());
            dispatch.setLaborHours(dto.getLaborHours());
            dispatch.setDispatchStatus(1); // 1=已派工
            dispatch.setPlanStartTime(dto.getPlanStartTime());
            dispatch.setPlanEndTime(dto.getPlanEndTime());
            dispatch.setRemark(dto.getRemark());
            baseMapper.insert(dispatch);

            // Update order statue to 1 (已派工)
            order.setStatue(1);
            spOrderMapper.updateById(order);

            logger.info("Dispatch created: order={}, team={}, user={}, hours={}",
                    order.getOrderCode(), dto.getTeamId(), dto.getUserId(), dto.getLaborHours());
        }
    }

    @Override
    public Map<String, Object> getDispatchByOrderId(String orderId) {
        QueryWrapper<SpOrderDispatch> qw = new QueryWrapper<>();
        qw.eq("order_id", orderId);
        qw.orderByDesc("create_time");
        SpOrderDispatch dispatch = baseMapper.selectOne(qw);

        if (dispatch == null) {
            return null;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", dispatch.getId());
        result.put("orderId", dispatch.getOrderId());
        result.put("teamId", dispatch.getTeamId());
        result.put("userId", dispatch.getUserId());
        result.put("laborHours", dispatch.getLaborHours());
        result.put("dispatchStatus", dispatch.getDispatchStatus());
        result.put("planStartTime", dispatch.getPlanStartTime());
        result.put("planEndTime", dispatch.getPlanEndTime());

        // Enrich with names
        SysUser user = sysUserMapper.selectById(dispatch.getUserId());
        if (user != null) {
            result.put("workerName", user.getName());
        }
        SpTeam team = spTeamMapper.selectById(dispatch.getTeamId());
        if (team != null) {
            result.put("teamName", team.getName());
        }

        return result;
    }
}
