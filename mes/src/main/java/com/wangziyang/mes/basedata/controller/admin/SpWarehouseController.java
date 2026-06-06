package com.wangziyang.mes.basedata.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.request.SpWarehousePageReq;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import com.wangziyang.mes.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 仓库管理 Controller
 *
 * @author wangziyang
 */
@Controller("adminSpWarehouseController")
@RequestMapping("/basedata/warehouse")
public class SpWarehouseController {

    @Autowired
    private ISpWarehouseService spWarehouseService;

    @Autowired
    private ISpWarehouseLocationService spWarehouseLocationService;

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpWarehousePageReq req) {
        QueryWrapper<SpWarehouse> qw = new QueryWrapper<>();
        qw.ne("is_deleted", "1");
        if (req.getName() != null && !req.getName().isEmpty()) {
            qw.like("name", req.getName());
        }
        if (req.getCode() != null && !req.getCode().isEmpty()) {
            qw.like("code", req.getCode());
        }
        qw.orderByDesc("create_time");
        return Result.success(spWarehouseService.page(req, qw));
    }

    @GetMapping("/{id}")
    @ResponseBody
    public Result getById(@PathVariable String id) {
        return Result.success(spWarehouseService.getById(id));
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(@RequestBody SpWarehouse record) {
        spWarehouseService.saveOrUpdate(record);
        // Regenerate locations when spec changes
        regenerateLocations(record.getId(), record.getGroups(), record.getRows(), record.getLayers(), record.getColumns());
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        SpWarehouse wh = new SpWarehouse();
        wh.setId(params.get("id"));
        wh.setDeleted("1");
        spWarehouseService.updateById(wh);
        return Result.success(null);
    }

    @GetMapping("/locations/{warehouseId}")
    @ResponseBody
    public Result getLocations(@PathVariable String warehouseId) {
        QueryWrapper<SpWarehouseLocation> qw = new QueryWrapper<>();
        qw.eq("warehouse_id", warehouseId)
                .ne("is_deleted", "1")
                .orderByAsc("group_no", "row_no", "layer_no", "col_no");
        return Result.success(spWarehouseLocationService.list(qw));
    }

    private void regenerateLocations(String warehouseId, int groups, int rows, int layers, int columns) {
        // Remove old locations
        QueryWrapper<SpWarehouseLocation> qw = new QueryWrapper<>();
        qw.eq("warehouse_id", warehouseId);
        spWarehouseLocationService.remove(qw);
        // Generate new locations
        for (int g = 1; g <= groups; g++) {
            for (int r = 1; r <= rows; r++) {
                for (int l = 1; l <= layers; l++) {
                    for (int c = 1; c <= columns; c++) {
                        String code = g + "-" + String.format("%02d%02d%02d", r, l, c);
                        SpWarehouseLocation loc = new SpWarehouseLocation();
                        loc.setWarehouseId(warehouseId);
                        loc.setCode(code);
                        loc.setGroupNo(g);
                        loc.setRowNo(r);
                        loc.setLayerNo(l);
                        loc.setColNo(c);
                        loc.setDeleted("0");
                        spWarehouseLocationService.save(loc);
                    }
                }
            }
        }
    }
}
