# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MES (Manufacturing Execution System) — "章鱼师兄", a full-stack monolith for factory production management. Covers system administration, master data, process/technology management, production orders, quality management, equipment management, and SN code management.

## Tech Stack

- **Backend**: Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2, Apache Shiro 1.4.0
- **Frontend (active)**: React 19 + TypeScript + Vite 8 + shadcn/Radix UI (`@workspace/ui`) + Tailwind CSS 4 + react-hook-form + zod + Zustand + React Router v7 — lives in `mes/frontend/apps/mes-new`
- **Frontend (OLD, retained for reference)**: Freemarker (`.ftl`) templates + Layui + jQuery (in `templates/`)
- **Database**: MySQL 8 with Druid connection pool
- **Cache**: Ehcache (local) or Redis (configurable via `spring.cache.type`)
- **Build**: Maven (use `mvnw` wrapper), Docker via `spotify/docker-maven-plugin`. Frontend build integrated via `frontend-maven-plugin`.

## Common Commands

```bash
# Build everything (frontend + backend)
cd mes && mvn clean package -DskipTests

# Build frontend only (pnpm monorepo root → builds apps/mes-new)
cd mes/frontend && pnpm build

# Dev: start backend (port 9090)
cd mes && mvn spring-boot:run

# Dev: start frontend dev server (port 4100, proxies /api → localhost:9090)
cd mes/frontend && pnpm dev

# TypeScript check
cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit

# Lint
cd mes/frontend && pnpm lint

# Run tests
cd mes && mvn test
cd mes && mvn test -Dtest=ClassName#methodName

# Build Docker image
cd mes && mvn docker:build
```

## Architecture

### Package Structure (under `com.wangziyang.mes`)

```
mes/src/main/java/com/wangziyang/mes/
├── SparchetypeApplication.java    # Entry point, @MapperScan on **.mapper*
├── common/                        # Shared infrastructure
│   ├── BaseEntity.java            # Snowflake ID, auto-filled create/update timestamps
│   ├── BaseController.java        # Helper to get current Shiro user
│   ├── BasePageReq.java           # Paging request base (extends MyBatis-Plus Page)
│   ├── Result.java                # Uniform API response {code, data, msg}
│   ├── advice/                    # Global exception handler, error view resolver
│   ├── config/                    # MyBatis-Plus, JSON, Freemarker-Shiro tag config
│   ├── enums/CommonEnum.java      # Shared enums
│   └── util/                      # CodeGenerator, TreeUtil, IdUtil, HashUtil
├── system/                        # User/Role/Menu/Dept/Dict + Shiro security
│   ├── config/shiro/              # ShiroConfig, ShiroRealm, Redis cache/session, retry-limit
│   └── controller/
│       ├── admin/                 # Admin-facing controllers (auth required)
│       └── client/                # Public login controller
├── basedata/                      # Master data: dynamic table config, materials
├── technology/                    # Process route (Flow), BOM, Operations
├── order/                         # Production orders
├── digitization/                  # Dashboard/echarts data API
└── dst/                           # (placeholder module)
```

### Layered Pattern (per module)

Each module follows: `controller` → `service`/`service/impl` → `mapper` + `entity`/`dto`/`request`/`vo`.

- **Controllers** return either Freemarker view names (`@Controller` + `String` return) or JSON (`@ResponseBody` + `Result`). Admin controllers extend `BaseController`.
- **Services** extend MyBatis-Plus `IService<T>` / `ServiceImpl<M, T>`. DTO objects handle input for create/update operations; entities are direct DB mappings.
- **Mappers** extend MyBatis-Plus `BaseMapper<T>`. Complex queries go in `src/main/resources/mapper/<module>/*.xml`.
- **Request** objects extend `BasePageReq` for paged list queries — each table gets its own request class (e.g., `SysUserPageReq`).
- **Password hashing**: MD5 × 3 iterations with username as salt (see `SysUserServiceImpl.save()`).

### Frontend (React SPA — `mes/frontend/apps/mes-new`)

> **⚠️ 当前唯一活跃前端 = `mes/frontend/apps/mes-new`（包名 `mes-new`）。** 旧的 `apps/mes1`（Ant Design 版）与 Vue3 作业前端 `mes/vue3` 已删除，仅可在 tag `pre-remove-vue3-mes1` 中找回。改前端一律在 `apps/mes-new` 下操作。
> **设计/UI 约定**：科技蓝设计系统（令牌在本地 `src/styles.css`）+ 动画基元（`src/motion/`），新页面复用既有样板（参考 `pages/system/user/UserList.tsx`），不要另起一套丑 UI。栈为 shadcn/Radix（`@workspace/ui`）+ react-hook-form + zod；全局 `StrictMode` 已**故意关闭**（避免 3D 数字孪生大屏丢失 WebGL 上下文），勿重开；RHF 字段名禁用 `nodeName` 等 DOM 属性名（否则提交崩溃）。

The active SPA lives in `mes/frontend/apps/mes-new` inside the `mes/frontend/` pnpm workspace (`pnpm-workspace.yaml` globs `apps/*` + `packages/*`; shared UI in `packages/` imported via `@workspace/ui`). It replaces the old Freemarker server-rendered templates. Dev server runs on `:4100` and proxies `/api → localhost:9090`; the Maven `frontend-maven-plugin` builds it via `pnpm --filter mes-new build`.

`src/` top-level: `api/` (per-module API functions) · `http/` (axios instance `client.ts` + `interceptors.ts` + `formBody.ts` form-encoding + `result.ts` Result unwrap + `queryCache.ts`/`hooks.ts` 自研查询缓存层) · `stores/` (Zustand) · `layouts/` (`AdminLayout`) · `components/` (shared CRUD blocks, shadcn/Radix) · `pages/` (per module: login / system / basedata / technology / order / digitization) · `hooks/` · `lib/` · `types/` · `utils/` · `router.tsx` (集中路由表) · `styles.css` (设计令牌).

**Backend contract (framework-agnostic — applies regardless of which frontend):**
- **Form-encoding** (`http/formBody.ts`): POST requests default to `application/x-www-form-urlencoded`. Two endpoints (`/basedata/manager/add-or-update`, `/basedata/flow/process/add-or-update`) use `@RequestBody` JSON — their API functions set `Content-Type: application/json` explicitly to opt out. (`/admin/sys/role/add-or-update` may be a third JSON endpoint — verify against the controller.)
- **Result wrapper** (`http/result.ts`): backend returns `Result<T>` = `{code, data, msg}`; the response interceptor unwraps `code===0` → `data`, otherwise surfaces `msg`, HTTP 401 → redirect to `/login`.
- **Pagination**: request params `current` (page number) + `size` (page size). Response from MyBatis-Plus IPage: `{ records, total, size, current, pages }`.
- **Permissions (RBAC)**: login loads the menu tree from `/admin/list/index/menu/tree` (backend prunes by role; `admin` is allowed through) and collects all `permission` strings into a `Set` used to gate menus, buttons, and routes. New pages must match a preset `sp_sys_menu` `url` to be reachable, and be registered in `router.tsx`.
- **CRUD pattern**: every list page = SearchForm → paged table → modal form (react-hook-form + zod). Follow `pages/system/user/UserList.tsx` and `UserForm.tsx` as the reference. Note: the data layer is the in-repo query-cache hooks (`http/queryCache.ts`/`hooks.ts`), **not** TanStack Query.

### Frontend (Old — retained for reference)

- Templates live in `src/main/resources/templates/`.
- Static assets in `src/main/resources/static/` (old jQuery/Layui/ECharts/Three.js — replaced by React build output).
- Freemarker integrates Shiro tags for permission-based rendering.

### Security (Apache Shiro)

- `ShiroConfig` defines filter chain: static assets and `/login` are anonymous; everything else requires `authc`.
- `SpLoginFormFilter` replaces the default `FormAuthenticationFilter`.
- Cache/session storage switches between Ehcache and Redis based on `spring.cache.type` config value.
- Login retry limiting via `RetryLimitCredentialsMatcher` backed by Ehcache `loginRetryCache`.

### Database

- Schema: `scripts/sql/MySQL-20210225.sql`
- MyBatis-Plus `SpMetaObjectHandler` auto-fills `createTime`, `createUsername`, `updateTime`, `updateUsername` from the current Shiro principal.
- ID strategy: `IdType.ID_WORKER_STR` (snowflake algorithm).

### Deployment

- `Dockerfile` based on `openjdk:8-jdk-alpine`, exposes port 80.
- Production uses Nginx reverse proxy in front of the Spring Boot jar.
- CI/CD via Jenkins (referenced but config not in repo).

## Configuration Profiles

- `application.yml` — shared config, defaults to `dev` profile
- `application-dev.yml` — port 9090, MySQL at `192.168.52.76:3306/sparchetype`, local Redis
- `application-pro.yml` — production overrides (DB credentials externalized)
