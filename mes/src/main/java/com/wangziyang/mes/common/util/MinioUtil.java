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

    private static final int PRESIGNED_EXPIRY_DAYS = 7;

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
            // MinIO 不可用时不应阻断整个应用启动;首次上传会再次失败并被 controller 捕获
            System.err.println("[MinioUtil] 初始化 bucket 失败(MinIO 可能未启动): " + e.getMessage());
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
