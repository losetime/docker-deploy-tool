import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/projects' },
  { path: '/projects', name: 'projects', component: () => import('../views/ProjectManage.vue') },
  { path: '/servers', name: 'servers', component: () => import('../views/ServerManage.vue') },
  { path: '/deploy', name: 'deploy', component: () => import('../views/Deploy.vue') },
  { path: '/containers', name: 'containers', component: () => import('../views/ContainerStatus.vue') },
  { path: '/history', name: 'history', component: () => import('../views/DeployHistory.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router