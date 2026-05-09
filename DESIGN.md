# Docker 部署工具 - 设计文档

## 项目概述

一个 Electron 桌面应用，用于自动化 Docker 项目部署流程。支持多项目管理、一键部署、容器状态查看、部署历史记录。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 41.x | 桌面应用框架 |
| Vue 3 | 3.5.x | 前端框架 |
| Vite | 6.x | 构建工具 |
| TDesign Vue Next | 1.19.x | UI 组件库 |
| ssh2 | 1.17.x | SSH/SFTP 连接 |
| electron-store | 11.x | 本地配置存储 |
| electron-builder | 26.x | 打包工具 |

## 功能设计

### 1. 项目管理

- 添加/编辑/删除项目配置
- 配置字段：
  - 项目名称
  - 项目路径（本地）
  - Dockerfile 路径
  - 镜像名称/标签
  - 服务器地址/端口/用户/密码
  - docker-compose 路径
  - 服务名称

### 2. 一键部署

部署流程：
```
1. 本地 docker build 构建镜像
2. docker save 导出 tar 文件
3. SFTP 上传 tar 到服务器
4. SSH 执行 docker load 加载镜像
5. SSH 执行 docker-compose up -d 重启服务
6. 清理临时文件
```

实时进度显示，日志输出。

### 3. 容器状态

- 选择项目后查看服务器上所有容器状态
- 显示：容器名称、状态、端口映射

### 4. 部署历史

- 保存最近 10 条部署记录
- 记录：项目名称、时间、状态（成功/失败）、信息

## 数据存储

### 存储方案

使用 `electron-store` + JSON 文件，不使用数据库。

### 密码加密

使用 AES-256-CBC 加密：
```javascript
const ENCRYPTION_KEY = crypto.scryptSync('deploy-tool-secret-key', 'salt', 32)
const IV_LENGTH = 16

// 加密
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// 解密
function decrypt(text) {
  const parts = text.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let decrypted = decipher.update(parts[1], 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

### 存储结构

```json
{
  "projects": [
    {
      "id": "unique-id",
      "name": "项目名称",
      "projectPath": "D:\\projects\\nova-space-client",
      "dockerfilePath": "./Dockerfile",
      "imageName": "nova-client",
      "imageTag": "latest",
      "serverHost": "8.160.178.247",
      "serverPort": 22,
      "serverUser": "root",
      "password": "加密后的密码",
      "composePath": "/opt/nova-space",
      "serviceName": "nova-client"
    }
  ],
  "history": [
    {
      "projectId": "xxx",
      "projectName": "项目名称",
      "timestamp": "2026-04-16T03:00:00Z",
      "success": true,
      "message": "部署成功"
    }
  ]
}
```

## 文件结构

```
deploy-tool/
├── electron/
│   ├── main.js          # 主进程
│   └── preload.js       # 预加载脚本（IPC 暴露）
├── src/
│   ├── main.js          # Vue 入口
│   └── App.vue          # 主界面组件
├── public/
│   └── icon.ico         # 应用图标
├── dist/                # Vite 构建输出
├── release/             # electron-builder 打包输出
├── index.html           # HTML 入口
├── vite.config.js       # Vite 配置
├── electron-builder.json # 打包配置
├── package.json         # 项目配置
└── DESIGN.md            # 本文档
```

## IPC 通信

主进程暴露的 API：

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `getProjects` | 无 | Project[] | 获取所有项目（密码已解密） |
| `saveProject` | Project | boolean | 保存项目（密码加密存储） |
| `deleteProject` | projectId | boolean | 删除项目 |
| `deploy` | Project | string | 执行部署 |
| `getContainers` | Project | string | 获取容器状态 |
| `getHistory` | 无 | History[] | 获取部署历史 |
| `saveHistory` | HistoryRecord | boolean | 保存历史记录 |

部署进度通过事件推送：
```javascript
// 主进程
event.sender.send('deploy-progress', { step, message, percent })

// 渲染进程监听
window.electronAPI.onDeployProgress((data) => { ... })
```

## 界面设计

### 主界面布局

```
┌─────────────────────────────────────────────┐
│  Docker 部署工具                    [Header] │
├──────────┬──────────────────────────────────┤
│ 项目管理 │                                  │
│ 一键部署 │        内容区域                   │
│ 容器状态 │                                  │
│ 部署历史 │                                  │
└──────────┴──────────────────────────────────┘
```

### 项目管理页面

- 表格展示项目列表
- 添加/编辑按钮打开对话框
- 表单字段：项目名称、路径、Dockerfile、镜像配置、服务器配置、Compose 配置

### 一键部署页面

- 下拉选择项目
- 开始部署按钮
- 进度条显示
- 日志输出区域（黑色背景，终端风格）

### 容器状态页面

- 选择项目
- 刷新按钮
- 容器列表输出（终端风格）

### 部署历史页面

- 表格展示最近 10 条记录
- 状态标签（成功/失败）

## 打包配置

```json
{
  "appId": "com.deploy-tool.app",
  "productName": "Docker部署工具",
  "win": {
    "target": "nsis",
    "arch": ["x64"]
  },
  "nsis": {
    "oneClick": false,
    "perMachine": true,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "shortcutName": "Docker部署工具"
  }
}
```

## 使用说明

### 开发模式

```bash
npm run electron:dev
```

### 构建 Windows 安装包

```bash
npm run electron:build:win
```

输出：`release/Docker部署工具 Setup 1.0.0.exe`

### 使用流程

1. 添加项目配置（填写表单）
2. 选择项目，点击"开始部署"
3. 查看进度和日志
4. 查看容器状态确认部署成功
5. 查看部署历史

## 注意事项

1. **本地环境要求**：Windows 上需要安装 Docker Desktop
2. **SSH 连接**：使用密码认证，密码加密存储
3. **临时文件**：部署完成后自动清理本地 tar 文件和服务器临时文件
4. **错误处理**：部署失败会记录到历史，显示错误信息

## 后续优化建议

1. 支持 SSH Key 认证
2. 支持多服务器配置
3. 支持回滚功能
4. 支持自定义部署脚本
5. 添加应用图标（需要提供 .ico 文件）