<template>
  <div class="page-container">
    <div class="page-header">
      <h2>部署</h2>
    </div>

    <div v-if="project" class="project-info">
      <t-card title="项目信息">
        <t-descriptions :column="2">
          <t-descriptions-item label="项目名称">{{ project.name }}</t-descriptions-item>
          <t-descriptions-item label="镜像">{{ project.imageName }}:{{ project.imageTag }}</t-descriptions-item>
          <t-descriptions-item label="服务名称">{{ project.serviceName }}</t-descriptions-item>
          <t-descriptions-item label="Compose路径">{{ project.composePath }}</t-descriptions-item>
        </t-descriptions>
      </t-card>
    </div>

    <div v-if="!projectId" class="no-project">
      <t-alert theme="warning" message="请从项目管理页面点击部署按钮进入" />
    </div>

    <div v-else class="deploy-form">
      <t-form layout="inline">
        <t-form-item label="选择服务器">
          <t-select v-model="selectedServerId" placeholder="请选择服务器" style="width: 300px">
            <t-option v-for="s in servers" :key="s.id" :value="s.id" :label="s.name + ' (' + s.host + ')'" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" :loading="deploying" @click="startDeploy" :disabled="!selectedServerId">
            开始部署
          </t-button>
        </t-form-item>
      </t-form>
    </div>

    <div v-if="deployProgress" class="deploy-progress">
      <t-progress :percentage="deployProgress.percent" :theme="deployProgress.theme" />
      <p class="deploy-message">{{ deployProgress.message }}</p>
    </div>

    <div v-if="deployLog.length" class="deploy-log">
      <h4>部署日志</h4>
      <div class="log-content">
        <div v-for="(log, index) in deployLog" :key="index" :class="['log-item', log.type]">
          <span class="log-time">[{{ log.time }}]</span>
          <span v-if="log.command" class="log-command">> {{ log.command }}</span>
          <span class="log-msg">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'

const route = useRoute()
const projectId = ref(route.query.projectId || '')
const project = ref(null)
const servers = ref([])
const selectedServerId = ref('')
const deploying = ref(false)
const deployProgress = ref(null)
const deployLog = ref([])

watch(() => route.query.projectId, (val) => {
  projectId.value = val || ''
  if (projectId.value) loadProject()
})

async function loadProject() {
  try {
    const projects = await window.electronAPI.getProjects()
    project.value = projects.find(p => p.id === projectId.value)
    if (!project.value) {
      MessagePlugin.warning('项目不存在')
    }
  } catch (e) {
    MessagePlugin.error('加载项目失败: ' + e.message)
  }
}

async function loadServers() {
  try {
    servers.value = await window.electronAPI.getServers()
  } catch (e) {
    MessagePlugin.error('加载服务器失败: ' + e.message)
  }
}

async function startDeploy() {
  const server = servers.value.find(s => s.id === selectedServerId.value)
  if (!server || !project.value) return

  deploying.value = true
  deployProgress.value = { percent: 0, message: '准备部署...', theme: 'default' }
  deployLog.value = []

  window.electronAPI.onDeployProgress((data) => {
    deployProgress.value = {
      percent: data.percent,
      message: data.message,
      theme: data.step === 'error' ? 'error' : (data.step === 'done' ? 'success' : 'default')
    }
    deployLog.value.push({
      time: new Date().toLocaleTimeString(),
      command: data.command || '',
      message: data.message,
      type: data.step === 'error' ? 'error' : (data.step === 'done' ? 'success' : 'info')
    })
  })

  try {
    await window.electronAPI.deploy({
      project: JSON.parse(JSON.stringify(project.value)),
      serverId: selectedServerId.value
    })
    await window.electronAPI.saveHistory({
      projectId: project.value.id,
      projectName: project.value.name,
      serverName: server.name,
      success: true,
      message: '部署成功'
    })
  } catch (e) {
    deployProgress.value = { percent: 0, message: '部署失败: ' + e, theme: 'error' }
    await window.electronAPI.saveHistory({
      projectId: project.value.id,
      projectName: project.value.name,
      serverName: server.name,
      success: false,
      message: String(e)
    })
  } finally {
    deploying.value = false
  }
}

onMounted(() => {
  loadServers()
  if (projectId.value) loadProject()
})
</script>

<style scoped>
.project-info {
  margin-bottom: 24px;
}

.no-project {
  margin-bottom: 24px;
}

.deploy-form {
  margin-bottom: 24px;
}

.deploy-progress {
  margin-top: 24px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
}

.deploy-message {
  margin-top: 8px;
  color: #666;
}

.deploy-log {
  margin-top: 24px;
}

.deploy-log h4 {
  margin-bottom: 12px;
}

.log-content {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.log-item {
  padding: 4px 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-time {
  color: #888;
}

.log-command {
  color: #569cd6;
  font-weight: bold;
  display: block;
  margin-top: 8px;
}

.log-msg {
  color: #d4d4d4;
}

.log-item.error .log-msg {
  color: #f48771;
}

.log-item.success .log-msg {
  color: #89d185;
}
</style>