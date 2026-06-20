import { describe, it, expect } from 'vitest'
import { collectPermissions, flattenMenu } from '@/utils/permission'
import type { MenuInfo } from '@/types/menu'

const sample: MenuInfo['menuInfo'] = {
  system: {
    id: '10',
    name: '系统管理',
    permission: '',
    url: '#',
    children: [
      { id: '101', name: '菜单管理', url: '/admin/sys/menu/list-ui', permission: 'menu:add' },
      { id: '102', name: '用户管理', url: '/admin/sys/user/list-ui', permission: 'user:add' },
      { id: '103', name: '空 url 目录', url: '', permission: '' },
    ],
  },
}

describe('collectPermissions', () => {
  it('递归收集所有非空 permission', () => {
    const set = collectPermissions(sample)
    expect(set.has('menu:add')).toBe(true)
    expect(set.has('user:add')).toBe(true)
    expect(set.size).toBe(2)
  })
  it('传入 null 返回空集合', () => {
    expect(collectPermissions(null).size).toBe(0)
  })
})

describe('flattenMenu', () => {
  it('只拍平出带有效 url(非 #/空)的叶子', () => {
    const leaves = flattenMenu(sample)
    expect(leaves.map((m) => m.url)).toEqual([
      '/admin/sys/menu/list-ui',
      '/admin/sys/user/list-ui',
    ])
  })
})
