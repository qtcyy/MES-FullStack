# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MES (Manufacturing Execution System) — "章鱼师兄", a full-stack monolith for factory production management. Covers system administration, master data, process/technology management, production orders, quality management, equipment management, and SN code management.

## Tech Stack

- **Backend**: Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2, Apache Shiro 1.4.0
- **Frontend (NEW)**: React 18 + TypeScript + Vite 5 + Ant Design 5 + TanStack Query + Zustand + React Router v6
- **Frontend (OLD, retained for reference)**: Freemarker (`.ftl`) templates + Layui + jQuery (in `templates/`)
- **Database**: MySQL 8 with Druid connection pool
- **Cache**: Ehcache (local) or Redis (configurable via `spring.cache.type`)
- **Build**: Maven (use `mvnw` wrapper), Docker via `spotify/docker-maven-plugin`. Frontend build integrated via `frontend-maven-plugin`.

## Common Commands

```bash
# Build everything (frontend + backend)
cd mes && mvn clean package -DskipTests

# Build frontend only (pnpm monorepo root → builds apps/mes1)
cd mes/frontend && pnpm build

# Dev: start backend (port 9090)
cd mes && mvn spring-boot:run

# Dev: start frontend dev server (port 4000, proxies /api → localhost:9090)
cd mes/frontend && pnpm dev

# TypeScript check
cd mes/frontend && pnpm --filter mes1 exec tsc --noEmit

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

### Frontend (React SPA)

> **⚠️ 当前活跃前端 = `mes/frontend/apps/mes-new`，不要去看/改 `apps/mes1`。**
> 最近所有前端开发都围绕 `apps/mes-new` 进行（dev server 实际跑在 `:4100`）。`apps/mes1`（下面文档描述的 Ant Design 版本）已弃用，仅作历史参考，**不要在它里面定位或修改文件**。
> 注意两者技术栈不同：`mes-new` 使用 shadcn/Radix UI（`@workspace/ui`）+ react-hook-form + zod，而 `mes1` 是 Ant Design 5。改前端前先确认在 `apps/mes-new` 下操作。

The React SPA lives in `mes/frontend/` — a pnpm workspace (monorepo). The root holds `pnpm-workspace.yaml` + root `package.json`; the app itself is `mes/frontend/apps/mes1/` (package name `mes1`), with `mes/frontend/packages/` reserved for shared packages. It replaces the old Freemarker server-rendered templates.

```
mes/frontend/apps/mes1/src/
├── api/                    # API call functions per module
│   ├── client.ts           # axios instance: form-encoding, Result unwrap, 401 handling
│   ├── auth.ts             # login, logout, captcha, userInfo
│   ├── menu.ts             # menu tree API
│   └── system|basedata|technology|order|digitization/
├── stores/                 # Zustand state management
│   ├── authStore.ts        # user, permissions (Set<string>), login/logout/hasPermission
│   ├── menuStore.ts        # menu tree, sidebar collapsed, selected/open keys
│   └── appStore.ts         # tabs (multi-tab nav), theme color
├── layouts/
│   └── AdminLayout.tsx     # Ant Layout: Sider (menu tree) + Header (user dropdown) + Tabs + Content(Outlet)
├── components/             # Shared CRUD building blocks
│   ├── PageTable.tsx       # Ant Table wrapper: server pagination, toolbar, size changer
│   ├── ModalForm.tsx       # Modal + Form: replaces spLayer iframe dialogs
│   ├── SearchForm.tsx      # Inline search form with 搜索/重置 buttons
│   ├── PageContainer.tsx   # Consistent page wrapper
│   ├── PrivateRoute.tsx    # Auth guard: redirects to /login if not authenticated
│   └── PermissionGuard.tsx # Renders children only if user has the required permission
├── pages/
│   ├── login/              # LoginPage + CaptchaImage
│   ├── welcome/            # Dashboard home
│   ├── system/             # User, Role, Menu, Dict, Dept (CRUD)
│   ├── basedata/           # Materile, Manager, ManagerItem (dynamic table CRUD)
│   ├── technology/         # BOM, Flow, FlowProcess (Transfer shuttle)
│   ├── order/              # Production orders
│   ├── digitization/       # PlanDashboard (ECharts), Simulation3D (Three.js)
│   └── error/              # 403, 404, 500
├── hooks/                  # usePagination, usePermission
├── types/                  # TypeScript interfaces (api.ts, user.ts, menu.ts, common.ts)
└── utils/                  # iconMap (Font Awesome → Ant Design icons)
```

**Key patterns:**
- **API client** (`api/client.ts`): axios request interceptor converts JSON to form-encoded (`application/x-www-form-urlencoded`) for all POST requests. Two endpoints (`/basedata/manager/add-or-update`, `/basedata/flow/process/add-or-update`) use `@RequestBody` JSON — their API functions set `Content-Type: application/json` explicitly to skip the transform. Response interceptor unwraps backend `Result<T>` wrapper: `code===0` → return `data`, `code!==0` → `message.error(msg)`, HTTP 401 → redirect to `/login`.
- **Pagination**: request params `current` (page number) + `size` (page size). Response format from MyBatis-Plus IPage: `{ records, total, size, current, pages }`.
- **Permission system**: login loads menu tree from `/admin/list/index/menu/tree`, recursively collects all `permission` strings into a `Set`. `<PermissionGuard perm="user:add">` checks membership.
- **CRUD pattern**: every list page uses `useQuery` + `useMutation` (TanStack Query) → SearchForm → PageTable → ModalForm → Form. Follow `pages/system/user/UserList.tsx` and `UserForm.tsx` as the reference.

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
