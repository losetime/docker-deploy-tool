<template>
  <div class="page-container">
    <div class="page-header">
      <h2>部署历史</h2>
    </div>

    <t-table :data="history" :columns="columns" row-key="timestamp" max-height="calc(100vh - 200px)">
      <template #status="{ row }">
        <t-tag :theme="row.success ? 'success' : 'danger'">
          {{ row.success ? '成功' : '失败' }}
        </t-tag>
      </template>
    </t-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const history = ref([])
const columns = [
  { colKey: 'projectName', title: '项目', width: 150 },
  { colKey: 'serverName', title: '服务器', width: 150 },
  { colKey: 'timestamp', title: '时间', width: 200 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'message', title: '信息' }
]

async function loadHistory() {
  try {
    history.value = await window.electronAPI.getHistory()
  } catch (e) {
    console.error('加载历史失败', e)
  }
}

onMounted(() => loadHistory())
</script>