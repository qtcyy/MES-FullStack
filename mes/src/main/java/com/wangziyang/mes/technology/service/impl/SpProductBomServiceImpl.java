package com.wangziyang.mes.technology.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.entity.SpProductBomItem;
import com.wangziyang.mes.technology.mapper.SpProductBomMapper;
import com.wangziyang.mes.technology.service.ISpProductBomItemService;
import com.wangziyang.mes.technology.service.ISpProductBomService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SpProductBomServiceImpl extends ServiceImpl<SpProductBomMapper, SpProductBom> implements ISpProductBomService {

    @Autowired
    private ISpProductBomItemService spProductBomItemService;

    @Override
    @Transactional
    public void lockBom(String rootId, String username) {
        SpProductBom root = getById(rootId);
        if (root == null || "locked".equals(root.getStatus())) {
            throw new RuntimeException("BOM not found or already locked");
        }
        List<SpProductBom> allNodes = collectAllNodes(rootId);
        LocalDateTime now = LocalDateTime.now();
        for (SpProductBom node : allNodes) {
            node.setStatus("locked");
            node.setLockedAt(now);
            node.setLockedBy(username);
            updateById(node);
        }
    }

    @Override
    @Transactional
    public SpProductBom createNewVersion(String rootId) {
        SpProductBom oldRoot = getById(rootId);
        if (oldRoot == null || !"locked".equals(oldRoot.getStatus())) {
            throw new RuntimeException("Only locked BOM can create new version");
        }
        String oldVer = oldRoot.getVersion();
        String newVer = "V" + (Integer.parseInt(oldVer.replace("V", "").replace(".0", "")) + 1) + ".0";

        String newRootId = UUID.randomUUID().toString().replace("-", "");
        SpProductBom newRoot = copyBomNode(oldRoot, null, newRootId, newVer);
        newRoot.setBomCode(generateBomCode());
        newRoot.setStatus("draft");
        save(newRoot);

        copyChildren(oldRoot.getId(), newRootId, newVer);

        return newRoot;
    }

    private void copyChildren(String oldParentId, String newParentId, String newVer) {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.eq("parent_id", oldParentId).orderByAsc("sort_order");
        List<SpProductBom> children = list(qw);

        for (SpProductBom child : children) {
            String newChildId = UUID.randomUUID().toString().replace("-", "");
            SpProductBom newChild = copyBomNode(child, newParentId, newChildId, newVer);
            newChild.setBomCode(generateBomCode());
            save(newChild);

            QueryWrapper<SpProductBomItem> itemQw = new QueryWrapper<>();
            itemQw.eq("bom_id", child.getId());
            List<SpProductBomItem> items = spProductBomItemService.list(itemQw);
            for (SpProductBomItem item : items) {
                SpProductBomItem newItem = new SpProductBomItem();
                newItem.setId(UUID.randomUUID().toString().replace("-", ""));
                newItem.setBomId(newChildId);
                newItem.setItemType(item.getItemType());
                newItem.setMaterialCode(item.getMaterialCode());
                newItem.setMaterialDesc(item.getMaterialDesc());
                newItem.setQuantity(item.getQuantity());
                newItem.setUnit(item.getUnit());
                newItem.setSortOrder(item.getSortOrder());
                spProductBomItemService.save(newItem);
            }

            copyChildren(child.getId(), newChildId, newVer);
        }
    }

    private SpProductBom copyBomNode(SpProductBom src, String newParentId, String newId, String newVer) {
        SpProductBom node = new SpProductBom();
        node.setId(newId);
        node.setProductCode(src.getProductCode());
        node.setNodeName(src.getNodeName());
        node.setParentId(newParentId);
        node.setLevel(src.getLevel());
        node.setVersion(newVer);
        node.setStatus("draft");
        node.setRemark(src.getRemark());
        node.setSortOrder(src.getSortOrder());
        return node;
    }

    @Override
    public List<SpProductBom> getTreeByRootId(String rootId) {
        List<SpProductBom> result = new ArrayList<>();
        SpProductBom root = getById(rootId);
        if (root != null) {
            result.add(root);
            collectChildren(rootId, result);
        }
        return result;
    }

    private List<SpProductBom> collectAllNodes(String nodeId) {
        List<SpProductBom> result = new ArrayList<>();
        SpProductBom node = getById(nodeId);
        if (node != null) {
            result.add(node);
            collectChildren(nodeId, result);
        }
        return result;
    }

    private void collectChildren(String parentId, List<SpProductBom> result) {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.eq("parent_id", parentId).orderByAsc("sort_order");
        List<SpProductBom> children = list(qw);
        for (SpProductBom child : children) {
            result.add(child);
            collectChildren(child.getId(), result);
        }
    }

    @Override
    public String generateBomCode() {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.likeRight("bom_code", "PBOM-").orderByDesc("bom_code").last("LIMIT 1");
        SpProductBom last = getOne(qw);
        int next = 1;
        if (last != null && last.getBomCode() != null) {
            String numStr = last.getBomCode().replace("PBOM-", "");
            try { next = Integer.parseInt(numStr) + 1; } catch (NumberFormatException e) { /* keep 1 */ }
        }
        return "PBOM-" + String.format("%03d", next);
    }

    @Override
    @Transactional
    public void cascadeDelete(String nodeId) {
        QueryWrapper<SpProductBomItem> itemQw = new QueryWrapper<>();
        itemQw.eq("bom_id", nodeId);
        spProductBomItemService.remove(itemQw);

        QueryWrapper<SpProductBom> childQw = new QueryWrapper<>();
        childQw.eq("parent_id", nodeId);
        List<SpProductBom> children = list(childQw);
        for (SpProductBom child : children) {
            cascadeDelete(child.getId());
        }

        removeById(nodeId);
    }
}
