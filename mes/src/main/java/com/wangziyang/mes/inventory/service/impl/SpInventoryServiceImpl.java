package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import com.wangziyang.mes.inventory.dto.ManualInboundDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;
import com.wangziyang.mes.inventory.service.ISpInventoryService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class SpInventoryServiceImpl
        extends ServiceImpl<SpInventoryMapper, SpInventory>
        implements ISpInventoryService {

    @Autowired
    private ISpWarehouseService spWarehouseService;

    @Autowired
    private ISpWarehouseLocationService spWarehouseLocationService;

    @Override
    public IPage<SpInventory> pageInventory(SpInventoryPageReq req) {
        QueryWrapper<SpInventory> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getMaterialCode())) {
            qw.like("material_code", req.getMaterialCode());
        }
        if (StringUtils.isNotEmpty(req.getStartDate())) {
            qw.ge("last_inbound_time", req.getStartDate() + " 00:00:00");
        }
        if (StringUtils.isNotEmpty(req.getEndDate())) {
            qw.le("last_inbound_time", req.getEndDate() + " 23:59:59");
        }
        qw.orderByDesc("last_inbound_time");
        return baseMapper.selectPage(new Page<>(req.getCurrent(), req.getSize()), qw);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void manualInbound(ManualInboundDTO dto) {
        // 0. 入参校验
        if (dto.getQuantity() == null || dto.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("入库数量必须大于 0");
        }
        if (StringUtils.isBlank(dto.getMaterialCode())) {
            throw new RuntimeException("物料编码不能为空");
        }

        // 1. 库房校验
        SpWarehouse wh = spWarehouseService.getById(dto.getWarehouseId());
        if (wh == null || "1".equals(wh.getDeleted())) {
            throw new RuntimeException("库房不存在或已停用");
        }
        if (!"零件库".equals(wh.getType())) {
            throw new RuntimeException("请选择零件库类型的库房(如电脑配件库)");
        }

        // 2. 库位校验
        SpWarehouseLocation loc = spWarehouseLocationService.getById(dto.getLocationId());
        if (loc == null || "1".equals(loc.getDeleted())) {
            throw new RuntimeException("库位不存在或已停用");
        }
        if (!dto.getWarehouseId().equals(loc.getWarehouseId())) {
            throw new RuntimeException("所选库位不属于该库房");
        }

        // 3. 混放校验
        SpInventory inv = baseMapper.selectOne(
                new QueryWrapper<SpInventory>().eq("location_id", dto.getLocationId()));
        if (inv != null && !inv.getMaterialCode().equals(dto.getMaterialCode())) {
            throw new RuntimeException("该库位已存放物料 " + inv.getMaterialCode() + "，只能存放相同物料");
        }

        // 4. upsert 库存
        LocalDateTime now = LocalDateTime.now();
        BigDecimal qty = dto.getQuantity() != null ? dto.getQuantity() : BigDecimal.ZERO;
        if (inv != null) {
            BigDecimal existing = inv.getQuantity() != null ? inv.getQuantity() : BigDecimal.ZERO;
            inv.setQuantity(existing.add(qty));
            inv.setLastInboundTime(now);
            baseMapper.updateById(inv);
        } else {
            SpInventory ninv = new SpInventory();
            ninv.setMaterialCode(dto.getMaterialCode());
            ninv.setMaterialDesc(dto.getMaterialDesc());
            ninv.setUnit(dto.getUnit());
            ninv.setWarehouseId(wh.getId());
            ninv.setWarehouseName(wh.getName());
            ninv.setLocationId(loc.getId());
            ninv.setLocationCode(loc.getCode());
            ninv.setQuantity(qty);
            ninv.setStatus("available");
            ninv.setLastInboundTime(now);
            baseMapper.insert(ninv);
        }
    }
}
