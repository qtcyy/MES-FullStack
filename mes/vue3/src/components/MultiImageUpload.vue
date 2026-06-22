<template>
  <div class="multi-image-upload">
    <div class="multi-image-upload__grid">
      <div
        v-for="(url, i) in urls"
        :key="modelValue[i] ?? i"
        class="multi-image-upload__item"
      >
        <el-image
          :src="url"
          fit="cover"
          :preview-src-list="urls"
          :initial-index="i"
          preview-teleported
          class="multi-image-upload__img"
        />
        <el-icon v-if="!disabled" class="multi-image-upload__del" @click="removeAt(i)">
          <Close />
        </el-icon>
      </div>
      <el-upload
        v-if="!disabled"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :http-request="doUpload"
        accept="image/*"
        class="multi-image-upload__add"
      >
        <el-icon :class="{ 'is-loading': uploading }"><Plus /></el-icon>
      </el-upload>
    </div>
    <el-empty v-if="disabled && !urls.length" description="无图片" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Close } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'

const props = withDefaults(
  defineProps<{
    /** 对象 key 列表(v-model) */
    modelValue: string[]
    /** 展示 url 列表(与 modelValue 同序;新上传项追加) */
    urls: string[]
    disabled?: boolean
    /** 上传函数,返回 {key,url} */
    uploadFn: (file: File) => Promise<{ key: string; url: string }>
  }>(),
  { disabled: false },
)
const emit = defineEmits<{
  'update:modelValue': [string[]]
  'update:urls': [string[]]
}>()

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

/** 自定义上传:调注入的 uploadFn,取回 {key,url} 同序追加 */
async function doUpload(opt: UploadRequestOptions): Promise<void> {
  uploading.value = true
  try {
    const { key, url } = await props.uploadFn(opt.file as File)
    emit('update:modelValue', [...props.modelValue, key])
    emit('update:urls', [...props.urls, url])
  } catch {
    /* 响应拦截器已提示,吞掉防未捕获 rejection */
  } finally {
    uploading.value = false
  }
}

const removeAt = (i: number) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, idx) => idx !== i),
  )
  emit(
    'update:urls',
    props.urls.filter((_, idx) => idx !== i),
  )
}
</script>

<style scoped>
.multi-image-upload__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.multi-image-upload__item {
  position: relative;
  width: 88px;
  height: 88px;
}
.multi-image-upload__img {
  width: 88px;
  height: 88px;
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color);
}
.multi-image-upload__del {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--el-color-danger);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
}
.multi-image-upload__add {
  width: 88px;
  height: 88px;
  border: 1px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-secondary);
}
.multi-image-upload__add:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
</style>
