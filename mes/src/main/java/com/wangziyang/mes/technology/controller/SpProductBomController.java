package com.wangziyang.mes.technology.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.basedata.entity.SpMaterile;
import com.wangziyang.mes.basedata.service.ISpMaterileService;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.entity.SpProductBomItem;
import com.wangziyang.mes.technology.request.SpProductBomPageReq;
import com.wangziyang.mes.technology.service.ISpProductBomItemService;
import com.wangziyang.mes.technology.service.ISpProductBomService;
import org.apache.commons.lang3.StringUtils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
@RequestMapping("/technology/product-bom")
public class SpProductBomController extends BaseController {

    @Autowired
    private ISpProductBomService spProductBomService;

    @Autowired
    private ISpProductBomItemService spProductBomItemService;

    @Autowired
    private ISpMaterileService iSpMaterileService;

    /**
     * 可作为 BOM 根节点的物料类型。
     * 1b 物料字典 material_type 的 value 为 FG(成品)/PG(半成品);
     * 兼容历史中文脏数据 "产品"/"半成品"。
     */
    private static final java.util.Set<String> PRODUCT_MAT_TYPES =
            new java.util.HashSet<>(java.util.Arrays.asList("FG", "PG", "产品", "半成品"));

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpProductBomPageReq req) {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.isNull("parent_id");
        if (StringUtils.isNotEmpty(req.getProductCodeLike())) {
            qw.like("product_code", req.getProductCodeLike());
        }
        if (StringUtils.isNotEmpty(req.getNodeNameLike())) {
            qw.like("node_name", req.getNodeNameLike());
        }
        qw.orderByDesc("create_time");
        IPage<SpProductBom> result = spProductBomService.page(req, qw);
        return Result.success(result);
    }

    @GetMapping("/tree")
    @ResponseBody
    public Result tree() {
        QueryWrapper<SpProductBom> rootQw = new QueryWrapper<>();
        rootQw.isNull("parent_id").orderByDesc("create_time");
        List<SpProductBom> roots = spProductBomService.list(rootQw);

        List<Map<String, Object>> trees = new ArrayList<>();
        for (SpProductBom root : roots) {
            trees.add(buildTreeNode(root));
        }
        return Result.success(trees);
    }

    private Map<String, Object> buildTreeNode(SpProductBom node) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", node.getId());
        map.put("bomCode", node.getBomCode());
        map.put("nodeName", node.getNodeName());
        map.put("productCode", node.getProductCode());
        map.put("level", node.getLevel());
        map.put("version", node.getVersion());
        map.put("status", node.getStatus());
        map.put("remark", node.getRemark());
        map.put("sortOrder", node.getSortOrder());

        QueryWrapper<SpProductBom> childQw = new QueryWrapper<>();
        childQw.eq("parent_id", node.getId()).orderByAsc("sort_order");
        List<SpProductBom> children = spProductBomService.list(childQw);

        List<Map<String, Object>> childMaps = new ArrayList<>();
        for (SpProductBom child : children) {
            childMaps.add(buildTreeNode(child));
        }
        map.put("children", childMaps);

        QueryWrapper<SpProductBomItem> itemQw = new QueryWrapper<>();
        itemQw.eq("bom_id", node.getId());
        map.put("itemCount", spProductBomItemService.count(itemQw));
        return map;
    }

    @GetMapping("/tree/{id}")
    @ResponseBody
    public Result getTree(@PathVariable String id) {
        List<SpProductBom> nodes = spProductBomService.getTreeByRootId(id);
        return Result.success(nodes);
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(@RequestBody SpProductBom record) {
        if (StringUtils.isEmpty(record.getParentId())) {
            if (StringUtils.isNotEmpty(record.getProductCode())) {
                QueryWrapper<SpMaterile> mq = new QueryWrapper<>();
                mq.eq("materiel", record.getProductCode());
                SpMaterile mat = iSpMaterileService.getOne(mq);
                if (mat == null || !PRODUCT_MAT_TYPES.contains(mat.getMatType())) {
                    return Result.failure("BOM 根节点必须对应成品/半成品物料（物料类型 FG/PG）");
                }
            }
        }

        if (StringUtils.isEmpty(record.getId())) {
            record.setId(UUID.randomUUID().toString().replace("-", ""));
            if (StringUtils.isEmpty(record.getParentId())) {
                record.setLevel(0);
                record.setBomCode(spProductBomService.generateBomCode());
                if (StringUtils.isEmpty(record.getVersion())) {
                    record.setVersion("V1.0");
                }
            } else {
                SpProductBom parent = spProductBomService.getById(record.getParentId());
                if (parent == null) {
                    return Result.failure("父节点不存在");
                }
                if ("locked".equals(parent.getStatus())) {
                    return Result.failure("BOM 已锁定，无法添加子节点");
                }
                record.setLevel(parent.getLevel() + 1);
                record.setProductCode(parent.getProductCode());
                record.setVersion(parent.getVersion());
                record.setBomCode(spProductBomService.generateBomCode());
            }
            if (StringUtils.isEmpty(record.getStatus())) {
                record.setStatus("draft");
            }
        } else {
            SpProductBom existing = spProductBomService.getById(record.getId());
            if (existing == null) {
                return Result.failure("节点不存在");
            }
            if ("locked".equals(existing.getStatus())) {
                return Result.failure("BOM 已锁定，无法修改节点");
            }
        }
        spProductBomService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        SpProductBom node = spProductBomService.getById(id);
        if (node != null && "locked".equals(node.getStatus())) {
            return Result.failure("BOM 已锁定，无法删除");
        }
        spProductBomService.cascadeDelete(id);
        return Result.success(null);
    }

    @PostMapping("/lock")
    @ResponseBody
    public Result lock(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        String username = getSysUser() != null ? getSysUser().getUsername() : "admin";
        try {
            spProductBomService.lockBom(id, username);
            return Result.success(null);
        } catch (RuntimeException e) {
            return Result.failure(e.getMessage());
        }
    }

    @PostMapping("/new-version")
    @ResponseBody
    public Result newVersion(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        try {
            SpProductBom newRoot = spProductBomService.createNewVersion(id);
            return Result.success(newRoot.getId());
        } catch (RuntimeException e) {
            return Result.failure(e.getMessage());
        }
    }

    @GetMapping("/items/{bomId}")
    @ResponseBody
    public Result getItems(@PathVariable String bomId) {
        QueryWrapper<SpProductBomItem> qw = new QueryWrapper<>();
        qw.eq("bom_id", bomId).orderByAsc("sort_order");
        return Result.success(spProductBomItemService.list(qw));
    }

    @PostMapping("/item/add-or-update")
    @ResponseBody
    public Result addOrUpdateItem(@RequestBody SpProductBomItem record) {
        if (StringUtils.isEmpty(record.getId())) {
            record.setId(UUID.randomUUID().toString().replace("-", ""));
        }
        SpProductBom bom = spProductBomService.getById(record.getBomId());
        if (bom != null && "locked".equals(bom.getStatus())) {
            return Result.failure("BOM 已锁定，无法修改物料清单");
        }
        spProductBomItemService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/item/delete")
    @ResponseBody
    public Result deleteItem(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        SpProductBomItem item = spProductBomItemService.getById(id);
        if (item != null) {
            SpProductBom bom = spProductBomService.getById(item.getBomId());
            if (bom != null && "locked".equals(bom.getStatus())) {
                return Result.failure("BOM 已锁定，无法删除物料");
            }
        }
        spProductBomItemService.removeById(id);
        return Result.success(null);
    }

    @GetMapping("/products")
    @ResponseBody
    public Result getProducts() {
        QueryWrapper<SpMaterile> qw = new QueryWrapper<>();
        qw.in("mat_type", PRODUCT_MAT_TYPES).ne("is_deleted", "1");
        return Result.success(iSpMaterileService.list(qw));
    }
}
