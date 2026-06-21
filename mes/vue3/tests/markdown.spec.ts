import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/utils/markdown'

describe('renderMarkdown', () => {
  it('渲染标题', () => {
    expect(renderMarkdown('# 标题')).toContain('<h1>')
  })

  it('渲染无序列表', () => {
    const html = renderMarkdown('- a\n- b')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>a</li>')
  })

  it('禁用原始 HTML（html:false 防 XSS）', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('空输入返回空串不报错', () => {
    expect(renderMarkdown('')).toBe('')
    // @ts-expect-error 故意传 undefined
    expect(renderMarkdown(undefined)).toBe('')
  })
})
