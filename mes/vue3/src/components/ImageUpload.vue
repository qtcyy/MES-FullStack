<template>
  <div class="image-upload">
    <div v-if="modelValue" class="image-upload__preview">
      <el-image
        :src="modelValue"
        alt="物料图片"
        fit="cover"
        class="image-upload__img"
        :preview-src-list="[modelValue]"
      />
      <el-button
        v-if="!disabled"
        class="image-upload__remove"
        aria-label="移除图片"
        :icon="Close"
        circle
        size="small"
        @click="emit('update:modelValue', '')"
      />
    </div>

    <el-upload
      v-if="!disabled"
      class="image-upload__trigger"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :http-request="doUpload"
      accept="image/*"
    >
      <el-button :loading="uploading" :icon="UploadFilled">
        {{ modelValue ? '重新上传' : '上传图片' }}
      </el-button>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, UploadFilled } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import { materileUploadImage } from '@/api/basedata/materile'

// 通用图片上传:props 入 / emit 出,零业务耦合
const props = withDefaults(
  defineProps<{
    modelValue?: string
    disabled?: boolean
    /** 上传函数(注入),默认上传到物料端点;其它模块可传各自上传 API 复用本组件 */
    uploadFn?: (file: File) => Promise<{ url: string }>
  }>(),
  { modelValue: '', disabled: false, uploadFn: materileUploadImage },
)
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const uploading = ref(false)

/** 上传前校验:仅图片 + ≤2MB */
function beforeUpload(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('只能上传图片文件')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 2MB')
    return false
  }
  return true
}

/** 自定义上传:调注入的 uploadFn,取回 url 回填 */
async function doUpload(opt: UploadRequestOptions): Promise<void> {
  uploading.value = true
  try {
    const res = await props.uploadFn(opt.file as File)
    emit('update:modelValue', res.url)
    ElMessage.success('上传成功')
  } catch {
    /* 响应拦截器已提示,吞掉防未捕获 rejection */
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.image-upload {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-3);
}
.image-upload__preview {
  position: relative;
  width: 80px;
  height: 80px;
}
.image-upload__img {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md, 6px);
  border: 1px solid var(--el-border-color);
}
.image-upload__remove {
  position: absolute;
  top: -8px;
  right: -8px;
}
</style>
