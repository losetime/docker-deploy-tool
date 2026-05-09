# Docker Deploy Tool

Windows 平台下的 Docker 部署管理工具，基于 Electron + Vue 3 开发。

## 功能特性

- 容器状态监控
- 一键部署管理
- 部署历史记录
- 项目管理
- 服务器管理

## 技术栈

- Electron 41
- Vue 3.5
- Vite 6
- TDesign Vue Next
- ssh2

## 开发

```bash
npm install
npm run electron:dev
```

## 构建

```bash
# Windows
npm run electron:build:win

# 全平台
npm run electron:build
```

## 项目结构

```
src/
├── main.js          # Vue 入口
├── App.vue          # 根组件
├── router/          # 路由配置
└── views/           # 页面组件
    ├── ContainerStatus.vue  # 容器状态
    ├── Deploy.vue           # 部署管理
    ├── DeployHistory.vue     # 部署历史
    ├── ProjectManage.vue     # 项目管理
    └── ServerManage.vue      # 服务器管理
```
