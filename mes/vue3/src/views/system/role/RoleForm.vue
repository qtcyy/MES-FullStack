<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑角色' : '新增角色'"
    width="600px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="角色名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入角色名称" clearable />
      </el-form-item>

      <el-form-item label="角色编码" prop="code">
        <el-input v-model="form.code" placeholder="请输入角色编码(唯一标识)" clearable />
      </el-form-item>

      <el-form-item label="描述" prop="descr">
        <el-input
          v-model="form.descr"
          type="textarea"
          :rows="2"
          placeholder="请输入描述(可选)"
        />
      </el-form-item>

      <el-form-item label="菜单权限">
        <div class="role-form__tree-wrap">
          <el-tree
            ref="treeRef"
            :data="menuTree"
            node-key="id"
            show-checkbox
            :props="{ label: 'name', children: 'children' }"
            default-expand-all
            class="role-form__tree"
          />
        </div>
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { ElTree } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import type { SysRoleDTO } from '@/types/system'
import type { TreeVO, SysMenu } from '@/types/menu'
import { mergeCheckedMenuIds } from '@/utils/systemTree'

const props = defineProps<{
  modelValue: boolean
  model: SysRoleDTO | null
  menuTree: TreeVO<SysMenu>[]
  checkedIds: string[]
  loading: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [SysRoleDTO]
}>()

const formRef = ref<FormInstance>()
// el-tree 的精确类型
const treeRef = ref<InstanceType<typeof ElTree>>()

const isEdit = computed(() => !!props.model?.id)

/** 表单本地状态:字段名均为业务命名,避免 DOM 属性冲突 */
const form = reactive<SysRoleDTO>({
  name: '',
  code: '',
  descr: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
}

/** 监听 props.model 变化,同步到本地 form */
watch(
  () => props.model,
  (val) => {
    if (val) {
      form.id = val.id
      form.name = val.name ?? ''
      form.code = val.code ?? ''
      form.descr = val.descr ?? ''
    } else {
      form.id = undefined
      form.name = ''
      form.code = ''
      form.descr = ''
    }
  },
  { immediate: true },
)

/**
 * 权限树勾选回填:
 * - 监听 checkedIds 与弹窗打开(modelValue=true)联动
 * - 使用 nextTick 确保 el-tree 节点已渲染后再调用 setCheckedKeys
 * - destroy-on-close 下弹窗重开后 treeRef 已重建,需 watch modelValue 触发回填
 */
watch(
  [() => props.modelValue, () => props.checkedIds],
  ([visible]) => {
    if (!visible) return
    nextTick(() => {
      treeRef.value?.setCheckedKeys(props.checkedIds)
    })
  },
  { immediate: true },
)

async function handleSubmit() {
  await formRef.value?.validate()

  // 合并勾选 + 半选父节点 id(后端需半选中间层用于 rebuild 授权)
  const checked = (treeRef.value?.getCheckedKeys(false) ?? []) as string[]
  const halfChecked = (treeRef.value?.getHalfCheckedKeys() ?? []) as string[]
  const sysMenuIds = mergeCheckedMenuIds(checked, halfChecked)

  emit('submit', { ...form, sysMenuIds })
}
</script>

<style scoped>
.role-form__tree-wrap {
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  padding: var(--sp-2);
}

.role-form__tree {
  --el-tree-node-hover-bg-color: var(--el-fill-color-light);
}
</style>
