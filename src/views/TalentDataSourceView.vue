<template>
  <div class="page-layout talent-page">
    <div class="page-title">Talent 数据源热部署</div>

    <transition name="form-slide">
      <el-card v-if="editing" class="page-card edit-card">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" style="max-width: 620px">
          <el-form-item label="IP / 主机" prop="host">
            <el-input v-model="form.host" placeholder="例如 localhost 或 192.168.1.10" />
          </el-form-item>
          <el-form-item label="端口" prop="port">
            <el-input-number v-model="form.port" :min="1" :max="65535" />
          </el-form-item>
          <el-form-item label="数据库名" prop="databaseName">
            <el-input v-model="form.databaseName" />
          </el-form-item>
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="请输入连接密码" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="save">保存并热部署</el-button>
            <el-button @click="editing = false">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </transition>

    <el-card class="page-card status-card">
      <template #header>
        <div class="status-header">
          <span>当前状态</span>
          <div>
            <el-button type="primary" plain @click="editConnection">编辑连接</el-button>
            <el-button :loading="verifying" @click="verify">验证连接</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="是否配置">
          <el-tag :type="status?.configured ? 'success' : 'info'">
            {{ status?.configured ? '已配置' : '未配置' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="连接状态">
          <el-tag :type="status?.connected ? 'success' : 'danger'">
            {{ status?.connected ? '正常' : '不可用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="地址">{{ status?.host || '-' }}</el-descriptions-item>
        <el-descriptions-item label="端口">{{ status?.port || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数据库">{{ status?.databaseName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ status?.username || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDateTime(status?.lastAppliedAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  getDataSourceStatus,
  saveDataSource,
  verifyDataSource,
} from '../api/talent'
import type { DataSourceForm, DataSourceStatus } from '../types/api'

const formRef = ref<FormInstance>()
const status = ref<DataSourceStatus>()
const saving = ref(false)
const verifying = ref(false)
const editing = ref(false)

const form = reactive<DataSourceForm>({
  host: 'localhost',
  port: 1433,
  databaseName: 'TALENTOPOS',
  username: '',
  password: '',
})

const rules: FormRules<DataSourceForm> = {
  host: [{ required: true, message: '请输入 IP 或主机名', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'change' }],
  databaseName: [{ required: true, message: '请输入数据库名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const loadStatus = async () => {
  status.value = await getDataSourceStatus()
}

const save = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    status.value = await saveDataSource({ ...form })
    editing.value = false
    ElMessage.success('数据源已热部署')
  } finally {
    saving.value = false
  }
}

const verify = async () => {
  verifying.value = true
  try {
    const result = await verifyDataSource()
    ElMessage.success(`连接正常，Products 数量：${result.productCount}`)
    await loadStatus()
  } finally {
    verifying.value = false
  }
}

const editConnection = () => {
  if (status.value?.configured) {
    form.host = status.value.host || form.host
    form.port = status.value.port || form.port
    form.databaseName = status.value.databaseName || form.databaseName
    form.username = status.value.username || form.username
    form.password = ''
  }
  editing.value = true
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

onMounted(loadStatus)
</script>

<style scoped>
.edit-card {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.status-card {
  flex-shrink: 0;
  margin-top: 10px;
}

.talent-page {
  overflow-y: auto;
  padding-right: 2px;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-slide-enter-active,
.form-slide-leave-active {
  transition: all 0.25s ease;
}

.form-slide-enter-from,
.form-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
