# Sidebar Independent Scroll — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sidebar menu scroll independently from main content area using CSS flex layout.

**Architecture:** Convert Sider into a flex column: fixed-height logo at top, scrollable menu area (`flex: 1; overflow-y: auto`), and lock the main content area to viewport height with its own scroll.

**Tech Stack:** React + TypeScript, Ant Design 5, CSS

---

### Task 1: Add menu scroll CSS

**Files:**
- Modify: `mes/frontend/src/index.css` (after line 39)

- [ ] **Step 1: Add `.admin-menu-scroll` styles**

Append after the existing `.admin-tabs` block:

```css
/* Sidebar menu scroll area */
.admin-menu-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.admin-menu-scroll::-webkit-scrollbar {
  width: 4px;
}

.admin-menu-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.admin-menu-scroll::-webkit-scrollbar-track {
  background: transparent;
}
```

- [ ] **Step 2: Verify CSS syntax**

Run: `cd mes/frontend && npx tsc --noEmit` (CSS change only, just confirm no build break)

---

### Task 2: Update AdminLayout styles

**Files:**
- Modify: `mes/frontend/src/layouts/AdminLayout.tsx` (lines 196-216, 218-296)

- [ ] **Step 1: Change root Layout style**

Replace line 196:
```tsx
<Layout style={{ minHeight: '100vh' }}>
```
with:
```tsx
<Layout style={{ height: '100vh', overflow: 'hidden' }}>
```

- [ ] **Step 2: Add flex column style to Sider**

Replace line 198-203:
```tsx
      <Layout.Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={toggleSidebar}
        theme="dark"
        width={256}
      >
```
with:
```tsx
      <Layout.Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={toggleSidebar}
        theme="dark"
        width={256}
        style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
      >
```

- [ ] **Step 3: Wrap Menu in scrollable div**

Replace lines 207-215:
```tsx
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
        />
```
with:
```tsx
        <div className="admin-menu-scroll">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </div>
```

- [ ] **Step 4: Set inner Layout height**

Replace line 219:
```tsx
      <Layout>
```
with:
```tsx
      <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
```

- [ ] **Step 5: Make Content scrollable**

Replace lines 288-296:
```tsx
        <Layout.Content
          style={{
            margin: 16,
            padding: 24,
            background: '#fff',
            minHeight: 280,
          }}
        >
```
with:
```tsx
        <Layout.Content
          style={{
            margin: 16,
            padding: 24,
            background: '#fff',
            flex: 1,
            overflowY: 'auto',
          }}
        >
```

- [ ] **Step 6: Verify TypeScript compilation**

Run: `cd mes/frontend && npx tsc --noEmit`

- [ ] **Step 7: Visual verification**

Run: `cd mes/frontend && npm run dev` and check at `http://localhost:3000` that:
- Sidebar stays fixed when scrolling content
- Menu scrolls internally when items overflow viewport
- Collapse/expand still works
- Tab navigation still works

- [ ] **Step 8: Commit**

```bash
git add mes/frontend/src/index.css mes/frontend/src/layouts/AdminLayout.tsx docs/superpowers/
git commit -m "💄 style: make sidebar menu scroll independently from main content"
```
