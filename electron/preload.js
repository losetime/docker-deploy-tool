const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 项目管理
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProject: (project) => ipcRenderer.invoke('save-project', project),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  checkDockerfile: (projectPath, dockerfilePath) => ipcRenderer.invoke('check-dockerfile', projectPath, dockerfilePath),

  // 服务器管理
  getServers: () => ipcRenderer.invoke('get-servers'),
  saveServer: (server) => ipcRenderer.invoke('save-server', server),
  deleteServer: (serverId) => ipcRenderer.invoke('delete-server', serverId),

  // 部署
  deploy: (data) => ipcRenderer.invoke('deploy', data),
  onDeployProgress: (callback) => ipcRenderer.on('deploy-progress', (event, data) => callback(data)),

  // 历史
  getHistory: () => ipcRenderer.invoke('get-history'),
  saveHistory: (record) => ipcRenderer.invoke('save-history', record),

  // 容器状态
  getContainers: (data) => ipcRenderer.invoke('get-containers', data)
})