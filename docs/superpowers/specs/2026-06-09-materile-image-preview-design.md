# 物料列表图片点击放大 — 设计文档

**日期**: 2026-06-09
**状态**: 已确认

## 概述

在 `/basedata/materile` 物料列表页中，将图片列从普通 `<img>` 替换为 Ant Design `<Image>` 组件，支持点击放大预览、缩放拖拽、旋转翻转，以及加载失败时的兜底占位图。

## 功能需求

| 功能 | 说明 |
|------|------|
| 点击放大 | 点击缩略图弹出全屏遮罩层预览大图 |
| 缩放/拖拽 | 预览模式下滚轮缩放、拖拽平移 |
| 旋转/翻转 | 预览工具栏：左旋、右旋、水平翻转、垂直翻转 |
| 加载失败兜底 | 图片 URL 失效时显示占位 SVG 而非空白/裂图 |

所有预览功能（缩放、拖拽、旋转、翻转）均为 Ant Design `Image` 组件自带能力，无需额外开发。

## 实现方案

**改动文件：** `mes/frontend/src/pages/basedata/MaterileList.tsx`

将图片列 render 函数中第 150 行的 `<img>` 替换为 `<Image>`：

```tsx
// Before:
v ? <img src={v} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '-',

// After:
v ? (
  <Image
    src={v}
    width={40}
    height={40}
    style={{ objectFit: 'cover', borderRadius: 4 }}
    fallback="data:image/svg+xml;base64,..." // 占位 SVG
  />
) : '-',
```

- 新增 `import { Image } from 'antd'`（如未导入）
- 无后端改动
- 无新依赖

## 占位 SVG

```
<svg width="40" height="40">
  <rect fill="#f0f0f0" width="40" height="40"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ccc" font-size="8">图片</text>
</svg>
```
