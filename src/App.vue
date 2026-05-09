<template>
  <t-layout class="app-layout">
    <t-header class="app-header">
      <div class="header-content">
        <h1>Docker 部署工具</h1>
      </div>
    </t-header>

    <t-layout>
      <t-aside class="app-aside">
        <t-menu :value="activeMenu" theme="light" @change="onMenuChange">
          <t-menu-item value="projects">
            <template #icon><t-icon name="folder" /></template>
            项目管理
          </t-menu-item>
          <t-menu-item value="servers">
            <template #icon><t-icon name="server" /></template>
            服务器管理
          </t-menu-item>
          <t-menu-item value="deploy">
            <template #icon><t-icon name="cloud-upload" /></template>
            部署
          </t-menu-item>
          <t-menu-item value="containers">
            <template #icon><t-icon name="storage" /></template>
            容器状态
          </t-menu-item>
          <t-menu-item value="history">
            <template #icon><t-icon name="history" /></template>
            部署历史
          </t-menu-item>
        </t-menu>
      </t-aside>

      <t-content class="app-content">
        <router-view />
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const activeMenu = ref(route.name || 'projects')

watch(() => route.name, (name) => {
  activeMenu.value = name || 'projects'
})

function onMenuChange(value) {
  router.push({ name: value })
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
}

.app-layout {
  height: 100%;
}

.app-header {
  background: #0052d9;
  color: white;
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.header-content h1 {
  font-size: 20px;
  font-weight: 500;
}

.app-aside {
  background: #f5f5f5;
}

.app-content {
  padding: 24px;
  background: #f0f2f5;
  overflow-y: auto;
}

.page-container {
  background: white;
  padding: 24px;
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 18px;
  font-weight: 500;
}
</style>