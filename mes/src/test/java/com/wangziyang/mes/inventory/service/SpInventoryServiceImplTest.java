package com.wangziyang.mes.inventory.service;

import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import com.wangziyang.mes.inventory.dto.ManualInboundDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.service.impl.SpInventoryServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.Silent.class)
public class SpInventoryServiceImplTest {

    @Mock
    private SpInventoryMapper inventoryMapper;   // 注入 ServiceImpl.baseMapper

    @Mock
    private ISpWarehouseService spWarehouseService;

    @Mock
    private ISpWarehouseLocationService spWarehouseLocationService;

    @InjectMocks
    private SpInventoryServiceImpl service;

    private ManualInboundDTO dto(BigDecimal qty, String material) {
        ManualInboundDTO d = new ManualInboundDTO();
        d.setMaterialCode(material);
        d.setMaterialDesc("描述");
        d.setUnit("个");
        d.setWarehouseId("wh1");
        d.setLocationId("loc1");
        d.setQuantity(qty);
        return d;
    }

    private SpWarehouse partWarehouse() {
        SpWarehouse w = new SpWarehouse();
        w.setId("wh1");
        w.setName("电脑配件库");
        w.setType("零件库");
        w.setDeleted("0");
        return w;
    }

    private SpWarehouseLocation location() {
        SpWarehouseLocation l = new SpWarehouseLocation();
        l.setId("loc1");
        l.setCode("1-010101");
        l.setWarehouseId("wh1");
        l.setDeleted("0");
        return l;
    }

    @Test(expected = RuntimeException.class)
    public void quantity_zero_throws() {
        service.manualInbound(dto(BigDecimal.ZERO, "PART-001"));
    }

    @Test(expected = RuntimeException.class)
    public void blank_material_throws() {
        service.manualInbound(dto(new BigDecimal("10"), "  "));
    }

    @Test(expected = RuntimeException.class)
    public void non_part_warehouse_throws() {
        SpWarehouse w = partWarehouse();
        w.setType("产品库");
        when(spWarehouseService.getById("wh1")).thenReturn(w);
        service.manualInbound(dto(new BigDecimal("10"), "PART-001"));
    }

    @Test(expected = RuntimeException.class)
    public void mixing_conflict_throws() {
        when(spWarehouseService.getById("wh1")).thenReturn(partWarehouse());
        when(spWarehouseLocationService.getById("loc1")).thenReturn(location());
        SpInventory existing = new SpInventory();
        existing.setLocationId("loc1");
        existing.setMaterialCode("PART-999");
        when(inventoryMapper.selectOne(any())).thenReturn(existing);
        service.manualInbound(dto(new BigDecimal("10"), "PART-001"));
    }

    @Test
    public void new_location_inserts() {
        when(spWarehouseService.getById("wh1")).thenReturn(partWarehouse());
        when(spWarehouseLocationService.getById("loc1")).thenReturn(location());
        when(inventoryMapper.selectOne(any())).thenReturn(null);
        service.manualInbound(dto(new BigDecimal("10"), "PART-001"));
        verify(inventoryMapper).insert(any());
    }
}
