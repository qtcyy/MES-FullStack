package com.wangziyang.mes.technology.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.entity.*;
import com.wangziyang.mes.technology.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
@RequestMapping("/technology/bom-flow")
public class SpBomFlowController extends BaseController {

    @Autowired
    private ISpBomFlowService spBomFlowService;

    @Autowired
    private ISpProductBomService spProductBomService;

    @Autowired
    private ISpFlowService iSpFlowService;

    @Autowired
    private ISpFlowOperRelationService iSpFlowOperRelationService;

    @Autowired
    private ISpOperService iSpOperService;

    @GetMapping("/list/{productBomRootId}")
    @ResponseBody
    public Result list(@PathVariable String productBomRootId) {
        List<SpProductBom> allNodes = spProductBomService.getTreeByRootId(productBomRootId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (SpProductBom node : allNodes) {
            Map<String, Object> nodeMap = new HashMap<>();
            nodeMap.put("bomNode", node);

            QueryWrapper<SpBomFlow> bfQw = new QueryWrapper<>();
            bfQw.eq("bom_id", node.getId());
            SpBomFlow bomFlow = spBomFlowService.getOne(bfQw, false);

            if (bomFlow != null) {
                nodeMap.put("bomFlow", bomFlow);
                SpFlow flow = iSpFlowService.getById(bomFlow.getFlowId());
                nodeMap.put("flow", flow);
                QueryWrapper<SpFlowOperRelation> operQw = new QueryWrapper<>();
                operQw.eq("flow_id", bomFlow.getFlowId()).orderByAsc("sort_num");
                List<SpFlowOperRelation> relations = iSpFlowOperRelationService.list(operQw);
                List<Map<String, Object>> operList = new ArrayList<>();
                for (SpFlowOperRelation rel : relations) {
                    SpOper oper = iSpOperService.getById(rel.getOperId());
                    Map<String, Object> om = new HashMap<>();
                    om.put("relation", rel);
                    om.put("oper", oper);
                    operList.add(om);
                }
                nodeMap.put("opers", operList);
            }
            result.add(nodeMap);
        }
        return Result.success(result);
    }

    @GetMapping("/products")
    @ResponseBody
    public Result getProducts() {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.isNull("parent_id");
        return Result.success(spProductBomService.list(qw));
    }

    @PostMapping("/bind")
    @ResponseBody
    public Result bind(@RequestBody Map<String, Object> params) {
        String bomId = (String) params.get("bomId");
        String flowId = (String) params.get("flowId");
        String remark = (String) params.get("remark");
        if (bomId == null || bomId.trim().isEmpty() || flowId == null || flowId.trim().isEmpty()) {
            return Result.failure("BOM 节点与工艺路线不能为空");
        }
        SpProductBom bomNode = spProductBomService.getById(bomId);
        if (bomNode == null) {
            return Result.failure("BOM 节点不存在");
        }
        if ("locked".equals(bomNode.getStatus())) {
            return Result.failure("BOM 已锁定，无法编辑工艺流程");
        }
        if (iSpFlowService.getById(flowId) == null) {
            return Result.failure("工艺路线不存在");
        }
        SpBomFlow existing = spBomFlowService.getOne(
                new QueryWrapper<SpBomFlow>().eq("bom_id", bomId), false);
        if (existing != null && "locked".equals(existing.getStatus())) {
            return Result.failure("工艺流程已锁定，无法修改");
        }
        String id = spBomFlowService.replaceBinding(bomId, flowId, remark);
        return Result.success(id);
    }

    @PostMapping("/unbind")
    @ResponseBody
    public Result unbind(@RequestBody Map<String, String> params) {
        String bomId = params.get("bomId");
        if (bomId == null || bomId.trim().isEmpty()) {
            return Result.failure("BOM 节点不能为空");
        }
        QueryWrapper<SpBomFlow> qw = new QueryWrapper<>();
        qw.eq("bom_id", bomId);
        SpBomFlow bf = spBomFlowService.getOne(qw, false);
        if (bf == null) {
            return Result.failure("绑定不存在或已解绑");
        }
        SpProductBom node = spProductBomService.getById(bomId);
        boolean locked = "locked".equals(bf.getStatus())
                || (node != null && "locked".equals(node.getStatus()));
        if (locked) {
            return Result.failure("工艺流程已锁定，无法解绑");
        }
        spBomFlowService.remove(qw);
        return Result.success(null);
    }

    @PostMapping("/lock/{productBomRootId}")
    @ResponseBody
    public Result lock(@PathVariable String productBomRootId) {
        SpProductBom rootBom = spProductBomService.getById(productBomRootId);
        if (rootBom == null || !"locked".equals(rootBom.getStatus())) {
            return Result.failure("产品BOM尚未锁定，请先锁定BOM结构后再锁定工艺流程");
        }
        spBomFlowService.lockProductBomFlows(productBomRootId);
        return Result.success(null);
    }

    @PostMapping("/update-remark")
    @ResponseBody
    public Result updateRemark(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        String remark = params.get("remark");
        if (id == null || id.trim().isEmpty()) {
            return Result.failure("id 不能为空");
        }
        SpBomFlow bf = spBomFlowService.getById(id);
        if (bf == null) {
            return Result.failure("绑定不存在");
        }
        if ("locked".equals(bf.getStatus())) {
            return Result.failure("工艺流程已锁定");
        }
        SpProductBom node = spProductBomService.getById(bf.getBomId());
        if (node != null && "locked".equals(node.getStatus())) {
            return Result.failure("BOM 已锁定，无法修改");
        }
        SpBomFlow upd = new SpBomFlow();
        upd.setId(id);
        upd.setRemark(remark);
        spBomFlowService.updateById(upd);
        return Result.success(null);
    }

    @GetMapping("/flows")
    @ResponseBody
    public Result getFlows() {
        return Result.success(iSpFlowService.list());
    }

    @GetMapping("/opers/{flowId}")
    @ResponseBody
    public Result getOpersByFlow(@PathVariable String flowId) {
        QueryWrapper<SpFlowOperRelation> qw = new QueryWrapper<>();
        qw.eq("flow_id", flowId).orderByAsc("sort_num");
        List<SpFlowOperRelation> relations = iSpFlowOperRelationService.list(qw);
        List<Map<String, Object>> result = new ArrayList<>();
        for (SpFlowOperRelation rel : relations) {
            SpOper oper = iSpOperService.getById(rel.getOperId());
            Map<String, Object> m = new HashMap<>();
            m.put("relation", rel);
            m.put("oper", oper);
            result.add(m);
        }
        return Result.success(result);
    }
}
