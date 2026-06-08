# MES-FullStack — 章鱼师兄制造执行系统

基于 Spring Boot + React 的全栈 MES（Manufacturing Execution System），覆盖系统管理、基础数据、工艺管理、生产订单、质量管理、设备管理等核心制造业务模块。

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Java 8, Spring Boot 2.1.7, MyBatis-Plus 3.1.2, Apache Shiro 1.4.0 |
| **前端** | React 19, TypeScript, Vite 8, Ant Design 6, TanStack Query, Zustand |
| **数据库** | MySQL 8, Druid 连接池 |
| **缓存** | Ehcache（本地）/ Redis（可切换） |
| **构建** | Maven + frontend-maven-plugin, Docker |
| **3D** | Three.js, @react-three/fiber, @react-three/drei |

## 功能模块

### 系统管理
- **用户管理** — 系统用户 CRUD
- **角色管理** — 角色 + 菜单权限树分配 + 预设角色（超级管理员/质检员/工艺员等 7 个）
- **菜单管理** — 动态菜单权限树
- **部门管理** — 组织架构
- **班组员工定义** — 班组 + 班次 + 员工分配
- **数据字典** — 字典项管理

### 基础数据
- **物料信息定义** — 物料编码自动生成（PROD-/PART-/STD-/OTHR-），含图片上传、来源、提前期、安全库存
- **零部件定义** — 自动 COMP-xxx 编码
- **库房库位定义** — 库房规格设定，库位编码自动生成（支持 组-行列层 格式）
- **编组设备定义** — 设备 + 设备组 + 设备分配，删除前校验生产订单
- **加工单元定义** — 加工单元 + 班组绑定

### 工艺管理
- **产品 BOM 管理** — 树形层级 BOM 编制，支持产品→半成品→组件多级结构，BOM 锁定定版，版本管理
- **工序信息定义** — 工序编码自动生成（OPR-xxx），绑定加工单元，工时/制造周期管理
- **工艺流程管理** — BOM 节点绑定工艺路线和工序序列，产品工艺锁定
- **工艺内容编制** — 五步向导式 SOP 编制（主信息→工序要求→辅助信息→物料核对→完成），图片/PDF 上传
- **产品工艺查询** — BOM 树展示 + 工艺详情只读查询
- **工艺路线管理** — 现有流程-工序关联管理

### 生产订单
- 工单下达、生产计划

### 数字化平台
- **智慧大屏** — ECharts 数据看板
- **3D 仿真** — Three.js 仓库 3D 场景，连接实际库房库位数据

## 快速开始（开发环境）

### 前置要求

- JDK 8
- Node.js 22+
- MySQL 8（本地 localhost:3306）
- Maven 3.6+

### 1. 初始化数据库

```bash
# 一键导入全部 39 张表结构 + 种子数据
mysql -h localhost -u root -p < scripts/sql/MySQL-init-all.sql
```

该脚本包含完整的数据库初始化（自动创建数据库 `mes_data`），无需单独执行其他 SQL 文件。

### 2. 配置数据库连接

编辑 `mes/src/main/resources/application-dev.yml`，确保数据库连接信息正确：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mes_data?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
    username: root
    password: 你的密码
```

### 3. 启动后端

```bash
cd mes
mvn spring-boot:run -DskipTests
```

后端启动于 `http://localhost:9090`

### 4. 启动前端

```bash
cd mes/frontend
npm install
npm run dev
```

前端启动于 `http://localhost:3000`，API 请求自动代理到 `localhost:9090`

### 5. 登录

浏览器访问 `http://localhost:3000`，默认账号：`admin` / `123456`

## 生产部署

### 构建

```bash
# 完整构建（前端 + 后端打包为 JAR）
cd mes
mvn clean package -DskipTests
```

构建产物：`mes/target/mes-1.0.0.jar`（内嵌 React 前端静态资源）

### Docker 部署

```bash
# 构建 Docker 镜像
cd mes
mvn docker:build

# 运行容器
docker run -d \
  --name mes-app \
  -p 80:80 \
  -e SPRING_PROFILES_ACTIVE=pro \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://<db-host>:3306/mes_data?...(参数同开发环境)" \
  -e SPRING_DATASOURCE_USERNAME="root" \
  -e SPRING_DATASOURCE_PASSWORD="<生产密码>" \
  sparchetype/mes:1.0.0
```

Dockerfile 位于 `mes/src/main/docker/Dockerfile`：
- 基础镜像：`openjdk:8-jdk-alpine`
- 时区：`Asia/Shanghai`
- 暴露端口：`80`
- 启动命令：`java -jar /app.jar`

### Nginx 反向代理

生产环境建议在 Spring Boot 前放置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态资源缓存
    location /assets/ {
        proxy_pass http://127.0.0.1:9090;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 环境变量

生产环境通过 `application-pro.yml` 配置，以下参数建议通过环境变量覆盖：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SPRING_PROFILES_ACTIVE` | 激活配置 | `pro` |
| `SPRING_DATASOURCE_URL` | 数据库 URL | `jdbc:mysql://localhost:3306/mes_data?...` |
| `SPRING_DATASOURCE_USERNAME` | 数据库用户 | `root` |
| `SPRING_DATASOURCE_PASSWORD` | 数据库密码 | — |
| `SPRING_REDIS_HOST` | Redis 地址 | `localhost` |
| `SPRING_REDIS_PORT` | Redis 端口 | `6379` |
| `SPRING_CACHE_TYPE` | 缓存类型 | `ehcache`（可选 `redis`） |

## 项目结构

```
MES-FullStack/
├── README.md
├── CLAUDE.md                          # Claude Code 项目指南
├── LICENSE                            # AGPL-3.0
├── docs/                              # 开发文档（FreeMarker/Layui 参考）
├── scripts/sql/                       # 数据库脚本
│   ├── MySQL-init-all.sql            # 完整初始化（推荐，39 表 + 种子数据）
│   ├── MySQL-20210225.sql            # 原始主表结构
│   ├── product-bom.sql               # 产品 BOM 扩展
│   ├── device-management.sql         # 设备管理扩展
│   ├── team-management.sql           # 班组管理扩展
│   └── role-management-update.sql    # 角色管理更新
└── mes/                               # 主 Maven 模块
    ├── pom.xml                        # Maven 配置
    ├── src/main/java/com/wangziyang/mes/
    │   ├── SparchetypeApplication.java
    │   ├── common/                    # BaseEntity, Result, BaseController, 配置
    │   ├── system/                    # 用户/角色/菜单/部门/字典 + Shiro 安全
    │   ├── basedata/                  # 物料/设备/加工单元/库房/零部件
    │   ├── technology/                # BOM/Flow/Oper/工艺内容/工艺流程
    │   ├── order/                     # 生产订单
    │   └── digitization/              # 数据看板/3D 仿真
    ├── src/main/resources/
    │   ├── application.yml           # 共享配置
    │   ├── application-dev.yml       # 开发环境
    │   ├── application-pro.yml       # 生产环境
    │   ├── mapper/                   # MyBatis XML
    │   ├── templates/                # 旧 Freemarker 模板（保留参考）
    │   └── static/                   # React 构建输出
    └── frontend/                      # React SPA
        ├── package.json
        ├── vite.config.ts            # Vite 配置 + API 代理
        └── src/
            ├── api/                  # 后端 API 调用
            ├── pages/                # 页面组件（按模块）
            ├── components/           # 共享组件（PageTable, ModalForm 等）
            ├── stores/               # Zustand 状态
            ├── layouts/              # AdminLayout
            ├── hooks/                # 自定义 Hooks
            ├── types/                # TypeScript 类型
            └── utils/                # 工具函数
```

## 开发约定

### 后端

- **分层模式**：`controller → service/impl → mapper + entity/dto/request`
- **API 响应**：统一 `Result<T>` 包装 `{code: 0, data: T, msg: ""}`
- **分页**：请求 `current + size`，响应 `{records, total, size, current, pages}`
- **ID 策略**：Snowflake 算法（`IdType.ID_WORKER_STR`）
- **软删除**：`is_deleted` 字段（0=正常, 1=删除, 2=禁用）
- **JSON 接口**：标注 `@RequestBody` 的方法前端需设 `Content-Type: application/json`

### 前端

- **API 客户端**：axios 实例 `api/client.ts`，自动 form 编码 POST，响应解包 Result
- **权限**：`<PermissionGuard perm="xxx:add">` 基于菜单权限 Set
- **CRUD 模式**：`useQuery` + `useMutation` → `SearchForm` → `PageTable` → `ModalForm` → `Form`
- **参考页面**：`pages/system/user/UserList.tsx` + `UserForm.tsx`

## 常见问题

### 前端构建失败
```bash
cd mes/frontend && npm install   # 确保依赖安装
npm run build                     # 重新构建
npx tsc --noEmit                 # 单独检查 TS 错误
```

### 后端启动失败
- 检查 MySQL 是否运行且数据库 `mes_data` 已创建
- 检查 `application-dev.yml` 中数据库密码是否正确
- 确认已执行 `scripts/sql/MySQL-init-all.sql` 初始化脚本

### API 返回 302 重定向
- Shiro 认证拦截，确认已通过 `/login` 登录
- 前端 API 调用在 DEV 模式下通过 `/api` 前缀代理（baseURL 自动设置）

### 图片上传不显示
- 检查 `vite.config.ts` 中图片路径代理配置
- 确认文件上传目录 `{user.dir}/uploads/` 有写入权限

## License

AGPL-3.0 — 详见 [LICENSE](./LICENSE)
