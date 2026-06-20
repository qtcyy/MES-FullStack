<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑用户' : '新增用户'"
    width="560px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="登录名" prop="username">
        <el-input
          v-model="form.username"
          :disabled="isEdit"
          placeholder="请输入登录名"
          clearable
        />
      </el-form-item>

      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" placeholder="请输入姓名" clearable />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          :placeholder="isEdit ? '留空不修改' : '请输入密码'"
          show-password
          clearable
        />
      </el-form-item>

      <el-form-item label="角色" prop="sysRoleIds">
        <el-select
          v-model="form.sysRoleIds"
          multiple
          placeholder="请选择角色"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="role in roles"
            :key="role.id"
            :label="role.name"
            :value="role.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="部门" prop="deptId">
        <el-tree-select
          v-model="form.deptId"
          :data="deptTree"
          node-key="id"
          :props="{ label: 'name', children: 'children' }"
          check-strictly
          clearable
          placeholder="请选择部门"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="状态" prop="deleted">
        <el-select v-model="form.deleted" placeholder="请选择状态" style="width: 100%">
          <el-option label="正常" value="0" />
          <el-option label="禁用" value="2" />
        </el-select>
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import type { SysUserDTO, SysRole } from '@/types/system'
import type { Tree } from '@/utils/systemTree'
import type { SysDepartment } from '@/types/system'
import { buildUserPayload } from '@/utils/systemTree'

const props = defineProps<{
  modelValue: boolean
  model: SysUserDTO | null
  roles: SysRole[]
  deptTree: Tree<SysDepartment>[]
  loading: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [SysUserDTO]
}>()

const formRef = ref<FormInstance>()

const isEdit = computed(() => !!props.model?.id)

/** 表单本地状态:字段名均为业务命名,避免 DOM 属性冲突 */
const form = reactive<SysUserDTO>({
  username: '',
  name: '',
  password: '',
  sysRoleIds: [],
  deptId: undefined,
  deleted: '0',
})

/** 监听 props.model 变化,同步到本地 form */
watch(
  () => props.model,
  (val) => {
    if (val) {
      // 编辑:填充已有字段
      form.id = val.id
      form.username = val.username ?? ''
      form.name = val.name ?? ''
      form.password = '' // 编辑时留空=不修改
      form.sysRoleIds = val.sysRoleIds ? [...val.sysRoleIds] : []
      form.deptId = val.deptId
      form.deleted = val.deleted ?? '0'
    } else {
      // 新增:重置所有字段
      form.id = undefined
      form.username = ''
      form.name = ''
      form.password = ''
      form.sysRoleIds = []
      form.deptId = undefined
      form.deleted = '0'
    }
  },
  { immediate: true },
)

/** 校验规则:密码在新增时必填 */
const rules = computed<FormRules>(() => ({
  username: [{ required: true, message: '请输入登录名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: isEdit.value
    ? []
    : [{ required: true, message: '请输入密码', trigger: 'blur' }],
}))

async function handleSubmit() {
  await formRef.value?.validate()
  const payload = buildUserPayload(form, isEdit.value)
  emit('submit', payload)
}
</script>
