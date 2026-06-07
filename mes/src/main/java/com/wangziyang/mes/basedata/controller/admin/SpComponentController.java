package com.wangziyang.mes.basedata.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.basedata.entity.SpComponent;
import com.wangziyang.mes.basedata.request.SpComponentPageReq;
import com.wangziyang.mes.basedata.service.ISpComponentService;
import com.wangziyang.mes.common.Result;
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
            qw.likeRight("code", "COMP-").orderByDesc("code").last("LIMIT 1");
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
        spComponentService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        SpComponent c = new SpComponent();
        c.setId(params.get("id"));
        c.setDeleted("1");
        spComponentService.updateById(c);
        return Result.success(null);
    }
}
