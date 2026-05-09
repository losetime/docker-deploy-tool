<template>
  <div class="page-container">
    <div class="page-header">
      <h2>服务器管理</h2>
      <t-button theme="primary" @click="openDialog()">
        <template #icon><t-icon name="add" /></template>
        添加服务器
      </t-button>
    </div>

    <t-table :data="servers" :columns="columns" row-key="id" max-height="calc(100vh - 200px)">
      <template #tags="{ row }">
        <t-space>
          <t-tag v-for="tag in (row.tags || '').split(',').filter(Boolean)" :key="tag" size="small">
            {{ tag }}
          </t-tag>
        </t-space>
      </template>
      <template #operation="{ row }">
        <t-space>
          <t-link theme="primary" @click="openDialog(row)">编辑</t-link>
          <t-link theme="danger" @click="deleteServer(row.id)">删除</t-link>
        </t-space>
      </template>
    </t-table>

    <t-dialog
      v-model:visible="dialogVisible"
      :header="editing ? '编辑服务器' : '添加服务器'"
      :confirm-btn="{ content: '保存', loading: saving }"
      @confirm="save"
      width="500px"
    >
      <t-form :data="form" :rules="rules" ref="formRef" label-align="right" label-width="100px">
        <t-form-item label="名称" name="name">
          <t-input v-model="form.name" placeholder="如：生产服务器" />
        </t-form-item>
        <t-form-item label="地址" name="host">
          <t-input v-model="form.host" placeholder="如：8.160.178.247" />
        </t-form-item>
        <t-form-item label="端口" name="port">
          <t-input-number v-model="form.port" :min="1" :max="65535" />
        </t-form-item>
        <t-form-item label="用户名" name="user">
          <t-input v-model="form.user" placeholder="如：root" />
        </t-form-item>
        <t-form-item label="密码" name="password">
          <t-input v-model="form.password" type="password" placeholder="服务器密码" />
        </t-form-item>
        <t-form-item label="备注" name="remark">
          <t-input v-model="form.remark" placeholder="备注信息" />
        </t-form-item>
        <t-form-item label="标签" name="tags">
          <t-input v-model="form.tags" placeholder="多个标签用逗号分隔，如：生产,阿里云" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

const servers = ref([])
const columns = [
  { colKey: 'name', title: '名称', width: 150 },
  { colKey: 'host', title: '地址', width: 150 },
  { colKey: 'port', title: '端口', width: 80 },
  { colKey: 'user', title: '用户', width: 100 },
  { colKey: 'remark', title: '备注', width: 150 },
  { colKey: 'tags', title: '标签', width: 150 },
  { colKey: 'operation', title: '操作', width: 150 }
]

const dialogVisible = ref(false)
const editing = ref(null)
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  id: '',
  name: '',
  host: '',
  port: 22,
  user: 'root',
  password: '',
  remark: '',
  tags: ''
})
const rules = {
  name: [{ required: true, message: '请输入名称' }],
  host: [{ required: true, message: '请输入地址' }],
  password: [{ required: true, message: '请输入密码' }]
}

async function load() {
  try {
    servers.value = await window.electronAPI.getServers()
  } catch (e) {
    MessagePlugin.error('加载失败: ' + e.message)
  }
}

function openDialog(server = null) {
  editing.value = server
  if (server) {
    Object.assign(form, server)
  } else {
    Object.assign(form, {
      id: Date.now().toString(),
      name: '',
      host: '',
      port: 22,
      user: 'root',
      password: '',
      remark: '',
      tags: ''
    })
  }
  dialogVisible.value = true
}

async function save() {
  const valid = await formRef.value.validate()
  if (valid !== true) return

  saving.value = true
  try {
    await window.electronAPI.saveServer({ ...form })
    MessagePlugin.success('保存成功')
    dialogVisible.value = false
    load()
  } catch (e) {
    MessagePlugin.error('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function deleteServer(id) {
  if (!confirm('确定删除此服务器？')) return
  try {
    await window.electronAPI.deleteServer(id)
    MessagePlugin.success('删除成功')
    load()
  } catch (e) {
    MessagePlugin.error('删除失败: ' + e.message)
  }
}

onMounted(() => load())
</script>