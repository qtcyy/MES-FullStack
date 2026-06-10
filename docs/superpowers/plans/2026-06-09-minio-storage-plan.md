# MinIO 对象存储集成 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将文件上传与图片服务从本地文件系统迁移至 MinIO 对象存储，消除 `user.dir` 漂移和 Shiro 鉴权问题。

**Architecture:** Spring Boot 通过 `io.minio:minio` SDK 上传文件到 MinIO，返回 Presigned GET URL（7 天有效期）。前端 `<Image>`/`<img>`/`<iframe>` 直连 MinIO，不再经过后端代理。桶 `mes`，按模块分 `materile/` 和 `process/` 前缀。

**Tech Stack:** MinIO Docker 镜像、`io.minio:minio` SDK、Spring Boot 2.1.7、Java 8

---

### Task 1: Docker 启动 MinIO + Maven 依赖 + 配置

**Files:**
- Create: `mes/docker-compose.yml`
- Modify: `mes/pom.xml` (near line 173, before `</dependencies>`)
- Modify: `mes/src/main/resources/application-dev.yml` (append at end)
- Modify: `mes/src/main/resources/application-pro.yml` (append at end)
- Create: `mes/src/main/java/com/wangziyang/mes/common/config/MinioConfig.java`

- [ ] **Step 1: 创建 docker-compose.yml**

在 `mes/docker-compose.yml` 创建：

```yaml
version: '3.8'
services:
  minio:
    image: minio/minio:latest
    container_name: minio-mes
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
volumes:
  minio_data:
```

- [ ] **Step 2: 启动 MinIO**

```bash
cd mes && docker compose up -d
```

Expected: MinIO 容器启动，`docker ps | grep minio` 显示 running。

- [ ] **Step 3: 验证 MinIO 可访问**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:9000
```

Expected: `HTTP 200`。打开 http://localhost:9001 可看到 MinIO Console。

- [ ] **Step 4: 创建 bucket**

```bash
docker exec minio-mes mc mb local/mes 2>/dev/null; docker exec minio-mes mc ls local/ 2>/dev/null || echo "请通过 Console http://localhost:9001 手动创建名为 mes 的 bucket"
```

Expected: 创建 `mes` bucket 成功。

- [ ] **Step 5: 添加 MinIO SDK 依赖**

在 `mes/pom.xml` 的 `</dependencies>` 前（第 173 行前）插入：

```xml
        <!-- MinIO Object Storage SDK -->
        <dependency>
            <groupId>io.minio</groupId>
            <artifactId>minio</artifactId>
            <version>8.5.7</version>
        </dependency>
```

- [ ] **Step 6: 添加 MinIO 配置到 application-dev.yml**

在 `application-dev.yml` 末尾追加：

```yaml
minio:
  endpoint: http://localhost:9000
  access-key: minioadmin
  secret-key: minioadmin
  bucket: mes
```

- [ ] **Step 7: 添加 MinIO 配置到 application-pro.yml**

在 `application-pro.yml` 末尾追加（占位，部署时填写）：

```yaml
minio:
  endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
  access-key: ${MINIO_ACCESS_KEY:minioadmin}
  secret-key: ${MINIO_SECRET_KEY:minioadmin}
  bucket: ${MINIO_BUCKET:mes}
```

- [ ] **Step 8: 创建 MinioConfig.java**

创建 `mes/src/main/java/com/wangziyang/mes/common/config/MinioConfig.java`：

```java
package com.wangziyang.mes.common.config;

import io.minio.MinioClient;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "minio")
@Configuration
public class MinioConfig {

    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucket;

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getAccessKey() { return accessKey; }
    public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
    public String getSecretKey() { return secretKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
    public String getBucket() { return bucket; }
    public void setBucket(String bucket) { this.bucket = bucket; }

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
```

- [ ] **Step 9: 验证 Maven 编译**

```bash
cd mes && mvn compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

- [ ] **Step 10: Commit**

```bash
git add mes/docker-compose.yml mes/pom.xml mes/src/main/resources/application-dev.yml mes/src/main/resources/application-pro.yml mes/src/main/java/com/wangziyang/mes/common/config/MinioConfig.java
git commit -m "feat: add MinIO dependency, config, and docker-compose"
```

---

### Task 2: 创建 MinioUtil 工具类

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/common/util/MinioUtil.java`

- [ ] **Step 1: 创建 MinioUtil.java**

```java
package com.wangziyang.mes.common.util;

import com.wangziyang.mes.common.config.MinioConfig;
import io.minio.*;
import io.minio.http.Method;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * MinIO 对象存储工具类
 */
@Component
public class MinioUtil {

    @Autowired
    private MinioConfig minioConfig;

    @Autowired
    private MinioClient minioClient;

    private static final long PRESIGNED_EXPIRY_DAYS = 7;

    /**
     * 确保 bucket 存在，不存在则创建
     */
    @PostConstruct
    public void ensureBucket() {
        try {
            String bucket = minioConfig.getBucket();
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to init MinIO bucket", e);
        }
    }

    /**
     * 上传文件到 MinIO
     *
     * @param file          MultipartFile
     * @param objectPrefix  对象前缀（如 "materile" 或 "process"）
     * @return 对象 key（如 "materile/uuid.jpg"）
     */
    public String upload(MultipartFile file, String objectPrefix) throws Exception {
        String originalName = file.getOriginalFilename();
        String ext = ".jpg";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        }
        String objectName = objectPrefix + "/" + UUID.randomUUID().toString().replace("-", "") + ext;

        try (InputStream is = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioConfig.getBucket())
                            .object(objectName)
                            .stream(is, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
        }
        return objectName;
    }

    /**
     * 上传文件到 MinIO（指定文件名）
     *
     * @param file          MultipartFile
     * @param objectPrefix  对象前缀
     * @param objectName    指定对象名（含扩展名）
     * @return 对象 key
     */
    public String upload(MultipartFile file, String objectPrefix, String objectName) throws Exception {
        String fullName = objectPrefix + "/" + objectName;
        try (InputStream is = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioConfig.getBucket())
                            .object(fullName)
                            .stream(is, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
        }
        return fullName;
    }

    /**
     * 生成 Presigned GET URL
     *
     * @param objectName 对象 key（如 "materile/uuid.jpg"）
     * @return presigned URL（7 天有效）
     */
    public String presignedGetUrl(String objectName) throws Exception {
        return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                        .bucket(minioConfig.getBucket())
                        .object(objectName)
                        .method(Method.GET)
                        .expiry(PRESIGNED_EXPIRY_DAYS, TimeUnit.DAYS)
                        .build()
        );
    }

    /**
     * 上传并返回 presigned URL
     *
     * @param file         MultipartFile
     * @param objectPrefix 对象前缀
     * @return presigned URL
     */
    public String uploadAndGetUrl(MultipartFile file, String objectPrefix) throws Exception {
        String objectName = upload(file, objectPrefix);
        return presignedGetUrl(objectName);
    }

    /**
     * 删除对象
     *
     * @param objectName 对象 key
     */
    public void delete(String objectName) throws Exception {
        minioClient.removeObject(
                RemoveObjectArgs.builder()
                        .bucket(minioConfig.getBucket())
                        .object(objectName)
                        .build()
        );
    }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd mes && mvn compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/common/util/MinioUtil.java
git commit -m "feat: add MinioUtil for upload, presigned URL, and object management"
```

---

### Task 3: 改造 SpMaterileController — MinIO 上传，删除本地服务

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/controller/SpMaterileController.java` (lines 160-189)

- [ ] **Step 1: 注入 MinioUtil，替换 uploadImage**

将第 160 行的 `UPLOAD_DIR` 常量和第 162-189 行的 `uploadImage` + `getImage` 方法替换为：

```java
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
```

并删除以下内容：
- `private static final String UPLOAD_DIR = ...` 常量（第 160 行）
- `getImage(@PathVariable String filename, ...)` 方法（第 178-189 行）
- 不再需要的 `import java.io.File` 和 `import java.nio.file.Files`（如仅用于上述方法）

同时添加 `import com.wangziyang.mes.common.util.MinioUtil;` 和其他需要的 import。

> **注意：** `uploadImage` 方法签名从 `throws IOException` 改为在方法内部 try-catch，因为我们不再向外抛出 IOException。

- [ ] **Step 2: 验证编译**

```bash
cd mes && mvn compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/basedata/controller/SpMaterileController.java
git commit -m "refactor: migrate materile image upload to MinIO, remove local file serving"
```

---

### Task 4: 改造 SpProcessContentController — MinIO 上传，删除本地服务

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/technology/controller/SpProcessContentController.java` (lines 103-170)

- [ ] **Step 1: 注入 MinioUtil，替换 uploadImage**

将第 103-131 行（`UPLOAD_DIR` 常量 + `uploadImage` + `getImage` 方法）替换为：

```java
    @Autowired
    private MinioUtil minioUtil;

    @PostMapping("/upload-image")
    @ResponseBody
    public Result uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) return Result.failure("文件为空");
        try {
            String url = minioUtil.uploadAndGetUrl(file, "process");
            Map<String, String> result = new HashMap<>();
            result.put("url", url);
            return Result.success(result);
        } catch (Exception e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }
```

并删除：
- `private static final String UPLOAD_DIR = ...` 常量（第 103 行）
- `getImage(...)` 方法（第 122-131 行）
- 不再需要的 `File`、`Files` import

- [ ] **Step 2: 替换 uploadDocument**

将第 150-170 行的 `uploadDocument` 方法替换为：

```java
    @PostMapping("/upload-document")
    @ResponseBody
    public Result uploadDocument(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) return Result.failure("文件为空");
        String originalName = file.getOriginalFilename();
        String ext = originalName != null && originalName.contains(".")
            ? originalName.substring(originalName.lastIndexOf(".") + 1).toLowerCase() : "";
        if (!"pdf".equals(ext)) {
            return Result.failure("只支持 PDF 格式");
        }
        try {
            String url = minioUtil.uploadAndGetUrl(file, "process");
            Map<String, String> result = new HashMap<>();
            result.put("url", url);
            result.put("name", originalName);
            return Result.success(result);
        } catch (Exception e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }
```

并删除不再需要的本地文件操作相关 import。

- [ ] **Step 3: 验证编译**

```bash
cd mes && mvn compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/technology/controller/SpProcessContentController.java
git commit -m "refactor: migrate process-content image/document upload to MinIO, remove local file serving"
```

---

### Task 5: 清理 — Shiro 图片 anon 规则 + Vite proxy 规则

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/system/config/shiro/ShiroConfig.java` (lines 109-111)
- Modify: `mes/frontend/vite.config.ts` (lines 21-28)

- [ ] **Step 1: 删除 Shiro 图片 anon 规则**

在 `ShiroConfig.java` 第 109-111 行，删除图片服务相关规则：

```java
        // 删除以下三行：
        // // 图片服务路径（<img> 标签请求无 AJAX 头，需放行避免 Shiro 重定向到登录页）
        // filterChainDefinitionMap.put("/technology/process-content/image/**", "anon");
        // filterChainDefinitionMap.put("/basedata/materile/image/**", "anon");
```

即将第 109-111 行替换为空（仅保留第 108 行和第 112 行之间的连贯性）。

> **注意：** 现有文件第 109-111 行是注释 + 两条 put，删除后确保第 112 行的 `filterChainDefinitionMap.put("/**", "authc");` 紧接在第 108 行 `filterChainDefinitionMap.put("/blog/open/**", "anon");` 之后。

- [ ] **Step 2: 删除 Vite 图片 proxy 规则**

在 `vite.config.ts` 删除 materile 和 process-content 的图片代理规则（第 21-28 行），即删除以下内容：

```typescript
      '/basedata/materile/image': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
      '/technology/process-content/image': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
```

保留 `/api` proxy 规则不变。

- [ ] **Step 3: 验证后端编译 + 前端 TypeScript**

```bash
cd mes && mvn compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

```bash
cd mes/frontend && npx tsc --noEmit 2>&1
```

Expected: 无错误输出（或仅有既存错误）

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/config/shiro/ShiroConfig.java mes/frontend/vite.config.ts
git commit -m "chore: remove Shiro image anon rules and Vite image proxy — no longer needed with MinIO presigned URLs"
```

---

### Task 6: 数据迁移 + 端到端验证

- [ ] **Step 1: 确认后端正在运行**

```bash
lsof -i :9090 | grep LISTEN
```

Expected: 有进程监听 9090 端口

- [ ] **Step 2: 确认 MinIO 正在运行**

```bash
docker ps | grep minio
```

Expected: `minio-mes` 容器 running

- [ ] **Step 3: 测试上传图片**

```bash
# 生成测试图片并上传
echo -n "test" > /tmp/test-upload.jpg
curl -s -X POST http://localhost:9090/basedata/materile/upload-image \
  -F "file=@/tmp/test-upload.jpg" \
  -b "SESSION=test-session-cookie-if-needed"
```

Expected: 返回 JSON，包含 presigned URL（格式：`http://localhost:9000/mes/materile/uuid.jpg?X-Amz-...`）。

- [ ] **Step 4: 测试 Presigned URL 可访问**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "<上一步返回的 presigned URL>"
```

Expected: `HTTP 200`

- [ ] **Step 5: 迁移现有文件到 MinIO**

在 `mes/` 目录下执行：

```bash
# 迁移 materile 图片
for f in uploads/materile/*; do
  [ -f "$f" ] || continue
  fname=$(basename "$f")
  curl -s -X PUT --upload-file "$f" \
    "http://localhost:9000/mes/materile/$fname" \
    -H "Authorization: $(echo -n 'minioadmin:minioadmin' | base64)"
  echo "Uploaded: materile/$fname"
done

# 迁移 process 文件
for f in uploads/process/*; do
  [ -f "$f" ] || continue
  fname=$(basename "$f")
  # 跳过 .docx 文件（非标准格式）
  if [[ "$fname" == *.docx ]]; then continue; fi
  curl -s -X PUT --upload-file "$f" \
    "http://localhost:9000/mes/process/$fname"
  echo "Uploaded: process/$fname"
done
```

> **注意：** 如 curl PUT 方法不可用，可通过 MinIO Console (http://localhost:9001) 手动上传。登录凭据：`minioadmin` / `minioadmin`，桶名 `mes`。

- [ ] **Step 6: 验证前端页面**

打开浏览器：
1. 访问 http://localhost:3000/basedata/materile — 图片列表正常显示
2. 新增物料并上传图片 — 上传成功，缩略图可点击放大
3. 访问 http://localhost:3000/technology/process-content — 历史图片能正常显示
4. 上传新图片/PDF — 上传成功，能预览

- [ ] **Step 7: 清理遗留文件 + Commit**

确认一切正常后：

```bash
rm -rf mes/uploads mes/frontend/uploads
git add mes/uploads mes/frontend/uploads  # 记录删除
git commit -m "chore: remove legacy local upload directories — migrated to MinIO"
```

---

### 改动文件汇总

| 文件 | 操作 | 说明 |
|------|------|------|
| `mes/docker-compose.yml` | 新增 | MinIO 容器 |
| `mes/pom.xml` | 修改 | 新增 `io.minio:minio` 依赖 |
| `application-dev.yml` | 修改 | 新增 `minio.*` 配置段 |
| `application-pro.yml` | 修改 | 新增 `minio.*` 配置段（环境变量） |
| `common/config/MinioConfig.java` | 新增 | MinioClient Bean |
| `common/util/MinioUtil.java` | 新增 | upload / presignedGet / ensureBucket |
| `SpMaterileController.java` | 修改 | uploadImage 改用 MinioUtil；删除 getImage + UPLOAD_DIR |
| `SpProcessContentController.java` | 修改 | uploadImage/uploadDocument 改用 MinioUtil；删除 getImage + UPLOAD_DIR |
| `ShiroConfig.java` | 修改 | 删除 materile/process image anon 规则 |
| `vite.config.ts` | 修改 | 删除 materile/process image proxy 规则 |
| `mes/uploads/` | 删除 | 遗留本地文件（迁移后） |
| `mes/frontend/uploads/` | 删除 | 遗留本地文件 |
