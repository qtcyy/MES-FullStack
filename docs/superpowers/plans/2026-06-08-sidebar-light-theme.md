# Sidebar Light Theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch sidebar from dark to light blue soft theme.

**Architecture:** Change Sider/Menu theme props, update CSS colors for logo and scrollbar.

**Tech Stack:** React, Ant Design 5, CSS

---

### Task 1: Update CSS for light theme

**Files:**
- Modify: `mes/frontend/src/index.css`

- [ ] **Step 1: Update logo and scrollbar styles**

Replace the dark-theme colors with light-theme blue tones:

```css
/* Logo area in the sidebar */
.admin-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  color: #1677ff;
  font-weight: bold;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 16px;
  border-bottom: 1px solid rgba(22, 119, 255, 0.15);
}

/* ... */

.admin-menu-scroll::-webkit-scrollbar-thumb {
  background: rgba(22, 119, 255, 0.25);
  border-radius: 2px;
}
```

---

### Task 2: Switch Sider and Menu theme props

**Files:**
- Modify: `mes/frontend/src/layouts/AdminLayout.tsx`

- [ ] **Step 1: Change Sider theme and background**

Replace `theme="dark"` with `theme="light"` and add light blue background:

```tsx
<Layout.Sider
  collapsible
  collapsed={sidebarCollapsed}
  onCollapse={toggleSidebar}
  theme="light"
  width={256}
  style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#e8f4fd' }}
>
```

- [ ] **Step 2: Change Menu theme**

Replace `theme="dark"` with `theme="light"`:

```tsx
<Menu
  theme="light"
  mode="inline"
  ...
/>
```

---

### Task 3: Verify

- [ ] **Step 1:** TypeScript check: `cd mes/frontend && ./node_modules/.bin/tsc --noEmit`
- [ ] **Step 2:** Visual check at `http://localhost:3000` — sidebar is light blue with dark text
- [ ] **Step 3:** Verify scrollbar is visible on light background

---

### Task 4: Commit

```bash
git add mes/frontend/src/index.css mes/frontend/src/layouts/AdminLayout.tsx docs/superpowers/
git commit -m "💄 style: switch sidebar to light blue theme"
```
