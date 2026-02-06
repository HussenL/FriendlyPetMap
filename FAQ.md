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

# 项目文件结构与作用（更新版 · MVP 已闭环）

   > 本文档用于向 **AI / 新开发者 / 未来的你** 说明
   >  当前版本 FriendlyPetMap 的 **真实结构、真实能力、真实边界**。
   >
   > 当前状态：
   >  **地图 + 定位 + 点位创建 + 留言 + 附近列表 + 区域遮罩**
   >  已构成完整 MVP 功能闭环。

------

   ## 0️⃣ 项目当前完成度说明（一句话）

   > **这是一个已完成核心交互闭环的地图型 Web MVP**：
   >  用户可定位 → 浏览地图 → 创建点位 → 留言 → 查看附近点位与留言。

------

   ## 1️⃣ 仓库根目录（Repo Root）

   ```
   FriendlyPetMap/
   ├─ backend/
   └─ frontend/
   ```

   ### 作用说明

   - `backend/`
      FastAPI 后端：
     - 提供地图点位（Incidents）
     - 提供留言读写（Comments）
     - 当前为 **MVP 内存 / mock 实现**
   - `frontend/`
      React + Vite 前端：
     - 地图渲染（MapLibre）
     - 用户定位
     - 点位与留言交互
     - 右侧栏附近点位列表

------

   ## 2️⃣ 后端（Python / FastAPI）

   ### 2.1 后端总体结构

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
   └─ .env
   ```

------

   ## 2.2 后端核心文件职责（逐个）

------

   ### `backend/app/main.py`

   **FastAPI 应用入口（拼装层）**

   - 创建 `FastAPI()` 实例
   - 配置 CORS
   - `include_router(api.router)`
   - 提供 `/health` 健康检查

   **设计原则**

   - ❌ 不写业务逻辑
   - ✅ 只负责“装配系统”

------

   ### `backend/app/api/router.py`

   **后端路由汇总器**

   - 统一挂载：
     - `/auth/*`
     - `/incidents`
     - `/comments`
   - 是所有业务模块的“入口总线”

   **当前已挂载能力**

   - `GET /incidents`
   - `POST /incidents`
   - `GET /comments`
   - `POST /comments`

------

   ## 2.3 shared（跨模块通用层）

   ### `shared/config.py`

   - 统一从环境变量读取配置
   - JWT secret / CORS / AWS 参数等集中管理

------

   ### `shared/types.py`

   **系统数据契约中心（非常重要）**

   定义了：

   - `Incident`
   - `IncidentCreateIn / Out`
   - `Comment`
   - `CommentCreateIn / Out`
   - `CommentListOut`

   > 前后端通过这些模型 **在语义上保持一致**，但不强耦合。

------

   ### `shared/security.py`

   - FastAPI dependency
   - 校验 App JWT
   - 当前 MVP 中 **暂未启用到 comments/incidents**

------

   ## 2.4 modules/incidents（地图点位模块）

   ### `modules/incidents/routes.py`

   **HTTP 路由层**

   - `GET /incidents`
      → 返回全部点位
   - `POST /incidents`
      → 创建新点位（lng / lat / title）

------

   ### `modules/incidents/service.py`

   **业务层**

   - 负责点位创建逻辑
   - 未来可加入：
     - 防刷
     - 合并重复点
     - 频率限制

------

   ### `modules/incidents/repo.py`

   **数据访问层（Repo）**

   - 当前：**内存 / mock 实现**
   - 返回结构化点位数据
   - 未来：
     - 可直接替换为 DynamoDB / Postgres
     - 不影响 routes / service

------

   ## 2.5 modules/comments（留言模块）

   ### `modules/comments/routes.py`

   **HTTP 路由层**

   - `GET /comments?incident_id=...`
      → 获取某点位的留言列表
   - `POST /comments`
      → 创建留言

------

   ### `modules/comments/service.py`

   **留言业务逻辑**

   - 生成 comment_id
   - 生成 created_at
   - 负责“留言属于哪个点位”

------

   ### `modules/comments/repo.py`

   **留言存储层**

   - 当前：内存字典
   - 结构：`incident_id -> comments[]`
   - 后端重启会清空（MVP 行为）

------

   ## 3️⃣ 前端（React + Vite / TypeScript）

   ### 3.1 前端总体结构

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
         ├─ incidents/
         │  └─ service.ts
         ├─ comments/
         │  └─ service.ts
         └─ map/
            ├─ mapStyle.ts
            └─ MapPage.tsx
   ```

------

   ## 3.2 前端关键文件说明

------

   ### `src/main.tsx`

   - React 应用入口
   - 注入 Router
   - 不包含业务逻辑

------

   ### `src/app/routes.tsx`

   - 定义前端路由
     - `/` → 地图主页面
     - `/auth/callback` → OAuth 回调（预留）

------

   ## 3.3 modules/map（地图核心模块）

   ### `mapStyle.ts`

   - MapLibre Style JSON
   - Raster OSM tiles
   - **台湾区域遮罩**
     - 使用多边形
     - 四角缺角
     - 视觉遮挡 + 交互禁止

------

   ### `MapPage.tsx`（当前 MVP 核心）

   **承担的职责**

   - 初始化 MapLibre（仅一次）
   - 获取浏览器定位并自动 flyTo
   - 控制最小放点 zoom（防刷）
   - 台湾区域：
     - 视觉遮罩
     - 禁止交互
   - 地图点击创建点位
   - 弹窗输入：标题 + 留言
   - Marker 渲染与点击
   - 右侧栏：
     - 显示 10km 内点位
     - 点击跳转并加载留言
   - 留言列表展示 + 继续留言

   > 这是当前 MVP 的**功能核心文件**。

------

   ## 3.4 modules/incidents（前端）

   ### `incidents/service.ts`

   - 封装：
     - `GET /incidents`
     - `POST /incidents`
   - 所有点位请求统一从这里走

------

   ## 3.5 modules/comments（前端）

   ### `comments/service.ts`

   - 封装：
     - `GET /comments`
     - `POST /comments`
   - 不直接写 fetch

------

   ## 3.6 modules/api

   ### `api/client.ts`

   **统一 API Client**

   - 自动带 baseUrl
   - 统一错误处理
   - 未来登录后自动带 JWT

------

   ## 4️⃣ 当前 MVP 已实现能力总结

   ✔ 地图加载与缩放
    ✔ 用户定位并自动跳转
    ✔ 台湾区域遮罩（精细化缺角）
    ✔ 缩放限制防刷
    ✔ 点击创建点位
    ✔ 一次输入标题 + 留言
    ✔ Marker 交互
    ✔ 留言列表
    ✔ 10km 附近点位列表
    ✔ 架构可替换、可演进

------

   ## 5️⃣ 明确尚未进入 MVP 的内容

   - 登录鉴权（接口已预留）
   - 持久化数据库
   - 内容审核 / 举报
   - 搜索 / 聚合统计
   - 管理后台

   > 以上内容 **可在不推翻当前结构的前提下增加**。

------

   ## ✅ 结论（给未来的你 / AI）

   > 当前 FriendlyPetMap
   >  **不是 Demo，而是一个已闭环、可演示、可扩展的 MVP 架构**。
   >
   > 后续开发应继续遵守：
   >
   > - routes / service / repo 分层
   > - shared 统一能力
   > - 地图 ≠ 业务数据
   > - 登录 ≠ OAuth 本身