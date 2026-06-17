package com.wangziyang.mes.order.controller;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.request.SpOrderReq;
import com.wangziyang.mes.order.service.ISpOrderService;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiImplicitParams;
import io.swagger.annotations.ApiOperation;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 * @author WangZiYang
 * @since 2020-07-01
 */
@Controller
@RequestMapping("/order/release")
public class SpOrderController extends BaseController {

    @Autowired
    private ISpOrderService iSpOrderService;

    /**
     * 生产订单管理界面
     *
     * @param model 模型
     * @return 生产订单管理界面
     */
    @ApiOperation("生产订单管理界面界面UI")
    @ApiImplicitParams({@ApiImplicitParam(name = "model", value = "模型", defaultValue = "模型")})
    @GetMapping("/list-ui")
    public String listUI(Model model) {
        return "/order/production/list";
    }

    /**
     * 生产订单修改界面
     *
     * @param model  模型
     * @param record 平台表对象
     * @return 更改界面
     */
    @ApiOperation("生产订单修改界面")
    @GetMapping("/add-or-update-ui")
    public String addOrUpdateUI(Model model, SpTableManager record) {
        if (StringUtils.isNotEmpty(record.getId())) {
            SpOrder spOrder = iSpOrderService.getById(record.getId());
            model.addAttribute("result", spOrder);
        }
        return "/order/production/addOrUpdate";
    }

    @GetMapping("/get-by-id")
    @ResponseBody
    public Result getById(String id) {
        SpOrder result = iSpOrderService.getById(id);
        return Result.success(result);
    }


    /**
     * 生产订单界面分页查询
     *
     * @param req 请求参数
     * @return Result 执行结果
     */
    @ApiOperation("生产订单界界面分页查询")
    @PostMapping("/page")
    @ResponseBody
    public Result page(SpOrderReq req) {
        QueryWrapper queryWrapper = new QueryWrapper();
        if (StringUtils.isNotEmpty(req.getOrderCodeLike())) {
            queryWrapper.like("order_code", req.getOrderCodeLike());
        }
        if (StringUtils.isNotEmpty(req.getMaterielLike())) {
            queryWrapper.like("materiel", req.getMaterielLike());
        }
        queryWrapper.orderByDesc("create_time");
        IPage result = iSpOrderService.page(req, queryWrapper);
        return Result.success(result);
    }

    @ApiOperation("生产订单修改、新增")
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpOrder record) {
        // 新建订单默认状态=0(已下发/待派工),以进入派工列表
        if (StringUtils.isEmpty(record.getId()) && record.getStatue() == null) {
            record.setStatue(0);
        }
        iSpOrderService.saveOrUpdate(record);
        return Result.success();
    }


    @ApiOperation("删除生产订单")
    @PostMapping("/delete")
    @ResponseBody
    public Result deleteByTableNameId(SpOrder req) throws Exception {
        iSpOrderService.removeById(req.getId());
        return Result.success();
    }
}
