<template>
  <div class="page-layout config-page">
    <div class="page-title">系统参数配置</div>

    <el-alert
      v-if="referenceLoadError"
      type="warning"
      :closable="false"
      show-icon
      class="reference-alert"
      :title="referenceLoadError"
    />

    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span>参数列表</span>
          <el-button type="primary" @click="openCreate()">新增根配置</el-button>
        </div>
      </template>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="configs"
        row-key="id"
        border
        :tree-props="{ children: 'children' }"
        @expand-change="onExpandChange"
      >
        <el-table-column prop="label" label="名称" min-width="180" />
        <el-table-column prop="configKey" label="Key" min-width="240" show-overflow-tooltip />
        <el-table-column label="值" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.valueType === 'PASSWORD' && row.configValue">******</span>
            <span v-else>{{ displayConfigValue(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="valueType" label="类型" width="110" align="center" />
        <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openCreate(row)">新增子项</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑配置' : '新增配置'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="父配置">
          <el-select v-model="form.parentId" clearable filterable placeholder="根配置" style="width: 100%">
            <el-option
              v-for="item in flatOptions"
              :key="item.id"
              :label="`${item.label} (${item.configKey})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="label">
          <el-input v-model="form.label" />
        </el-form-item>
        <el-form-item label="Key" prop="configKey">
          <el-input v-model="form.configKey" placeholder="例如 google-drive.enabled" />
        </el-form-item>
        <el-form-item label="类型" prop="valueType">
          <el-select v-model="form.valueType" style="width: 100%">
            <el-option label="分组" value="GROUP" />
            <el-option label="文本" value="STRING" />
            <el-option label="整数" value="INTEGER" />
            <el-option label="小数" value="DECIMAL" />
            <el-option label="布尔" value="BOOLEAN" />
            <el-option label="密码" value="PASSWORD" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.valueType !== 'GROUP'" label="值" prop="configValue">
          <el-switch
            v-if="form.valueType === 'BOOLEAN'"
            v-model="booleanValue"
            active-text="true"
            inactive-text="false"
            @change="form.configValue = String(booleanValue)"
          />
          <el-select
            v-else-if="currentOptionSource"
            v-model="form.configValue"
            filterable
            clearable
            placeholder="请从 TALENT 数据中选择"
            style="width: 100%"
          >
            <el-option
              v-for="option in currentOptions"
              :key="option.value"
              :label="referenceOptionLabel(option)"
              :value="option.value"
            />
          </el-select>
          <el-input
            v-else
            v-model="form.configValue"
            :type="form.valueType === 'PASSWORD' ? 'password' : 'text'"
            show-password
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="系统配置">
          <el-switch v-model="form.systemFlag" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type TableInstance } from 'element-plus'
import { createAppConfig, deleteAppConfig, getAppConfigTree, updateAppConfig } from '../api/appConfig'
import { getTalentReferenceOptionMap } from '../api/talent'
import type { AppConfig, AppConfigForm, TalentReferenceOption, TalentReferenceType } from '../types/api'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const configs = ref<AppConfig[]>([])
const tableRef = ref<TableInstance>()
const formRef = ref<FormInstance>()
const booleanValue = ref(false)
const referenceOptions = ref<Partial<Record<TalentReferenceType, TalentReferenceOption[]>>>({})
const referenceLoadError = ref('')
const editingOptionSource = ref<TalentReferenceType | null>(null)

const form = reactive<AppConfigForm>({
  parentId: null,
  configKey: '',
  configValue: '',
  valueType: 'STRING',
  label: '',
  description: '',
  sortOrder: 0,
  systemFlag: false,
})

const rules: FormRules<AppConfigForm> = {
  label: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  configKey: [{ required: true, message: '请输入配置 key', trigger: 'blur' }],
  valueType: [{ required: true, message: '请选择值类型', trigger: 'change' }],
}

const flatOptions = computed(() => flatten(configs.value).filter((item) => item.id !== editingId.value))

const currentOptionSource = computed(() => editingOptionSource.value)

const currentOptions = computed(() => {
  if (!currentOptionSource.value) return []
  return referenceOptions.value[currentOptionSource.value] || []
})

const flatten = (items: AppConfig[]): AppConfig[] =>
  items.flatMap((item) => [item, ...flatten(item.children || [])])

const expandedRowIds = ref<Set<number>>(new Set())

const hasChildren = (row: AppConfig) => !!(row.children && row.children.length > 0)

const getRowDepth = (row: AppConfig, rowsById: Map<number, AppConfig>) => {
  let depth = 0
  let current: AppConfig | undefined = row
  while (current?.parentId != null) {
    const parent = rowsById.get(current.parentId)
    if (!parent) break
    depth += 1
    current = parent
  }
  return depth
}

const onExpandChange = (row: AppConfig, expanded: boolean) => {
  if (!hasChildren(row)) return
  if (expanded) {
    expandedRowIds.value.add(row.id)
  } else {
    expandedRowIds.value.delete(row.id)
  }
}

const ensureRowExpanded = async (row: AppConfig) => {
  if (!hasChildren(row)) return
  expandedRowIds.value.add(row.id)
  await nextTick()
  tableRef.value?.toggleRowExpansion(row, true)
}

const restoreExpandedRows = async () => {
  await nextTick()
  const table = tableRef.value
  if (!table) return

  const flat = flatten(configs.value)
  const rowsById = new Map(flat.map((row) => [row.id, row]))
  const validIds = new Set(flat.filter(hasChildren).map((row) => row.id))
  expandedRowIds.value = new Set([...expandedRowIds.value].filter((id) => validIds.has(id)))

  const rowsToExpand = [...expandedRowIds.value]
    .map((id) => rowsById.get(id))
    .filter((row): row is AppConfig => !!row && hasChildren(row))
    .sort((a, b) => getRowDepth(a, rowsById) - getRowDepth(b, rowsById))

  for (const row of rowsToExpand) {
    table.toggleRowExpansion(row, true)
  }
}

const pruneExpandedIds = (removedId: number) => {
  expandedRowIds.value.delete(removedId)
}

const referenceOptionLabel = (option: TalentReferenceOption) => {
  if (option.code && option.code !== option.value) {
    return `${option.label} (${option.code})`
  }
  return option.label
}

const findReferenceLabel = (row: AppConfig) => {
  if (!row.optionSource || !row.configValue) return null
  const options = referenceOptions.value[row.optionSource] || []
  const normalized = row.configValue.trim().toLowerCase()
  const match = options.find((item) => item.value.trim().toLowerCase() === normalized)
  return match ? referenceOptionLabel(match) : null
}

const displayConfigValue = (row: AppConfig) => {
  if (!row.configValue) return '-'
  const label = findReferenceLabel(row)
  return label ? `${label}` : row.configValue
}

const loadReferenceOptions = async () => {
  referenceLoadError.value = ''
  try {
    referenceOptions.value = await getTalentReferenceOptionMap()
  } catch (error) {
    referenceLoadError.value =
      error instanceof Error
        ? `TALENT 参考数据加载失败，GUID 类配置将暂时只能手动输入：${error.message}`
        : 'TALENT 参考数据加载失败，GUID 类配置将暂时只能手动输入'
  }
}

const loadConfigs = async () => {
  loading.value = true
  try {
    configs.value = await getAppConfigTree()
    await restoreExpandedRows()
  } finally {
    loading.value = false
  }
}

const resetForm = (parent?: AppConfig) => {
  editingId.value = null
  editingOptionSource.value = null
  form.parentId = parent?.id ?? null
  form.configKey = parent ? `${parent.configKey}.` : ''
  form.configValue = ''
  form.valueType = 'STRING'
  form.label = ''
  form.description = ''
  form.sortOrder = 0
  form.systemFlag = false
  booleanValue.value = false
}

const openCreate = (parent?: AppConfig) => {
  resetForm(parent)
  if (parent) {
    void ensureRowExpanded(parent)
  }
  dialogVisible.value = true
}

const openEdit = (row: AppConfig) => {
  editingId.value = row.id
  editingOptionSource.value = row.optionSource ?? null
  form.parentId = row.parentId ?? null
  form.configKey = row.configKey
  form.configValue = row.configValue ?? ''
  form.valueType = row.valueType
  form.label = row.label
  form.description = row.description ?? ''
  form.sortOrder = row.sortOrder ?? 0
  form.systemFlag = !!row.systemFlag
  booleanValue.value = row.configValue === 'true' || row.configValue === '1'
  dialogVisible.value = true
}

const save = async () => {
  await formRef.value?.validate()
  if (form.valueType === 'GROUP') {
    form.configValue = null
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateAppConfig(editingId.value, { ...form })
      ElMessage.success('配置已更新')
    } else {
      await createAppConfig({ ...form })
      ElMessage.success('配置已创建')
    }
    dialogVisible.value = false
    await loadConfigs()
  } finally {
    saving.value = false
  }
}

const remove = async (row: AppConfig) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.label}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await deleteAppConfig(row.id)
  pruneExpandedIds(row.id)
  ElMessage.success('配置已删除')
  await loadConfigs()
}

onMounted(async () => {
  await Promise.all([loadConfigs(), loadReferenceOptions()])
})
</script>

<style scoped>
.config-page {
  overflow-y: auto;
}

.reference-alert {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
