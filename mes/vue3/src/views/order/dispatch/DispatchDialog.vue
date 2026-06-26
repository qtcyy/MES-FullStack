<template>
  <FormDialog
    :model-value="modelValue"
    :title="`派工（已选 ${count} 张工单）`"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form :model="form" label-width="92px">
      <el-form-item label="班组">
        <el-select v-model="form.teamId" placeholder="请选择班组" clearable style="width: 100%" @change="onTeamChange">
          <el-option v-for="t in teams" :key="t.id" :label="t.code ? `${t.code} ${t.name}` : t.name" :value="t.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="作业员">
        <el-select v-model="form.userId" placeholder="请先选班组" clearable :disabled="!form.teamId" style="width: 100%">
          <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="工时(小时)">
        <el-input-number v-model="form.laborHours" :min="0.5" :step="0.5" :precision="1" controls-position="right" style="width: 100%" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="计划开始">
            <el-date-picker v-model="form.planStartTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可选" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="计划结束">
            <el-date-picker v-model="form.planEndTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="可选" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { dispatchTeams, dispatchTeamUsers } from '@/api/order/dispatch'
import { buildDispatchPayload, validateDispatch } from '@/utils/order'
import type { SpDispatchAssign, SpTeamOption, TeamUserOption } from '@/types/order'

const props = defineProps<{ modelValue: boolean; orderIds: string[]; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [SpDispatchAssign] }>()

const count = computed(() => props.orderIds.length)
const teams = ref<SpTeamOption[]>([])
const users = ref<TeamUserOption[]>([])
const form = reactive({ teamId: '', userId: '', laborHours: 8, planStartTime: '', planEndTime: '', remark: '' })

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      Object.assign(form, { teamId: '', userId: '', laborHours: 8, planStartTime: '', planEndTime: '', remark: '' })
      users.value = []
      teams.value = await dispatchTeams()
    }
  },
  { immediate: true },
)

async function onTeamChange(teamId: string) {
  form.userId = ''
  users.value = teamId ? await dispatchTeamUsers(teamId) : []
}

function handleSubmit() {
  const err = validateDispatch(props.orderIds, form)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('submit', buildDispatchPayload(props.orderIds, form))
}
</script>
