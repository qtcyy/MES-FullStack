package com.wangziyang.mes.basedata.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.request.SpDevicePageReq;
import com.wangziyang.mes.basedata.service.ISpDeviceService;
import com.wangziyang.mes.common.Result;
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
        if (spDeviceService.hasOrders(id)) {
            return Result.failure("设备已关联生产作业，无法删除");
        }
        SpDevice existing = spDeviceService.getById(id);
        if (existing == null) {
            return Result.failure("设备不存在");
        }
        SpDevice device = new SpDevice();
        device.setId(id);
        device.setDeleted("1");
        // 释放 code 唯一索引，避免软删除后再新增同编号设备触发唯一键冲突；
        // code 列为 varchar(32)，id 为雪花串，截断前缀后拼接完整 id 以保证唯一且不超长
        device.setCode(buildDeletedCode(existing.getCode(), id));
        spDeviceService.updateById(device);
        return Result.success(null);
    }

    private static final int CODE_MAX_LEN = 32;

    private String buildDeletedCode(String code, String id) {
        String suffix = "#" + id;
        String prefix = code == null ? "" : code;
        int maxPrefix = CODE_MAX_LEN - suffix.length();
        if (maxPrefix < 0) {
            // 极端情况下 id 本身超长，直接截断整体
            return suffix.substring(0, CODE_MAX_LEN);
        }
        if (prefix.length() > maxPrefix) {
            prefix = prefix.substring(0, maxPrefix);
        }
        return prefix + suffix;
    }
}
