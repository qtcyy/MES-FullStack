<template>
  <div class="pc-editor">
    <!-- 顶部:状态 + 操作 -->
    <div class="pc-editor__head">
      <el-tag :type="statusTagType" size="small" disable-transitions>{{ statusLabel }}</el-tag>
      <div class="pc-editor__ops">
        <el-button
          type="primary"
          size="small"
          :disabled="!editable"
          :loading="saving"
          @click="onSave"
          >保存主信息</el-button
        >
        <el-button
          type="warning"
          size="small"
          :disabled="!editable || !contentId"
          @click="onComplete"
          >完成编制</el-button
        >
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 主信息 -->
      <el-tab-pane label="主信息" name="main">
        <el-form :model="form" label-width="80px">
          <el-form-item label="主信息" required>
            <el-input v-model="form.mainInfo" :disabled="!editable" placeholder="工序主信息" />
          </el-form-item>
          <el-form-item label="工艺内容" required>
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="4"
              :disabled="!editable"
              placeholder="工艺内容"
            />
          </el-form-item>
          <el-form-item label="工序图片">
            <MultiImageUpload
              v-model="form.contentImageKeys"
              v-model:urls="contentImageUrls"
              :disabled="!editable"
              :upload-fn="pcUploadImage"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 工序要求 -->
      <el-tab-pane label="工序要求" name="req">
        <el-input
          v-model="form.requirements"
          type="textarea"
          :rows="5"
          :disabled="!editable"
          placeholder="工序要求"
        />
      </el-tab-pane>

      <!-- 检验 -->
      <el-tab-pane label="检验" name="inspect">
        <el-form label-width="80px">
          <el-form-item label="需检验">
            <el-switch v-model="form.inspectionRequiredBool" :disabled="!editable" />
          </el-form-item>
          <el-form-item label="检验图片">
            <MultiImageUpload
              v-model="form.inspectionImageKeys"
              v-model:urls="inspectionImageUrls"
              :disabled="!editable"
              :upload-fn="pcUploadImage"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 注意事项 -->
      <el-tab-pane label="注意事项" name="notes">
        <el-input
          v-model="form.notes"
          type="textarea"
          :rows="5"
          :disabled="!editable"
          placeholder="注意事项"
        />
      </el-tab-pane>

      <!-- 工装设备 -->
      <el-tab-pane label="工装设备" name="equip">
        <template v-if="contentId">
          <div v-if="editable" class="pc-editor__bar">
            <el-button type="primary" size="small" :icon="Plus" @click="openEquip(null)"
              >新增设备</el-button
            >
          </div>
          <el-table :data="detail.equipment" stripe border>
            <el-table-column prop="name" label="设备名称" show-overflow-tooltip />
            <el-table-column prop="quantity" label="数量" width="90" />
            <el-table-column prop="remark" label="备注" show-overflow-tooltip />
            <el-table-column v-if="editable" label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="openEquip(row as SpProcessEquipment)"
                  >编辑</el-button
                >
                <el-button
                  type="danger"
                  link
                  size="small"
                  @click="onEquipDelete(row as SpProcessEquipment)"
                  >删除</el-button
                >
              </template>
            </el-table-column>
            <template #empty><el-empty description="暂无设备" :image-size="60" /></template>
          </el-table>
        </template>
        <el-empty v-else description="请先保存主信息后维护设备" :image-size="60" />
      </el-tab-pane>

      <!-- 技术文档 -->
      <el-tab-pane label="技术文档" name="doc">
        <template v-if="contentId">
          <div v-if="editable" class="pc-editor__bar">
            <el-upload
              :show-file-list="false"
              :http-request="doDocUpload"
              accept="application/pdf"
            >
              <el-button type="primary" size="small" :icon="Upload" :loading="docUploading"
                >上传 PDF</el-button
              >
            </el-upload>
          </div>
          <el-table :data="detail.documents" stripe border>
            <el-table-column label="文档名称" show-overflow-tooltip>
              <template #default="{ row }">
                <el-link :href="row.fileUrl" target="_blank" type="primary">{{ row.name }}</el-link>
              </template>
            </el-table-column>
            <el-table-column v-if="editable" label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  link
                  size="small"
                  @click="onDocDelete(row as SpProcessDocumentVO)"
                  >删除</el-button
                >
              </template>
            </el-table-column>
            <template #empty><el-empty description="暂无文档" :image-size="60" /></template>
          </el-table>
        </template>
        <el-empty v-else description="请先保存主信息后上传文档" :image-size="60" />
      </el-tab-pane>

      <!-- 物料清单(只读) -->
      <el-tab-pane label="物料清单" name="mat">
        <el-table :data="bomItems" stripe border>
          <el-table-column prop="materialCode" label="物料编码" show-overflow-tooltip />
          <el-table-column prop="materialDesc" label="描述" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="90" />
          <el-table-column prop="unit" label="单位" width="90" />
          <template #empty><el-empty description="暂无物料" :image-size="60" /></template>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <EquipmentForm
      v-model="equipDialog"
      :model="editingEquip"
      :loading="equipSaving"
      @submit="onEquipSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import MultiImageUpload from '@/components/MultiImageUpload.vue'
import EquipmentForm from './EquipmentForm.vue'
import {
  pcUploadImage,
  pcUploadDocument,
  pcEquipmentSave,
  pcEquipmentDelete,
  pcDocumentSave,
  pcDocumentDelete,
} from '@/api/technology/processContent'
import {
  parseCsvKeys,
  inspectionToBool,
  canEditContent,
  validateContent,
  buildContentPayload,
  buildEquipmentPayload,
  type ContentFormModel,
} from '@/utils/processContent'
import type {
  ProcessContentDetail,
  SpProcessContent,
  SpProcessEquipment,
  SpProcessDocumentVO,
  SpProductBomItem,
} from '@/types/technology'

const props = defineProps<{
  bomId: string
  detail: ProcessContentDetail
  bomItems: SpProductBomItem[]
  saving?: boolean
}>()
const emit = defineEmits<{
  save: [SpProcessContent]
  complete: [string]
  reload: []
}>()

const activeTab = ref('main')

const contentId = computed(() => props.detail.content?.id)
const editable = computed(() => canEditContent(props.detail.content?.status))
const statusLabel = computed(() =>
  props.detail.content?.status === 'completed'
    ? '已完成'
    : props.detail.content?.id
      ? '草稿'
      : '未编制',
)
const statusTagType = computed(() =>
  props.detail.content?.status === 'completed' ? 'success' : 'info',
)

// 表单模型 + 图片展示 url(与 key 同序)
const form = reactive<ContentFormModel>({
  bomId: props.bomId,
  contentImageKeys: [],
  inspectionImageKeys: [],
  inspectionRequiredBool: false,
})
const contentImageUrls = ref<string[]>([])
const inspectionImageUrls = ref<string[]>([])

// detail/bomId 变化时回填(切节点)
watch(
  () => [props.bomId, props.detail] as const,
  () => {
    const c = props.detail.content
    form.bomId = props.bomId
    form.mainInfo = c?.mainInfo ?? ''
    form.content = c?.content ?? ''
    form.requirements = c?.requirements ?? ''
    form.notes = c?.notes ?? ''
    form.flowId = c?.flowId
    form.contentImageKeys = parseCsvKeys(c?.contentImages)
    form.inspectionImageKeys = parseCsvKeys(c?.inspectionImages)
    form.inspectionRequiredBool = inspectionToBool(c?.inspectionRequired)
    contentImageUrls.value = [...props.detail.contentImageUrls]
    inspectionImageUrls.value = [...props.detail.inspectionImageUrls]
    // 不在此重置 activeTab:切节点时父级 :key=bomId 整体重挂(activeTab 自然回 main),
    // 保存后静默 reload 同节点则保留当前 Tab。
  },
  { immediate: true, deep: true },
)

const onSave = () => {
  const err = validateContent(form)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('save', buildContentPayload(form, contentId.value))
}
const onComplete = () => emit('complete', contentId.value!)

// 设备:子资源 CRUD 直接调用 API,成功才关弹窗 + 触发父级 reload(失败保留输入)
const equipDialog = ref(false)
const equipSaving = ref(false)
const editingEquip = ref<SpProcessEquipment | null>(null)
const openEquip = (row: SpProcessEquipment | null) => {
  editingEquip.value = row
  equipDialog.value = true
}
const onEquipSubmit = async (f: {
  id?: string
  name: string
  quantity?: number
  remark?: string
}) => {
  equipSaving.value = true
  try {
    await pcEquipmentSave(buildEquipmentPayload(f, contentId.value!))
    equipDialog.value = false
    emit('reload')
  } catch {
    /* 拦截器已提示,保持弹窗开、保留输入 */
  } finally {
    equipSaving.value = false
  }
}
const onEquipDelete = async (row: SpProcessEquipment) => {
  try {
    await ElMessageBox.confirm(`确认删除设备「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await pcEquipmentDelete(row.id!)
    ElMessage.success('删除成功')
    emit('reload')
  } catch {
    /* 拦截器已提示 */
  }
}

// 文档:上传 → 拿 key 直接保存记录 → reload(自定义上传,对齐 MultiImageUpload 的 http-request 模式)
const docUploading = ref(false)
const MAX_DOC_SIZE = 20 * 1024 * 1024 // 20MB
const doDocUpload = async (opt: UploadRequestOptions): Promise<void> => {
  const file = opt.file as File
  if (file.type !== 'application/pdf') {
    ElMessage.warning('只能上传 PDF 文件')
    return
  }
  if (file.size > MAX_DOC_SIZE) {
    ElMessage.warning('文档大小不能超过 20MB')
    return
  }
  docUploading.value = true
  try {
    const { key, name } = await pcUploadDocument(file)
    await pcDocumentSave({ contentId: contentId.value!, name, filePath: key })
    ElMessage.success('上传成功')
    emit('reload')
  } catch {
    /* 响应拦截器已提示,吞掉防未捕获 rejection */
  } finally {
    docUploading.value = false
  }
}
const onDocDelete = async (row: SpProcessDocumentVO) => {
  try {
    await ElMessageBox.confirm(`确认删除文档「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await pcDocumentDelete(row.id)
    ElMessage.success('删除成功')
    emit('reload')
  } catch {
    /* 拦截器已提示 */
  }
}
</script>

<style scoped>
.pc-editor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
  gap: var(--sp-2);
}
.pc-editor__bar {
  margin-bottom: var(--sp-3);
}
</style>
