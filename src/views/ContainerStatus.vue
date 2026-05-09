<template>
  <div class="page-container">
    <div class="page-header">
      <h2>容器状态</h2>
    </div>

    <t-form layout="inline" class="container-form">
      <t-form-item label="选择项目">
        <t-select v-model="projectId" placeholder="请选择项目" style="width: 300px">
          <t-option v-for="p in projects" :key="p.id" :value="p.id" :label="p.name" />
        </t-select>
      </t-form-item>
      <t-form-item label="选择服务器">
        <t-select v-model="serverId" placeholder="请选择服务器" style="width: 300px">
          <t-option v-for="s in servers" :key="s.id" :value="s.id" :label="s.name + ' (' + s.host + ')'" />
        </t-select>
      </t-form-item>
      <t-form-item>
        <t-button theme="primary" :loading="loading" @click="loadContainers" :disabled="!projectId || !serverId">
          刷新状态
        </t-button>
      </t-form-item>
    </t-form>

    <div v-if="output" class="container-output">
      <pre>{{ output }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

const projects = ref([])
const servers = ref([])
const projectId = ref('')
const serverId = ref('')
const loading = ref(false)
const output = ref('')

async function loadProjects() {
  try {
    projects.value = await window.electronAPI.getProjects()
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

async function loadContainers() {
  const project = projects.value.find(p => p.id === projectId.value)
  const server = servers.value.find(s => s.id === serverId.value)
  if (!project || !server) return

  loading.value = true
  try {
    output.value = await window.electronAPI.getContainers({
      project: JSON.parse(JSON.stringify(project)),
      serverId: serverId.value
    })
  } catch (e) {
    MessagePlugin.error('获取容器状态失败: ' + e)
    output.value = ''
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProjects()
  loadServers()
})
</script>

<style scoped>
.container-form {
  margin-bottom: 24px;
}

.container-output {
  margin-top: 24px;
}

.container-output pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}
</style>