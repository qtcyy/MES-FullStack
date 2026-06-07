# 产品 BOM 管理 实现计划

> **For agentic workers:** 使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务逐步实现。步骤使用 checkbox (`- [ ]`) 语法追踪。

**Goal:** 新增独立的"产品BOM管理"模块，支持树形层级 BOM 编制、物料清单管理、BOM 锁定定版和版本更新。

**Architecture:** 后端新增两张表（sp_product_bom + sp_product_bom_item），Spring Boot Controller 使用 @RequestBody JSON 接口。前端 React 页面包含列表/树形切换视图和左右分栏 BOM 编制界面。

**Tech Stack:** Java 8 + Spring Boot 2.1.7 + MyBatis-Plus 3.1.2 / React 18 + TypeScript + Ant Design 5 + TanStack Query

---

### Task 1: 创建数据库表

**Files:**
- Create: SQL 脚本（通过命令行执行）

- [ ] **Step 1: 执行 DDL 创建 sp_product_bom 表**

```bash
mysql -h 192.168.52.76 -u root -proot sparchetype -e "
CREATE TABLE IF NOT EXISTS \`sp_product_bom\` (
  \`id\` varchar(32) NOT NULL,
  \`bom_code\` varchar(50) DEFAULT NULL COMMENT 'BOM编码',
  \`product_code\` varchar(50) DEFAULT NULL COMMENT '产品物料编码',
  \`node_name\` varchar(100) DEFAULT NULL COMMENT '节点名称',
  \`parent_id\` varchar(32) DEFAULT NULL COMMENT '父节点ID',
  \`level\` int DEFAULT 0 COMMENT '层级 0=产品 1=半成品 2=组件',
  \`version\` varchar(20) DEFAULT 'V1.0' COMMENT '版本号',
  \`status\` varchar(20) DEFAULT 'draft' COMMENT 'draft=草稿 locked=已锁定',
  \`remark\` varchar(500) DEFAULT NULL COMMENT '备注',
  \`sort_order\` int DEFAULT 0 COMMENT '排序',
  \`locked_at\` datetime DEFAULT NULL COMMENT '锁定时间',
  \`locked_by\` varchar(50) DEFAULT NULL COMMENT '锁定人',
  \`create_time\` datetime DEFAULT NULL,
  \`create_username\` varchar(50) DEFAULT NULL,
  \`update_time\` datetime DEFAULT NULL,
  \`update_username\` varchar(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_parent_id\` (\`parent_id\`),
  KEY \`idx_product_code\` (\`product_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"
```

- [ ] **Step 2: 执行 DDL 创建 sp_product_bom_item 表**

```bash
mysql -h 192.168.52.76 -u root -proot sparchetype -e "
CREATE TABLE IF NOT EXISTS \`sp_product_bom_item\` (
  \`id\` varchar(32) NOT NULL,
  \`bom_id\` varchar(32) NOT NULL COMMENT '所属BOM节点ID',
  \`item_type\` varchar(20) DEFAULT 'material' COMMENT 'material=物料 bom_ref=BOM节点引用',
  \`material_code\` varchar(50) DEFAULT NULL COMMENT '物料编码',
  \`material_desc\` varchar(200) DEFAULT NULL COMMENT '物料描述',
  \`quantity\` decimal(10,2) DEFAULT 1.00 COMMENT '用量',
  \`unit\` varchar(20) DEFAULT '个' COMMENT '单位',
  \`sort_order\` int DEFAULT 0 COMMENT '排序',
  \`create_time\` datetime DEFAULT NULL,
  \`create_username\` varchar(50) DEFAULT NULL,
  \`update_time\` datetime DEFAULT NULL,
  \`update_username\` varchar(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_bom_id\` (\`bom_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"
```

- [ ] **Step 3: 验证表创建成功**

```bash
mysql -h 192.168.52.76 -u root -proot sparchetype -e "SHOW CREATE TABLE sp_product_bom\G" 2>&1 | head -5
mysql -h 192.168.52.76 -u root -proot sparchetype -e "SHOW CREATE TABLE sp_product_bom_item\G" 2>&1 | head -5
```

---

### Task 2: 创建后端实体类

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/technology/entity/SpProductBom.java`
- Create: `mes/src/main/java/com/wangziyang/mes/technology/entity/SpProductBomItem.java`

- [ ] **Step 1: 创建 SpProductBom.java**

```java
package com.wangziyang.mes.technology.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;
import java.time.LocalDateTime;

@TableName(value = "sp_product_bom")
public class SpProductBom extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String bomCode;
    private String productCode;
    private String nodeName;
    private String parentId;
    private Integer level;
    private String version;
    private String status;
    private String remark;
    private Integer sortOrder;
    private LocalDateTime lockedAt;
    private String lockedBy;

    public String getBomCode() { return bomCode; }
    public void setBomCode(String bomCode) { this.bomCode = bomCode; }
    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }
    public String getNodeName() { return nodeName; }
    public void setNodeName(String nodeName) { this.nodeName = nodeName; }
    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }
    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }
    public String getLockedBy() { return lockedBy; }
    public void setLockedBy(String lockedBy) { this.lockedBy = lockedBy; }

    @Override
    public String toString() {
        return "SpProductBom{" +
                "bomCode=" + bomCode +
                ", productCode=" + productCode +
                ", nodeName=" + nodeName +
                ", parentId=" + parentId +
                ", level=" + level +
                ", version=" + version +
                ", status=" + status +
                "}";
    }
}
```

- [ ] **Step 2: 创建 SpProductBomItem.java**

```java
package com.wangziyang.mes.technology.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;
import java.math.BigDecimal;

@TableName(value = "sp_product_bom_item")
public class SpProductBomItem extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String bomId;
    private String itemType;
    private String materialCode;
    private String materialDesc;
    private BigDecimal quantity;
    private String unit;
    private Integer sortOrder;

    public String getBomId() { return bomId; }
    public void setBomId(String bomId) { this.bomId = bomId; }
    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }
    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getMaterialDesc() { return materialDesc; }
    public void setMaterialDesc(String materialDesc) { this.materialDesc = materialDesc; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    @Override
    public String toString() {
        return "SpProductBomItem{" +
                "bomId=" + bomId +
                ", materialCode=" + materialCode +
                ", quantity=" + quantity +
                "}";
    }
}
```

---

### Task 3: 创建后端 Mapper + Service + Request

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/technology/mapper/SpProductBomMapper.java`
- Create: `mes/src/main/java/com/wangziyang/mes/technology/mapper/SpProductBomItemMapper.java`
- Create: `mes/src/main/java/com/wangziyang/mes/technology/service/ISpProductBomService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpProductBomServiceImpl.java`
- Create: `mes/src/main/java/com/wangziyang/mes/technology/service/ISpProductBomItemService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpProductBomItemServiceImpl.java`
- Create: `mes/src/main/java/com/wangziyang/mes/technology/request/SpProductBomPageReq.java`

- [ ] **Step 1: 创建 SpProductBomMapper.java**

```java
package com.wangziyang.mes.technology.mapper;

import com.wangziyang.mes.technology.entity.SpProductBom;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

public interface SpProductBomMapper extends BaseMapper<SpProductBom> {
}
```

- [ ] **Step 2: 创建 SpProductBomItemMapper.java**

```java
package com.wangziyang.mes.technology.mapper;

import com.wangziyang.mes.technology.entity.SpProductBomItem;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

public interface SpProductBomItemMapper extends BaseMapper<SpProductBomItem> {
}
```

- [ ] **Step 3: 创建 ISpProductBomService.java**

```java
package com.wangziyang.mes.technology.service;

import com.wangziyang.mes.technology.entity.SpProductBom;
import com.baomidou.mybatisplus.extension.service.IService;
import java.util.List;

public interface ISpProductBomService extends IService<SpProductBom> {
    void lockBom(String rootId, String username);
    SpProductBom createNewVersion(String rootId);
    List<SpProductBom> getTreeByRootId(String rootId);
    String generateBomCode();
    void cascadeDelete(String nodeId);
}
```

- [ ] **Step 4: 创建 ISpProductBomItemService.java**

```java
package com.wangziyang.mes.technology.service;

import com.wangziyang.mes.technology.entity.SpProductBomItem;
import com.baomidou.mybatisplus.extension.service.IService;

public interface ISpProductBomItemService extends IService<SpProductBomItem> {
}
```

- [ ] **Step 5: 创建 SpProductBomServiceImpl.java**

```java
package com.wangziyang.mes.technology.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.entity.SpProductBomItem;
import com.wangziyang.mes.technology.mapper.SpProductBomMapper;
import com.wangziyang.mes.technology.service.ISpProductBomItemService;
import com.wangziyang.mes.technology.service.ISpProductBomService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SpProductBomServiceImpl extends ServiceImpl<SpProductBomMapper, SpProductBom> implements ISpProductBomService {

    @Autowired
    private ISpProductBomItemService spProductBomItemService;

    @Override
    @Transactional
    public void lockBom(String rootId, String username) {
        // Find root node
        SpProductBom root = getById(rootId);
        if (root == null || "locked".equals(root.getStatus())) {
            throw new RuntimeException("BOM not found or already locked");
        }
        // Collect all nodes in tree
        List<SpProductBom> allNodes = collectAllNodes(rootId);
        LocalDateTime now = LocalDateTime.now();
        for (SpProductBom node : allNodes) {
            node.setStatus("locked");
            node.setLockedAt(now);
            node.setLockedBy(username);
            updateById(node);
        }
    }

    @Override
    @Transactional
    public SpProductBom createNewVersion(String rootId) {
        SpProductBom oldRoot = getById(rootId);
        if (oldRoot == null || !"locked".equals(oldRoot.getStatus())) {
            throw new RuntimeException("Only locked BOM can create new version");
        }
        // Generate new version number
        String oldVer = oldRoot.getVersion();
        String newVer = "V" + (Integer.parseInt(oldVer.replace("V", "").replace(".0", "")) + 1) + ".0";

        // Deep copy root
        String newRootId = UUID.randomUUID().toString().replace("-", "");
        SpProductBom newRoot = copyBomNode(oldRoot, null, newRootId, newVer);
        newRoot.setBomCode(generateBomCode());
        newRoot.setStatus("draft");
        save(newRoot);

        // Deep copy children recursively
        copyChildren(oldRoot.getId(), newRootId, newVer);

        return newRoot;
    }

    private void copyChildren(String oldParentId, String newParentId, String newVer) {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.eq("parent_id", oldParentId).orderByAsc("sort_order");
        List<SpProductBom> children = list(qw);

        for (SpProductBom child : children) {
            String newChildId = UUID.randomUUID().toString().replace("-", "");
            SpProductBom newChild = copyBomNode(child, newParentId, newChildId, newVer);
            newChild.setBomCode(generateBomCode());
            save(newChild);

            // Copy BOM items
            QueryWrapper<SpProductBomItem> itemQw = new QueryWrapper<>();
            itemQw.eq("bom_id", child.getId());
            List<SpProductBomItem> items = spProductBomItemService.list(itemQw);
            for (SpProductBomItem item : items) {
                SpProductBomItem newItem = new SpProductBomItem();
                newItem.setId(UUID.randomUUID().toString().replace("-", ""));
                newItem.setBomId(newChildId);
                newItem.setItemType(item.getItemType());
                newItem.setMaterialCode(item.getMaterialCode());
                newItem.setMaterialDesc(item.getMaterialDesc());
                newItem.setQuantity(item.getQuantity());
                newItem.setUnit(item.getUnit());
                newItem.setSortOrder(item.getSortOrder());
                spProductBomItemService.save(newItem);
            }

            // Recurse
            copyChildren(child.getId(), newChildId, newVer);
        }
    }

    private SpProductBom copyBomNode(SpProductBom src, String newParentId, String newId, String newVer) {
        SpProductBom node = new SpProductBom();
        node.setId(newId);
        node.setProductCode(src.getProductCode());
        node.setNodeName(src.getNodeName());
        node.setParentId(newParentId);
        node.setLevel(src.getLevel());
        node.setVersion(newVer);
        node.setStatus("draft");
        node.setRemark(src.getRemark());
        node.setSortOrder(src.getSortOrder());
        return node;
    }

    @Override
    public List<SpProductBom> getTreeByRootId(String rootId) {
        List<SpProductBom> result = new ArrayList<>();
        SpProductBom root = getById(rootId);
        if (root != null) {
            result.add(root);
            collectChildren(rootId, result);
        }
        return result;
    }

    private List<SpProductBom> collectAllNodes(String nodeId) {
        List<SpProductBom> result = new ArrayList<>();
        SpProductBom node = getById(nodeId);
        if (node != null) {
            result.add(node);
            collectChildren(nodeId, result);
        }
        return result;
    }

    private void collectChildren(String parentId, List<SpProductBom> result) {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.eq("parent_id", parentId).orderByAsc("sort_order");
        List<SpProductBom> children = list(qw);
        for (SpProductBom child : children) {
            result.add(child);
            collectChildren(child.getId(), result);
        }
    }

    @Override
    public String generateBomCode() {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.likeRight("bom_code", "PBOM-").orderByDesc("bom_code").last("LIMIT 1");
        SpProductBom last = getOne(qw);
        int next = 1;
        if (last != null && last.getBomCode() != null) {
            String numStr = last.getBomCode().replace("PBOM-", "");
            try { next = Integer.parseInt(numStr) + 1; } catch (NumberFormatException e) { /* keep 1 */ }
        }
        return "PBOM-" + String.format("%03d", next);
    }

    @Override
    @Transactional
    public void cascadeDelete(String nodeId) {
        // Delete items
        QueryWrapper<SpProductBomItem> itemQw = new QueryWrapper<>();
        itemQw.eq("bom_id", nodeId);
        spProductBomItemService.remove(itemQw);

        // Recursively delete children
        QueryWrapper<SpProductBom> childQw = new QueryWrapper<>();
        childQw.eq("parent_id", nodeId);
        List<SpProductBom> children = list(childQw);
        for (SpProductBom child : children) {
            cascadeDelete(child.getId());
        }

        // Delete self
        removeById(nodeId);
    }
}
```

- [ ] **Step 6: 创建 SpProductBomItemServiceImpl.java**

```java
package com.wangziyang.mes.technology.service.impl;

import com.wangziyang.mes.technology.entity.SpProductBomItem;
import com.wangziyang.mes.technology.mapper.SpProductBomItemMapper;
import com.wangziyang.mes.technology.service.ISpProductBomItemService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

@Service
public class SpProductBomItemServiceImpl extends ServiceImpl<SpProductBomItemMapper, SpProductBomItem> implements ISpProductBomItemService {
}
```

- [ ] **Step 7: 创建 SpProductBomPageReq.java**

```java
package com.wangziyang.mes.technology.request;

import com.wangziyang.mes.common.BasePageReq;

public class SpProductBomPageReq extends BasePageReq {
    private String productCodeLike;
    private String nodeNameLike;

    public String getProductCodeLike() { return productCodeLike; }
    public void setProductCodeLike(String productCodeLike) { this.productCodeLike = productCodeLike; }
    public String getNodeNameLike() { return nodeNameLike; }
    public void setNodeNameLike(String nodeNameLike) { this.nodeNameLike = nodeNameLike; }
}
```

---

### Task 4: 创建后端 Controller

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/technology/controller/SpProductBomController.java`

- [ ] **Step 1: 创建 SpProductBomController.java**

```java
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
import org.apache.shiro.SecurityUtils;
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

    @PostMapping("/page")
    @ResponseBody
    public Result page(SpProductBomPageReq req) {
        QueryWrapper<SpProductBom> qw = new QueryWrapper<>();
        qw.isNull("parent_id"); // Only root nodes for list view
        if (StringUtils.isNotEmpty(req.getProductCodeLike())) {
            qw.like("product_code", req.getProductCodeLike());
        }
        if (StringUtils.isNotEmpty(req.getNodeNameLike())) {
            qw.like("node_name", req.getNodeNameLike());
        }
        qw.orderByDesc("create_time");
        IPage<SpProductBom> result = spProductBomService.page(req, qw);
        // Attach child count
        for (SpProductBom record : result.getRecords()) {
            QueryWrapper<SpProductBom> childQw = new QueryWrapper<>();
            childQw.eq("parent_id", record.getId());
            record.setNodeName(record.getNodeName()); // already set
        }
        return Result.success(result);
    }

    @GetMapping("/tree")
    @ResponseBody
    public Result tree() {
        // Return all root nodes with children for tree view
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
        // count children
        map.put("childCount", children.size());
        // count items
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
        // New root node: validate product material type
        if (StringUtils.isEmpty(record.getParentId())) {
            // Root node - must be a product
            if (StringUtils.isNotEmpty(record.getProductCode())) {
                QueryWrapper<SpMaterile> mq = new QueryWrapper<>();
                mq.eq("materiel", record.getProductCode());
                SpMaterile mat = iSpMaterileService.getOne(mq);
                if (mat == null || !"产品".equals(mat.getMatType())) {
                    return Result.failure("BOM 根节点必须对应产品物料（物料类型为"产品"）");
                }
            }
        }

        if (StringUtils.isEmpty(record.getId())) {
            // New node
            record.setId(UUID.randomUUID().toString().replace("-", ""));
            if (StringUtils.isEmpty(record.getParentId())) {
                // Root node
                record.setLevel(0);
                record.setBomCode(spProductBomService.generateBomCode());
                if (StringUtils.isEmpty(record.getVersion())) {
                    record.setVersion("V1.0");
                }
            } else {
                // Child node
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
        String username = (String) SecurityUtils.getSubject().getPrincipal();
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
        // Validate parent BOM not locked
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
        qw.eq("mat_type", "产品").ne("is_deleted", "1");
        return Result.success(iSpMaterileService.list(qw));
    }
}
```

---

### Task 5: 插入演示数据和菜单

**Files:**
- SQL 通过命令行执行

- [ ] **Step 1: 确保演示物料存在（如不存在则 INSERT）**

```bash
mysql -h 192.168.52.76 -u root -proot sparchetype -e "
INSERT INTO sp_materile (id, materiel, materiel_desc, mat_type, unit, is_deleted, create_time)
VALUES
(UUID(), 'PROD-001', '台式电脑主机', '产品', '台', '0', NOW()),
(UUID(), 'PART-001', 'CPU i7-13700K', '零件', '个', '0', NOW()),
(UUID(), 'PART-002', 'DDR5 32GB 内存', '零件', '条', '0', NOW()),
(UUID(), 'PART-003', 'SSD 1TB NVMe', '零件', '个', '0', NOW()),
(UUID(), 'PART-004', '主板 Z790', '零件', '个', '0', NOW()),
(UUID(), 'PART-005', 'CPU散热器', '零件', '个', '0', NOW()),
(UUID(), 'PART-006', '机箱外壳 ATX', '零件', '个', '0', NOW()),
(UUID(), 'PART-007', '电源 750W 金牌', '零件', '个', '0', NOW()),
(UUID(), 'PART-008', '散热风扇 120mm', '零件', '个', '0', NOW())
ON DUPLICATE KEY UPDATE materiel_desc=VALUES(materiel_desc);
"
```

- [ ] **Step 2: 插入演示 BOM 数据**

```bash
mysql -h 192.168.52.76 -u root -proot sparchetype -e "
INSERT INTO sp_product_bom (id, bom_code, product_code, node_name, parent_id, level, version, status, remark, sort_order, create_time)
VALUES
('bom-root-001', 'PBOM-001', 'PROD-001', '台式电脑主机', NULL, 0, 'V1.0', 'draft', '台式电脑主机产品BOM，首批量产版本', 0, NOW()),
('bom-sub-001', 'PBOM-002', 'PROD-001', '台式电脑半成品', 'bom-root-001', 1, 'V1.0', 'draft', '台式电脑主机半成品组装单元，包含主板和机箱两个子组件', 0, NOW()),
('bom-comp-001', 'PBOM-003', 'PROD-001', '主板单元', 'bom-sub-001', 2, 'V1.0', 'draft', '包含CPU、内存、SSD、主板等核心计算部件', 0, NOW()),
('bom-comp-002', 'PBOM-004', 'PROD-001', '机箱单元', 'bom-sub-001', 2, 'V1.0', 'draft', '包含机箱、电源、散热风扇等外部设备', 1, NOW())
ON DUPLICATE KEY UPDATE node_name=VALUES(node_name);
"
```

- [ ] **Step 3: 插入演示 BOM 行项目数据**

```bash
mysql -h 192.168.52.76 -u root -proot sparchetype -e "
INSERT INTO sp_product_bom_item (id, bom_id, item_type, material_code, material_desc, quantity, unit, sort_order, create_time)
VALUES
('item-001', 'bom-comp-001', 'material', 'PART-001', 'CPU i7-13700K', 1, '个', 0, NOW()),
('item-002', 'bom-comp-001', 'material', 'PART-002', 'DDR5 32GB 内存', 2, '条', 1, NOW()),
('item-003', 'bom-comp-001', 'material', 'PART-003', 'SSD 1TB NVMe', 1, '个', 2, NOW()),
('item-004', 'bom-comp-001', 'material', 'PART-004', '主板 Z790', 1, '个', 3, NOW()),
('item-005', 'bom-comp-001', 'material', 'PART-005', 'CPU散热器', 1, '个', 4, NOW()),
('item-006', 'bom-comp-002', 'material', 'PART-006', '机箱外壳 ATX', 1, '个', 0, NOW()),
('item-007', 'bom-comp-002', 'material', 'PART-007', '电源 750W 金牌', 1, '个', 1, NOW()),
('item-008', 'bom-comp-002', 'material', 'PART-008', '散热风扇 120mm', 3, '个', 2, NOW())
ON DUPLICATE KEY UPDATE material_desc=VALUES(material_desc);
"
```

- [ ] **Step 4: 插入菜单和权限**

```bash
mysql -h 192.168.52.76 -u root -proot sparchetype -e "
-- Insert parent menu for 产品BOM管理 under 工艺管理
INSERT INTO sys_menu (id, title, name, parent_id, type, permission, icon, sort, create_time)
VALUES ('112', '产品BOM管理', '/technology/product-bom', '5', '1', 'product-bom:list', 'fa fa-cubes', 8, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Insert button permissions
INSERT INTO sys_menu (id, title, name, parent_id, type, permission, sort, create_time)
VALUES
('1121', '新增BOM', '', '112', '2', 'product-bom:add', 1, NOW()),
('1122', '编辑BOM', '', '112', '2', 'product-bom:edit', 2, NOW()),
('1123', '删除BOM', '', '112', '2', 'product-bom:delete', 3, NOW()),
('1124', '锁定BOM', '', '112', '2', 'product-bom:lock', 4, NOW())
ON DUPLICATE KEY UPDATE permission=VALUES(permission);
"
```

---

### Task 6: 添加前端 TypeScript 类型和 API

**Files:**
- Modify: `mes/frontend/src/types/common.ts`
- Create: `mes/frontend/src/api/technology/product-bom.ts`

- [ ] **Step 1: 在 common.ts 中添加 ProductBom 和 ProductBomItem 类型**

在 `mes/frontend/src/types/common.ts` 的 Bom 接口之后添加：

```typescript
// Product BOM types
export interface ProductBom {
  id: string
  bomCode: string
  productCode: string
  nodeName: string
  parentId?: string
  level: number
  version: string
  status: string // 'draft' | 'locked'
  remark?: string
  sortOrder?: number
  childCount?: number
  itemCount?: number
  children?: ProductBom[]
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface ProductBomItem {
  id?: string
  bomId: string
  itemType?: string // 'material' | 'bom_ref'
  materialCode: string
  materialDesc: string
  quantity: number
  unit: string
  sortOrder?: number
}
```

- [ ] **Step 2: 创建 product-bom.ts API**

```typescript
import client from '../client'
import type { PageResult, PageParams } from '@/types/api'
import type { ProductBom, ProductBomItem } from '@/types/common'

export function page(params: PageParams & { productCodeLike?: string; nodeNameLike?: string }) {
  return client.post('/technology/product-bom/page', params) as Promise<PageResult<ProductBom>>
}

export function tree() {
  return client.get('/technology/product-bom/tree') as Promise<ProductBom[]>
}

export function getTree(id: string) {
  return client.get(`/technology/product-bom/tree/${id}`) as Promise<ProductBom[]>
}

export function addOrUpdate(record: Record<string, unknown>) {
  return client.post('/technology/product-bom/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function deleteBom(id: string) {
  return client.post('/technology/product-bom/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function lockBom(id: string) {
  return client.post('/technology/product-bom/lock', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function newVersion(id: string) {
  return client.post('/technology/product-bom/new-version', { id }, {
    headers: { 'Content-Type': 'application/json' },
  }) as Promise<string>
}

export function getItems(bomId: string) {
  return client.get(`/technology/product-bom/items/${bomId}`) as Promise<ProductBomItem[]>
}

export function addOrUpdateItem(record: Record<string, unknown>) {
  return client.post('/technology/product-bom/item/add-or-update', record, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function deleteItem(id: string) {
  return client.post('/technology/product-bom/item/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getProducts() {
  return client.get('/technology/product-bom/products') as Promise<{ id: string; materiel: string; materielDesc: string }[]>
}
```

---

### Task 7: 创建 ProductBomList 页面（列表/树形切换）

**Files:**
- Create: `mes/frontend/src/pages/technology/ProductBomList.tsx`

- [ ] **Step 1: 创建 ProductBomList.tsx**

```tsx
import { useState } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message, Space, Radio, Tree, Modal, Select } from 'antd'
import { PlusOutlined, UnorderedListOutlined, ApartmentOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as productBomApi from '@/api/technology/product-bom'
import type { ProductBom } from '@/types/common'
import type { DataNode } from 'antd/es/tree'

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  locked: { text: '已锁定', color: 'green' },
}

export default function ProductBomList() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [products, setProducts] = useState<{ id: string; materiel: string; materielDesc: string }[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['product-boms', pagination, filters],
    queryFn: () =>
      productBomApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
    enabled: viewMode === 'list',
  })

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ['product-bom-tree'],
    queryFn: () => productBomApi.tree(),
    enabled: viewMode === 'tree',
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productBomApi.addOrUpdate(values),
    onSuccess: (newId: string) => {
      message.success('BOM 根节点创建成功')
      setAddModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['product-boms'] })
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree'] })
      navigate(`/technology/product-bom/${newId}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productBomApi.deleteBom(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['product-boms'] })
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree'] })
    },
  })

  const lockMutation = useMutation({
    mutationFn: (id: string) => productBomApi.lockBom(id),
    onSuccess: () => {
      message.success('BOM 已锁定')
      queryClient.invalidateQueries({ queryKey: ['product-boms'] })
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree'] })
    },
  })

  const newVersionMutation = useMutation({
    mutationFn: (id: string) => productBomApi.newVersion(id),
    onSuccess: (newId: string) => {
      message.success('新版本创建成功')
      queryClient.invalidateQueries({ queryKey: ['product-boms'] })
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree'] })
      navigate(`/technology/product-bom/${newId}`)
    },
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }

  const handleReset = () => {
    setFilters({})
    reset()
  }

  const handleAdd = async () => {
    try {
      const prods = await productBomApi.getProducts()
      setProducts(ensureArray(prods))
    } catch {
      setProducts([])
    }
    setSelectedProduct(null)
    setAddModalOpen(true)
  }

  const handleAddConfirm = () => {
    if (!selectedProduct) {
      message.warning('请选择产品物料')
      return
    }
    const prod = products.find(p => p.materiel === selectedProduct)
    saveMutation.mutate({
      productCode: selectedProduct,
      nodeName: prod?.materielDesc || selectedProduct,
      remark: '',
    })
  }

  const handleEdit = (record: ProductBom) => {
    navigate(`/technology/product-bom/${record.id}`)
  }

  const handleDelete = (record: ProductBom) => {
    deleteMutation.mutate(record.id)
  }

  const handleLock = (record: ProductBom) => {
    lockMutation.mutate(record.id)
  }

  const handleNewVersion = (record: ProductBom) => {
    newVersionMutation.mutate(record.id)
  }

  const columns = [
    {
      title: 'BOM编码',
      dataIndex: 'bomCode',
      key: 'bomCode',
      render: (val: string, record: ProductBom) => (
        <a onClick={() => handleEdit(record)}>{val}</a>
      ),
    },
    {
      title: '产品物料编码',
      dataIndex: 'productCode',
      key: 'productCode',
    },
    {
      title: '节点名称',
      dataIndex: 'nodeName',
      key: 'nodeName',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        const s = statusMap[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ProductBom) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            {record.status === 'locked' ? '查看' : '编辑'}
          </Button>
          {record.status === 'draft' && (
            <>
              <Popconfirm
                title="确认锁定BOM结构？锁定后不可编辑。"
                onConfirm={() => handleLock(record)}
              >
                <Button type="link" size="small">
                  锁定
                </Button>
              </Popconfirm>
              <Popconfirm title="确定要删除该BOM吗？" onConfirm={() => handleDelete(record)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'locked' && (
            <Popconfirm
              title={`将在 ${record.version} 基础上创建新版本？`}
              onConfirm={() => handleNewVersion(record)}
            >
              <Button type="link" size="small">
                新版本
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // Build tree data from API response
  const buildTreeNodes = (nodes: ProductBom[]): DataNode[] => {
    return nodes.map((node: ProductBom) => ({
      key: node.id,
      title: (
        <span>
          {node.level === 0 ? '🏭 ' : node.level === 1 ? '🔧 ' : '📦 '}
          <strong>{node.nodeName}</strong>
          <Tag color={node.status === 'locked' ? 'green' : 'default'} style={{ marginLeft: 8 }}>
            {node.status === 'locked' ? '已锁定' : '草稿'}
          </Tag>
          <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{node.version}</span>
          <span style={{ float: 'right' }}>
            {node.level === 0 && (
              <>
                <a
                  onClick={(e) => { e.stopPropagation(); handleEdit(node) }}
                  style={{ marginRight: 8, fontSize: 12 }}
                >
                  {node.status === 'locked' ? '查看' : '编辑'}
                </a>
                {node.status === 'draft' ? (
                  <Popconfirm
                    title="确认锁定BOM结构？锁定后不可编辑。"
                    onConfirm={() => handleLock(node)}
                    onPopupClick={(e) => e.stopPropagation()}
                  >
                    <a onClick={(e) => e.stopPropagation()} style={{ fontSize: 12 }}>锁定</a>
                  </Popconfirm>
                ) : (
                  <Popconfirm
                    title={`将在 ${node.version} 基础上创建新版本？`}
                    onConfirm={() => handleNewVersion(node)}
                    onPopupClick={(e) => e.stopPropagation()}
                  >
                    <a onClick={(e) => e.stopPropagation()} style={{ fontSize: 12 }}>新版本</a>
                  </Popconfirm>
                )}
              </>
            )}
          </span>
        </span>
      ),
      children: node.children ? buildTreeNodes(node.children) : undefined,
    }))
  }

  return (
    <PageContainer>
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="productCodeLike">
          <Input placeholder="产品编码" />
        </Form.Item>
        <Form.Item name="nodeNameLike">
          <Input placeholder="节点名称" />
        </Form.Item>
      </SearchForm>

      <PageTable
        rowKey="id"
        columns={columns}
        dataSource={viewMode === 'list' ? ensureArray(data?.records) : []}
        loading={viewMode === 'list' ? isLoading : treeLoading}
        total={viewMode === 'list' ? (data?.total || 0) : 0}
        pagination={
          viewMode === 'list'
            ? { current: pagination.current, pageSize: pagination.pageSize }
            : false
        }
        onChange={onChange}
        toolbar={
          <Space>
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="list">
                <UnorderedListOutlined /> 列表
              </Radio.Button>
              <Radio.Button value="tree">
                <ApartmentOutlined /> 树形
              </Radio.Button>
            </Radio.Group>
            <PermissionGuard perm="product-bom:add">
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增
              </Button>
            </PermissionGuard>
          </Space>
        }
      >
        {viewMode === 'tree' && (
          <div style={{ padding: 16 }}>
            <Tree
              showLine={{ showLeafIcon: false }}
              defaultExpandAll
              treeData={buildTreeNodes(ensureArray(treeData) as ProductBom[])}
            />
          </div>
        )}
      </PageTable>

      <Modal
        title="新增产品 BOM"
        open={addModalOpen}
        onOk={handleAddConfirm}
        onCancel={() => setAddModalOpen(false)}
        confirmLoading={saveMutation.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="选择产品物料（仅显示产品类型）" required>
            <Select
              showSearch
              placeholder="请选择产品物料"
              value={selectedProduct}
              onChange={setSelectedProduct}
              optionFilterProp="label"
              options={products.map(p => ({
                label: `${p.materiel} - ${p.materielDesc}`,
                value: p.materiel,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
```

---

### Task 8: 创建 ProductBomEditor 页面（BOM 编制界面）

**Files:**
- Create: `mes/frontend/src/pages/technology/ProductBomEditor.tsx`

- [ ] **Step 1: 创建 ProductBomEditor.tsx**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Breadcrumb, Button, Form, Input, InputNumber, Select, Popconfirm, message, Space, Table, Modal, Tree, Tag, Spin, Row, Col } from 'antd'
import { PlusOutlined, LockOutlined, CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import * as productBomApi from '@/api/technology/product-bom'
import type { ProductBom, ProductBomItem } from '@/types/common'
import type { DataNode } from 'antd/es/tree'

export default function ProductBomEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [itemForm] = Form.useForm()
  const [selectedNode, setSelectedNode] = useState<ProductBom | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [addChildModalOpen, setAddChildModalOpen] = useState(false)
  const [childForm] = Form.useForm()

  const { data: nodes, isLoading } = useQuery({
    queryKey: ['product-bom-tree', id],
    queryFn: () => productBomApi.getTree(id!),
    enabled: !!id,
  })

  const { data: items, refetch: refetchItems } = useQuery({
    queryKey: ['product-bom-items', selectedNode?.id],
    queryFn: () => productBomApi.getItems(selectedNode!.id),
    enabled: !!selectedNode?.id,
  })

  const allNodes = ensureArray(nodes) as ProductBom[]
  const rootNode = allNodes.find(n => !n.parentId)
  const isLocked = rootNode?.status === 'locked'
  const isRootLocked = isLocked

  useEffect(() => {
    if (allNodes.length > 0 && !selectedNode) {
      setSelectedNode(allNodes[0])
      setExpandedKeys(allNodes.map(n => n.id))
    }
  }, [nodes])

  useEffect(() => {
    if (selectedNode) {
      form.setFieldsValue(selectedNode)
    }
  }, [selectedNode, form])

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productBomApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('保存成功')
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree', id] })
    },
  })

  const addChildMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productBomApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('子节点添加成功')
      setAddChildModalOpen(false)
      childForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (nodeId: string) => productBomApi.deleteBom(nodeId),
    onSuccess: () => {
      message.success('节点已删除')
      setSelectedNode(rootNode || null)
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree', id] })
    },
  })

  const lockMutation = useMutation({
    mutationFn: () => productBomApi.lockBom(rootNode!.id),
    onSuccess: () => {
      message.success('BOM 已锁定，所有节点变为只读')
      queryClient.invalidateQueries({ queryKey: ['product-bom-tree', id] })
    },
  })

  const newVersionMutation = useMutation({
    mutationFn: () => productBomApi.newVersion(rootNode!.id),
    onSuccess: (newId: string) => {
      message.success('新版本创建成功')
      navigate(`/technology/product-bom/${newId}`)
    },
  })

  const saveItemMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productBomApi.addOrUpdateItem(values),
    onSuccess: () => {
      message.success('物料保存成功')
      itemForm.resetFields()
      refetchItems()
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => productBomApi.deleteItem(itemId),
    onSuccess: () => {
      message.success('物料已删除')
      refetchItems()
    },
  })

  const handleNodeSelect = useCallback((selectedKeys: any[]) => {
    if (selectedKeys.length > 0) {
      const node = allNodes.find(n => n.id === selectedKeys[0])
      if (node) setSelectedNode(node)
    }
  }, [allNodes])

  const handleNodeSave = () => {
    const values = form.getFieldsValue()
    saveMutation.mutate({ ...values, id: selectedNode?.id })
  }

  const handleAddChild = () => {
    childForm.resetFields()
    setAddChildModalOpen(true)
  }

  const handleAddChildConfirm = () => {
    childForm.validateFields().then(values => {
      addChildMutation.mutate({
        parentId: selectedNode?.id,
        nodeName: values.nodeName,
        remark: values.remark || '',
      })
    })
  }

  const handleDeleteNode = () => {
    if (selectedNode) {
      deleteMutation.mutate(selectedNode.id)
    }
  }

  const handleAddItem = () => {
    itemForm.validateFields().then(values => {
      saveItemMutation.mutate({
        ...values,
        bomId: selectedNode?.id,
      })
    })
  }

  const handleDeleteItem = (item: ProductBomItem) => {
    if (item.id) deleteItemMutation.mutate(item.id)
  }

  const buildTreeNode = (node: ProductBom): DataNode => ({
    key: node.id,
    title: (
      <span>
        {node.level === 0 ? '🏭 ' : node.level === 1 ? '🔧 ' : '📦 '}
        {node.nodeName}
        <Tag
          color={node.status === 'locked' ? 'green' : 'default'}
          style={{ marginLeft: 8, fontSize: 10 }}
        >
          {node.status === 'locked' ? '已锁定' : '草稿'}
        </Tag>
      </span>
    ),
    children: allNodes
      .filter(n => n.parentId === node.id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(buildTreeNode),
  })

  const treeData: DataNode[] = rootNode ? [buildTreeNode(rootNode)] : []

  const itemColumns = [
    {
      title: '物料编码',
      dataIndex: 'materialCode',
      key: 'materialCode',
      render: (val: string) => <Input
        defaultValue={val}
        style={{ width: 120 }}
        disabled={isLocked}
        onChange={(e) => {
          // Read-only in table, use form for editing
        }}
      />,
    },
    {
      title: '物料描述',
      dataIndex: 'materialDesc',
      key: 'materialDesc',
    },
    {
      title: '用量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: ProductBomItem) =>
        !isLocked && (
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteItem(record)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        ),
    },
  ]

  if (isLoading) {
    return <PageContainer><Spin size="large" style={{ display: 'block', margin: '200px auto' }} /></PageContainer>
  }

  return (
    <PageContainer>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/technology/product-bom')}>产品BOM管理</a> },
          { title: rootNode?.nodeName || 'BOM 编制' },
        ]}
      />

      <Row gutter={16}>
        {/* Left panel: BOM tree */}
        <Col span={8}>
          <div style={{
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            background: '#fafafa',
          }}>
            <Space style={{ marginBottom: 12 }}>
              <Button
                size="small"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/technology/product-bom')}
              >
                返回
              </Button>
              <span style={{ fontWeight: 'bold', fontSize: 14 }}>
                BOM 结构树
              </span>
            </Space>
            <div style={{ marginBottom: 8 }}>
              <Space>
                {!isLocked && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddChild}
                    disabled={!selectedNode}
                  >
                    添加子节点
                  </Button>
                )}
                {rootNode && rootNode.level === 0 && !isLocked && (
                  <Popconfirm
                    title="确认锁定BOM结构？锁定后不可编辑。"
                    onConfirm={() => lockMutation.mutate()}
                  >
                    <Button
                      size="small"
                      icon={<LockOutlined />}
                      loading={lockMutation.isPending}
                    >
                      锁定BOM结构
                    </Button>
                  </Popconfirm>
                )}
                {isLocked && (
                  <Popconfirm
                    title={`将在 ${rootNode?.version} 基础上创建新版本？`}
                    onConfirm={() => newVersionMutation.mutate()}
                  >
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      loading={newVersionMutation.isPending}
                    >
                      创建新版本
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
            <Tree
              showLine={{ showLeafIcon: false }}
              treeData={treeData}
              selectedKeys={selectedNode ? [selectedNode.id] : []}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              onSelect={handleNodeSelect}
            />
          </div>
        </Col>

        {/* Right panel: node details + items */}
        <Col span={16}>
          {selectedNode && (
            <>
              <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                background: '#fafafa',
              }}>
                <h4 style={{ marginBottom: 12 }}>
                  {selectedNode.level === 0 ? '🏭 ' : selectedNode.level === 1 ? '🔧 ' : '📦 '}
                  节点信息
                  {!isLocked && selectedNode.id !== rootNode?.id && (
                    <Popconfirm
                      title="确定删除此节点及其所有子节点？"
                      onConfirm={handleDeleteNode}
                      style={{ float: 'right' }}
                    >
                      <Button size="small" danger>删除节点</Button>
                    </Popconfirm>
                  )}
                </h4>
                <Form form={form} layout="vertical" disabled={isLocked}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="nodeName" label="节点名称">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="bomCode" label="BOM编码">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name="level" label="层级">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name="status" label="状态">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="remark" label="备注">
                    <Input.TextArea rows={2} placeholder="请输入备注信息，说明此节点的制造步骤和用途" />
                  </Form.Item>
                  {!isLocked && (
                    <Button type="primary" onClick={handleNodeSave} loading={saveMutation.isPending}>
                      保存节点信息
                    </Button>
                  )}
                </Form>
              </div>

              {/* BOM Items table */}
              <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 16,
                background: '#fafafa',
              }}>
                <h4 style={{ marginBottom: 12 }}>📦 物料清单</h4>
                <Table
                  rowKey="id"
                  columns={itemColumns}
                  dataSource={ensureArray(items)}
                  pagination={false}
                  size="small"
                />
                {!isLocked && (
                  <div style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 6 }}>
                    <Form form={itemForm} layout="inline">
                      <Form.Item
                        name="materialCode"
                        label="物料编码"
                        rules={[{ required: true, message: '请输入' }]}
                      >
                        <Input placeholder="编码或选择物料" style={{ width: 150 }} />
                      </Form.Item>
                      <Form.Item
                        name="materialDesc"
                        label="物料描述"
                        rules={[{ required: true, message: '请输入' }]}
                      >
                        <Input placeholder="物料描述" style={{ width: 180 }} />
                      </Form.Item>
                      <Form.Item
                        name="quantity"
                        label="用量"
                        rules={[{ required: true, message: '请输入' }]}
                        initialValue={1}
                      >
                        <InputNumber min={0.01} step={0.01} style={{ width: 80 }} />
                      </Form.Item>
                      <Form.Item
                        name="unit"
                        label="单位"
                        rules={[{ required: true, message: '请输入' }]}
                        initialValue="个"
                      >
                        <Select style={{ width: 80 }}>
                          <Select.Option value="个">个</Select.Option>
                          <Select.Option value="条">条</Select.Option>
                          <Select.Option value="台">台</Select.Option>
                          <Select.Option value="套">套</Select.Option>
                          <Select.Option value="kg">kg</Select.Option>
                          <Select.Option value="m">m</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          onClick={handleAddItem}
                          loading={saveItemMutation.isPending}
                        >
                          添加物料
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                )}
              </div>
            </>
          )}
        </Col>
      </Row>
    </PageContainer>
  )
}
```

---

### Task 9: 添加前端路由

**Files:**
- Modify: `mes/frontend/src/App.tsx`

- [ ] **Step 1: 在 App.tsx 中添加导入和路由**

在文件顶部的导入区域添加：
```typescript
import ProductBomList from '@/pages/technology/ProductBomList'
import ProductBomEditor from '@/pages/technology/ProductBomEditor'
```

在 Technology 路由区域（`<Route path="technology/bom"` 之后）添加：
```tsx
<Route path="technology/product-bom" element={<ProductBomList />} />
<Route path="technology/product-bom/:id" element={<ProductBomEditor />} />
```

---

### Task 10: 构建和验证

- [ ] **Step 1: 构建前端**

```bash
npm --prefix mes/frontend run build
```

期望：构建成功，无 TypeScript 错误

- [ ] **Step 2: 验证后端编译**

```bash
mvn -f mes/pom.xml compile -DskipTests -Dskip.npm=true -Dskip.installnodenpm=true
```

期望：BUILD SUCCESS

- [ ] **Step 3: 重启后端验证 API**

重启后端服务后，验证 API：
```bash
# 验证分页查询
curl -s -X POST http://localhost:9090/technology/product-bom/page -d 'current=1&size=10' | python3 -m json.tool

# 验证树查询
curl -s http://localhost:9090/technology/product-bom/tree | python3 -m json.tool
```

- [ ] **Step 4: 验证演示数据**

```bash
mysql -h 192.168.52.76 -u root -proot sparchetype -e "SELECT id, bom_code, node_name, level, status FROM sp_product_bom"
```

期望：4 条记录
