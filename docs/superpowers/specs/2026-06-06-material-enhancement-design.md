# Material Management Enhancement Design

**Date:** 2026-06-06 | **Status:** Approved | **Branch:** `rebuild/frontend`

## Overview

Enhance existing `sp_materile` table and materile CRUD to support: auto-generated material codes with type prefixes, material source, lead time, safety stock, and image upload.

## Changes

### 1. Database — ALTER TABLE

```sql
ALTER TABLE sp_materile
  ADD COLUMN source varchar(8) DEFAULT NULL COMMENT '物料来源: 自制/外购',
  ADD COLUMN lead_time int DEFAULT 1 COMMENT '需求提前期(天), min 1',
  ADD COLUMN safety_stock int DEFAULT 0 COMMENT '安全库存',
  ADD COLUMN image_url varchar(512) DEFAULT NULL COMMENT '物料图片路径';
```

### 2. Auto-generated Material Code

| Type | matType | Prefix |
|------|---------|--------|
| 产品 | 产品 | PROD- |
| 零件 | 零件 | PART- |
| 标准件 | 标准件 | STD- |
| 其他 | 其他 | OTHR- |

When adding new material with empty `materiel`, backend generates code: `{PREFIX}{NNN}` (e.g., PROD-001, PART-005).

### 3. matType Options

Replace existing options (原材料,半成品,成品,辅料) with: 产品, 零件, 标准件, 其他.

### 4. New Form Fields

| Field | Type | Default/Rule |
|-------|------|-------------|
| materiel | Display-only (auto) | Auto-generated from type prefix |
| source | Select: 自制/外购 | 产品→自制, 其他→外购 |
| lead_time | InputNumber | min=1, default=1 |
| safety_stock | InputNumber | min=0, default=0 |
| image_url | Upload + preview | jpg/png, max 2MB |

### 5. Image Upload

- Endpoint: `POST /basedata/materile/upload-image`
- Storage: `static/upload/materile/` (served as static resource)
- Returns: `{ url: "/upload/materile/filename.jpg" }`

### 6. Files Modified

| Layer | File | Change |
|-------|------|--------|
| Backend | `SpMaterile.java` | +4 fields (source, leadTime, safetyStock, imageUrl) |
| Backend | `SpMaterileController.java` | +upload endpoint, +code auto-gen in addOrUpdate |
| Frontend | `types/common.ts` | +4 fields on Materiel type |
| Frontend | `MaterileForm.tsx` | +4 inputs, +matType options, +code auto-gen display |
| Frontend | `MaterileList.tsx` | +source column, +image thumbnail column |

### 7. matType → Default Value Mapping

When user selects type, auto-set defaults:
- 产品 → source=自制, lead_time=3
- 零件 → source=外购, lead_time=1
- 标准件 → source=外购, lead_time=1
- 其他 → source=外购, lead_time=1
