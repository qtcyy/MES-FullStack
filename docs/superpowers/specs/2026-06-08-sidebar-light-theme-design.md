# Sidebar Light Theme — Design Spec

**Date**: 2026-06-08  
**Status**: approved  
**Branch**: `feature/ui-optimization`

## Goal

Switch sidebar from dark theme to a light blue soft style while preserving existing layout and functionality.

## Design

| Element | Current | New |
|---------|---------|-----|
| `Layout.Sider` theme | `"dark"` | `"light"` |
| Sider background | default dark | `#e8f4fd` |
| `Menu` theme | `"dark"` | `"light"` |
| Logo text color | `#fff` | `#1677ff` |
| Logo border-bottom | `rgba(255,255,255,0.1)` | `rgba(22,119,255,0.15)` |
| Menu scrollbar thumb | `rgba(255,255,255,0.2)` | `rgba(22,119,255,0.25)` |
| Collapse trigger | auto (white) | auto (dark, from light theme) |

### Non-goals

- No layout structure change
- No icon/logic/state change
- No new dependencies

### Files

- `mes/frontend/src/layouts/AdminLayout.tsx` — Sider theme + background, Menu theme
- `mes/frontend/src/index.css` — Logo colors, scrollbar colors
