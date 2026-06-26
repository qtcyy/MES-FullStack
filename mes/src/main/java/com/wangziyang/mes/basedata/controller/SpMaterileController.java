package com.wangziyang.mes.basedata.controller;


import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.basedata.entity.SpMaterile;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.request.spMaterileReq;
import com.wangziyang.mes.basedata.service.ISpMaterileService;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.common.util.MinioUtil;
import com.wangziyang.mes.technology.entity.SpFlow;
import com.wangziyang.mes.technology.service.ISpFlowService;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiImplicitParams;
import io.swagger.annotations.ApiOperation;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * <p>
 * 物料控制器
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-19
 */
@Controller
@RequestMapping("/basedata/materile")
public class SpMaterileController extends BaseController {

    /**
     * 物料服务
     *
     * @date 2020-07-07
     */
    @Autowired
    private ISpMaterileService iSpMaterileService;
    /**
     * 流程服务
     */
    @Autowired
    private ISpFlowService iSpFlowService;

    /**
     * 物料管理界面
     *
     * @param model 模型
     * @return 物料管理界面
     */
    @ApiOperation("物料管理界面UI")
    @ApiImplicitParams({@ApiImplicitParam(name = "model", value = "模型", defaultValue = "模型")})
    @GetMapping("/list-ui")
    public String listUI(Model model) {
        return "basedata/materile/list";
    }


    /**
     * 物料管理修改界面
     *
     * @param model  模型
     * @param record 平台表对象
     * @return 更改界面
     */
    @ApiOperation("物料管理修改界面")
    @GetMapping("/add-or-update-ui")
    public String addOrUpdateUI(Model model, SpTableManager record) {
        if (StringUtils.isNotEmpty(record.getId())) {
            SpMaterile SpMaterile = iSpMaterileService.getById(record.getId());
            model.addAttribute("result", SpMaterile);
        }
        return "basedata/materile/addOrUpdate";
    }

    @GetMapping("/get-by-id")
    @ResponseBody
    public Result getById(String id) {
        SpMaterile result = iSpMaterileService.getById(id);
        return Result.success(result);
    }


    /**
     * 物料管理界面分页查询
     *
     * @param req 请求参数
     * @return Result 执行结果
     */
    @ApiOperation("物料管理界面分页查询")
    @ApiImplicitParams({@ApiImplicitParam(name = "req", value = "请求参数", defaultValue = "请求参数")})
    @PostMapping("/page")
    @ResponseBody
    public Result page(spMaterileReq req) {
        QueryWrapper queryWrapper = new QueryWrapper();
        queryWrapper.ne("is_deleted", "1"); // 过滤软删记录
        if (StringUtils.isNotEmpty(req.getMaterielLike())) {
            queryWrapper.like("materiel", req.getMaterielLike());
        }
        if (StringUtils.isNotEmpty(req.getMaterielDescLike())) {
            queryWrapper.like("materiel_desc", req.getMaterielDescLike());
        }
        queryWrapper.orderByDesc("create_time");
        IPage result = iSpMaterileService.page(req, queryWrapper);
        return Result.success(result);
    }

    /**
     * 物料管理修改、新增
     *
     * @param record 物料实体类
     * @return 执行结果
     */
    @ApiOperation("物料管理修改、新增")
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpMaterile record) {
        // Auto-generate material code if empty (new record)
        if (StringUtils.isEmpty(record.getMateriel()) && StringUtils.isNotEmpty(record.getMatType())) {
            String prefix = getCodePrefix(record.getMatType());
            QueryWrapper<SpMaterile> qw = new QueryWrapper<>();
            qw.likeRight("materiel", prefix).orderByDesc("materiel").last("LIMIT 1");
            SpMaterile last = iSpMaterileService.getOne(qw);
            int next = 1;
            if (last != null && last.getMateriel() != null) {
                String numStr = last.getMateriel().replace(prefix, "");
                try { next = Integer.parseInt(numStr) + 1; } catch (NumberFormatException e) { /* keep 1 */ }
            }
            record.setMateriel(prefix + String.format("%03d", next));
        }
        if (StrUtil.isNotBlank(record.getFlowId())) {
            SpFlow spflow = iSpFlowService.getById(record.getFlowId());
            if (Objects.nonNull(spflow)) {
                record.setFlowDesc(spflow.getFlowDesc());
            }
        }
        iSpMaterileService.saveOrUpdate(record);
        return Result.success();
    }

    private String getCodePrefix(String matType) {
        if (matType == null) return "OTHR-";
        switch (matType) {
            // 字典 material_type 的 value
            case "FG": return "FG-";   // 成品
            case "PG": return "PG-";   // 半成品
            // 兼容历史中文脏值
            case "产品": return "PROD-";
            case "零件": return "PART-";
            case "标准件": return "STD-";
            default: return "OTHR-";
        }
    }

    @Autowired
    private MinioUtil minioUtil;

    @PostMapping("/upload-image")
    @ResponseBody
    public Result uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) return Result.failure("文件为空");
        try {
            String url = minioUtil.uploadAndGetUrl(file, "materile");
            Map<String, String> result = new HashMap<>();
            result.put("url", url);
            return Result.success(result);
        } catch (Exception e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }


    /**
     * 删除物料信息
     *
     * @param req 请求参数
     * @return Result 执行结果
     */
    @ApiOperation("删除物料信息")
    @ApiImplicitParams({@ApiImplicitParam(name = "req", value = "物料实体", defaultValue = "物料实体")})
    @PostMapping("/delete")
    @ResponseBody
    public Result deleteByTableNameId(SpMaterile req) throws Exception {
        com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<SpMaterile> uw =
                new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<>();
        uw.eq("id", req.getId()).set("is_deleted", "1");
        iSpMaterileService.update(uw);
        return Result.success();
    }
}
