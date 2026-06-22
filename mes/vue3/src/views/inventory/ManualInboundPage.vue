<template>
  <PageContainer title="手动入库">
    <el-card class="manual-card">
      <el-form label-width="100px" class="manual-form">
        <el-form-item label="物料编码" required>
          <el-input v-model="form.materialCode" placeholder="请输入物料编码" />
        </el-form-item>
        <el-form-item label="物料描述">
          <el-input v-model="form.materialDesc" placeholder="可选" />
        </el-form-item>
        <el-form-item label="单位">
          <el-select v-model="form.unit" placeholder="选择单位" clearable>
            <el-option v-for="o in unitOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" required>
          <el-input-number v-model="form.quantity" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="库位" required>
          <LocationSelect v-model="loc" :target-material="form.materialCode || ''" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">入库</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import LocationSelect from './LocationSelect.vue'
import { manualInbound } from '@/api/inventory/stock'
import { useDict } from '@/composables/useDict'
import { validateManualInbound, buildManualInboundPayload } from '@/utils/inventory'

const { options: unitOptions } = useDict('ORDER_UNIT')

const form = reactive({ materialCode: '', materialDesc: '', unit: '', quantity: 0 })
const loc = ref<{ warehouseId?: string; locationId?: string }>({})
const submitting = ref(false)

function resetForm() {
  form.materialCode = ''
  form.materialDesc = ''
  form.unit = ''
  form.quantity = 0
  loc.value = {}
}

async function submit() {
  const err = validateManualInbound({ ...form, warehouseId: loc.value.warehouseId, locationId: loc.value.locationId })
  if (err) { ElMessage.warning(err); return }
  submitting.value = true
  try {
    await manualInbound(buildManualInboundPayload({ ...form, warehouseId: loc.value.warehouseId, locationId: loc.value.locationId }))
    ElMessage.success('入库成功')
    resetForm()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.manual-card { max-width: 560px; }
.manual-form { padding: var(--sp-2); }
</style>
