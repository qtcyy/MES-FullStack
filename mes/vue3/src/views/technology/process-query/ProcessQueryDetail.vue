<template>
  <div class="pq-detail">
    <!-- 顶部:节点名 + 编制状态(无任何操作按钮) -->
    <div class="pq-detail__head">
      <span class="pq-detail__name">{{ nodeName }}</span>
      <el-tag :type="statusTagType" size="small" disable-transitions>{{ statusLabel }}</el-tag>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 主信息 -->
      <el-tab-pane label="主信息" name="main">
        <el-form label-width="80px">
          <el-form-item label="主信息">
            <el-input :model-value="content?.mainInfo ?? ''" readonly placeholder="—" />
          </el-form-item>
          <el-form-item label="工艺内容">
            <el-input
              :model-value="content?.content ?? ''"
              type="textarea"
              :rows="4"
              readonly
              placeholder="—"
            />
          </el-form-item>
          <el-form-item label="工序图片">
            <MultiImageUpload
              :model-value="contentImageKeys"
              :urls="detail.contentImageUrls"
              disabled
              :upload-fn="noopUpload"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 工序要求 -->
      <el-tab-pane label="工序要求" name="req">
        <el-input
          :model-value="content?.requirements ?? ''"
          type="textarea"
          :rows="5"
          readonly
          placeholder="—"
        />
      </el-tab-pane>

      <!-- 检验 -->
      <el-tab-pane label="检验" name="inspect">
        <el-form label-width="80px">
          <el-form-item label="需检验">
            <el-tag :type="inspected ? 'success' : 'info'" size="small" disable-transitions>{{
              inspected ? '是' : '否'
            }}</el-tag>
          </el-form-item>
          <el-form-item label="检验图片">
            <MultiImageUpload
              :model-value="inspectionImageKeys"
              :urls="detail.inspectionImageUrls"
              disabled
              :upload-fn="noopUpload"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 注意事项 -->
      <el-tab-pane label="注意事项" name="notes">
        <el-input
          :model-value="content?.notes ?? ''"
          type="textarea"
          :rows="5"
          readonly
          placeholder="—"
        />
      </el-tab-pane>

      <!-- 工装设备(只读) -->
      <el-tab-pane label="工装设备" name="equip">
        <el-table :data="detail.equipment" stripe border>
          <el-table-column prop="name" label="设备名称" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="90" />
          <el-table-column prop="remark" label="备注" show-overflow-tooltip />
          <template #empty><el-empty description="暂无设备" :image-size="60" /></template>
        </el-table>
      </el-tab-pane>

      <!-- 技术文档(只读,仅预览) -->
      <el-tab-pane label="技术文档" name="doc">
        <el-table :data="detail.documents" stripe border>
          <el-table-column label="文档名称" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link
                :href="row.fileUrl || undefined"
                :disabled="!row.fileUrl"
                target="_blank"
                type="primary"
                >{{ row.name }}</el-link
              >
            </template>
          </el-table-column>
          <template #empty><el-empty description="暂无文档" :image-size="60" /></template>
        </el-table>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MultiImageUpload from '@/components/MultiImageUpload.vue'
import { parseCsvKeys, inspectionToBool } from '@/utils/processContent'
import type { ProcessContentDetail, SpProductBomItem } from '@/types/technology'

const props = defineProps<{
  nodeName: string
  detail: ProcessContentDetail
  bomItems: SpProductBomItem[]
}>()

const activeTab = ref('main')

const content = computed(() => props.detail.content)
const inspected = computed(() => inspectionToBool(content.value?.inspectionRequired))
const contentImageKeys = computed(() => parseCsvKeys(content.value?.contentImages))
const inspectionImageKeys = computed(() => parseCsvKeys(content.value?.inspectionImages))

const statusLabel = computed(() =>
  content.value?.status === 'completed' ? '已完成' : content.value?.id ? '草稿' : '未编制',
)
const statusTagType = computed(() => (content.value?.status === 'completed' ? 'success' : 'info'))

// MultiImageUpload 的 uploadFn 为 required;只读态 disabled 隐藏上传触发器,此函数永不被调用
const noopUpload = () => Promise.resolve({ key: '', url: '' })
</script>

<style scoped>
.pq-detail__head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.pq-detail__name {
  font-size: 15px;
  font-weight: 600;
}
</style>
