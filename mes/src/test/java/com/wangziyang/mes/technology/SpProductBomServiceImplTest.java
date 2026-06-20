package com.wangziyang.mes.technology;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.wangziyang.mes.basedata.entity.SpMaterile;
import com.wangziyang.mes.basedata.service.ISpMaterileService;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.controller.SpProductBomController;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.entity.SpProductBomItem;
import com.wangziyang.mes.technology.service.ISpProductBomItemService;
import com.wangziyang.mes.technology.service.ISpProductBomService;
import com.wangziyang.mes.technology.service.impl.SpProductBomServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 产品 BOM 后端守卫单测 (Cycle product-bom).
 *
 * 范式: JUnit4 + MockitoJUnitRunner; Result extends HashMap -> 用 get("code") 断言
 * (成功 0 / 失败 1)。@InjectMocks 须 mock controller 全部注入字段。
 *
 * 覆盖修正点:
 *  1. 产品类型校验放宽到 FG/PG(+历史中文) —— /products 与根节点创建校验。
 */
@RunWith(MockitoJUnitRunner.class)
public class SpProductBomServiceImplTest {

    @Mock
    private ISpProductBomService spProductBomService;

    @Mock
    private ISpProductBomItemService spProductBomItemService;

    @Mock
    private ISpMaterileService iSpMaterileService;

    @InjectMocks
    private SpProductBomController controller;

    private SpProductBom rootRecord(String productCode) {
        SpProductBom r = new SpProductBom();
        r.setProductCode(productCode);
        r.setNodeName("台式电脑");
        // parentId 为空 => 根节点 => 触发产品类型校验
        return r;
    }

    private SpMaterile mat(String matType) {
        SpMaterile m = new SpMaterile();
        m.setMateriel("PROD-X");
        m.setMatType(matType);
        return m;
    }

    /**
     * 物料类型为 FG(成品) 时, 根节点创建应通过校验 (返回成功 0)。
     * 这是本次核心修正: 旧代码硬编码 "产品" 会拒掉真实 FG/PG 物料。
     */
    @Test
    public void addRoot_acceptsFgMaterial() {
        when(iSpMaterileService.getOne(any())).thenReturn(mat("FG"));
        when(spProductBomService.generateBomCode()).thenReturn("PBOM-001");
        when(spProductBomService.saveOrUpdate(any(SpProductBom.class))).thenReturn(true);

        Result r = controller.addOrUpdate(rootRecord("PROD-X"));

        assertThat(r.get("code")).isEqualTo(0);
        verify(spProductBomService, times(1)).saveOrUpdate(any(SpProductBom.class));
    }

    /**
     * 物料类型为 PG(半成品) 时同样通过校验。
     */
    @Test
    public void addRoot_acceptsPgMaterial() {
        when(iSpMaterileService.getOne(any())).thenReturn(mat("PG"));
        when(spProductBomService.generateBomCode()).thenReturn("PBOM-001");
        when(spProductBomService.saveOrUpdate(any(SpProductBom.class))).thenReturn(true);

        Result r = controller.addOrUpdate(rootRecord("PROD-X"));

        assertThat(r.get("code")).isEqualTo(0);
    }

    /**
     * 物料类型为零件(非成品/半成品)时, 根节点创建应被拒绝 (返回失败码 != 0),
     * 且不落库。
     */
    @Test
    public void addRoot_rejectsNonProductMaterial() {
        when(iSpMaterileService.getOne(any())).thenReturn(mat("零件"));

        Result r = controller.addOrUpdate(rootRecord("PART-001"));

        assertThat(r.get("code")).isNotEqualTo(0);
        verify(spProductBomService, never()).saveOrUpdate(any(SpProductBom.class));
    }

    /**
     * 物料不存在时, 根节点创建应被拒绝。
     */
    @Test
    public void addRoot_rejectsMissingMaterial() {
        when(iSpMaterileService.getOne(any())).thenReturn(null);

        Result r = controller.addOrUpdate(rootRecord("NOPE"));

        assertThat(r.get("code")).isNotEqualTo(0);
        verify(spProductBomService, never()).saveOrUpdate(any(SpProductBom.class));
    }

    /**
     * /products 端点应按 FG/PG(+历史中文) 过滤, 而非硬编码 "产品"。
     * 这里只验证调用 list(wrapper) 并原样返回, 保证端点不再硬编码拒掉真实物料。
     */
    @Test
    @SuppressWarnings("unchecked")
    public void getProducts_queriesMaterialList() {
        when(iSpMaterileService.list(any(Wrapper.class))).thenReturn(java.util.Collections.emptyList());

        Result r = controller.getProducts();

        assertThat(r.get("code")).isEqualTo(0);
        verify(iSpMaterileService, times(1)).list(any(Wrapper.class));
    }

    /**
     * 锁定子节点(parent locked)时, 新增子节点应被拒绝。守卫: locked 后不可加子节点。
     */
    @Test
    public void addChild_rejectsWhenParentLocked() {
        SpProductBom parent = new SpProductBom();
        parent.setId("p1");
        parent.setStatus("locked");
        parent.setLevel(0);
        when(spProductBomService.getById("p1")).thenReturn(parent);

        SpProductBom child = new SpProductBom();
        child.setParentId("p1");
        child.setNodeName("子节点");

        Result r = controller.addOrUpdate(child);

        assertThat(r.get("code")).isNotEqualTo(0);
        verify(spProductBomService, never()).saveOrUpdate(any(SpProductBom.class));
    }

    // ---- Service 层: new-version 深拷贝须复制根节点自身的行项目 ----

    /**
     * createNewVersion: 之前根节点的行项目未被复制(只复制子节点的)。
     * 修正后根节点也应调用 copyItems -> 这里验证: 当根节点有 1 条 item 时,
     * 新版本树中至少为根节点 save 了一条对应 item(bomId 重映射到新根 id)。
     */
    @Test
    @SuppressWarnings("unchecked")
    public void createNewVersion_copiesRootItems() {
        ISpProductBomItemService itemService = mock(ISpProductBomItemService.class);
        SpProductBomServiceImpl service = spy(new SpProductBomServiceImpl());
        // 注入私有字段 spProductBomItemService
        org.springframework.test.util.ReflectionTestUtils
                .setField(service, "spProductBomItemService", itemService);

        SpProductBom oldRoot = new SpProductBom();
        oldRoot.setId("old-root");
        oldRoot.setStatus("locked");
        oldRoot.setVersion("V1.0");
        oldRoot.setProductCode("PROD-1");
        oldRoot.setNodeName("根");
        oldRoot.setLevel(0);

        // service.getById(rootId) -> oldRoot
        doReturn(oldRoot).when(service).getById("old-root");
        // generateBomCode 避免触碰 mapper
        doReturn("PBOM-099").when(service).generateBomCode();
        // 根节点 save / 无子节点
        doReturn(true).when(service).save(any(SpProductBom.class));
        doReturn(java.util.Collections.emptyList()).when(service).list(any(Wrapper.class));

        // 根节点有 1 条行项目
        SpProductBomItem rootItem = new SpProductBomItem();
        rootItem.setId("it-1");
        rootItem.setBomId("old-root");
        rootItem.setMaterialCode("PART-001");
        rootItem.setQuantity(java.math.BigDecimal.ONE);
        when(itemService.list(any(Wrapper.class)))
                .thenReturn(java.util.Collections.singletonList(rootItem))   // 根节点
                .thenReturn(java.util.Collections.emptyList());              // 后续(子节点等)

        SpProductBom newRoot = service.createNewVersion("old-root");

        assertThat(newRoot).isNotNull();
        assertThat(newRoot.getVersion()).isEqualTo("V2.0");
        assertThat(newRoot.getStatus()).isEqualTo("draft");
        // 关键断言: 根节点的行项目被复制(save 了一条新 item)
        org.mockito.ArgumentCaptor<SpProductBomItem> cap =
                org.mockito.ArgumentCaptor.forClass(SpProductBomItem.class);
        verify(itemService, atLeastOnce()).save(cap.capture());
        SpProductBomItem saved = cap.getValue();
        assertThat(saved.getMaterialCode()).isEqualTo("PART-001");
        // bomId 重映射到新根 id(非旧 id)
        assertThat(saved.getBomId()).isNotEqualTo("old-root");
        assertThat(saved.getBomId()).isEqualTo(newRoot.getId());
    }
}
