package com.wangziyang.mes.system.util;

import com.wangziyang.mes.system.entity.SysMenu;
import com.wangziyang.mes.system.vo.TreeVO;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * 菜单树按授权集合剪枝:保留「自身被授权 或 任一后代被授权」的节点,丢弃空目录。
 * 纯函数,无 Spring 依赖,便于单测。
 */
public final class MenuTreeFilter {

    private MenuTreeFilter() {
    }

    public static List<TreeVO<SysMenu>> prune(List<TreeVO<SysMenu>> nodes, Set<String> grantedIds) {
        List<TreeVO<SysMenu>> kept = new ArrayList<>();
        if (nodes == null) {
            return kept;
        }
        for (TreeVO<SysMenu> node : nodes) {
            List<TreeVO<SysMenu>> prunedChildren = prune(node.getChildren(), grantedIds);
            boolean selfGranted = grantedIds != null && grantedIds.contains(node.getId());
            if (selfGranted || !prunedChildren.isEmpty()) {
                node.setChildren(prunedChildren);
                kept.add(node);
            }
        }
        return kept;
    }
}
