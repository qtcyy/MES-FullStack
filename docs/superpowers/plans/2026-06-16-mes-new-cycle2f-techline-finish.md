# 工艺技术线收尾(D BOM-Flow 绑定 + E 工艺文件/上传)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development 逐任务执行。步骤用 `- [ ]` 勾选。

**Goal:** 在 `apps/mes-new` 完成工艺路线绑定(D)与工艺文件编制/上传(E)两个页面,并修正本周期涉及的 12 个真实后端 bug(含 MinIO 改为存对象 key + 读时重签)。

**Architecture:** 两个主从页面(产品根选择 → 左 BOM 树 / 右节点详情),沿用 2e `ProductBomList` 范式。后端无新增业务端点,仅修 bug。上传走 `http.post(url, FormData)`,字段名 `file`。`@RequestBody` 端点用 `JSON_HEADERS`。

**Tech Stack:** React 19 + TS + Vite + shadcn `@workspace/ui` + react-hook-form + zod + `@ngify/http`/rxjs;后端 Spring Boot 2.1 + MyBatis-Plus 3.1.2 + MinIO 7.1.4。

**设计依据:** `docs/superpowers/specs/2026-06-16-mes-new-cycle2f-techline-finish-design.md`

**关键路径常量:**
- 仓库根 `REPO=/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack`
- 后端技术模块 `$REPO/mes/src/main/java/com/wangziyang/mes/technology`
- 前端 `$REPO/mes/frontend/apps/mes-new/src`
- git 操作一律 `git -C $REPO ...`;后端编译 `cd $REPO/mes && mvn -DskipTests compile`;前端 `cd $REPO/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm lint && pnpm build`;DB `/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data`。

---

## Task 1:后端 D — SpBomFlowController/Service 修复 + 唯一约束

**Files:**
- Modify: `$REPO/mes/src/main/java/com/wangziyang/mes/technology/controller/SpBomFlowController.java`
- Modify: `$REPO/mes/src/main/java/com/wangziyang/mes/technology/service/ISpBomFlowService.java`
- Modify: `$REPO/mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpBomFlowServiceImpl.java`
- Modify DDL: `$REPO/scripts/sql/MySQL-init-all.sql`(sp_bom_flow 段,行 54)
- DB migration:对 dev 库执行 ALTER

修复(对抗复核确认):D-BUG-1/2(bind 无校验+非事务)、D-BUG-3(getOne 重复 500)、D-BUG-7(锁状态不一致)、D-BUG-9(假成功)。

- [ ] **Step 1:ISpBomFlowService 增加原子 rebind 方法**

在接口里追加:
```java
public interface ISpBomFlowService extends IService<SpBomFlow> {
    void lockProductBomFlows(String productBomRootId);

    /** 原子替换某 BOM 节点的工艺绑定(remove+save 同事务),返回新绑定 id */
    String replaceBinding(String bomId, String flowId, String remark);
}
```

- [ ] **Step 2:SpBomFlowServiceImpl 实现 replaceBinding**

在类中追加(保留现有 lockProductBomFlows 不变):
```java
    @Override
    @Transactional(rollbackFor = Exception.class)
    public String replaceBinding(String bomId, String flowId, String remark) {
        QueryWrapper<SpBomFlow> delQw = new QueryWrapper<>();
        delQw.eq("bom_id", bomId);
        remove(delQw);
        SpBomFlow bf = new SpBomFlow();
        bf.setBomId(bomId);
        bf.setFlowId(flowId);
        bf.setStatus("draft");
        bf.setRemark(remark);
        save(bf); // 不手设 id,交由 @TableId 雪花生成
        return bf.getId();
    }
```

- [ ] **Step 3:重写 SpBomFlowController 的 bind/unbind/update-remark/list**

`bind` 改为(校验 bomId/flowId 非空、节点存在且未锁、flow 存在、已有绑定未锁,再调用原子 replaceBinding):
```java
    @PostMapping("/bind")
    @ResponseBody
    public Result bind(@RequestBody Map<String, Object> params) {
        String bomId = (String) params.get("bomId");
        String flowId = (String) params.get("flowId");
        String remark = (String) params.get("remark");
        if (bomId == null || bomId.trim().isEmpty() || flowId == null || flowId.trim().isEmpty()) {
            return Result.failure("BOM 节点与工艺路线不能为空");
        }
        SpProductBom bomNode = spProductBomService.getById(bomId);
        if (bomNode == null) {
            return Result.failure("BOM 节点不存在");
        }
        if ("locked".equals(bomNode.getStatus())) {
            return Result.failure("BOM 已锁定，无法编辑工艺流程");
        }
        if (iSpFlowService.getById(flowId) == null) {
            return Result.failure("工艺路线不存在");
        }
        SpBomFlow existing = spBomFlowService.getOne(
                new QueryWrapper<SpBomFlow>().eq("bom_id", bomId), false);
        if (existing != null && "locked".equals(existing.getStatus())) {
            return Result.failure("工艺流程已锁定，无法修改");
        }
        String id = spBomFlowService.replaceBinding(bomId, flowId, remark);
        return Result.success(id);
    }
```

`list` 第 44 行 `getOne(bfQw)` → `getOne(bfQw, false)`。

`unbind` 改为:
```java
    @PostMapping("/unbind")
    @ResponseBody
    public Result unbind(@RequestBody Map<String, String> params) {
        String bomId = params.get("bomId");
        if (bomId == null || bomId.trim().isEmpty()) {
            return Result.failure("BOM 节点不能为空");
        }
        QueryWrapper<SpBomFlow> qw = new QueryWrapper<>();
        qw.eq("bom_id", bomId);
        SpBomFlow bf = spBomFlowService.getOne(qw, false);
        if (bf == null) {
            return Result.failure("绑定不存在或已解绑");
        }
        SpProductBom node = spProductBomService.getById(bomId);
        boolean locked = "locked".equals(bf.getStatus())
                || (node != null && "locked".equals(node.getStatus()));
        if (locked) {
            return Result.failure("工艺流程已锁定，无法解绑");
        }
        spBomFlowService.remove(qw);
        return Result.success(null);
    }
```

`update-remark` 改为(用 UpdateWrapper 仅改 remark;新增 import `com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper`):
```java
    @PostMapping("/update-remark")
    @ResponseBody
    public Result updateRemark(@RequestBody Map<String, String> params) {
        String id = params.get("id");
        String remark = params.get("remark");
        if (id == null || id.trim().isEmpty()) {
            return Result.failure("id 不能为空");
        }
        SpBomFlow bf = spBomFlowService.getById(id);
        if (bf == null) {
            return Result.failure("绑定不存在");
        }
        if ("locked".equals(bf.getStatus())) {
            return Result.failure("工艺流程已锁定");
        }
        SpProductBom node = spProductBomService.getById(bf.getBomId());
        if (node != null && "locked".equals(node.getStatus())) {
            return Result.failure("BOM 已锁定，无法修改");
        }
        spBomFlowService.update(new UpdateWrapper<SpBomFlow>().eq("id", id).set("remark", remark));
        return Result.success(null);
    }
```

- [ ] **Step 4:DDL 唯一约束(SQL 文件)**

`MySQL-init-all.sql` sp_bom_flow 段第 54 行 `KEY idx_bom_id (bom_id),` 改为 `UNIQUE KEY uk_bom_flow_bom (bom_id),`(保留 idx_flow_id)。

- [ ] **Step 5:DB migration(幂等)+ 编译**

```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "ALTER TABLE sp_bom_flow ADD UNIQUE KEY uk_bom_flow_bom (bom_id);" 2>&1 | grep -v "Duplicate key name" || true
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -DskipTests compile
```
预期:`BUILD SUCCESS`;ALTER 成功(若已存在则忽略 Duplicate key name)。
> dev 库已确认 sp_bom_flow 无重复 bom_id(4 行),可直接 ALTER。

- [ ] **Step 6:提交**
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/src/main/java/com/wangziyang/mes/technology/controller/SpBomFlowController.java mes/src/main/java/com/wangziyang/mes/technology/service/ISpBomFlowService.java mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpBomFlowServiceImpl.java scripts/sql/MySQL-init-all.sql
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "🐛 fix(technology): BOM-Flow绑定后端修复(bind校验+原子事务+唯一约束+锁一致+解绑/改备注真实返回)" --no-verify
```

---

## Task 2:后端 E — SpProcessContentController + MinioUtil 修复 + 唯一约束

**Files:**
- Modify: `$REPO/mes/src/main/java/com/wangziyang/mes/technology/controller/SpProcessContentController.java`
- Modify: `$REPO/mes/src/main/java/com/wangziyang/mes/common/util/MinioUtil.java`
- Modify DDL: `$REPO/scripts/sql/MySQL-init-all.sql`(sp_process_content 段,行 303)
- DB migration

修复:E-1(save 完成锁)、E-2(get 恒带空数组)、E-3(子表 contentId/锁校验)、E-4(删除真实返回+清对象)、E-5(上传 key 化+读时重签)、E-6(内容唯一+复用)、E-7(complete 真实返回)、M-1(启动容错)。

- [ ] **Step 1:MinioUtil 启动容错**

`ensureBucket()` 的 catch 块由 `throw new RuntimeException(...)` 改为仅日志(不阻断启动):
```java
        } catch (Exception e) {
            // MinIO 不可用时不应阻断整个应用启动;首次上传会再次失败并被 controller 捕获
            System.err.println("[MinioUtil] 初始化 bucket 失败(MinIO 可能未启动): " + e.getMessage());
        }
```
> `presignedGetUrl(String)` 已是 public,无需新增方法。

- [ ] **Step 2:SpProcessContentController 增加私有辅助方法**

在类中追加(import 已含 `java.util.*`):
```java
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
```

- [ ] **Step 3:重写 getByBomId(恒带空数组 + 重签)**
```java
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
```

- [ ] **Step 4:重写 save(唯一+复用+完成锁)**
```java
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
```

- [ ] **Step 5:重写 complete / equipment*/document* / upload***
```java
    @PostMapping("/complete/{id}")
    @ResponseBody
    public Result complete(@PathVariable String id) {
        SpProcessContent c = contentService.getById(id);
        if (c == null) return Result.failure("工艺文件不存在");
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
```
> `listByProduct` 把第 56 行 `getOne(qw)` 改 `getOne(qw, false)`(防重复 500)。`bom-items`/`products` 不变。

- [ ] **Step 6:DDL 唯一约束**

`MySQL-init-all.sql` sp_process_content 段第 303 行 `PRIMARY KEY (\`id\`)` 改为:
```
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_process_content_bom` (`bom_id`)
```

- [ ] **Step 7:DB migration + 编译**
```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "ALTER TABLE sp_process_content ADD UNIQUE KEY uk_process_content_bom (bom_id);" 2>&1 | grep -v "Duplicate key name" || true
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -DskipTests compile
```
预期:`BUILD SUCCESS`。dev 库 sp_process_content 已确认无重复 bom_id(2 行)。

- [ ] **Step 8:提交**
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/src/main/java/com/wangziyang/mes/technology/controller/SpProcessContentController.java mes/src/main/java/com/wangziyang/mes/common/util/MinioUtil.java scripts/sql/MySQL-init-all.sql
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "🐛 fix(technology): 工艺文件后端修复(完成锁+子表校验+删除清对象+上传key化读时重签+内容唯一+MinIO启动容错)" --no-verify
```

---

## Task 3:前端类型 + API 模块 + 扁平树工具(含单测)

**Files:**
- Modify: `$REPO/mes/frontend/apps/mes-new/src/types/technology.ts`
- Create: `$REPO/mes/frontend/apps/mes-new/src/api/technology/bom-flow.ts`
- Create: `$REPO/mes/frontend/apps/mes-new/src/api/technology/process-content.ts`
- Modify: `$REPO/mes/frontend/apps/mes-new/src/utils/productBom.ts`
- Test: `$REPO/mes/frontend/apps/mes-new/src/utils/__tests__/productBom.test.ts`(追加)

- [ ] **Step 1:types/technology.ts 追加类型**(追加到文件末尾)
```ts
// ===== BOM-Flow 绑定(周期 2f, D) =====

/** 工艺路线-工序关系(sp_flow_oper_relation,前端只用部分字段) */
export interface SpFlowOperRelation {
  id: string
  flowId?: string
  operId?: string
  oper?: string
  sortNum?: number
  /** firstOper / lastOper */
  operType?: string
}

/** /bom-flow/opers/{flowId} 与 list 内 opers 项 */
export interface FlowOperItem {
  relation: SpFlowOperRelation
  oper?: SpOper | null
}

/** BOM-Flow 绑定行(sp_bom_flow) */
export interface SpBomFlow {
  id: string
  bomId: string
  flowId: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
}

/** /bom-flow/list/{rootId} 的扁平节点项(未绑定节点仅 bomNode) */
export interface BomFlowNodeVO {
  bomNode: SpProductBom
  bomFlow?: SpBomFlow | null
  flow?: SpFlow | null
  opers?: FlowOperItem[]
}

// ===== 工艺文件(周期 2f, E) =====

/** 工艺文件内容(sp_process_content);图片字段为逗号连接的对象 key 列表 */
export interface SpProcessContent {
  id?: string
  bomId: string
  flowId?: string
  mainInfo?: string
  content?: string
  contentImages?: string
  requirements?: string
  /** '0' | '1' 字符串(切勿发 boolean) */
  inspectionRequired?: string
  inspectionImages?: string
  notes?: string
  status?: 'draft' | 'completed'
}

/** 工装设备(sp_process_equipment) */
export interface SpProcessEquipment {
  id?: string
  contentId: string
  name: string
  quantity?: number
  remark?: string
}

/** 技术文档(sp_process_document);filePath 存对象 key,fileUrl 为后端读时重签的可访问 url */
export interface SpProcessDocument {
  id?: string
  contentId: string
  name: string
  filePath: string
  fileUrl?: string
}

/** /process-content/get/{bomId} 返回 */
export interface ProcessContentDetailVO {
  content: SpProcessContent | null
  equipment: SpProcessEquipment[]
  documents: SpProcessDocument[]
  /** 与 content.contentImages 的非空 key 顺序对齐的展示 url */
  contentImageUrls: string[]
  inspectionImageUrls: string[]
}

/** /process-content/list/{rootId} 节点项 */
export interface ProcessContentNodeVO {
  bomNode: SpProductBom
  content: SpProcessContent | null
}
```

- [ ] **Step 2:utils/productBom.ts 追加扁平→树工具**

追加(文件已有 `materielToItem`/`pickRootSubtree`):
```ts
import type { SpProductBom } from '@/types/technology'  // 若文件已 import 则复用

/** 任意「带 bomNode 的扁平项」附加 children 后的树节点 */
export type BomNodeTree<T> = T & { children: BomNodeTree<T>[] }

/**
 * 把后端返回的扁平 {bomNode,...} 数组按 parentId 重建为树,兄弟按 sortOrder 升序。
 * 用于 D(BomFlowNodeVO)与 E(ProcessContentNodeVO)的左侧 TreeDataTable。
 */
export function buildBomNodeTree<T extends { bomNode: SpProductBom }>(items: T[]): BomNodeTree<T>[] {
  const byId = new Map<string, BomNodeTree<T>>()
  for (const it of items) byId.set(it.bomNode.id, { ...it, children: [] })
  const roots: BomNodeTree<T>[] = []
  for (const it of items) {
    const node = byId.get(it.bomNode.id)!
    const pid = it.bomNode.parentId
    if (pid && byId.has(pid)) byId.get(pid)!.children.push(node)
    else roots.push(node)
  }
  const sortRec = (arr: BomNodeTree<T>[]) => {
    arr.sort((a, b) => (a.bomNode.sortOrder ?? 0) - (b.bomNode.sortOrder ?? 0))
    arr.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}
```
> 若 `SpProductBom` 已在文件顶部 import,不要重复 import;按文件实际情况合并。

- [ ] **Step 3:为 buildBomNodeTree 写单测**

在 `utils/__tests__/productBom.test.ts` 追加:
```ts
import { buildBomNodeTree } from '../productBom'

describe('buildBomNodeTree', () => {
  const mk = (id: string, parentId: string | undefined, sortOrder = 0) =>
    ({ bomNode: { id, parentId, nodeName: id, sortOrder } })

  it('rebuilds tree by parentId and sorts siblings by sortOrder', () => {
    const flat = [mk('c', 'a', 2), mk('a', undefined, 0), mk('b', 'a', 1)]
    const tree = buildBomNodeTree(flat as any)
    expect(tree).toHaveLength(1)
    expect(tree[0].bomNode.id).toBe('a')
    expect(tree[0].children.map((n) => n.bomNode.id)).toEqual(['b', 'c'])
  })

  it('treats nodes with missing/unknown parent as roots', () => {
    const flat = [mk('x', 'ghost'), mk('y', undefined)]
    const tree = buildBomNodeTree(flat as any)
    expect(tree.map((n) => n.bomNode.id).sort()).toEqual(['x', 'y'])
  })

  it('returns [] for empty input', () => {
    expect(buildBomNodeTree([])).toEqual([])
  })
})
```

- [ ] **Step 4:创建 api/technology/bom-flow.ts**
```ts
import { http } from '@/http/client'
import type { SpProductBom, SpFlow, BomFlowNodeVO, FlowOperItem } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 产品根(parent_id IS NULL) */
export function bomFlowProducts() {
  return http.get<SpProductBom[]>('/technology/bom-flow/products')
}

/** 某产品根下全部节点(扁平,含 bomFlow/flow/opers) */
export function bomFlowList(rootId: string) {
  return http.get<BomFlowNodeVO[]>(`/technology/bom-flow/list/${encodeURIComponent(rootId)}`)
}

/** 全部工艺路线(下拉) */
export function bomFlowFlows() {
  return http.get<SpFlow[]>('/technology/bom-flow/flows')
}

/** 某工艺路线的工序链预览 */
export function bomFlowOpers(flowId: string) {
  return http.get<FlowOperItem[]>(`/technology/bom-flow/opers/${encodeURIComponent(flowId)}`)
}

/** 绑定/换绑(JSON)→ 新绑定 id */
export function bomFlowBind(body: { bomId: string; flowId: string; remark?: string }) {
  return http.post<string>('/technology/bom-flow/bind', body, JSON_HEADERS)
}

/** 解绑(JSON {bomId}) */
export function bomFlowUnbind(bomId: string) {
  return http.post<null>('/technology/bom-flow/unbind', { bomId }, JSON_HEADERS)
}

/** 改备注(JSON {id,remark};id 为绑定行 id) */
export function bomFlowUpdateRemark(id: string, remark: string) {
  return http.post<null>('/technology/bom-flow/update-remark', { id, remark }, JSON_HEADERS)
}

/** 锁定整产品工艺(需 BOM 根已锁定) */
export function bomFlowLock(rootId: string) {
  return http.post<null>(`/technology/bom-flow/lock/${encodeURIComponent(rootId)}`, {}, JSON_HEADERS)
}
```

- [ ] **Step 5:创建 api/technology/process-content.ts**
```ts
import { http } from '@/http/client'
import type {
  SpProductBom, SpProductBomItem,
  ProcessContentNodeVO, ProcessContentDetailVO,
  SpProcessContent, SpProcessEquipment, SpProcessDocument,
} from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

/** 上传端点(供 MultiImageUpload / ProcessDocumentUpload 直接走 FormData) */
export const PROCESS_UPLOAD_IMAGE_URL = '/technology/process-content/upload-image'
export const PROCESS_UPLOAD_DOCUMENT_URL = '/technology/process-content/upload-document'

export function processContentProducts() {
  return http.get<SpProductBom[]>('/technology/process-content/products')
}
export function processContentList(rootId: string) {
  return http.get<ProcessContentNodeVO[]>(`/technology/process-content/list/${encodeURIComponent(rootId)}`)
}
export function processContentGet(bomId: string) {
  return http.get<ProcessContentDetailVO>(`/technology/process-content/get/${encodeURIComponent(bomId)}`)
}
export function processContentBomItems(bomId: string) {
  return http.get<SpProductBomItem[]>(`/technology/process-content/bom-items/${encodeURIComponent(bomId)}`)
}
export function processContentSave(body: Partial<SpProcessContent>) {
  return http.post<string>('/technology/process-content/save', body, JSON_HEADERS)
}
export function processContentComplete(id: string) {
  return http.post<null>(`/technology/process-content/complete/${encodeURIComponent(id)}`, {}, JSON_HEADERS)
}
export function processEquipmentSave(body: Partial<SpProcessEquipment>) {
  return http.post<string>('/technology/process-content/equipment/save', body, JSON_HEADERS)
}
export function processEquipmentDelete(id: string) {
  return http.post<null>('/technology/process-content/equipment/delete', { id }, JSON_HEADERS)
}
export function processDocumentSave(body: Partial<SpProcessDocument>) {
  return http.post<string>('/technology/process-content/document/save', body, JSON_HEADERS)
}
export function processDocumentDelete(id: string) {
  return http.post<null>('/technology/process-content/document/delete', { id }, JSON_HEADERS)
}
```

- [ ] **Step 6:验证 + 提交**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new exec vitest run src/utils/__tests__/productBom.test.ts
```
预期:tsc 无输出(通过);vitest 全绿(含新增 3 例)。
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/types/technology.ts mes/frontend/apps/mes-new/src/api/technology/bom-flow.ts mes/frontend/apps/mes-new/src/api/technology/process-content.ts mes/frontend/apps/mes-new/src/utils/productBom.ts mes/frontend/apps/mes-new/src/utils/__tests__/productBom.test.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): 工艺线收尾类型+API(bom-flow/process-content)+扁平树工具(含单测)" --no-verify
```

---

## Task 4:MultiImageUpload 多图上传组件(含单测)

**Files:**
- Create: `$REPO/mes/frontend/apps/mes-new/src/components/MultiImageUpload.tsx`
- Test: `$REPO/mes/frontend/apps/mes-new/src/components/__tests__/multiImage.test.ts`

**说明:** 维护「对象 key 列表 + 展示 url 列表」两个等长数组。新增上传走 `http.post(uploadUrl, FormData)` 得 `{key,url}` 后同时 append;删除按 index 同时移除;`onChange(keys, urls)` 回传父组件。父组件保存 content 时用 `keys.join(',')`。参考 `ImageUpload.tsx` 的 FormData 上传逻辑。

- [ ] **Step 1:写纯函数(便于单测)+ 组件**
```tsx
import { useRef, useState } from 'react'
import { firstValueFrom } from 'rxjs'
import { toast, cn } from '@workspace/ui'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { http } from '@/http/client'
import { PROCESS_UPLOAD_IMAGE_URL } from '@/api/technology/process-content'

/** 逗号连接的 key 串 ↔ key 数组(过滤空串,避免 ''.split(',') 产生 ['']) */
export function parseKeys(csv: string | undefined | null): string[] {
  return (csv ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}
export function joinKeys(keys: string[]): string {
  return keys.filter(Boolean).join(',')
}

interface MultiImageUploadProps {
  /** 对象 key 列表 */
  keys: string[]
  /** 与 keys 等长的展示 url 列表 */
  urls: string[]
  onChange: (keys: string[], urls: string[]) => void
  uploadUrl?: string
  disabled?: boolean
  max?: number
}

export default function MultiImageUpload({
  keys, urls, onChange, uploadUrl = PROCESS_UPLOAD_IMAGE_URL, disabled, max = 8,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('仅支持图片文件'); return }
    if (file.size / 1024 / 1024 >= 2) { toast.error('图片大小不能超过 2MB'); return }
    if (keys.length >= max) { toast.error(`最多 ${max} 张`); return }
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const data = await firstValueFrom(http.post<{ key: string; url: string }>(uploadUrl, fd))
      if (data?.key) {
        onChange([...keys, data.key], [...urls, data.url ?? ''])
        toast.success('上传成功')
      }
    } catch { /* 拦截器已 toast */ } finally { setUploading(false) }
  }

  const removeAt = (i: number) => {
    onChange(keys.filter((_, idx) => idx !== i), urls.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {keys.map((k, i) => (
        <div key={k + i} className="relative size-20 overflow-hidden rounded-md border border-border">
          <img src={urls[i]} alt="预览" className="size-full object-cover" />
          {!disabled && (
            <button type="button" onClick={() => removeAt(i)}
              className="absolute right-0 top-0 inline-flex size-5 items-center justify-center rounded-bl bg-black/50 text-white hover:bg-black/70"
              aria-label="移除图片">
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      {!disabled && keys.length < max && (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className={cn('flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50')}>
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <span className="text-xs">{uploading ? '上传中' : '添加图片'}</span>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2:parseKeys/joinKeys 单测**
```ts
import { parseKeys, joinKeys } from '../MultiImageUpload'

describe('MultiImageUpload key helpers', () => {
  it('parseKeys filters empties (no [""])', () => {
    expect(parseKeys('')).toEqual([])
    expect(parseKeys(undefined)).toEqual([])
    expect(parseKeys('a, b ,,c')).toEqual(['a', 'b', 'c'])
  })
  it('joinKeys drops falsy and joins by comma', () => {
    expect(joinKeys(['a', '', 'b'])).toBe('a,b')
    expect(joinKeys([])).toBe('')
  })
})
```

- [ ] **Step 3:验证 + 提交**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new exec vitest run src/components/__tests__/multiImage.test.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/components/MultiImageUpload.tsx mes/frontend/apps/mes-new/src/components/__tests__/multiImage.test.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): MultiImageUpload 多图上传组件(key/url 等长 + 解析序列化单测)" --no-verify
```

---

## Task 5:页面 D — 工艺路线绑定(BomFlowList + FlowBindForm)+ 路由

**Files:**
- Create: `$REPO/mes/frontend/apps/mes-new/src/pages/technology/bom-flow/BomFlowList.tsx`
- Create: `$REPO/mes/frontend/apps/mes-new/src/pages/technology/bom-flow/FlowBindForm.tsx`
- Modify: `$REPO/mes/frontend/apps/mes-new/src/router.tsx`
- Modify: `$REPO/mes/frontend/apps/mes-new/src/layouts/routeMeta.ts`

**参考:** 镜像 `pages/technology/product-bom/ProductBomList.tsx` 的"浏览态→主从编辑态"结构与 `BomNodeForm.tsx` 的 FormDialog+RHF 范式。**DOM clobbering 铁律:RHF 字段名禁用 nodeName/name 等 DOM 属性名。**

- [ ] **Step 1:FlowBindForm.tsx(绑定/换绑弹窗:Select flow + remark)**

要求:`FormDialog` + RHF + zod。字段 `flowId`(必填,Select 来自 `bomFlowFlows()`)、`remark`(可选 Textarea)。提交调用 `bomFlowBind({bomId, flowId, remark})`。props:`{ open, onOpenChange, bomId, initial?: {flowId?, remark?}, onSaved }`。成功后 `toast.success('已绑定工艺路线')`、`onSaved()`、关闭。zod schema 用 `bindFlowId`(避开潜在冲突)再映射回 `flowId` 提交。
```tsx
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, toast } from '@workspace/ui'
import { GitBranch } from 'lucide-react'
import { useEffect } from 'react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { bomFlowFlows, bomFlowBind } from '@/api/technology/bom-flow'

const schema = z.object({
  bindFlowId: z.string().min(1, '请选择工艺路线'),
  remark: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  bomId: string
  initial?: { flowId?: string; remark?: string }
  onSaved: () => void
}

export default function FlowBindForm({ open, onOpenChange, bomId, initial, onSaved }: Props) {
  const { data: flows } = useQuery$(['bomFlow', 'flows'], () => bomFlowFlows(), { enabled: open })
  const { mutate, loading } = useMutation$((b: { bomId: string; flowId: string; remark?: string }) => bomFlowBind(b))
  const { control, handleSubmit, reset, register, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bindFlowId: '', remark: '' },
  })
  useEffect(() => {
    if (open) reset({ bindFlowId: initial?.flowId ?? '', remark: initial?.remark ?? '' })
  }, [open, initial, reset])

  const onSubmit = handleSubmit(async (v) => {
    try {
      await mutate({ bomId, flowId: v.bindFlowId, remark: v.remark ?? '' })
      toast.success('已绑定工艺路线')
      onSaved()
      onOpenChange(false)
    } catch { /* toast by interceptor */ }
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="绑定工艺路线"
      description="为该 BOM 节点选择一条工艺路线" icon={GitBranch} onSubmit={onSubmit} submitting={loading}>
      <FormSection title="工艺路线" tag="必填">
        <FormField label="工艺路线" required error={errors.bindFlowId?.message}>
          <Controller control={control} name="bindFlowId" render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="请选择工艺路线" /></SelectTrigger>
              <SelectContent>
                {(flows ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.flow} {f.flowDesc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField label="备注" htmlFor="bind-remark">
          <Textarea id="bind-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2:BomFlowList.tsx(主从绑定页)**

结构要求(镜像 ProductBomList):
1. **浏览态:** `PageContainer` 标题"工艺路线绑定";产品根 `Select`(来自 `bomFlowProducts()`)+「进入绑定」按钮 → 设置 `editingRootId` 进入绑定态。
2. **绑定态:** 顶部「← 返回」+ 当前产品名 + 状态;`MasterDetailLayout`:
   - **master:** `TreeDataTable`,数据 = `buildBomNodeTree(bomFlowList(rootId) 结果)`;列:节点名(可点 `<button type="button">` 设 `selectedBomId`)、层级(0 产品/1 半成品/≥2 组件)、已绑工艺(`flow?.flow` Badge 或灰"未绑定")、状态(draft/locked Badge);`getRowId=(r)=>r.bomNode.id`、`getSubRows=(r)=>r.children`。
   - **detail:** 选中节点项 `selected = flat.find(...)`:
     - 节点信息只读(nodeName/level/productCode)。
     - 已绑工艺卡片:有 `selected.flow` 显示 flow 编码+描述+`selected.bomFlow.remark`;无则空态。
     - 工序预览:`selected.opers`(或调用 `bomFlowOpers(flowId)`)只读 `DataTable`,列:序号(sortNum)、工序(`oper?.operDesc`/`relation.oper`)、首/末标记(operType firstOper→"首" lastOper→"末");`oper` 为 null 时显示 relation.oper 兜底。
     - 操作按钮(`canWrite = rootStatus !== 'locked' && selected.bomFlow?.status !== 'locked'`):[绑定/换绑](打开 FlowBindForm)、[解绑](AlertDialog 确认→`bomFlowUnbind(bomId)`)。
   - 顶部工具条:[锁定工艺] 按钮,`disabled = rootStatus !== 'locked'`,禁用时旁注"请先在产品BOM中锁定结构";点按 AlertDialog 确认→`bomFlowLock(rootId)`。
3. **数据/失效:** `useQuery$(['bomFlow','list',rootId], () => bomFlowList(rootId), {enabled: !!rootId})`;写操作成功后 `invalidate('["bomFlow","list"')` 刷新。`rootStatus` 取自 `flat.find(x=>x.bomNode.id===rootId)?.bomNode.status` 或 list 中根节点。
4. **空值保护:** `flow`/`opers`/`bomFlow` 均可能缺失或 null,全部可选链 + 兜底。

> 完整组件较长,镜像 ProductBomList 的状态管理(useState editingRootId/selectedId、StatusBadge、enterEdit/back)。务必:`PermissionGuard`(若有合适 perm 串可包,否则略)、所有可点节点用 `<button type="button">`、删除/锁定用 `AlertDialog`。

- [ ] **Step 3:注册路由 + 标签**

`router.tsx`:在 `import ProductBomList ...` 后加 `import BomFlowList from '@/pages/technology/bom-flow/BomFlowList'`;在 `{ path: 'technology/product-bom', ... }` 后加 `{ path: 'technology/bom-flow', element: <BomFlowList /> },`。

`layouts/routeMeta.ts`:在 `'/technology/product-bom'` 行后加 `'/technology/bom-flow': { title: '工艺路线绑定', icon: 'branches' },`。

- [ ] **Step 4:验证 + 提交**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm lint
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/technology/bom-flow mes/frontend/apps/mes-new/src/router.tsx mes/frontend/apps/mes-new/src/layouts/routeMeta.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): 工艺路线绑定页(产品根→BOM树→绑定/换绑/解绑/工序预览/锁定)" --no-verify
```
预期:tsc 无输出;lint 不新增 error(基线 0 error / 9 warning)。

---

## Task 6:页面 E — 工艺文件编制(ProcessContentList + 子表单)+ 路由

**Files:**
- Create: `$REPO/mes/frontend/apps/mes-new/src/pages/technology/process-content/ProcessContentList.tsx`
- Create: `$REPO/mes/frontend/apps/mes-new/src/pages/technology/process-content/EquipmentForm.tsx`
- Create: `$REPO/mes/frontend/apps/mes-new/src/pages/technology/process-content/ProcessDocumentUpload.tsx`
- Modify: `$REPO/mes/frontend/apps/mes-new/src/router.tsx`
- Modify: `$REPO/mes/frontend/apps/mes-new/src/layouts/routeMeta.ts`

- [ ] **Step 1:EquipmentForm.tsx(工装设备增改弹窗)**

`FormDialog` + RHF + zod。字段 `equipName`(必填,映射后端 `name`,避开 DOM `name`)、`quantity`(number,默认 1)、`remark`。props:`{open,onOpenChange,contentId,initial?:SpProcessEquipment,onSaved}`。提交 `processEquipmentSave({id:initial?.id, contentId, name:v.equipName, quantity:v.quantity, remark:v.remark})`。成功 toast + onSaved + 关闭。

- [ ] **Step 2:ProcessDocumentUpload.tsx(PDF 上传按钮)**

参考 ImageUpload 的 FormData 逻辑,但 `accept=".pdf,application/pdf"`,上传到 `PROCESS_UPLOAD_DOCUMENT_URL` 得 `{key,url,name}`,然后 `processDocumentSave({contentId, name, filePath:key})`,成功后 `onSaved()`。props:`{contentId, disabled?, onSaved}`。校验非 PDF 前端先 toast 拦截。
```tsx
import { useRef, useState } from 'react'
import { firstValueFrom } from 'rxjs'
import { Button, toast } from '@workspace/ui'
import { Loader2, Upload } from 'lucide-react'
import { http } from '@/http/client'
import { PROCESS_UPLOAD_DOCUMENT_URL, processDocumentSave } from '@/api/technology/process-content'

export default function ProcessDocumentUpload({
  contentId, disabled, onSaved,
}: { contentId: string; disabled?: boolean; onSaved: () => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) { toast.error('只支持 PDF 格式'); return }
    if (file.size / 1024 / 1024 >= 20) { toast.error('文件不能超过 20MB'); return }
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const data = await firstValueFrom(http.post<{ key: string; url: string; name: string }>(PROCESS_UPLOAD_DOCUMENT_URL, fd))
      if (data?.key) {
        await firstValueFrom(processDocumentSave({ contentId, name: data.name ?? file.name, filePath: data.key }))
        toast.success('已上传文档')
        onSaved()
      }
    } catch { /* 拦截器已 toast */ } finally { setUploading(false) }
  }
  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onPick} />
      <Button type="button" variant="outline" size="sm" disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        上传 PDF
      </Button>
    </>
  )
}
```

- [ ] **Step 3:ProcessContentList.tsx(主从编制页)**

结构要求:
1. **浏览态:** `PageContainer` 标题"工艺文件编制";产品根 `Select`(`processContentProducts()`)+「进入编制」→ `editingRootId`。
2. **编制态:** `MasterDetailLayout`:
   - **master:** `TreeDataTable`,数据 = `buildBomNodeTree(processContentList(rootId))`;列:节点名(`<button>` 设 `selectedBomId`)、层级、编制状态(content?.status==='completed' → 绿色 Badge"已完成"+✓,否则灰"草稿"/"未编制")。
   - **detail:** 选中节点的编辑器(`useQuery$(['processContent','detail',bomId], () => processContentGet(bomId), {enabled:!!bomId})`):
     - 顶部:状态 Badge + [保存主信息](`processContentSave`)+ [完成编制](`processContentComplete(contentId)`,AlertDialog 确认,需先有 contentId)。
     - `isCompleted = detail.content?.status === 'completed'`;`isCompleted` 时全部只读(隐藏上传/删除/保存,禁用输入)。
     - **Tabs**(`@workspace/ui` Tabs):
       - 主信息:`mainInfo`*、`content`*(Textarea)、工序图片 `MultiImageUpload`(keys=parseKeys(content.contentImages),urls=detail.contentImageUrls)。
       - 工序要求:`requirements`(Textarea)。
       - 检验:`inspectionRequired`(Switch,boolean↔'1'/'0')、检验图片 `MultiImageUpload`(inspectionImages / inspectionImageUrls)。
       - 注意事项:`notes`(Textarea)。
       - 工装设备:`DataTable`(detail.equipment;列 name/quantity/remark/操作)+ [新增设备](EquipmentForm)/ 行内删除(AlertDialog→`processEquipmentDelete`);需 contentId。
       - 技术文档:`DataTable`(detail.documents;列 name/操作:打开 fileUrl 新窗预览 + 删除)+ `ProcessDocumentUpload`;需 contentId。
       - 物料清单:只读 `DataTable`(`processContentBomItems(bomId)`;列 materialCode/materialDesc/quantity/unit)。
   - **contentId 引导:** `contentId = detail.content?.id`。无 contentId 时,设备/文档/图片 Tab 显示"请先在『主信息』填写并保存"。保存主信息:`processContentSave({ id: content?.id, bomId, mainInfo, content, requirements, inspectionRequired, inspectionImages, contentImages, notes })`(**不传 status**),成功后 `invalidate('["processContent"')`。
   - **图片状态:** 用 `useState` 维护 `contentImageKeys/Urls`、`inspectionImageKeys/Urls`,在 `detail` 加载到位时(useEffect)从 `parseKeys(content.*Images)` + `detail.*ImageUrls` 初始化;`MultiImageUpload.onChange` 更新 state;保存主信息时 `contentImages: joinKeys(contentImageKeys)`。
   - 表单主体(mainInfo/content/requirements/inspectionRequired/notes)用 RHF;**字段名避开 DOM 冲突**(如 `content` 字段建议改 `procContent`/用 Controller,`name` 永不直用)。inspectionRequired 用 Controller + Switch,提交映射 `checked ? '1' : '0'`。
3. **失效:** 任何写操作后 `invalidate('["processContent"')`(覆盖 list 与 detail)。

> 完整组件较长。镜像 ProductBomList 的 master-detail 骨架 + 本周期 BomItemForm/EquipmentForm 的弹窗范式。完成编制后(isCompleted)严格只读。

- [ ] **Step 4:注册路由 + 标签**

`router.tsx`:加 `import ProcessContentList from '@/pages/technology/process-content/ProcessContentList'`;在 bom-flow 路由后加 `{ path: 'technology/process-content', element: <ProcessContentList /> },`。

`routeMeta.ts`:加 `'/technology/process-content': { title: '工艺文件编制', icon: 'file-text' },`(若 iconMap 无 file-text 则用 'profile'/'snippets' 等既有图标,按 utils/iconMap 实际可用项选)。

- [ ] **Step 5:验证 + 提交**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm lint
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/technology/process-content mes/frontend/apps/mes-new/src/router.tsx mes/frontend/apps/mes-new/src/layouts/routeMeta.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit -m "✨ feat(mes-new): 工艺文件编制页(主从+Tabs:主信息/要求/检验/设备/文档/物料 + 多图&PDF上传 + 完成只读)" --no-verify
```

---

## Task 7:全量硬验证 + 运行时冒烟 + 路线图记忆

- [ ] **Step 1:静态全绿**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm lint && pnpm --filter mes-new exec vitest run && pnpm build
```
预期:tsc 无输出;lint 0 error(≤9 warning);vitest 全绿;build 成功。

- [ ] **Step 2:后端编译**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -DskipTests compile
```
预期:`BUILD SUCCESS`。

- [ ] **Step 3:运行时冒烟(需后端 :9090 + 前端 :4100 + MinIO :9000 已起)**

走通并在回复中贴关键结果:
- D:进入 `/technology/bom-flow` → 选产品根 → 给节点绑定/换绑/解绑工艺路线 → 工序预览正确 → 锁定工艺(BOM 已锁定前提)。
- E:进入 `/technology/process-content` → 选产品根 → 选节点 → 填主信息保存(创建 content) → 工序/检验多图上传 → 工装设备增删 → PDF 上传/删除 → 物料清单只读 → 完成编制 → 只读校验。
- DB 核对:`SELECT bom_id,flow_id,status FROM sp_bom_flow;`、`SELECT id,bom_id,status,content_images FROM sp_process_content;`(content_images 应为 key 列表非长 URL)、`SELECT name,file_path FROM sp_process_document;`(file_path 应为 key)。
- MinIO 核对:`process/` 下有新对象;`get/{bomId}` 返回的 `contentImageUrls`/`documents[].fileUrl` 可访问(curl 200)。

- [ ] **Step 4:更新路线图记忆**

更新 `~/.claude/projects/-Users-chengyiyang-Desktop-Projects-class-work-MES-FullStack/memory/mes-rebuild-roadmap.md`:已完成列表追加"产品 BOM(2e)、工艺路线绑定 + 工艺文件编制/上传(2f,工艺技术线收尾)";剩余模块移除工艺线项;记录"MinIO 上传已落地(存 key + 读时重签)"与"docker-compose 复现化 MinIO 为后续基础设施项"。

- [ ] **Step 5:最终代码审查 + 提醒提交**

派 final reviewer 通读本周期全部改动;贴所有验证输出;提醒用户用 `/commit` 收尾(若仍有未提交)。
