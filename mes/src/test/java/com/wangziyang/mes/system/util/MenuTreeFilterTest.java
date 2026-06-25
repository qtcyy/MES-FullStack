package com.wangziyang.mes.system.util;

import com.wangziyang.mes.system.entity.SysMenu;
import com.wangziyang.mes.system.vo.TreeVO;
import org.junit.Assert;
import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;

public class MenuTreeFilterTest {

    private TreeVO<SysMenu> node(String id, TreeVO<SysMenu>... children) {
        TreeVO<SysMenu> n = new TreeVO<>();
        n.setId(id);
        n.setCode(id);
        n.setChildren(new java.util.ArrayList<>(Arrays.asList(children)));
        return n;
    }

    @Test
    public void keepsGrantedLeafAndItsAncestor() {
        TreeVO<SysMenu> leaf = node("btn_user_add");
        TreeVO<SysMenu> page = node("user", leaf);
        TreeVO<SysMenu> dir = node("system", page);

        List<TreeVO<SysMenu>> result =
                MenuTreeFilter.prune(Collections.singletonList(dir), new HashSet<>(Arrays.asList("user", "btn_user_add")));

        Assert.assertEquals(1, result.size());
        Assert.assertEquals("system", result.get(0).getId());
        Assert.assertEquals(1, result.get(0).getChildren().size());
        Assert.assertEquals("user", result.get(0).getChildren().get(0).getId());
        Assert.assertEquals(1, result.get(0).getChildren().get(0).getChildren().size());
    }

    @Test
    public void dropsUngrantedSubtreeAndEmptyDir() {
        TreeVO<SysMenu> grantedPage = node("user");
        TreeVO<SysMenu> ungrantedPage = node("role");
        TreeVO<SysMenu> dir = node("system", grantedPage, ungrantedPage);
        TreeVO<SysMenu> emptyDir = node("order", node("plan"));

        List<TreeVO<SysMenu>> result =
                MenuTreeFilter.prune(Arrays.asList(dir, emptyDir), new HashSet<>(Collections.singletonList("user")));

        Assert.assertEquals(1, result.size());
        Assert.assertEquals("system", result.get(0).getId());
        Assert.assertEquals(1, result.get(0).getChildren().size());
        Assert.assertEquals("user", result.get(0).getChildren().get(0).getId());
    }

    @Test
    public void nullArgsAreSafe() {
        // 入参 nodes 为 null:返回空列表,不抛异常
        Assert.assertTrue(MenuTreeFilter.prune(null, new HashSet<>()).isEmpty());

        // 入参 grantedIds 为 null:等价于空集 —— 无任何授权,整棵无授权树被剪掉
        TreeVO<SysMenu> page = node("user");
        TreeVO<SysMenu> dir = node("system", page);
        List<TreeVO<SysMenu>> result = MenuTreeFilter.prune(Collections.singletonList(dir), null);
        Assert.assertTrue(result.isEmpty());
    }
}
