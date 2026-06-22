package com.wangziyang.mes.basedata;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.controller.admin.SpWarehouseController;
import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 仓库库位重生成守卫 Mockito 单元测试 (Cycle 2b-2)
 *
 * addOrUpdate 应仅在「新建」或「维度(groups/rows/layers/columns)实际变化」时
 * 才重建库位(spWarehouseLocationService.remove);仅改名等不应触发重建,
 * 以免库位 id 全变、孤儿化 2a 库存的 location_id 引用。
 */
@RunWith(MockitoJUnitRunner.class)
public class Cycle2b2BackendTest {

    @Mock
    private ISpWarehouseService spWarehouseService;

    @Mock
    private ISpWarehouseLocationService spWarehouseLocationService;

    @InjectMocks
    private SpWarehouseController controller;

    private SpWarehouse warehouse(String id, int g, int r, int l, int c) {
        SpWarehouse w = new SpWarehouse();
        w.setId(id);
        w.setCode("W1");
        w.setName("库");
        w.setGroups(g);
        w.setRows(r);
        w.setLayers(l);
        w.setColumns(c);
        return w;
    }

    /** 新建(getById 返回 null)→ 重建库位 1 次 */
    @Test
    public void create_regeneratesLocations() {
        SpWarehouse rec = warehouse("w1", 1, 1, 1, 1);
        when(spWarehouseService.getById("w1")).thenReturn(null);

        controller.addOrUpdate(rec);

        verify(spWarehouseLocationService, times(1)).remove(any(QueryWrapper.class));
        verify(spWarehouseLocationService, atLeastOnce()).save(any(SpWarehouseLocation.class));
    }

    /** 编辑仅改名(维度不变)→ 不重建库位 */
    @Test
    public void edit_sameDimensions_skipsRegenerate() {
        SpWarehouse old = warehouse("w1", 2, 3, 2, 4);
        SpWarehouse rec = warehouse("w1", 2, 3, 2, 4);
        rec.setName("新名字");
        when(spWarehouseService.getById("w1")).thenReturn(old);

        controller.addOrUpdate(rec);

        verify(spWarehouseLocationService, never()).remove(any(QueryWrapper.class));
        verify(spWarehouseLocationService, never()).save(any(SpWarehouseLocation.class));
    }

    /** 编辑改维度 → 重建库位 1 次 */
    @Test
    public void edit_changedDimensions_regenerates() {
        SpWarehouse old = warehouse("w1", 2, 3, 2, 4);
        SpWarehouse rec = warehouse("w1", 2, 3, 2, 5); // columns 4→5
        when(spWarehouseService.getById("w1")).thenReturn(old);

        controller.addOrUpdate(rec);

        verify(spWarehouseLocationService, times(1)).remove(any(QueryWrapper.class));
        verify(spWarehouseLocationService, atLeastOnce()).save(any(SpWarehouseLocation.class));
    }
}
