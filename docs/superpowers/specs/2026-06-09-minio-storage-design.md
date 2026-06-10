# MinIO 对象存储集成 — 设计文档

**日期**: 2026-06-09
**状态**: 已确认
**分支**: `feat/minio-storage`

## 概述

将项目中的文件上传与图片服务从本地文件系统（`user.dir/uploads/`）迁移至 MinIO 对象存储。消除 `user.dir` 漂移导致的文件丢失问题，解除图片服务对 Shiro 鉴权的依赖，为容器化部署扫清障碍。

## 决策

| 维度 | 选择 | 说明 |
|------|------|------|
| 部署方式 | Docker `minio/minio` | 本地开发 `localhost:9000` (API) / `localhost:9001` (Console) |
| URL 策略 | Presigned URL | 前端直连 MinIO，不需要后端代理服务 |
| 桶结构 | 单桶 `mes` + 目录前缀 | `materile/`、`process/` |
| Presigned 有效期 | 7 天 | 上传后生成，前端存储完整 presigned URL |
| MinIO SDK | `io.minio:minio` | 官方 Java SDK |
| 前端改动 | 极小 | 继续使用返回的 URL，无需改动 |

## 架构

```
┌──────────────┐   POST upload   ┌──────────────┐   putObject    ┌──────────┐
│   Frontend    │ ──────────────→ │   Spring Boot │ ─────────────→ │  MinIO   │
│  (React)      │                │    Controller  │               │  (Docker) │
│              │  presigned URL  │              │ presignGetObject│          │
│  <Image src=>│ ←────────────── │              │ ←───────────── │          │
│  <iframe>    │                │              │               │          │
└──────────────┘                └──────────────┘               └──────────┘
```

## MinIO 配置

### application-dev.yml

```yaml
minio:
  endpoint: http://localhost:9000
  access-key: minioadmin
  secret-key: minioadmin
  bucket: mes
```

### Docker 启动命令

```bash
docker run -d \
  --name minio-mes \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

## 桶结构

```
mes/
├── materile/
│   ├── {uuid1}.jpg
│   └── {uuid2}.png
└── process/
    ├── {uuid3}.jpg
    ├── {uuid4}.jpg
    ├── {uuid5}.pdf
    └── {uuid6}.docx
```

## 改造清单

### 后端改动

| 文件 | 操作 | 说明 |
|------|------|------|
| `pom.xml` | 修改 | 新增 `io.minio:minio` 依赖 |
| `application-dev.yml` | 修改 | 新增 `minio.*` 配置段 |
| `application-pro.yml` | 修改 | 新增 `minio.*` 配置段（占位） |
| 新增 `MinioConfig.java` | 新增 | MinioClient Bean |
| 新增 `MinioUtil.java` | 新增 | upload / presignGet / ensureBucket |
| `SpMaterileController.java` | 修改 | uploadImage 改用 MinioUtil；删除 getImage |
| `SpProcessContentController.java` | 修改 | uploadImage/uploadDocument 改用 MinioUtil；删除 getImage |
| `ShiroConfig.java` | 修改 | 删除 `/basedata/materile/image/**` 和 `/technology/process-content/image/**` 的 anon 规则 |

### 前端改动

| 文件 | 操作 | 说明 |
|------|------|------|
| `vite.config.ts` | 修改 | 删除 materile/process-content image proxy 规则 |

无需其他前端改动——上传 API 返回的 `url` 字段从相对路径变为 presigned URL，前端 `img`/`Image`/`iframe` 直接使用。

### 遗留清理

| 路径 | 操作 |
|------|------|
| `mes/uploads/` | 迁移文件后删除 |
| `mes/frontend/uploads/` | 删除 |
| `mes/static/upload/` | 删除（遗留文件） |

## 数据迁移

`mes/uploads/` 下现有文件：

```
materile/
  - 8f148abf3dd74585ae61a2f28a16552a.png
  - 40db0ede3a1c4022a7458b66a5bedd7e.jpg
process/
  - 04a90f7acd4f4aab91c6d605ef060801.jpg
  - b364ca704a6f49cbb0d46354acab1b3c.jpg
  - d3c5192a32f4405d839294abb13f890d.pdf
  - f993d77d5de7496381795efcb72abac2.docx
```

迁移脚本：遍历文件，用 MinIO SDK putObject 到对应桶路径。

DB 中的现有 URL 格式为 `/basedata/materile/image/uuid.jpg` 和 `/technology/process-content/image/uuid.jpg`。迁移后需更新为 MinIO presigned URL，或通过 object key 反向生成。

## Presigned URL 有效期

- 上传时返回 7 天有效期
- DB 中 `imageUrl` / `contentImages` / `inspectionImages` / `filePath` 存储完整 presigned URL
- 后续可考虑添加刷新 URL 的机制（定时任务或在查询时动态生成）
