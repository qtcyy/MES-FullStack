import MarkdownIt from 'markdown-it'

// html:false → 禁止原始 HTML 注入，防 XSS；linkify 自动识别链接；breaks 单换行转 <br>
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

/** 渲染 markdown 为 HTML 字符串（已转义原始 HTML） */
export function renderMarkdown(src: string): string {
  return md.render(src ?? '')
}
