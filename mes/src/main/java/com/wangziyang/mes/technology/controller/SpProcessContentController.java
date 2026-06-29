package com.wangziyang.mes.technology.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.common.util.MinioUtil;
import com.wangziyang.mes.technology.entity.*;
import com.wangziyang.mes.technology.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Controller
@RequestMapping("/technology/process-content")
public class SpProcessContentController extends BaseController {

    @Autowired private ISpProcessContentService contentService;
    @Autowired private ISpProcessEquipmentService equipmentService;
    @Autowired private ISpProcessDocumentService documentService;
    @Autowired private ISpProductBomService bomService;
    @Autowired private ISpProductBomItemService bomItemService;
    @Autowired private MinioUtil minioUtil;

    /** 校验父工艺文件可编辑:contentId 非空 + 存在 + 未完成。可编辑返回 null,否则返回失败 Result */
    private Result validateEditableParent(String contentId) {
        if (contentId == null || contentId.trim().isEmpty()) {
            return Result.failure("缺少工艺文件ID");
        }
        SpProcessContent parent = contentService.getById(contentId);
        if (parent == null) {
            return Result.failure("工艺文件不存在");
        }
        if ("completed".equals(parent.getStatus())) {
            return Result.failure("工艺文件已锁定，不可修改");
        }
        return null;
    }

    /** 把逗号连接的对象 key 列表重签为可访问 url 列表(顺序与非空 key 一致) */
    private List<String> resolveUrls(String csvKeys) {
        List<String> urls = new ArrayList<>();
        if (csvKeys == null || csvKeys.trim().isEmpty()) return urls;
        for (String k : csvKeys.split(",")) {
            String key = k.trim();
            if (key.isEmpty()) continue;
            String u = resolveUrl(key);
            urls.add(u == null ? "" : u);
        }
        return urls;
    }

    /** 单个对象 key 重签;失败返回 null */
    private String resolveUrl(String key) {
        if (key == null || key.trim().isEmpty()) return null;
        try {
            return minioUtil.presignedGetUrl(key.trim());
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/get/{bomId}")
    @ResponseBody
    public Result getByBomId(@PathVariable String bomId) {
        SpProcessContent content = contentService.getOne(
                new QueryWrapper<SpProcessContent>().eq("bom_id", bomId), false);
        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        List<SpProcessEquipment> equipment = new ArrayList<>();
        List<Map<String, Object>> documents = new ArrayList<>();
        List<String> contentImageUrls = new ArrayList<>();
        List<String> inspectionImageUrls = new ArrayList<>();
        if (content != null) {
            QueryWrapper<SpProcessEquipment> eqQw = new QueryWrapper<>();
            eqQw.eq("content_id", content.getId());
            equipment = equipmentService.list(eqQw);
            QueryWrapper<SpProcessDocument> docQw = new QueryWrapper<>();
            docQw.eq("content_id", content.getId());
            for (SpProcessDocument d : documentService.list(docQw)) {
                Map<String, Object> dm = new HashMap<>();
                dm.put("id", d.getId());
                dm.put("contentId", d.getContentId());
                dm.put("name", d.getName());
                dm.put("filePath", d.getFilePath());
                dm.put("fileUrl", resolveUrl(d.getFilePath()));
                documents.add(dm);
            }
            contentImageUrls = resolveUrls(content.getContentImages());
            inspectionImageUrls = resolveUrls(content.getInspectionImages());
        }
        result.put("equipment", equipment);
        result.put("documents", documents);
        result.put("contentImageUrls", contentImageUrls);
        result.put("inspectionImageUrls", inspectionImageUrls);
        return Result.success(result);
    }

    @GetMapping("/list/{productBomRootId}")
    @ResponseBody
    public Result listByProduct(@PathVariable String productBomRootId) {
        List<SpProductBom> nodes = bomService.getTreeByRootId(productBomRootId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (SpProductBom node : nodes) {
            Map<String, Object> m = new HashMap<>();
            m.put("bomNode", node);
            QueryWrapper<SpProcessContent> qw = new QueryWrapper<>();
            qw.eq("bom_id", node.getId());
            m.put("content", contentService.getOne(qw, false));
            result.add(m);
        }
        return Result.success(result);
    }

    @PostMapping("/save")
    @ResponseBody
    public Result save(@RequestBody SpProcessContent record) {
        // 创建路径:同一 bomId 已有内容则复用其 id 转为更新(防重复 + 前端竞态)
        if ((record.getId() == null || record.getId().isEmpty()) && record.getBomId() != null) {
            SpProcessContent existed = contentService.getOne(
                    new QueryWrapper<SpProcessContent>().eq("bom_id", record.getBomId()), false);
            if (existed != null) record.setId(existed.getId());
        }
        if (record.getId() == null || record.getId().isEmpty()) {
            record.setId(UUID.randomUUID().toString().replace("-", ""));
            record.setStatus("draft");
        } else {
            SpProcessContent existing = contentService.getById(record.getId());
            if (existing == null) return Result.failure("工艺文件不存在");
            if ("completed".equals(existing.getStatus())) {
                return Result.failure("工艺文件已完成锁定，不可修改");
            }
            record.setStatus(existing.getStatus()); // 不信任客户端 status
        }
        contentService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/complete/{id}")
    @ResponseBody
    public Result complete(@PathVariable String id) {
        SpProcessContent c = contentService.getById(id);
        if (c == null) return Result.failure("工艺文件不存在");
        if ("completed".equals(c.getStatus())) {
            return Result.failure("工艺文件已完成，请勿重复提交");
        }
        // 完成编制前校验必填项（主信息、工序内容），避免空内容被标记为已完成
        if (c.getMainInfo() == null || c.getMainInfo().trim().isEmpty()) {
            return Result.failure("请先填写并保存『主信息』后再完成编制");
        }
        if (c.getContent() == null || c.getContent().trim().isEmpty()) {
            return Result.failure("请先填写并保存『工序内容』后再完成编制");
        }
        c.setStatus("completed");
        contentService.updateById(c);
        return Result.success(null);
    }

    @PostMapping("/equipment/save")
    @ResponseBody
    public Result saveEquipment(@RequestBody SpProcessEquipment record) {
        Result check = validateEditableParent(record.getContentId());
        if (check != null) return check;
        if (record.getQuantity() == null) record.setQuantity(1);
        if (record.getId() == null || record.getId().isEmpty()) {
            record.setId(UUID.randomUUID().toString().replace("-", ""));
        }
        equipmentService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/equipment/delete")
    @ResponseBody
    public Result deleteEquipment(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        if (id == null || id.trim().isEmpty()) return Result.failure("id 不能为空");
        boolean ok = equipmentService.removeById(id);
        return ok ? Result.success(null) : Result.failure("删除失败或记录不存在");
    }

    @PostMapping("/upload-image")
    @ResponseBody
    public Result uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) return Result.failure("文件为空");
        try {
            String key = minioUtil.upload(file, "process");
            Map<String, String> result = new HashMap<>();
            result.put("key", key);
            result.put("url", minioUtil.presignedGetUrl(key));
            return Result.success(result);
        } catch (Exception e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }

    @PostMapping("/document/save")
    @ResponseBody
    public Result saveDocument(@RequestBody SpProcessDocument record) {
        Result check = validateEditableParent(record.getContentId());
        if (check != null) return check;
        if (record.getId() == null || record.getId().isEmpty()) {
            record.setId(UUID.randomUUID().toString().replace("-", ""));
        }
        documentService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/document/delete")
    @ResponseBody
    public Result deleteDocument(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        if (id == null || id.trim().isEmpty()) return Result.failure("id 不能为空");
        SpProcessDocument doc = documentService.getById(id);
        if (doc == null) return Result.failure("删除失败或记录不存在");
        boolean ok = documentService.removeById(id);
        if (!ok) return Result.failure("删除失败");
        if (doc.getFilePath() != null && !doc.getFilePath().trim().isEmpty()) {
            try { minioUtil.delete(doc.getFilePath().trim()); } catch (Exception ignore) { /* 仅清理,失败不影响 */ }
        }
        return Result.success(null);
    }

    @PostMapping("/upload-document")
    @ResponseBody
    public Result uploadDocument(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) return Result.failure("文件为空");
        String originalName = file.getOriginalFilename();
        String ext = originalName != null && originalName.contains(".")
            ? originalName.substring(originalName.lastIndexOf(".") + 1).toLowerCase() : "";
        if (!"pdf".equals(ext)) return Result.failure("只支持 PDF 格式");
        try {
            String key = minioUtil.upload(file, "process");
            Map<String, String> result = new HashMap<>();
            result.put("key", key);
            result.put("url", minioUtil.presignedGetUrl(key));
            result.put("name", originalName);
            return Result.success(result);
        } catch (Exception e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }

    @GetMapping("/bom-items/{bomId}")
    @ResponseBody
    public Result getBomItems(@PathVariable String bomId) {
        QueryWrapper<SpProductBomItem> qw = new QueryWrapper<>();
        qw.eq("bom_id", bomId).orderByAsc("sort_order");
        return Result.success(bomItemService.list(qw));
    }

    @GetMapping("/products")
    @ResponseBody
    public Result getProducts() {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.isNull("parent_id");
        return Result.success(bomService.list(qw));
    }
}
