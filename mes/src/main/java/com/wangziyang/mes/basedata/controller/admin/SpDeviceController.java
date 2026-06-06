package com.wangziyang.mes.basedata.controller.admin;

import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.request.SpDevicePageReq;
import com.wangziyang.mes.basedata.service.ISpDeviceService;
import com.wangziyang.mes.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Controller("adminSpDeviceController")
@RequestMapping("/basedata/device")
public class SpDeviceController {

    @Autowired
    private ISpDeviceService spDeviceService;

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpDevicePageReq req) throws Exception {
        return Result.success(spDeviceService.pageWithRelations(req));
    }

    @GetMapping("/{id}")
    @ResponseBody
    public Result getById(@PathVariable String id) {
        return Result.success(spDeviceService.getById(id));
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(@RequestBody SpDevice record) {
        spDeviceService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        if (spDeviceService.hasOrders(id)) {
            return Result.failure("设备已关联生产作业，无法删除");
        }
        SpDevice device = new SpDevice();
        device.setId(id);
        device.setDeleted("1");
        spDeviceService.updateById(device);
        return Result.success(null);
    }
}
