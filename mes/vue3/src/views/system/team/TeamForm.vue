<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑班组' : '新增班组'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="班组代码" prop="code">
        <el-input v-model="form.code" placeholder="如 BZ001" clearable />
      </el-form-item>
      <el-form-item label="班组名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入班组名称" clearable />
      </el-form-item>
      <el-form-item label="上班时间" prop="startTime">
        <el-time-picker
          v-model="form.startTime"
          format="HH:mm"
          value-format="HH:mm"
          placeholder="如 08:00"
          clearable
        />
      </el-form-item>
      <el-form-item label="下班时间" prop="endTime">
        <el-time-picker
          v-model="form.endTime"
          format="HH:mm"
          value-format="HH:mm"
          placeholder="如 17:00"
          clearable
        />
      </el-form-item>
      <el-form-item label="工作日" prop="workdays">
        <el-select v-model="form.workdays" multiple placeholder="选择工作日" style="width: 100%">
          <el-option v-for="w in WEEKDAYS" :key="w.value" :label="w.label" :value="w.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注" prop="descr">
        <el-input v-model="form.descr" type="textarea" :rows="3" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import { WEEKDAYS, buildTeamPayload, parseWorkdays } from '@/utils/team'
import type { SpTeam, SpTeamDTO, TeamFormModel } from '@/types/team'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;有 id = 编辑(传入分页记录 SpTeamDTO) */
  model: Partial<SpTeamDTO> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpTeam>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

const form = reactive<TeamFormModel>({
  id: undefined,
  code: '',
  name: '',
  startTime: undefined,
  endTime: undefined,
  workdays: [],
  descr: undefined,
})

function resetForm() {
  form.id = undefined
  form.code = ''
  form.name = ''
  form.startTime = undefined
  form.endTime = undefined
  form.workdays = []
  form.descr = undefined
}

watch(
  () => props.model,
  (val) => {
    if (val) {
      resetForm()
      Object.assign(form, {
        id: val.id,
        code: val.code,
        name: val.name,
        startTime: val.startTime,
        endTime: val.endTime,
        workdays: parseWorkdays(val.workdays),
        descr: val.descr,
      })
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const rules: FormRules = {
  code: [{ required: true, message: '请输入班组代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入班组名称', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildTeamPayload({ ...form }))
}
</script>
