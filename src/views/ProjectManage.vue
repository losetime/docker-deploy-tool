<template>
  <div class="page-container">
    <div class="page-header">
      <h2>项目管理</h2>
      <t-button theme="primary" @click="openDialog()">
        <template #icon><t-icon name="add" /></template>
        添加项目
      </t-button>
    </div>

    <t-table :data="projects" :columns="columns" row-key="id" max-height="calc(100vh - 200px)">
      <template #operation="{ row }">
        <t-space>
          <t-link theme="primary" @click="goDeploy(row.id)">部署</t-link>
          <t-link theme="primary" @click="openDialog(row)">编辑</t-link>
          <t-link theme="danger" @click="deleteProject(row.id)">删除</t-link>
        </t-space>
      </template>
    </t-table>

    <t-dialog
      v-model:visible="dialogVisible"
      :header="editing ? '编辑项目' : '添加项目'"
      :confirm-btn="{ content: '保存', loading: saving }"
      @confirm="save"
      width="600px"
    >
      <t-form :data="form" :rules="rules" ref="formRef" label-align="right" label-width="120px">
        <t-form-item label="项目路径" name="projectPath">
          <t-input-adornment append>
            <t-button variant="outline" @click="selectFolder">选择</t-button>
          </t-input-adornment>
          <t-input v-model="form.projectPath" placeholder="点击选择按钮选择项目文件夹" readonly />
        </t-form-item>
        <t-form-item label="项目名称" name="name">
          <t-input v-model="form.name" placeholder="自动从文件夹名推断" />
        </t-form-item>
        <t-form-item label="Dockerfile路径" name="dockerfilePath">
          <t-input-adornment append>
            <t-button variant="outline" @click="selectDockerfile">选择</t-button>
          </t-input-adornment>
          <t-input v-model="form.dockerfilePath" placeholder="自动检测或手动选择" />
        </t-form-item>
        <t-form-item label="镜像名称" name="imageName">
          <t-input v-model="form.imageName" placeholder="自动从项目名推断" />
        </t-form-item>
        <t-form-item label="镜像标签" name="imageTag">
          <t-input v-model="form.imageTag" placeholder="默认 latest" />
        </t-form-item>
        <t-form-item label="服务名称" name="serviceName">
          <t-input v-model="form.serviceName" placeholder="自动从项目名推断" />
        </t-form-item>
        <t-divider>Docker Compose 配置</t-divider>
        <t-form-item label="Compose路径" name="composePath">
          <t-input v-model="form.composePath" placeholder="如：/opt/nova-space" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const projects = ref([])
const columns = [
  { colKey: 'name', title: '项目名称', width: 150 },
  { colKey: 'imageName', title: '镜像', width: 150 },
  { colKey: 'serviceName', title: '服务', width: 150 },
  { colKey: 'composePath', title: 'Compose路径', width: 200 },
  { colKey: 'operation', title: '操作', width: 200 }
]

const dialogVisible = ref(false)
const editing = ref(null)
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  id: '',
  name: '',
  projectPath: '',
  dockerfilePath: './Dockerfile',
  imageName: '',
  imageTag: 'latest',
  composePath: '',
  serviceName: ''
})
const rules = {
  name: [{ required: true, message: '请输入项目名称' }],
  projectPath: [{ required: true, message: '请输入项目路径' }],
  imageName: [{ required: true, message: '请输入镜像名称' }],
  composePath: [{ required: true, message: '请输入Compose路径' }],
  serviceName: [{ required: true, message: '请输入服务名称' }]
}

async function load() {
  try {
    projects.value = await window.electronAPI.getProjects()
  } catch (e) {
    MessagePlugin.error('加载失败: ' + e.message)
  }
}

async function selectFolder() {
  const folderPath = await window.electronAPI.selectFolder()
  if (!folderPath) return

  const folderName = folderPath.split(/[/\\]/).pop()
  form.projectPath = folderPath
  form.name = folderName
  form.imageName = folderName
  form.imageTag = 'latest'
  form.serviceName = folderName

  const dockerfileExists = await window.electronAPI.checkDockerfile(folderPath, 'Dockerfile')
  if (dockerfileExists) {
    form.dockerfilePath = folderPath.replace(/\\/g, '/') + '/Dockerfile'
  } else {
    form.dockerfilePath = ''
    MessagePlugin.warning('未找到 Dockerfile，请手动选择')
  }
}

async function selectDockerfile() {
  const filePath = await window.electronAPI.selectFile()
  if (!filePath) return
  form.dockerfilePath = filePath.replace(/\\/g, '/')
}

function openDialog(project = null) {
  editing.value = project
  if (project) {
    Object.assign(form, project)
  } else {
    Object.assign(form, {
      id: Date.now().toString(),
      name: '',
      projectPath: '',
      dockerfilePath: '',
      imageName: '',
      imageTag: 'latest',
      composePath: '',
      serviceName: ''
    })
  }
  dialogVisible.value = true
}

async function save() {
  const valid = await formRef.value.validate()
  if (valid !== true) return

  saving.value = true
  try {
    await window.electronAPI.saveProject({ ...form })
    MessagePlugin.success('保存成功')
    dialogVisible.value = false
    load()
  } catch (e) {
    MessagePlugin.error('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function deleteProject(id) {
  if (!confirm('确定删除此项目？')) return
  try {
    await window.electronAPI.deleteProject(id)
    MessagePlugin.success('删除成功')
    load()
  } catch (e) {
    MessagePlugin.error('删除失败: ' + e.message)
  }
}

function goDeploy(projectId) {
  router.push({ path: '/deploy', query: { projectId } })
}

onMounted(() => load())
</script>