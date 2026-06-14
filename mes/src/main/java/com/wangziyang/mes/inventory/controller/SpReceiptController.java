package com.wangziyang.mes.inventory.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.inventory.dto.ManualInboundDTO;
import com.wangziyang.mes.inventory.dto.PostItemDTO;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;
import com.wangziyang.mes.inventory.request.SpReceiptPageReq;
import com.wangziyang.mes.inventory.service.ISpInventoryService;
import com.wangziyang.mes.inventory.service.ISpWarehouseReceiptItemService;
import com.wangziyang.mes.inventory.service.ISpWarehouseReceiptService;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

/**
 * 计划入库 Controller
 */
@Controller
@RequestMapping("/inventory")
public class SpReceiptController extends BaseController {

    @Autowired
    private ISpWarehouseReceiptService receiptService;

    @Autowired
    private ISpWarehouseReceiptItemService receiptItemService;

    @Autowired
    private ISpInventoryService inventoryService;

    @ApiOperation("分页查询入库单")
    @PostMapping("/receipt/page")
    @ResponseBody
    public Result pageReceipts(SpReceiptPageReq req) {
        return Result.success(receiptService.pageReceipts(req));
    }

    @ApiOperation("查询入库单明细")
    @GetMapping("/receipt/{receiptId}/items")
    @ResponseBody
    public Result getItems(@PathVariable String receiptId) {
        return Result.success(receiptItemService.listByReceiptId(receiptId));
    }

    @ApiOperation("入库登账(单条)")
    @PostMapping("/receipt/item/post")
    @ResponseBody
    public Result postItem(@RequestBody PostItemDTO dto) {
        receiptService.postItem(dto);
        return Result.success();
    }

    @ApiOperation("分页查询库存明细")
    @PostMapping("/page")
    @ResponseBody
    public Result pageInventory(SpInventoryPageReq req) {
        return Result.success(inventoryService.pageInventory(req));
    }

    @ApiOperation("手动入库")
    @PostMapping("/manual-inbound")
    @ResponseBody
    public Result manualInbound(@RequestBody ManualInboundDTO dto) {
        inventoryService.manualInbound(dto);
        return Result.success();
    }
}
