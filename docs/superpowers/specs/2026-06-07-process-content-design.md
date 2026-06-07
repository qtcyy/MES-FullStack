# 工艺内容编制 — 设计文档

**日期**: 2026-06-07 | **状态**: 已确认

## 1. 概述

工艺流程锁定后，为每个 BOM 组件节点编制工艺内容（SOP），包含主信息、辅助信息和物料核对。

## 2. 数据库

### sp_process_content
```sql
CREATE TABLE sp_process_content (
  id varchar(32) PRIMARY KEY,
  bom_id varchar(32) NOT NULL,
  flow_id varchar(32),
  main_info varchar(500),
  content text,
  content_images varchar(2000),
  requirements text,
  inspection_required char(1) DEFAULT '0',
  inspection_images varchar(2000),
  notes text,
  status varchar(20) DEFAULT 'draft',
  create_time datetime, create_username varchar(50),
  update_time datetime, update_username varchar(50)
);
```

### sp_process_equipment
id, content_id, name, quantity, remark + audit fields

### sp_process_document
id, content_id, name, file_path + audit fields

## 3. 后端

- Entity × 3, Mapper × 3, Service × 3, Controller × 1
- API: CRUD + image upload + file upload + list by product

## 4. 前端

- `ProcessContentPage.tsx`: Steps wizard (主信息→要求→辅助→物料→完成)
- 路由 `/technology/process-content`, 菜单
