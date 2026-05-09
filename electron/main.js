const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store').default
const crypto = require('crypto')

const ENCRYPTION_KEY = crypto.scryptSync('deploy-tool-secret-key', 'salt', 32)
const IV_LENGTH = 16

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text) {
  const parts = text.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

const store = new Store({
  name: 'deploy-config',
  encryptionKey: ENCRYPTION_KEY
})

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png')
  })

  const isDev = !app.isPackaged || process.defaultApp
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ==================== 服务器管理 ====================

ipcMain.handle('get-servers', () => {
  const servers = store.get('servers', [])
  return servers.map(s => ({
    ...s,
    password: s.password ? decrypt(s.password) : ''
  }))
})

ipcMain.handle('save-server', (event, server) => {
  const servers = store.get('servers', [])
  const index = servers.findIndex(s => s.id === server.id)

  const encryptedServer = {
    ...server,
    password: server.password ? encrypt(server.password) : ''
  }

  if (index >= 0) {
    servers[index] = encryptedServer
  } else {
    servers.push(encryptedServer)
  }

  store.set('servers', servers)
  return true
})

ipcMain.handle('delete-server', (event, serverId) => {
  const servers = store.get('servers', [])
  const filtered = servers.filter(s => s.id !== serverId)
  store.set('servers', filtered)
  return true
})

// ==================== 项目管理 ====================

ipcMain.handle('get-projects', () => {
  const projects = store.get('projects', [])
  return projects.map(p => ({
    ...p,
    password: p.password ? decrypt(p.password) : ''
  }))
})

ipcMain.handle('save-project', (event, project) => {
  const projects = store.get('projects', [])
  const index = projects.findIndex(p => p.id === project.id)

  const encryptedProject = {
    ...project,
    password: project.password ? encrypt(project.password) : ''
  }

  if (index >= 0) {
    projects[index] = encryptedProject
  } else {
    projects.push(encryptedProject)
  }

  store.set('projects', projects)
  return true
})

ipcMain.handle('delete-project', (event, projectId) => {
  const projects = store.get('projects', [])
  const filtered = projects.filter(p => p.id !== projectId)
  store.set('projects', filtered)
  return true
})

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择项目文件夹'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: '选择 Dockerfile',
    filters: [{ name: 'Dockerfile', extensions: ['*'] }]
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle('check-dockerfile', (event, projectPath, dockerfilePath) => {
  const fullPath = path.isAbsolute(dockerfilePath)
    ? dockerfilePath
    : path.join(projectPath, dockerfilePath)
  return fs.existsSync(fullPath)
})

// ==================== 部署历史 ====================

ipcMain.handle('get-history', () => {
  return store.get('history', [])
})

ipcMain.handle('save-history', (event, record) => {
  let history = store.get('history', [])
  history.unshift({
    ...record,
    timestamp: new Date().toISOString()
  })
  history = history.slice(0, 10)
  store.set('history', history)
  return true
})

// ==================== 部署 ====================

ipcMain.handle('deploy', async (event, data) => {
  const { project, serverId } = data
  const { Client } = require('ssh2')
  const { exec } = require('child_process')

  const servers = store.get('servers', [])
  const server = servers.find(s => s.id === serverId)
  if (!server) {
    event.sender.send('deploy-progress', { step: 'error', message: '服务器不存在', percent: 0, command: '' })
    return '服务器不存在'
  }

  const serverPassword = server.password ? decrypt(server.password) : ''

  const sendProgress = (step, message, percent, command = '') => {
    event.sender.send('deploy-progress', { step, message, percent, command })
  }

  const dockerCheck = await new Promise((resolve) => {
    exec('docker info', (err) => {
      resolve(!err)
    })
  })

  if (!dockerCheck) {
    sendProgress('error', 'Docker Desktop 未运行，请先启动 Docker Desktop', 0)
    return 'Docker Desktop 未运行'
  }

  const dockerfileFullPath = project.dockerfilePath.replace(/\//g, path.sep)

  if (!fs.existsSync(dockerfileFullPath)) {
    sendProgress('error', `Dockerfile 不存在: ${dockerfileFullPath}`, 0)
    return `Dockerfile 不存在: ${dockerfileFullPath}`
  }

  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', () => {
      sendProgress('connect', 'SSH 连接成功', 10)

      const buildCmd = `docker build -t ${project.imageName}:${project.imageTag} -f "${dockerfileFullPath}" "${project.projectPath}"`
      sendProgress('build', '正在构建 Docker 镜像...', 20, buildCmd)

      exec(buildCmd, (err, stdout, stderr) => {
        if (err) {
          sendProgress('error', `构建失败: ${stderr}`, 0, buildCmd)
          conn.end()
          reject(stderr || err.message)
          return
        }

        sendProgress('build', '镜像构建成功', 40)

        const tarPath = path.join(project.projectPath, `${project.imageName}-${Date.now()}.tar`)
        const saveCmd = `docker save -o "${tarPath}" ${project.imageName}:${project.imageTag}`
        sendProgress('export', '正在导出镜像...', 50, saveCmd)

        exec(saveCmd, (err, stdout, stderr) => {
          if (err) {
            sendProgress('error', `导出失败: ${stderr}`, 0, saveCmd)
            conn.end()
            reject(stderr || err.message)
            return
          }

          sendProgress('export', '镜像导出成功', 60)

          const remotePath = `/tmp/${path.basename(tarPath)}`
          sendProgress('upload', '正在上传镜像到服务器...', 70, `SFTP upload -> ${remotePath}`)

          conn.sftp((err, sftp) => {
            if (err) {
              sendProgress('error', `SFTP 错误: ${err.message}`, 0)
              conn.end()
              reject(err.message)
              return
            }

            sftp.fastPut(tarPath, remotePath, (err) => {
              if (err) {
                sendProgress('error', `上传失败: ${err.message}`, 0)
                conn.end()
                reject(err.message)
                return
              }

              sendProgress('upload', '镜像上传成功', 80)

              const loadCmd = `docker load -i ${remotePath} && rm ${remotePath}`
              sendProgress('load', '正在加载镜像...', 85, loadCmd)

              conn.exec(loadCmd, (err, stream) => {
                if (err) {
                  sendProgress('error', `加载失败: ${err.message}`, 0, loadCmd)
                  conn.end()
                  reject(err.message)
                  return
                }

                let output = ''
                stream.on('data', (data) => { output += data })
                stream.stderr.on('data', (data) => { output += data })
                stream.on('close', () => {
                  sendProgress('load', '镜像加载成功', 90)

                  const restartCmd = `cd ${project.composePath} && docker-compose up -d ${project.serviceName}`
                  sendProgress('restart', '正在重启服务...', 95, restartCmd)

                  conn.exec(restartCmd, (err, stream) => {
                    if (err) {
                      sendProgress('error', `重启失败: ${err.message}`, 0, restartCmd)
                      conn.end()
                      reject(err.message)
                      return
                    }

                    let restartOutput = ''
                    stream.on('data', (data) => { restartOutput += data })
                    stream.stderr.on('data', (data) => { restartOutput += data })
                    stream.on('close', () => {
                      sendProgress('done', '部署完成!', 100)

                      fs.unlinkSync(tarPath)

                      conn.end()
                      resolve(restartOutput)
                    })
                  })
                })
              })
            })
          })
        })
      })
    }).on('error', (err) => {
      sendProgress('error', `连接失败: ${err.message}`, 0)
      reject(err.message)
    }).connect({
      host: server.host,
      port: server.port || 22,
      username: server.user,
      password: serverPassword
    })
  })
})

// ==================== 容器状态 ====================

ipcMain.handle('get-containers', async (event, data) => {
  const { project, serverId } = data
  const { Client } = require('ssh2')

  const servers = store.get('servers', [])
  const server = servers.find(s => s.id === serverId)
  if (!server) {
    return '服务器不存在'
  }

  const serverPassword = server.password ? decrypt(server.password) : ''

  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on('ready', () => {
      conn.exec('docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', (err, stream) => {
        if (err) {
          conn.end()
          reject(err.message)
          return
        }

        let output = ''
        stream.on('data', (data) => { output += data })
        stream.stderr.on('data', (data) => { output += data })
        stream.on('close', () => {
          conn.end()
          resolve(output)
        })
      })
    }).on('error', (err) => reject(err.message)).connect({
      host: server.host,
      port: server.port || 22,
      username: server.user,
      password: serverPassword
    })
  })
})