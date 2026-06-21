package com.wangziyang.mes.technology;

import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.controller.SpBomFlowController;
import com.wangziyang.mes.technology.entity.SpBomFlow;
import com.wangziyang.mes.technology.entity.SpFlow;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.service.ISpBomFlowService;
import com.wangziyang.mes.technology.service.ISpFlowOperRelationService;
import com.wangziyang.mes.technology.service.ISpFlowService;
import com.wangziyang.mes.technology.service.ISpOperService;
import com.wangziyang.mes.technology.service.ISpProductBomService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * BOM 工艺绑定守卫 Mockito 单元测试 (Cycle 1c-3)
 *
 * Result extends HashMap<String,Object>，直接读 "code" 键：success=0 / failure=1。
 * 与 Cycle1c1BackendTest 一致使用 AssertJ 断言风格。
 */
@RunWith(MockitoJUnitRunner.Silent.class)
public class SpBomFlowGuardTest {

    @Mock
    private ISpBomFlowService spBomFlowService;

    @Mock
    private ISpProductBomService spProductBomService;

    @Mock
    private ISpFlowService iSpFlowService;

    @Mock
    private ISpFlowOperRelationService iSpFlowOperRelationService;

    @Mock
    private ISpOperService iSpOperService;

    @InjectMocks
    private SpBomFlowController controller;

    /** bind：BOM 节点已锁定 → 拒绝(code=1)，且不写入绑定 */
    @Test
    public void bind_rejectsWhenNodeLocked() {
        SpProductBom node = new SpProductBom();
        node.setStatus("locked");
        when(spProductBomService.getById("b1")).thenReturn(node);

        Map<String, Object> params = new HashMap<>();
        params.put("bomId", "b1");
        params.put("flowId", "f1");

        Result r = controller.bind(params);

        assertThat(r.get("code")).isEqualTo(1);
        verify(spBomFlowService, never()).replaceBinding(any(), any(), any());
    }

    /** bind：现有绑定已锁定 → 拒绝(code=1) */
    @Test
    public void bind_rejectsWhenExistingBindingLocked() {
        SpProductBom node = new SpProductBom();
        node.setStatus("draft");
        when(spProductBomService.getById("b1")).thenReturn(node);
        when(iSpFlowService.getById("f1")).thenReturn(new SpFlow());

        SpBomFlow existing = new SpBomFlow();
        existing.setStatus("locked");
        when(spBomFlowService.getOne(any(), anyBoolean())).thenReturn(existing);

        Map<String, Object> params = new HashMap<>();
        params.put("bomId", "b1");
        params.put("flowId", "f1");

        Result r = controller.bind(params);

        assertThat(r.get("code")).isEqualTo(1);
        verify(spBomFlowService, never()).replaceBinding(any(), any(), any());
    }

    /** unbind：绑定已锁定 → 拒绝(code=1)，且不删除 */
    @Test
    public void unbind_rejectsWhenBindingLocked() {
        SpBomFlow bf = new SpBomFlow();
        bf.setStatus("locked");
        when(spBomFlowService.getOne(any(), anyBoolean())).thenReturn(bf);
        when(spProductBomService.getById("b1")).thenReturn(new SpProductBom());

        Map<String, String> params = new HashMap<>();
        params.put("bomId", "b1");

        Result r = controller.unbind(params);

        assertThat(r.get("code")).isEqualTo(1);
        verify(spBomFlowService, never()).remove(any());
    }

    /** unbind：节点已锁定(绑定本身 draft) → 仍拒绝(code=1) */
    @Test
    public void unbind_rejectsWhenNodeLocked() {
        SpBomFlow bf = new SpBomFlow();
        bf.setStatus("draft");
        when(spBomFlowService.getOne(any(), anyBoolean())).thenReturn(bf);
        SpProductBom node = new SpProductBom();
        node.setStatus("locked");
        when(spProductBomService.getById("b1")).thenReturn(node);

        Map<String, String> params = new HashMap<>();
        params.put("bomId", "b1");

        Result r = controller.unbind(params);

        assertThat(r.get("code")).isEqualTo(1);
        verify(spBomFlowService, never()).remove(any());
    }

    /** lock：BOM 根尚未锁定 → 拒绝(code=1)，且不批量锁定工艺 */
    @Test
    public void lock_rejectsWhenRootNotLocked() {
        SpProductBom root = new SpProductBom();
        root.setStatus("draft");
        when(spProductBomService.getById("r1")).thenReturn(root);

        Result r = controller.lock("r1");

        assertThat(r.get("code")).isEqualTo(1);
        verify(spBomFlowService, never()).lockProductBomFlows(eq("r1"));
    }

    /** lock：BOM 根已锁定 → 放行(code=0)，并触发批量锁定工艺 */
    @Test
    public void lock_succeedsWhenRootLocked() {
        SpProductBom root = new SpProductBom();
        root.setStatus("locked");
        when(spProductBomService.getById("r1")).thenReturn(root);

        Result r = controller.lock("r1");

        assertThat(r.get("code")).isEqualTo(0);
        verify(spBomFlowService).lockProductBomFlows("r1");
    }
}
