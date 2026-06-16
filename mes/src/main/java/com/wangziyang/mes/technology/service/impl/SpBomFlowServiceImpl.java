package com.wangziyang.mes.technology.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.technology.entity.SpBomFlow;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.mapper.SpBomFlowMapper;
import com.wangziyang.mes.technology.service.ISpBomFlowService;
import com.wangziyang.mes.technology.service.ISpProductBomService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SpBomFlowServiceImpl extends ServiceImpl<SpBomFlowMapper, SpBomFlow> implements ISpBomFlowService {

    @Autowired
    private ISpProductBomService spProductBomService;

    @Override
    @Transactional
    public void lockProductBomFlows(String productBomRootId) {
        List<SpProductBom> allNodes = spProductBomService.getTreeByRootId(productBomRootId);
        for (SpProductBom node : allNodes) {
            QueryWrapper<SpBomFlow> qw = new QueryWrapper<>();
            qw.eq("bom_id", node.getId());
            List<SpBomFlow> bomFlows = list(qw);
            for (SpBomFlow bf : bomFlows) {
                bf.setStatus("locked");
                updateById(bf);
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String replaceBinding(String bomId, String flowId, String remark) {
        QueryWrapper<SpBomFlow> delQw = new QueryWrapper<>();
        delQw.eq("bom_id", bomId);
        remove(delQw);
        SpBomFlow bf = new SpBomFlow();
        bf.setBomId(bomId);
        bf.setFlowId(flowId);
        bf.setStatus("draft");
        bf.setRemark(remark);
        save(bf); // 不手设 id,交由 @TableId 雪花生成
        return bf.getId();
    }
}
