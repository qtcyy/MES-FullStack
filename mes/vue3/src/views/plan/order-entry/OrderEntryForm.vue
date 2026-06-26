<template>
  <FormDialog
    :model-value="modelValue"
    title="新增生产订单"
    width="680px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="订单类型" prop="orderSource">
            <el-radio-group v-model="form.orderSource">
              <el-radio-button value="DEMAND">需求订单</el-radio-button>
              <el-radio-button value="FORECAST">预测订单</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="排产方式">
            <el-tag :type="form.orderSource === 'DEMAND' ? 'warning' : 'success'">
              {{ form.orderSource === 'DEMAND' ? '逆向排产(按交付日期)' : '正向排产(按开工日期)' }}
            </el-tag>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="产品BOM" prop="bomId">
        <el-select v-model="form.bomId" placeholder="请选择产品BOM" filterable clearable style="width:100%" @change="onBomChange">
          <el-option v-for="b in boms" :key="b.id" :label="`${b.bomCode} / ${b.materielDesc}`" :value="b.id!">
            <span>{{ b.bomCode }} / {{ b.materielDesc }}</span>
            <el-tag size="small" style="margin-left:8px" :type="b.id === latestBomId(b.bomCode) ? 'success' : 'info'">
              {{ b.versionNumber }}{{ b.id === latestBomId(b.bomCode) ? ' · 最新' : '' }}
            </el-tag>
          </el-option>
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="需求数量" prop="qty">
            <el-input-number v-model="form.qty" :min="1" :precision="0" controls-position="right" style="width:100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item v-if="form.orderSource === 'DEMAND'" label="计划交付" prop="planEndTime">
            <el-date-picker v-model="form.planEndTime" type="date" value-format="YYYY-MM-DD HH:mm:ss" placeholder="计划交付日期" style="width:100%" />
          </el-form-item>
          <el-form-item v-else label="计划开工" prop="planStartTime">
            <el-date-picker v-model="form.planStartTime" type="date" value-format="YYYY-MM-DD HH:mm:ss" placeholder="计划开工日期" style="width:100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="客户名称"><el-input v-model="form.customerName" clearable /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="销售合同号"><el-input v-model="form.contractNo" clearable /></el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="优先级">
        <el-input-number v-model="form.priority" :min="1" :precision="0" controls-position="right" />
        <span style="margin-left:8px;color:var(--el-text-color-secondary)">数字越小优先级越高</span>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.orderDescription" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { useRequest } from '@/composables/useRequest'
import { http } from '@/api/request'
import type { ProductionOrder } from '@/types/plan'
import type { IPage } from '@/types/system'

interface BomRow { id?: string; bomCode?: string; materielCode?: string; materielDesc?: string; versionNumber?: string; state?: string }

const props = defineProps<{ modelValue: boolean; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [Partial<ProductionOrder>] }>()

const formRef = ref<FormInstance>()
const form = reactive<Partial<ProductionOrder>>({})

const { data: bomPage } = useRequest(
  () => http.post<IPage<BomRow>>('/technology/bom/page', { current: 1, size: 200 }),
  { immediate: true },
)
const boms = computed<BomRow[]>(() => (bomPage.value?.records ?? []).filter((b) => b.state === 'pass'))

function latestBomId(bomCode?: string): string | undefined {
  const same = boms.value.filter((b) => b.bomCode === bomCode)
  if (!same.length) return undefined
  return same.reduce((a, b) => ((b.versionNumber ?? '') > (a.versionNumber ?? '') ? b : a)).id
}

function onBomChange(id: string) {
  const hit = boms.value.find((b) => b.id === id)
  if (!hit) return
  form.bomCode = hit.bomCode
  form.bomVersion = hit.versionNumber
  form.materiel = hit.materielCode
  form.materielDesc = hit.materielDesc
  if (hit.id !== latestBomId(hit.bomCode)) {
    ElMessage.warning('所选 BOM 非最新版本,最新版本请确认后再下单')
  }
}

function plusWorkdays(days: number): string {
  const d = new Date()
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) added++
  }
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 00:00:00`
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      Object.keys(form).forEach((k) => delete (form as Record<string, unknown>)[k])
      Object.assign(form, { orderSource: 'DEMAND', qty: 10, planEndTime: plusWorkdays(5) })
    }
  },
)

const rules: FormRules = {
  orderSource: [{ required: true, message: '请选择订单类型', trigger: 'change' }],
  bomId: [{ required: true, message: '请选择产品BOM', trigger: 'change' }],
  qty: [{ required: true, message: '请输入需求数量', trigger: 'change' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  if (form.orderSource === 'DEMAND' && !form.planEndTime) { ElMessage.warning('请填写计划交付日期'); return }
  if (form.orderSource === 'FORECAST' && !form.planStartTime) { ElMessage.warning('请填写计划开工日期'); return }
  emit('submit', { ...form })
}
</script>
