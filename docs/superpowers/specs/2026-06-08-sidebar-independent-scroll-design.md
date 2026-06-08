# Sidebar Independent Scroll — Design Spec

**Date**: 2026-06-08  
**Status**: approved

## Goal

Make the sidebar menu scroll independently from the main content area. Currently the entire page scrolls as one unit; after this change, the sidebar stays fixed and its menu scrolls internally when items overflow, while the main content area scrolls independently.

## Design

**Approach**: CSS flex column layout within the existing Ant Design `Layout.Sider`.

### Layout Structure

```
height: 100vh, overflow: hidden (root)
├── Sider (display: flex, flex-direction: column, height: 100vh)
│   ├── Logo (flex-shrink: 0, height: 64px)
│   ├── .admin-menu-scroll (flex: 1, overflow-y: auto)
│   │   └── <Menu />
│   └── Collapse trigger (auto)
└── Main Layout (height: 100vh)
    ├── Header (64px)
    ├── Tabs (auto)
    └── Content (flex: 1, overflow-y: auto)
        └── <Outlet />
```

### Changes

| File | Change |
|------|--------|
| `AdminLayout.tsx` | Root `Layout`: `height: '100vh'` + `overflow: 'hidden'` |
| `AdminLayout.tsx` | `Layout.Sider`: flex column + `height: '100vh'` |
| `AdminLayout.tsx` | Wrap `<Menu>` in `<div className="admin-menu-scroll">` |
| `AdminLayout.tsx` | Inner `Layout`: `height: '100vh'` |
| `AdminLayout.tsx` | `Layout.Content`: `flex: 1` + `overflowY: 'auto'` |
| `index.css` | Add `.admin-menu-scroll` styles with thin scrollbar |

### Non-goals

- Not changing the collapse animation or trigger
- Not changing menu open/select logic
- No new npm dependencies
- No changes to routing, tabs, or auth

### Risks

- Low risk. Change is scoped to layout CSS only. Collapse width transition may need verification.
