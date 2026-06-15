import { describe, it, expect } from 'vitest'
import { collectPermissions } from '@/stores/permissions'
import type { TreeVO, SysMenu } from '@/types/menu'

describe('collectPermissions', () => {
  it('递归收集所有非空 permission', () => {
    const tree: Record<string, TreeVO<SysMenu>> = {
      '1': {
        id: '1',
        name: '系统',
        permission: '',
        children: [
          { id: '2', name: '用户', permission: 'user:list', children: [
            { id: '3', name: '新增', permission: 'user:add' },
          ] },
          { id: '4', name: '角色', permission: 'role:list' },
        ],
      },
    }
    const perms = collectPermissions(tree)
    expect(perms.has('user:list')).toBe(true)
    expect(perms.has('user:add')).toBe(true)
    expect(perms.has('role:list')).toBe(true)
    expect(perms.size).toBe(3)
  })
})
