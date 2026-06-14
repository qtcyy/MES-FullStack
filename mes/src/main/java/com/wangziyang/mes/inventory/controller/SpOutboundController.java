package com.wangziyang.mes.inventory.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.inventory.dto.PostOutboundItemDTO;
import com.wangziyang.mes.inventory.request.SpOutboundPageReq;
import com.wangziyang.mes.inventory.service.ISpOutboundOrderItemService;
import com.wangziyang.mes.inventory.service.ISpOutboundOrderService;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

/**
 * 配套出库 Controller
 */
@Controller
@RequestMapping("/inventory/outbound")
public class SpOutboundController extends BaseController {

    @Autowired
    private ISpOutboundOrderService outboundService;

    @Autowired
    private ISpOutboundOrderItemService outboundItemService;

    @ApiOperation("分页查询出库单")
    @PostMapping("/page")
    @ResponseBody
    public Result pageOutbounds(SpOutboundPageReq req) {
        return Result.success(outboundService.pageOutbounds(req));
    }

    @ApiOperation("查询出库单明细")
    @GetMapping("/{outboundId}/items")
    @ResponseBody
    public Result getItems(@PathVariable String outboundId) {
        return Result.success(outboundItemService.listByOutboundId(outboundId));
    }

    @ApiOperation("出库登账(FIFO)")
    @PostMapping("/item/post")
    @ResponseBody
    public Result postOutboundItem(@RequestBody PostOutboundItemDTO dto) {
        outboundService.postOutboundItem(dto);
        return Result.success();
    }
}
