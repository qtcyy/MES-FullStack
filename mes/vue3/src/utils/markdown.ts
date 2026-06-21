import MarkdownIt from 'markdown-it'

// html:false → 禁止原始 HTML 注入，防 XSS；linkify 自动识别链接；breaks 单换行转 <br>
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

// 链接在新标签打开，避免点击外链顶掉整个 SPA；rel 防 window.opener 反向控制
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/** 渲染 markdown 为 HTML 字符串（已转义原始 HTML） */
export function renderMarkdown(src: string): string {
  return md.render(src ?? '')
}
