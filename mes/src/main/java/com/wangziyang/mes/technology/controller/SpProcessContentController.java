package com.wangziyang.mes.technology.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.entity.*;
import com.wangziyang.mes.technology.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.util.Arrays;
import java.nio.file.Files;
import java.util.*;

@Controller
@RequestMapping("/technology/process-content")
public class SpProcessContentController extends BaseController {

    @Autowired private ISpProcessContentService contentService;
    @Autowired private ISpProcessEquipmentService equipmentService;
    @Autowired private ISpProcessDocumentService documentService;
    @Autowired private ISpProductBomService bomService;
    @Autowired private ISpProductBomItemService bomItemService;

    @GetMapping("/get/{bomId}")
    @ResponseBody
    public Result getByBomId(@PathVariable String bomId) {
        QueryWrapper<SpProcessContent> qw = new QueryWrapper<>();
        qw.eq("bom_id", bomId);
        SpProcessContent content = contentService.getOne(qw);
        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        if (content != null) {
            QueryWrapper<SpProcessEquipment> eqQw = new QueryWrapper<>();
            eqQw.eq("content_id", content.getId());
            result.put("equipment", equipmentService.list(eqQw));
            QueryWrapper<SpProcessDocument> docQw = new QueryWrapper<>();
            docQw.eq("content_id", content.getId());
            result.put("documents", documentService.list(docQw));
        }
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
            m.put("content", contentService.getOne(qw));
            result.add(m);
        }
        return Result.success(result);
    }

    @PostMapping("/save")
    @ResponseBody
    public Result save(@RequestBody SpProcessContent record) {
        if (record.getId() == null || record.getId().isEmpty()) {
            record.setId(UUID.randomUUID().toString().replace("-", ""));
            record.setStatus("draft");
        }
        contentService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/complete/{id}")
    @ResponseBody
    public Result complete(@PathVariable String id) {
        SpProcessContent c = contentService.getById(id);
        if (c != null) {
            c.setStatus("completed");
            contentService.updateById(c);
        }
        return Result.success(null);
    }

    @PostMapping("/equipment/save")
    @ResponseBody
    public Result saveEquipment(@RequestBody SpProcessEquipment record) {
        if (record.getId() == null || record.getId().isEmpty()) {
            record.setId(UUID.randomUUID().toString().replace("-", ""));
        }
        equipmentService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/equipment/delete")
    @ResponseBody
    public Result deleteEquipment(@RequestBody Map<String, String> params) {
        equipmentService.removeById(params.get("id"));
        return Result.success(null);
    }

    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/uploads/process/";

    @PostMapping("/upload-image")
    @ResponseBody
    public Result uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) return Result.failure("文件为空");
        String ext = ".jpg";
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains("."))
            ext = originalName.substring(originalName.lastIndexOf("."));
        String fileName = UUID.randomUUID().toString().replace("-", "") + ext;
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists()) dir.mkdirs();
        file.transferTo(new File(UPLOAD_DIR + fileName));
        Map<String, String> result = new HashMap<>();
        result.put("url", "/technology/process-content/image/" + fileName);
        return Result.success(result);
    }

    @GetMapping("/image/{filename}")
    public void getImage(@PathVariable String filename, HttpServletResponse response) throws IOException {
        File file = new File(UPLOAD_DIR + filename);
        if (!file.exists()) { response.sendError(404); return; }
        response.setContentType(filename.endsWith(".png") ? "image/png" : "image/jpeg");
        Files.copy(file.toPath(), response.getOutputStream());
        response.getOutputStream().flush();
    }

    @PostMapping("/document/save")
    @ResponseBody
    public Result saveDocument(@RequestBody SpProcessDocument record) {
        if (record.getId() == null || record.getId().isEmpty()) {
            record.setId(UUID.randomUUID().toString().replace("-", ""));
        }
        documentService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    @PostMapping("/document/delete")
    @ResponseBody
    public Result deleteDocument(@RequestBody Map<String, String> params) {
        documentService.removeById(params.get("id"));
        return Result.success(null);
    }

    @PostMapping("/upload-document")
    @ResponseBody
    public Result uploadDocument(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) return Result.failure("文件为空");
        String originalName = file.getOriginalFilename();
        String ext = originalName != null && originalName.contains(".")
            ? originalName.substring(originalName.lastIndexOf(".") + 1).toLowerCase() : "";
        if (!Arrays.asList("pdf", "doc", "docx").contains(ext)) {
            return Result.failure("只支持 PDF 和 Word（.doc/.docx）格式");
        }
        String extWithDot = originalName != null && originalName.contains(".")
            ? originalName.substring(originalName.lastIndexOf(".")) : "";
        String fileName = UUID.randomUUID().toString().replace("-", "") + extWithDot;
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists()) dir.mkdirs();
        file.transferTo(new File(UPLOAD_DIR + fileName));
        Map<String, String> result = new HashMap<>();
        result.put("url", "/technology/process-content/image/" + fileName);
        result.put("name", originalName);
        return Result.success(result);
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
