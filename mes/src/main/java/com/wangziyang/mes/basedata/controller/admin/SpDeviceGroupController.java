package com.wangziyang.mes.basedata.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.entity.SpDeviceGroup;
import com.wangziyang.mes.basedata.entity.SpDeviceGroupItem;
import com.wangziyang.mes.basedata.request.SpDeviceGroupPageReq;
import com.wangziyang.mes.basedata.service.ISpDeviceGroupItemService;
import com.wangziyang.mes.basedata.service.ISpDeviceGroupService;
import com.wangziyang.mes.basedata.service.ISpDeviceService;
import com.wangziyang.mes.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller("adminSpDeviceGroupController")
@RequestMapping("/basedata/device-group")
public class SpDeviceGroupController {

    @Autowired
    private ISpDeviceGroupService spDeviceGroupService;

    @Autowired
    private ISpDeviceGroupItemService spDeviceGroupItemService;

    @Autowired
    private ISpDeviceService spDeviceService;

    @GetMapping("/list-ui")
    public String listUI() {
        return "forward:/index.html";
    }

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpDeviceGroupPageReq req) throws Exception {
        return Result.success(spDeviceGroupService.pageWithRelations(req));
    }

    @GetMapping("/{id}")
    @ResponseBody
    public Result getById(@PathVariable String id) {
        return Result.success(spDeviceGroupService.getById(id));
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(@RequestBody SpDeviceGroup record) {
        spDeviceGroupService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        SpDeviceGroup group = new SpDeviceGroup();
        group.setId(id);
        group.setDeleted("1");
        spDeviceGroupService.updateById(group);
        return Result.success(null);
    }

    @GetMapping("/items/{groupId}")
    @ResponseBody
    public Result getGroupItems(@PathVariable String groupId) {
        QueryWrapper<SpDeviceGroupItem> qw = new QueryWrapper<>();
        qw.eq("group_id", groupId);
        List<SpDeviceGroupItem> items = spDeviceGroupItemService.list(qw);
        if (items.isEmpty()) return Result.success(Collections.emptyList());
        List<String> deviceIds = items.stream().map(SpDeviceGroupItem::getDeviceId).collect(Collectors.toList());
        return Result.success(spDeviceService.listByIds(deviceIds));
    }

    @PostMapping("/items/add")
    @ResponseBody
    public Result addGroupItems(@RequestBody Map<String, Object> params) {
        String groupId = (String) params.get("groupId");
        @SuppressWarnings("unchecked")
        List<String> deviceIds = (List<String>) params.get("deviceIds");
        if (deviceIds != null) {
            for (String deviceId : deviceIds) {
                SpDeviceGroupItem existing = spDeviceGroupItemService.getOne(
                    new QueryWrapper<SpDeviceGroupItem>().eq("group_id", groupId).eq("device_id", deviceId)
                );
                if (existing == null) {
                    SpDeviceGroupItem item = new SpDeviceGroupItem();
                    item.setGroupId(groupId);
                    item.setDeviceId(deviceId);
                    spDeviceGroupItemService.save(item);
                }
            }
        }
        return Result.success(null);
    }

    @PostMapping("/items/remove")
    @ResponseBody
    public Result removeGroupItem(@RequestBody Map<String, String> params) {
        String groupId = params.get("groupId");
        String deviceId = params.get("deviceId");
        QueryWrapper<SpDeviceGroupItem> qw = new QueryWrapper<>();
        qw.eq("group_id", groupId).eq("device_id", deviceId);
        spDeviceGroupItemService.remove(qw);
        return Result.success(null);
    }
}
