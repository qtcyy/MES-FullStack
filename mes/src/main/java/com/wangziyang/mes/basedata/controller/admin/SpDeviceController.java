package com.wangziyang.mes.basedata.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.request.SpDevicePageReq;
import com.wangziyang.mes.basedata.service.ISpDeviceService;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.common.util.SoftDeleteUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
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
        if (!StringUtils.hasText(record.getCode())) {
            return Result.failure("设备编码不能为空");
        }
        // 在未删除的设备中校验 code 唯一，给出友好提示，避免命中唯一索引抛出原始 SQL 异常
        QueryWrapper<SpDevice> qw = new QueryWrapper<>();
        qw.eq("code", record.getCode())
          .ne("is_deleted", "1");
        if (StringUtils.hasText(record.getId())) {
            qw.ne("id", record.getId());
        }
        if (spDeviceService.count(qw) > 0) {
            return Result.failure("设备编码已存在：" + record.getCode());
        }
        spDeviceService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        if (spDeviceService.isReferencedByGroup(id)) {
            return Result.failure("设备已被设备编组引用，请先从编组中移除后再删除");
        }
        SpDevice existing = spDeviceService.getById(id);
        if (existing == null) {
            return Result.failure("设备不存在");
        }
        SpDevice device = new SpDevice();
        device.setId(id);
        device.setDeleted("1");
        // 释放 code 唯一索引，避免软删除后再新增同编号设备触发唯一键冲突（code 列 varchar(32)）
        device.setCode(SoftDeleteUtil.freeUniqueValue(existing.getCode(), id, 32));
        spDeviceService.updateById(device);
        return Result.success(null);
    }
}
