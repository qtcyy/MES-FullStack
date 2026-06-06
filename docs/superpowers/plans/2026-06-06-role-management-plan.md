# Role Management Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance role management with system-role flag, menu-permission assignment via tree UI, and 7 preset roles.

**Architecture:** Add `is_system` column to `sp_sys_role`, add `rebuild` method to `SysRoleMenuServiceImpl`, add `tree/{roleId}` endpoint to `SysRoleController`, modify `RoleForm.tsx` to include a checkbox tree for menu assignment, and update `RoleList.tsx` for system-role UX.

**Tech Stack:** Java 8 + Spring Boot 2.1.7 + MyBatis-Plus 3.1.2, React 18 + TypeScript + Ant Design 5 + TanStack Query

---

### Task 1: Database — ALTER TABLE and Seed Data

**Files:**
- Create: `scripts/sql/role-management-update.sql`

- [ ] **Step 1: Create the SQL migration script**

```sql
-- Role Management Enhancement
-- Adds is_system column and 7 preset roles with menu assignments

ALTER TABLE sp_sys_role ADD COLUMN is_system varchar(1) DEFAULT '0'
  COMMENT '系统角色 0-否 1-是';

-- Preset roles (Snowflake IDs pre-generated for consistency)
INSERT INTO sp_sys_role (id, name, code, descr, is_deleted, is_system, create_time, create_username, update_time, update_username)
VALUES
(REPLACE(UUID(), '-', ''), '数据员', 'data_clerk', '享有基础数据中心权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '工艺员', 'process_tech', '享有工艺管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '生产计划员', 'prod_planner', '享有计划管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '生产主管', 'prod_supervisor', '享有生产管理相关权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '生产作业员', 'prod_operator', '享有在制品管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '库房管理员', 'warehouse_mgr', '享有物料管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin'),
(REPLACE(UUID(), '-', ''), '质量管理员', 'quality_mgr', '享有质量相关管理权限', '0', '1', NOW(), 'admin', NOW(), 'admin');

-- Role-menu assignments
-- 数据员: 基础数据配置平台(105), 基础数据维护(106)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, '105', NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r WHERE r.code = 'data_clerk' AND r.is_system = '1';

INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, '106', NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r WHERE r.code = 'data_clerk' AND r.is_system = '1';

-- 工艺员: 工艺管理(15), 工艺路线管理(151), 工艺BOM管理(152)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '15' AS id UNION SELECT '151' UNION SELECT '152') m
WHERE r.code = 'process_tech' AND r.is_system = '1';

-- 生产计划员: 计划管理(12), 工单下达(121)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '12' AS id UNION SELECT '121') m
WHERE r.code = 'prod_planner' AND r.is_system = '1';

-- 生产主管: 计划管理(12), 工单下达(121), 在制品管理(16), SN通用过程采集(161), 数字化平台(14), 智慧大屏(141)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '12' AS id UNION SELECT '121' UNION SELECT '16' UNION SELECT '161' UNION SELECT '14' UNION SELECT '141') m
WHERE r.code = 'prod_supervisor' AND r.is_system = '1';

-- 生产作业员: 在制品管理(16), SN通用过程采集(161)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '16' AS id UNION SELECT '161') m
WHERE r.code = 'prod_operator' AND r.is_system = '1';

-- 库房管理员: 物料管理(13), 物料维护(131)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '13' AS id UNION SELECT '131') m
WHERE r.code = 'warehouse_mgr' AND r.is_system = '1';

-- 质量管理员: 基础数据配置平台(105), 基础数据维护(106), 在制品管理(16), SN通用过程采集(161)
INSERT INTO sp_sys_role_menu (id, role_id, menu_id, create_time, create_username, update_time, update_username)
SELECT REPLACE(UUID(), '-', ''), r.id, m.id, NOW(), 'admin', NOW(), 'admin'
FROM sp_sys_role r, (SELECT '105' AS id UNION SELECT '106' UNION SELECT '16' UNION SELECT '161') m
WHERE r.code = 'quality_mgr' AND r.is_system = '1';
```

- [ ] **Step 2: Execute the SQL script against the database**

```bash
mysql -h 192.168.52.76 -u root -p sparchetype < scripts/sql/role-management-update.sql
```

Expected: ALTER TABLE succeeds, 7 roles inserted, role-menu assignments inserted.

- [ ] **Step 3: Commit**

```bash
git add scripts/sql/role-management-update.sql
git commit -m "feat: add is_system column and 7 preset roles with menu assignments"
```

---

### Task 2: Backend — SysRole Entity

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/system/entity/SysRole.java`

- [ ] **Step 1: Add `isSystem` field to SysRole**

In `SysRole.java`, add after the `deleted` field (after line 39):

```java
    /**
     * 系统角色(0:否;1:是)
     */
    @TableField(value = "is_system")
    private String isSystem;

    public String getIsSystem() {
        return isSystem;
    }

    public void setIsSystem(String isSystem) {
        this.isSystem = isSystem;
    }
```

- [ ] **Step 2: Verify compilation**

```bash
cd mes && mvn compile -pl . -am -q
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/entity/SysRole.java
git commit -m "feat: add isSystem field to SysRole entity"
```

---

### Task 3: Backend — SysRoleDTO

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/system/dto/SysRoleDTO.java`

- [ ] **Step 1: Add `sysMenuIds` field to SysRoleDTO**

In `SysRoleDTO.java`, add after `checked` field (after the `sysMenuDtos` field at line 25):

```java
    /**
     * 角色拥有的菜单ID数组
     */
    private String[] sysMenuIds;

    public String[] getSysMenuIds() {
        return sysMenuIds;
    }

    public void setSysMenuIds(String[] sysMenuIds) {
        this.sysMenuIds = sysMenuIds;
    }
```

- [ ] **Step 2: Verify compilation**

```bash
cd mes && mvn compile -pl . -am -q
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/dto/SysRoleDTO.java
git commit -m "feat: add sysMenuIds field to SysRoleDTO"
```

---

### Task 4: Backend — SysRoleMenu Service Rebuild Method

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/system/service/ISysRoleMenuService.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SysRoleMenuServiceImpl.java`

- [ ] **Step 1: Add `rebuild` method to ISysRoleMenuService interface**

In `ISysRoleMenuService.java`, add inside the interface:

```java
    /**
     * 重新建立角色菜单关系
     *
     * @param roleId  角色ID
     * @param menuIds 菜单ID数组
     * @throws Exception 异常
     */
    void rebuild(String roleId, String[] menuIds) throws Exception;
```

- [ ] **Step 2: Implement `rebuild` in SysRoleMenuServiceImpl**

In `SysRoleMenuServiceImpl.java`, replace the entire class body with:

```java
@Service
public class SysRoleMenuServiceImpl extends ServiceImpl<SysRoleMenuMapper, SysRoleMenu> implements ISysRoleMenuService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void rebuild(String roleId, String[] menuIds) throws Exception {
        // Remove all existing role-menu mappings
        QueryWrapper<SysRoleMenu> deleteWrapper = new QueryWrapper<>();
        deleteWrapper.eq("role_id", roleId);
        remove(deleteWrapper);

        // Insert new role-menu mappings
        if (menuIds != null && menuIds.length > 0) {
            for (String menuId : menuIds) {
                if (StringUtils.isEmpty(menuId)) {
                    continue;
                }
                SysRoleMenu sysRoleMenu = new SysRoleMenu();
                sysRoleMenu.setRoleId(roleId);
                sysRoleMenu.setMenuId(menuId);
                save(sysRoleMenu);
            }
        }
    }
}
```

Add these imports at the top of the file:

```java
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.system.entity.SysRoleMenu;
import org.apache.commons.lang3.StringUtils;
import org.springframework.transaction.annotation.Transactional;
```

- [ ] **Step 3: Verify compilation**

```bash
cd mes && mvn compile -pl . -am -q
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/service/ISysRoleMenuService.java \
        mes/src/main/java/com/wangziyang/mes/system/service/impl/SysRoleMenuServiceImpl.java
git commit -m "feat: add rebuild method to SysRoleMenuService for role-menu assignment"
```

---

### Task 5: Backend — SysRoleController Enhancements

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysRoleController.java`

- [ ] **Step 1: Add imports and inject SysRoleMenuService**

Add these imports:

```java
import com.wangziyang.mes.system.dto.SysRoleDTO;
import com.wangziyang.mes.system.entity.SysRoleMenu;
import com.wangziyang.mes.system.service.ISysRoleMenuService;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;
import java.util.stream.Collectors;
```

Add injection after `sysRoleService`:

```java
    @Autowired
    private ISysRoleMenuService sysRoleMenuService;
```

- [ ] **Step 2: Add `tree/{roleId}` endpoint**

Add before the closing `}` of the class:

```java
    @GetMapping("/tree/{roleId}")
    @ResponseBody
    public Result tree(@PathVariable String roleId) {
        QueryWrapper<SysRoleMenu> qw = new QueryWrapper<>();
        qw.eq("role_id", roleId);
        List<SysRoleMenu> list = sysRoleMenuService.list(qw);
        List<String> menuIds = list.stream()
                .map(SysRoleMenu::getMenuId)
                .collect(Collectors.toList());
        return Result.success(menuIds);
    }
```

- [ ] **Step 3: Modify `addOrUpdate` to handle `sysMenuIds`**

Replace the existing `addOrUpdate` method:

```java
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SysRoleDTO record) throws Exception {
        sysRoleService.saveOrUpdate(record);
        if (record.getSysMenuIds() != null) {
            sysRoleMenuService.rebuild(record.getId(), record.getSysMenuIds());
        }
        return Result.success(record.getId());
    }
```

- [ ] **Step 4: Verify compilation**

```bash
cd mes && mvn compile -pl . -am -q
```

Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysRoleController.java
git commit -m "feat: add menu tree endpoint and sysMenuIds handling to SysRoleController"
```

---

### Task 6: Frontend — TypeScript Types

**Files:**
- Modify: `mes/frontend/src/types/user.ts`

- [ ] **Step 1: Add `isSystem` and `sysMenuIds` to SysRole interface**

In `user.ts`, update the `SysRole` interface:

```typescript
export interface SysRole {
  id: string
  name: string
  code: string
  descr: string
  deleted: string
  isSystem?: string    // "0"=normal, "1"=system role
  sysMenuIds?: string[]  // menu IDs for tree checkbox state
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd mes/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/types/user.ts
git commit -m "feat: add isSystem and sysMenuIds to SysRole type"
```

---

### Task 7: Frontend — Role API

**Files:**
- Modify: `mes/frontend/src/api/system/role.ts`

- [ ] **Step 1: Add `getRoleMenuTree` function**

In `role.ts`, add after the existing functions:

```typescript
export function getRoleMenuTree(roleId: string) {
  return client.get(`/admin/sys/role/tree/${roleId}`) as Promise<string[]>
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd mes/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/api/system/role.ts
git commit -m "feat: add getRoleMenuTree API function"
```

---

### Task 8: Frontend — RoleForm with Menu Tree Selector

**Files:**
- Modify: `mes/frontend/src/pages/system/RoleForm.tsx`

- [ ] **Step 1: Rewrite RoleForm.tsx with menu tree and isSystem field**

Replace the entire content of `RoleForm.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Form, Input, Radio, Tree, Divider } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { DataNode } from 'antd/es/tree'
import * as roleApi from '@/api/system/role'
import * as menuApi from '@/api/system/menu'
import type { TreeVO, SysMenu } from '@/types/menu'

interface RoleFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function convertToTreeData(nodes: TreeVO<SysMenu>[]): DataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: node.name,
    children: node.children ? convertToTreeData(node.children) : undefined,
  }))
}

function getAllKeys(nodes: TreeVO<SysMenu>[]): string[] {
  const keys: string[] = []
  const walk = (list: TreeVO<SysMenu>[]) => {
    list.forEach((node) => {
      keys.push(node.id)
      if (node.children && node.children.length > 0) {
        walk(node.children)
      }
    })
  }
  walk(nodes)
  return keys
}

function RoleForm({ id, onFinish, formInstance }: RoleFormProps) {
  const [menuTree, setMenuTree] = useState<TreeVO<SysMenu>[]>([])
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [treeLoading, setTreeLoading] = useState(false)

  // Load menu tree
  useEffect(() => {
    setTreeLoading(true)
    menuApi.tree().then((data: any) => {
      const treeData = Array.isArray(data) ? data : (data as any)?.data ?? []
      setMenuTree(treeData)
    }).finally(() => setTreeLoading(false))
  }, [])

  // In edit mode, load role data and checked menu IDs
  useEffect(() => {
    if (id) {
      roleApi.getById(id).then((res: any) => {
        formInstance.setFieldsValue(res)
        // If the response includes sysMenuIds, use them
        if (res.sysMenuIds) {
          setCheckedKeys(res.sysMenuIds)
        }
      })
      // Also fetch role menu tree for checked state
      roleApi.getRoleMenuTree(id).then((menuIds: any) => {
        const ids = Array.isArray(menuIds) ? menuIds : (menuIds as any)?.data ?? []
        setCheckedKeys(ids)
      }).catch(() => {
        // Ignore if endpoint not available yet
      })
    } else {
      setCheckedKeys([])
    }
  }, [id, formInstance])

  const handleFinish = (values: any) => {
    onFinish?.({
      ...values,
      sysMenuIds: checkedKeys,
    })
  }

  const allKeys = getAllKeys(menuTree)

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ deleted: '0', isSystem: '0' }}
    >
      <Form.Item
        name="name"
        label="角色名称"
        rules={[{ required: true, message: '请输入角色名称' }]}
      >
        <Input placeholder="请输入角色名称" />
      </Form.Item>

      <Form.Item
        name="code"
        label="角色编码"
        rules={[{ required: true, message: '请输入角色编码' }]}
      >
        <Input placeholder="请输入角色编码" />
      </Form.Item>

      <Form.Item
        name="descr"
        label="描述"
      >
        <Input.TextArea rows={3} placeholder="请输入描述" />
      </Form.Item>

      <Form.Item
        name="isSystem"
        label="系统角色"
      >
        <Radio.Group>
          <Radio value="0">否</Radio>
          <Radio value="1">是</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        name="deleted"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <Radio.Group>
          <Radio value="0">正常</Radio>
          <Radio value="1">已删除</Radio>
          <Radio value="2">已禁用</Radio>
        </Radio.Group>
      </Form.Item>

      <Divider>授权菜单</Divider>

      <Form.Item label="菜单权限">
        {menuTree.length > 0 ? (
          <Tree
            checkable
            defaultExpandAll
            checkedKeys={checkedKeys}
            onCheck={(keys: any) => setCheckedKeys(keys as string[])}
            treeData={convertToTreeData(menuTree)}
            style={{ maxHeight: 400, overflow: 'auto' }}
          />
        ) : (
          <span style={{ color: '#999' }}>{treeLoading ? '加载中...' : '暂无菜单数据'}</span>
        )}
      </Form.Item>

      {/* Hidden field to carry all keys for unchecked state detection */}
      <Form.Item name="allMenuKeys" hidden initialValue={allKeys}>
        <Input />
      </Form.Item>
    </Form>
  )
}

export default RoleForm
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd mes/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/pages/system/RoleForm.tsx
git commit -m "feat: add menu tree selector and isSystem toggle to RoleForm"
```

---

### Task 9: Frontend — RoleList with System Role UI

**Files:**
- Modify: `mes/frontend/src/pages/system/RoleList.tsx`

- [ ] **Step 1: Update RoleList.tsx**

Replace the entire content of `RoleList.tsx`:

```tsx
import { useState } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message, Space } from 'antd'
import { PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as roleApi from '@/api/system/role'
import RoleForm from './RoleForm'
import type { SysRole } from '@/types/user'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
  '2': { text: '已禁用', color: 'orange' },
}

export default function RoleList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()

  // Fetch role list
  const { data, isLoading } = useQuery({
    queryKey: ['roles', pagination, filters],
    queryFn: () =>
      roleApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  // Add / Edit mutation
  const saveMutation = useMutation({
    mutationFn: (values: SysRole & { sysMenuIds?: string[] }) =>
      roleApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })

  // Delete mutation (soft delete via addOrUpdate)
  const deleteMutation = useMutation({
    mutationFn: (record: SysRole) =>
      roleApi.addOrUpdate({ ...record, deleted: '1' }),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }

  const handleReset = () => {
    setFilters({})
    reset()
  }

  const handleAdd = () => {
    setEditId(null)
    formInstance.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: SysRole) => {
    setEditId(record.id)
    formInstance.resetFields()
    setModalOpen(true)
  }

  const handleAuthMenu = (record: SysRole) => {
    setEditId(record.id)
    formInstance.resetFields()
    setModalOpen(true)
  }

  const handleDelete = (record: SysRole) => {
    deleteMutation.mutate(record)
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setEditId(null)
    formInstance.resetFields()
  }

  const handleFormFinish = (values: Record<string, unknown>) => {
    saveMutation.mutate({
      ...values,
      id: editId || undefined,
    })
  }

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '描述',
      dataIndex: 'descr',
      key: 'descr',
    },
    {
      title: '系统角色',
      dataIndex: 'isSystem',
      key: 'isSystem',
      render: (val: string) =>
        val === '1' ? (
          <Tag color="blue">系统角色</Tag>
        ) : (
          <Tag color="default">普通角色</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'deleted',
      key: 'deleted',
      render: (val: string) => {
        const status = statusMap[val] || { text: val, color: 'default' }
        return <Tag color={status.color}>{status.text}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SysRole) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => handleAuthMenu(record)}
          >
            授权菜单
          </Button>
          {record.isSystem !== '1' && (
            <Popconfirm title="确定要删除该角色吗？" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="name">
          <Input placeholder="角色名称" />
        </Form.Item>
      </SearchForm>

      <PageTable
        rowKey="id"
        columns={columns}
        dataSource={ensureArray(data?.records)}
        loading={isLoading}
        total={data?.total || 0}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
        }}
        onChange={onChange}
        toolbar={
          <PermissionGuard perm="role:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑角色' : '新增角色'}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <RoleForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd mes/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/pages/system/RoleList.tsx
git commit -m "feat: add system role column, auth menu button, and conditional delete to RoleList"
```

---

### Task 10: Integration Verification

- [ ] **Step 1: Build backend**

```bash
cd mes && mvn compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 2: Build frontend**

```bash
cd mes/frontend && npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Start backend and verify the tree endpoint works**

```bash
cd mes && mvn spring-boot:run &
# Wait for startup, then:
curl -s http://localhost:9090/admin/sys/role/tree/1185025876737396738 | python3 -m json.tool
```

Expected: Returns a JSON array of menu IDs assigned to the super admin role, e.g., `["1", "2", "3", "101", "102", "103", "104"]`.

- [ ] **Step 4: Verify menu tree endpoint for role form**

```bash
curl -s http://localhost:9090/admin/sys/menu/tree | python3 -m json.tool
```

Expected: Returns the full menu tree structure as JSON.

- [ ] **Step 5: Commit any final adjustments**

```bash
git status
git add -A
git commit -m "chore: final integration adjustments for role management"
```
