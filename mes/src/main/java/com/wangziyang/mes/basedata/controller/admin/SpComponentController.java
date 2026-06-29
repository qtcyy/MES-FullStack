package com.wangziyang.mes.basedata.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.entity.SpComponent;
import com.wangziyang.mes.basedata.request.SpComponentPageReq;
import com.wangziyang.mes.basedata.service.ISpComponentService;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.common.util.SoftDeleteUtil;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 组件定义 Controller
 *
 * @author wangziyang
 */
@Controller("adminSpComponentController")
@RequestMapping("/basedata/component")
public class SpComponentController {

    @Autowired
    private ISpComponentService spComponentService;

    @GetMapping("/list-ui")
    public String listUI() {
        return "forward:/index.html";
    }

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpComponentPageReq req) {
        QueryWrapper<SpComponent> qw = new QueryWrapper<>();
        qw.ne("is_deleted", "1");
        if (StringUtils.isNotEmpty(req.getName())) {
            qw.like("name", req.getName());
        }
        if (StringUtils.isNotEmpty(req.getCode())) {
            qw.like("code", req.getCode());
        }
        qw.orderByDesc("create_time");
        return Result.success(spComponentService.page(req, qw));
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpComponent record) {
        // Auto-generate code if empty
        if (StringUtils.isEmpty(record.getCode())) {
            QueryWrapper<SpComponent> qw = new QueryWrapper<>();
            // 排除软删行：其 code 已被释放为 COMP-xxx#id，parseInt 会失败导致序号回退
            qw.ne("is_deleted", "1").likeRight("code", "COMP-").orderByDesc("code").last("LIMIT 1");
            SpComponent last = spComponentService.getOne(qw);
            int next = 1;
            if (last != null && last.getCode() != null) {
                try {
                    next = Integer.parseInt(last.getCode().replace("COMP-", "")) + 1;
                } catch (NumberFormatException e) {
                    // fall through
                }
            }
            record.setCode("COMP-" + String.format("%03d", next));
        }
        // 未删除记录中校验 code 唯一，给出友好提示，避免命中唯一索引抛原始 SQL 异常
        QueryWrapper<SpComponent> dup = new QueryWrapper<>();
        dup.eq("code", record.getCode()).ne("is_deleted", "1");
        if (StringUtils.isNotEmpty(record.getId())) {
            dup.ne("id", record.getId());
        }
        if (spComponentService.count(dup) > 0) {
            return Result.failure("零部件编号已存在：" + record.getCode());
        }
        spComponentService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        SpComponent existing = spComponentService.getById(id);
        if (existing == null) {
            return Result.failure("零部件不存在");
        }
        SpComponent c = new SpComponent();
        c.setId(id);
        c.setDeleted("1");
        // 释放 code 唯一索引，避免软删除后再新增同编号零部件触发唯一键冲突（code 列 varchar(32)）
        c.setCode(SoftDeleteUtil.freeUniqueValue(existing.getCode(), id, 32));
        spComponentService.updateById(c);
        return Result.success(null);
    }
}
