# 角色卡生成器 (nova-web)

一键生成 [SillyTavern](https://github.com/SillyTavern/SillyTavern) 角色卡的网页工具。输入一段作品总要求，工具会调用大语言模型逐块生成角色设定、世界书、状态栏、MVU 变量、HTML 美化模块等内容，并打包成可直接导入 SillyTavern 的角色卡 JSON 文件。

## 功能特性

- **分块生成**：把一张角色卡拆成多个独立分块，分别生成、分别重写，互不干扰
  - 主体：角色设定、性格、场景设定、开场白、对话示例
  - 扩展：背景设定、玩家角色、对话补充、角色采访
  - MVU 变量系统：变量结构、变量初始化、更新规则、分阶段角色设定
  - 状态栏
  - HTML 美化模块（美化部分 / 正则部分 / 世界书部分，三者占位符与正则捕获组自动对齐）
- **一键全量生成**：按顺序逐块生成，并把已生成内容作为上下文喂给后续分块，保证设定前后一致，避免重复堆砌
- **流式进度**：全量生成通过 SSE 实时回传每个分块的进度与结果
- **按要求重生成**：支持基于「全局补充要求」「本页修改要求」重新生成全部或指定分块
- **优先级控制**：作品总要求 < 全局补充要求 < 本页修改要求，逐级递增覆盖
- **导出 SillyTavern v3 卡**：自动把各分块打包成标准角色卡 JSON，世界书条目、MVU 固定条目、正则脚本一并组装
- **模型自选**：可拉取上游可用模型列表，在前端自由切换
- **密钥本地存储**：API 密钥只保存在浏览器 localStorage，由前端随请求带上，服务端不落盘

## 技术栈

- 运行时：Node.js 20（ES Module）
- 后端：Express 4，纯接口 + 静态资源托管
- 前端：单页 `index.html`（原生 JS，无构建步骤）
- 上游：OpenAI 兼容的 `/chat/completions` 与 `/models` 接口

## 项目结构

```
.
├── server.js          # Express 服务：接口路由、上游 LLM 代理、SSE 全量生成
├── lib/
│   ├── blocks.js      # 所有分块/世界书/MVU/美化部分的定义与提示词
│   └── packer.js      # 把分块组装成 SillyTavern v3 角色卡 JSON
├── public/
│   ├── index.html     # 前端单页应用
│   └── img/           # 静态图片资源
├── index.html         # 入口页面
├── package.json
├── Dockerfile
└── .dockerignore
```

## 快速开始

### 本地运行

```bash
npm install
npm start
# 默认监听 8090，可用 PORT 环境变量覆盖
PORT=5180 npm start
```

打开浏览器访问 `http://localhost:8090`，在左下角「设置」里填入你的 API 密钥，即可开始生成。

### Docker 运行

```bash
docker build -t nova-web .
docker run -d -p 5180:8090 --name nova-web nova-web
```

访问 `http://<服务器IP>:5180`。

## API 接口

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET  | `/api/blocks` | 列出所有分块定义 |
| POST | `/api/generate-block` | 生成单个分块 |
| GET  | `/api/beautify-parts` | 列出美化模块的各部分 |
| POST | `/api/generate-beautify-part` | 生成美化模块的某一部分 |
| POST | `/api/generate-all` | 一键全量生成（SSE 流式返回进度） |
| POST | `/api/pack` | 把分块打包成 SillyTavern v3 角色卡 JSON |
| GET  | `/api/models` | 用用户密钥拉取上游可用模型列表 |
| GET  | `/api/health` | 健康检查 |

### 鉴权说明

所有需要调用大模型的接口都从请求里读取密钥与模型，优先级如下：

- 密钥：`x-api-key` 头 → `Authorization: Bearer` 头 → 请求体 `apiKey`
- 模型：`x-model` 头 → 请求体 `model`（默认 `gemini-2.5-pro`）

密钥由前端从浏览器本地存储带上，服务端仅作转发代理，不做持久化。

## 配置

- `PORT`：服务监听端口，默认 `8090`
- 上游地址在 `server.js` 中的 `UPSTREAM` 常量配置，需为 OpenAI 兼容接口

## 注意事项

- 请使用你自己的、有效的 API 密钥；密钥仅保存在浏览器本地，不会上传到代码仓库。
- 上游接口需兼容 OpenAI 的 `/chat/completions` 与 `/models` 格式。
