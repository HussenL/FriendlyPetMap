# 📄 FriendlyPetMap 项目 FAQ / 架构白皮书（MVP 版）

> 本文档用于向 **AI 助手 / 新开发者 / 架构审查** 说明
>  **FriendlyPetMap（宠物投毒地图）** 项目的整体目标、技术选型、模块划分与文件职责。
>
> 当前阶段为 **MVP（最小可用版本）**，强调：
>  **模块解耦、可替换、可演进，而非一次性做完所有功能。**

------

## 一、项目是什么？（一句话版本）

**FriendlyPetMap** 是一个：

> **基于第三方 OAuth 登录的地图型 Web 应用**
>  用于在地图上展示事件点位，并允许登录用户进行轻量级留言互动。

------

## 二、核心功能边界（MVP 范围）

### ✅ 当前已设计/实现的能力

- 第三方登录（抖音 OAuth）
- 地图展示（OSM 瓦片）
- 点位读取（Incidents）
- 登录用户留言（Comments）

### ❌ 明确不属于 MVP 的内容

- 内容审核 / 举报
- 实时通信
- 搜索 / 统计分析
- 多角色权限
- 管理后台

> 这些功能**可以在不推翻现有架构的前提下后续增加**。

------

## 三、总体技术架构（语言与职责）

### 技术栈选择

| 层级     | 技术                      |
| -------- | ------------------------- |
| 前端     | React + Vite + TypeScript |
| 后端     | Python + FastAPI          |
| 鉴权     | OAuth（抖音） + 自签 JWT  |
| 数据     | DynamoDB（后期接入）      |
| 地图     | OSM Raster Tiles          |
| 静态资源 | S3 / CloudFront           |

### 核心设计原则

1. **OAuth ≠ 登录系统**
2. **地图资源 ≠ 业务数据**
3. **前端不信任任何用户输入**
4. **每个模块都可以被替换**

------

## 四、系统分层逻辑（概念层）

```
[ Browser / Frontend ]
        |
        v
[ FastAPI API Layer ]
        |
        ├── Auth Module        → 第三方身份换取 App Token
        ├── Incidents Module   → 地图点位读取
        └── Comments Module    → 登录用户留言
        |
[ Storage Layer ]
    ├── DynamoDB (业务数据)
    └── S3 / CDN (地图瓦片)
```

------

## 五、后端目录结构与职责（Python 主体）

### 📁 `backend/app/`

这是 FastAPI 的应用根目录。

------

### `main.py`

**作用：应用入口**

- 创建 FastAPI 实例
- 配置 CORS
- 挂载所有 API 路由
- 不包含任何业务逻辑

> 这是一个 **“拼装文件”**，而不是业务文件。

------

### `api/router.py`

**作用：统一路由注册**

- 将各模块的 `routes.py` 挂载到主应用
- 控制 API 的整体结构

> 新增模块时，只需在这里 `include_router`。

------

### 📁 `modules/`

**业务模块目录，每个模块职责单一**

------

#### 📁 `modules/auth/`

**身份与鉴权模块**

##### `routes.py`

- 路由层
- 定义 `/auth/douyin/callback`
- 处理 HTTP 输入输出

##### `douyin_client.py`

- 与抖音 OAuth API 通信
- 用 `code` 换 `access_token`
- 获取用户公开信息

##### `jwt_service.py`

- 签发 App JWT
- 校验 App JWT
- 不关心 HTTP、数据库或前端

> **Auth 模块只负责“你是谁”，不负责“你能干什么”。**

------

#### 📁 `modules/incidents/`

**地图点位模块（只读为主）**

##### `routes.py`

- 定义 `/incidents`
- 返回点位列表

##### `service.py`

- 业务层
- 决定如何获取点位数据

##### `repo.py`

- 数据访问层
- 当前 MVP 可返回 mock
- 后期接 DynamoDB 时只改这里

------

#### 📁 `modules/comments/`

**用户留言模块（需要登录）**

##### `routes.py`

- 定义 `/comments`
- 强制 JWT 校验

##### `service.py`

- 生成 comment_id
- 组合业务字段（用户、时间）

##### `repo.py`

- 数据写入层
- 当前 MVP 可 mock
- 后期接 DynamoDB

------

### 📁 `shared/`

**跨模块共享能力**

#### `config.py`

- 从环境变量读取配置
- 所有模块统一配置来源

#### `security.py`

- FastAPI dependency
- 从 HTTP Header 解析并校验 JWT

#### `types.py`

- Pydantic 数据模型
- 定义 API 输入 / 输出结构

#### `http.py`

- 通用错误响应
- 统一异常语义

------

## 六、前端目录结构与职责（TS 副用）

### 📁 `frontend/src/`

前端遵循 **模块即功能** 的组织方式。

------

### `main.tsx`

- React 应用入口
- 注入 Router

------

### 📁 `app/`

#### `routes.tsx`

- 定义前端路由：
  - `/` → 地图页
  - `/auth/callback` → OAuth 回调页

------

### 📁 `modules/`

#### `auth/`

- 登录按钮
- OAuth 回调处理
- App Token 本地存储

#### `api/`

- 封装 fetch
- 自动附带 `Authorization: Bearer <token>`

#### `map/`

- 地图初始化（MapLibre）
- Marker 渲染
- 与业务解耦

#### `incidents/`

- 调用 `/incidents` API

#### `comments/`

- 调用 `/comments` API

------

### 📁 `shared/`

- `config.ts`：读取 `import.meta.env`
- `types.ts`：前端用的业务类型

------

## 七、Token 与安全模型（FAQ 高频）

### Q：为什么不用抖音的 access_token？

- 生命周期不可控
- 权限过大
- 不属于本业务系统

### A：

> 本项目采用 **双 Token 模型**：
>  抖音 Token → 换取 → **App JWT（业务身份证）**

------

## 八、为什么这个架构“对 AI 友好”？

- 每个文件**职责单一**
- 文件名即语义
- 模块边界清晰
- 任一模块都可独立替换

👉 非常适合：

- 让 AI 补代码
- 让 AI 做代码审查
- 让 AI 生成新功能模块

------

## 九、当前状态总结（给 AI 的结论）

> FriendlyPetMap 当前是一个
>  **Python FastAPI + React/Vite 的模块化地图型 Web 项目**
>  已完成：
>
> - OAuth 登录设计
> - App JWT 鉴权
> - 地图 + 点位 + 留言 MVP 架构
>
> 后续开发应 **严格遵循现有模块边界**，避免跨模块直接耦合。



---

# ✅ 项目文件结构与作用（详细版）

> 约定：
>
> - **后端主语言：Python（FastAPI）**
> - **前端副语言：TypeScript（React/Vite）**
> - 模块边界：**routes（HTTP） / service（业务） / repo（存储） / shared（通用）**

------

## 1) 仓库根目录（Repo Root）

```
FriendlyPetMap/
├─ backend/
└─ frontend/
```

### ✅ 作用

- `backend/`：所有 Python API、鉴权与业务数据读写
- `frontend/`：所有 Web UI、地图渲染、调用 API

------

# 2) 后端（Python / FastAPI）

## 2.1 后端总览结构

```
backend/
├─ app/
│  ├─ main.py
│  ├─ api/
│  │  └─ router.py
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ routes.py
│  │  │  ├─ douyin_client.py
│  │  │  └─ jwt_service.py
│  │  ├─ incidents/
│  │  │  ├─ routes.py
│  │  │  ├─ service.py
│  │  │  └─ repo.py
│  │  └─ comments/
│  │     ├─ routes.py
│  │     ├─ service.py
│  │     └─ repo.py
│  └─ shared/
│     ├─ config.py
│     ├─ types.py
│     ├─ http.py
│     └─ security.py
├─ requirements.txt
└─ .env  (本地开发可选)
```

------

## 2.2 后端文件逐个说明（非常详细）

### `backend/requirements.txt`

**作用：Python 依赖清单**

- FastAPI、uvicorn、httpx、PyJWT、boto3 等
- 让环境可复现（CI/CD 或 다른开发者）

------

### `backend/.env`（可选）

**作用：本地环境变量**

- `APP_JWT_SECRET`、抖音 key/secret、CORS、DDB 表名等
- 注意：生产环境通常用云平台的环境变量/密钥系统，不直接提交 `.env`

------

## `backend/app/main.py`

**作用：FastAPI 应用入口（拼装层）**

- 创建 `FastAPI()` 实例
- 配置 CORS
- `include_router()` 注册所有模块 API
- 提供 `/health` 健康检查

> 规则：`main.py` **不写业务逻辑**，只“拼装”。

------

## `backend/app/api/router.py`

**作用：后端路由汇总器（模块装配）**

- 统一 `include_router(auth_router/incidents_router/comments_router)`
- 保证所有模块路由入口集中管理

> 规则：新增模块时，只需要改这里，不动 main.py。

------

# 2.3 shared（跨模块通用层）

## `backend/app/shared/config.py`

**作用：配置中心（从 env 读取）**

- 把环境变量统一收口为 `settings`
- 所有模块读取配置必须从这里拿，禁止各模块直接 `os.getenv` 分散读取

> 好处：配置集中、方便测试、避免漏配。

------

## `backend/app/shared/types.py`

**作用：Pydantic 模型（接口契约）**

- 定义 API 输入/输出结构（例如：`AuthCallbackIn/Out`, `Incident`, `CommentCreateIn/Out`）
- 强制数据校验（长度、类型、必填字段）

> 好处：接口可读、错误更早暴露、也方便未来 OpenAPI 自动生成前端类型。

------

## `backend/app/shared/http.py`

**作用：统一 HTTP 错误语义**

- `bad_request()` / `unauthorized()` 等
- 模块内部用统一方式抛错，不到处手写 `HTTPException`

> 好处：错误语义统一，便于前端处理与日志追踪。

------

## `backend/app/shared/security.py`

**作用：鉴权依赖（FastAPI Dependency）**

- 从 Header 解析 `Authorization: Bearer <token>`
- 调用 `jwt_service.verify_app_token()`
- 返回 `user`（JWT payload）给路由使用

> 规则：凡是需要登录的 API，都通过 `Depends(get_current_user)` 注入用户信息。

------

# 2.4 modules/auth（身份模块）

## `backend/app/modules/auth/routes.py`

**作用：Auth HTTP 路由层**

- 暴露 `POST /auth/douyin/callback`
- 接收 `code`
- 调用 `douyin_client` 交换 token & 拉 profile
- 调用 `jwt_service` 签发 `app_token`
- 返回 `{app_token, profile}`

> 规则：routes.py **只处理 HTTP**，不处理复杂业务与存储。

------

## `backend/app/modules/auth/douyin_client.py`

**作用：抖音 OAuth 客户端**

- `exchange_code(code)`：用 code 换 `access_token/open_id`
- `get_userinfo(access_token, open_id)`：获取用户公开资料

> 规则：所有和抖音 API 的交互都只能放这里。未来如果换成微信/Apple，只替换这个模块实现。

------

## `backend/app/modules/auth/jwt_service.py`

**作用：App Token（JWT）服务**

- `sign_app_token(payload)`：签发业务 JWT
- `verify_app_token(token)`：校验 JWT，返回 payload（用户身份）

> 规则：JWT 的 secret、过期时间等只从 `shared/config.py` 读取。

------

# 2.5 modules/incidents（点位模块）

## `backend/app/modules/incidents/routes.py`

**作用：Incidents HTTP 路由层**

- 暴露 `GET /incidents`
- 调用 `service.list_incidents()` 返回点位数组

> MVP 可公开读；未来想改登录可见，只需要加 `Depends(get_current_user)`。

------

## `backend/app/modules/incidents/service.py`

**作用：点位业务层**

- 决定“点位数据怎么取”
- 组合/过滤/排序/分页（以后扩展在这里做）

------

## `backend/app/modules/incidents/repo.py`

**作用：点位存储层（Repo）**

- MVP：返回 mock 数据
- 接 DynamoDB 后：在这里实现 scan/query
- 未来换 Aurora/ES：只换 repo，不动 service/routes

> 这层是“存储可替换”的关键。

------

# 2.6 modules/comments（留言模块）

## `backend/app/modules/comments/routes.py`

**作用：Comments HTTP 路由层**

- 暴露 `POST /comments`
- 强制登录：`Depends(get_current_user)`
- 解析 `incident_id/content`
- 调用 service 创建留言

------

## `backend/app/modules/comments/service.py`

**作用：留言业务层**

- 生成 `comment_id`
- 生成 `created_at`
- 组装写入 item（含 user_sub/nickname/avatar）
- 将写入动作委托给 repo

> 这里是业务规则中心：比如以后做敏感词过滤、频率限制等都加在这里。

------

## `backend/app/modules/comments/repo.py`

**作用：留言存储层（Repo）**

- MVP：mock（不写入）
- 接 DynamoDB 后：实现 `put_item` 写入

> 设计建议：Comments 表使用 `PK=incident_id, SK=created_at#comment_id`，以便按事件分页拉取留言。

------

------

# 3) 前端（React + Vite / TypeScript）

## 3.1 前端总览结构

```
frontend/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ .env.local
└─ src/
   ├─ main.tsx
   ├─ app/
   │  └─ routes.tsx
   ├─ shared/
   │  ├─ config.ts
   │  └─ types.ts
   └─ modules/
      ├─ api/
      │  └─ client.ts
      ├─ auth/
      │  ├─ index.ts
      │  ├─ LoginButton.tsx
      │  └─ CallbackPage.tsx
      ├─ map/
      │  ├─ mapStyle.ts
      │  └─ MapPage.tsx
      ├─ incidents/
      │  └─ service.ts
      └─ comments/
         └─ service.ts
```

------

## 3.2 前端文件逐个说明

### `frontend/.env.local`

**作用：前端构建时环境变量**

- `VITE_API_BASE`
- `VITE_DOUYIN_CLIENT_KEY`
- `VITE_DOUYIN_REDIRECT_URI`
- `VITE_TILES_URL`

> 注意：必须在项目根目录，不要放 src 下；必须以 `VITE_` 前缀才能被 Vite 注入。

------

## `frontend/src/main.tsx`

**作用：React 入口**

- 初始化 ReactDOM
- 注入 RouterProvider

------

## `frontend/src/app/routes.tsx`

**作用：前端路由定义**

- `/`：地图主页面
- `/auth/callback`：抖音回调页面（拿 code）

------

## `frontend/src/shared/config.ts`

**作用：统一读取 import.meta.env**

- 把 `VITE_*` 收口成 `config` 对象
- 其他模块只引用 `config`，不直接散落 `import.meta.env`

------

## `frontend/src/shared/types.ts`

**作用：前端业务类型**

- `Incident`、`AppAuthResponse` 等
- 可与后端 Pydantic 模型保持一致（但不强耦合）

------

# 3.3 前端 modules（功能模块）

## `frontend/src/modules/api/client.ts`

**作用：统一 API Client**

- 封装 fetch
- 自动带上 `Authorization: Bearer <app_token>`
- 统一错误处理（res.ok，否则抛 Error）

> 规则：所有 API 调用必须从这里走，避免到处复制粘贴 fetch。

------

## `frontend/src/modules/auth/index.ts`

**作用：登录态存储**

- `getAppToken/setAppToken/clearAppToken`
- 当前用 localStorage；未来可换 cookie 或 storage，不影响其他模块

------

## `frontend/src/modules/auth/LoginButton.tsx`

**作用：构造抖音 OAuth 跳转 URL**

- 生成 state（放入 sessionStorage）
- redirect 到 `open.douyin.com/.../oauth/connect`

------

## `frontend/src/modules/auth/CallbackPage.tsx`

**作用：OAuth 回调处理**

- 从 URL 拿 `code/state`
- 校验 state 防 CSRF
- 调用后端 `POST /auth/douyin/callback`
- 保存 `app_token`
- 跳回首页 `/`

------

## `frontend/src/modules/incidents/service.ts`

**作用：点位 API 调用封装**

- `listIncidents()` → `GET /incidents`

------

## `frontend/src/modules/comments/service.ts`

**作用：留言 API 调用封装**

- `postComment()` → `POST /comments`
- 依赖 api client 自动带 token

------

## `frontend/src/modules/map/mapStyle.ts`

**作用：地图样式配置（MapLibre Style JSON）**

- raster source 指向 `config.tilesUrl`

------

## `frontend/src/modules/map/MapPage.tsx`

**作用：地图主页面**

- 初始化 MapLibre
- 加载 incidents
- 渲染 marker
- 点击 marker → prompt 输入留言 → 调用 `postComment`

> 规则：MapPage 不直接写 fetch；只调用 service。

------

# 4) 给其他 AI 的开发约束（非常重要）

为了保证项目长期可维护，其他 AI/开发者必须遵守：

1. **routes.py 不写存储细节**
2. **repo.py 不写业务规则**
3. **service.py 不直接处理 HTTP**
4. **shared/config.py 是唯一配置入口**
5. **前端所有 API 请求都从 modules/api/client.ts 走**