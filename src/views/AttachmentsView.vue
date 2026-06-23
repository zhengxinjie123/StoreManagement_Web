<template>
  <div class="page-layout">
    <div class="page-title">电子发票列表</div>

    <el-card class="page-card page-card--static">
      <el-form class="upload-form" :inline="true" :model="uploadForm">
        <el-form-item label="供应商" required>
          <el-select
            v-model="uploadForm.supplierGuid"
            filterable
            clearable
            placeholder="请选择供应商"
            class="field-select"
          >
            <el-option
              v-for="supplier in suppliers"
              :key="supplier.guid"
              :label="supplierLabel(supplier)"
              :value="supplier.guid"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="电子发票" class="upload-item" required>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".xls,.xlsx,.pdf"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
            class="inline-upload"
          >
            <el-button v-if="!selectedFile">选择电子发票</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="uploading" @click="submitUpload">上传</el-button>
          <el-button @click="openBatchSelect">批量上传</el-button>
          <input
            ref="batchInputRef"
            type="file"
            multiple
            accept=".xls,.xlsx,.pdf"
            class="hidden-file-input"
            @change="onBatchFilesSelected"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <el-dialog
      v-model="batchDialogVisible"
      title="批量上传电子发票"
      width="680px"
      destroy-on-close
      @closed="resetBatchUpload"
    >
      <div class="batch-tip">系统将根据文件名自动匹配供应商（文件名包含供应商名称）；未匹配到的请手动选择，供应商为必填项。</div>
      <el-table :data="batchItems" border max-height="420">
        <el-table-column label="文件名" min-width="220">
          <template #default="{ row }">
            <span class="batch-file-name" :title="row.fileName">{{ row.fileName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="供应商" min-width="320">
          <template #default="{ row }">
            <el-select
              v-model="row.supplierGuid"
              filterable
              clearable
              placeholder="请选择供应商"
              style="width: 100%"
            >
              <el-option
                v-for="supplier in suppliers"
                :key="supplier.guid"
                :label="supplierLabel(supplier)"
                :value="supplier.guid"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" @click="removeBatchItem($index)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchUploading" @click="submitBatchUpload">确认上传</el-button>
      </template>
    </el-dialog>

    <el-card class="page-card page-card--grow">
      <el-tabs v-model="activeOwnerTab" class="owner-tabs" @tab-change="onOwnerTabChange">
        <el-tab-pane label="自己" name="SELF" />
        <el-tab-pane label="父母" name="PARENT" />
      </el-tabs>

      <div class="filter-bar">
        <el-select
          v-model="query.supplierGuid"
          filterable
          clearable
          placeholder="按供应商筛选"
          placement="bottom-start"
          popper-class="supplier-select-dropdown"
          class="field-select"
          @change="search"
          @clear="search"
        >
          <el-option
            v-for="supplier in suppliers"
            :key="supplier.guid"
            :label="supplierLabel(supplier)"
            :value="supplier.guid"
          >
            <span class="supplier-option" :title="supplierLabel(supplier)">
              {{ supplierLabel(supplier) }}
            </span>
          </el-option>
        </el-select>
        <div class="filter-bar-actions">
          <el-button
            type="primary"
            :disabled="!selectedRows.length"
            :loading="batchCleaning"
            @click="batchClean"
          >
            批量清洗
          </el-button>
          <el-button
            :loading="oneClickCleaning"
            @click="oneClickClean"
          >
            一键清洗
          </el-button>
          <el-button
            type="success"
            :disabled="!selectedRows.length"
            :loading="batchImporting"
            @click="batchImport"
          >
            批量导入
          </el-button>
          <el-button
            type="success"
            :loading="oneClickImporting"
            @click="oneClickImport"
          >
            一键导入
          </el-button>
        </div>
      </div>

      <div ref="tableShellRef" class="table-shell">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="attachments"
        border
        :max-height="tableMaxHeight"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="48" align="center" />
        <el-table-column label="文件名" min-width="100">
          <template #default="{ row }">
            <span class="download-link" @click="download(row)">
              {{ fullFilename(row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="供应商中文名">
          <template #default="{ row }">
            <span>
              {{ row.supplierChineseName }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="供应商外文名">
          <template #default="{ row }">
            <span>
              {{ row.supplierForeignName }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="上传时间">
          <template #default="{ row }">
            <span>
               {{ dayjs(row.uploadDate).format('YYYY-MM-DD HH:mm:ss') }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="清洗状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.cleanStatus === 'CLEANED' ? 'success' : 'info'" effect="light">
              {{ row.cleanStatusName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="导入状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.importStatus)" effect="light">
              {{ row.importStatusName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button link type="primary" @click="openAttachmentDetail(row)">详情</el-button>
              <el-dropdown trigger="click" @command="(command: RowAction) => handleRowAction(command, row)">
                <el-button link type="primary" :loading="cleaningUuid === row.uuid">
                  更多
                  <el-icon class="action-dropdown-icon"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="clean">清洗</el-dropdown-item>
                    <el-dropdown-item command="import">导入</el-dropdown-item>
                    <el-dropdown-item command="delete" divided :disabled="!row.deletable">
                      <span :class="{ 'action-danger': row.deletable }">删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div class="pagination">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadAttachments"
          @current-change="loadAttachments"
        />
      </div>
    </el-card>

    <ReadonlyDetailDialog
      v-model:visible="detailVisible"
      title="电子发票详情"
      :items="attachmentDetailItems"
    />

    <el-dialog v-model="cleanDialogVisible" title="选择清洗模板" width="420px" destroy-on-close>
      <p class="clean-dialog-hint">
        {{ cleanQueue.length > 1
          ? `该供应商存在多个模板，请为选中的 ${cleanQueue.length} 个发票选择清洗模板。`
          : '该供应商存在多个模板，请选择用于本次清洗的模板。' }}
      </p>
      <el-form label-width="80px">
        <el-form-item label="模板">
          <el-select v-model="cleanTemplateId" filterable placeholder="请选择模板" style="width: 100%">
            <el-option
              v-for="item in cleanTemplateOptions"
              :key="item.id"
              :label="itemLabel(item)"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cleanDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!cleanTemplateId" @click="confirmClean">开始清洗</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useTableMaxHeight } from '../utils/layout'
import ReadonlyDetailDialog, { type DetailItem } from '../components/ReadonlyDetailDialog.vue'
import { ElMessage, ElMessageBox, type TableInstance, type UploadFile, type UploadInstance } from 'element-plus'
import {
  type AttachmentOwnerType,
  attachmentDownloadUrl,
  batchUploadAttachments,
  cleanAttachment,
  deleteAttachment,
  fetchAllAttachments,
  getAttachments,
  matchSuppliersByFileName,
  uploadAttachment,
} from '../api/attachments'
import { getInvoiceTemplatesBySupplier } from '../api/invoiceTemplate'
import { getSupplierOptions } from '../api/talent'
import type { Attachment, InvoiceTemplate, SupplierOption } from '../types/api'
import dayjs from 'dayjs'


type RowAction = 'clean' | 'import' | 'delete'

const tableShellRef = ref<HTMLElement | null>(null)
const tableRef = ref<TableInstance>()
const { tableMaxHeight, recalc: recalcTableHeight } = useTableMaxHeight(tableShellRef)
const detailVisible = ref(false)
const detailAttachment = ref<Attachment | null>(null)

const uploadRef = ref<UploadInstance>()
const batchInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const uploading = ref(false)
const cleaningUuid = ref('')
const batchCleaning = ref(false)
const oneClickCleaning = ref(false)
const batchImporting = ref(false)
const oneClickImporting = ref(false)
const batchUploading = ref(false)
const batchDialogVisible = ref(false)
const cleanDialogVisible = ref(false)
const cleanTemplateId = ref<number | null>(null)
const cleanTemplateOptions = ref<InvoiceTemplate[]>([])
const cleanTarget = ref<Attachment | null>(null)
const cleanQueue = ref<Attachment[]>([])
const selectedRows = ref<Attachment[]>([])
const activeOwnerTab = ref<AttachmentOwnerType>('SELF')
const loading = ref(false)
const total = ref(0)
const attachments = ref<Attachment[]>([])
const suppliers = ref<SupplierOption[]>([])

interface BatchUploadRow {
  id: string
  file: File
  fileName: string
  supplierGuid: string
}

const batchItems = ref<BatchUploadRow[]>([])

const uploadForm = reactive({
  supplierGuid: '',
})

const query = reactive({
  current: 1,
  pageSize: 10,
  supplierGuid: '',
  ownerType: 'SELF' as AttachmentOwnerType,
})

const ownerTabLabel = computed(() => (activeOwnerTab.value === 'SELF' ? '自己' : '父母'))

const isExcelAttachment = (row: Attachment) =>
  ['xls', 'xlsx'].includes(row.extensionName.toLowerCase())

const supplierFilterHint = () => (query.supplierGuid ? '（已应用供应商筛选）' : '')

const onOwnerTabChange = (tabName: string | number) => {
  query.ownerType = tabName as AttachmentOwnerType
  selectedRows.value = []
  tableRef.value?.clearSelection()
  search()
}

const onSelectionChange = (rows: Attachment[]) => {
  selectedRows.value = rows
}

const onFileChange = (file: UploadFile) => {
  const rawFile = file.raw
  if (!rawFile || !isAllowedInvoiceFile(rawFile.name)) {
    ElMessage.warning('电子发票只允许选择 Excel 或 PDF 文件')
    uploadRef.value?.clearFiles()
    selectedFile.value = undefined
    return
  }
  selectedFile.value = rawFile
}

const onFileRemove = () => {
  selectedFile.value = undefined
}

const loadSuppliers = async () => {
  suppliers.value = await getSupplierOptions()
}

const loadAttachments = async () => {
  loading.value = true
  try {
    const page = await getAttachments({
      current: query.current,
      pageSize: query.pageSize,
      supplierGuid: query.supplierGuid || undefined,
      ownerType: query.ownerType,
    })
    attachments.value = page.records
    total.value = page.total
    selectedRows.value = []
    tableRef.value?.clearSelection()
  } finally {
    loading.value = false
  }
}

const search = () => {
  query.current = 1
  loadAttachments()
}

const submitUpload = async () => {
  if (!uploadForm.supplierGuid) {
    ElMessage.warning('请先选择供应商')
    return
  }
  if (!selectedFile.value) {
    ElMessage.warning('请先选择电子发票')
    return
  }

  uploading.value = true
  try {
    await uploadAttachment(selectedFile.value, uploadForm.supplierGuid, query.ownerType)
    uploadRef.value?.clearFiles()
    selectedFile.value = undefined
    query.current = 1
    await loadAttachments()
    ElMessage.success('上传成功')
  } finally {
    uploading.value = false
  }
}

const openBatchSelect = () => {
  batchInputRef.value?.click()
}

const onBatchFilesSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''

  if (!files.length) {
    return
  }

  const validFiles = files.filter((file) => isAllowedInvoiceFile(file.name))
  if (validFiles.length !== files.length) {
    ElMessage.warning('已自动过滤非 Excel/PDF 文件')
  }
  if (!validFiles.length) {
    ElMessage.warning('请选择 Excel 或 PDF 文件')
    return
  }

  let matchMap = new Map<string, string>()
  try {
    const matches = await matchSuppliersByFileName(validFiles.map((file) => file.name))
    matchMap = new Map(
      matches.map((item) => [item.fileName, item.supplierGuid || '']),
    )
  } catch {
    return
  }

  batchItems.value = validFiles.map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    fileName: file.name,
    supplierGuid: matchMap.get(file.name) || '',
  }))
  batchDialogVisible.value = true
}

const removeBatchItem = (index: number) => {
  batchItems.value.splice(index, 1)
  if (!batchItems.value.length) {
    batchDialogVisible.value = false
  }
}

const resetBatchUpload = () => {
  batchItems.value = []
}

const submitBatchUpload = async () => {
  if (!batchItems.value.length) {
    ElMessage.warning('请先选择电子发票')
    return
  }

  const missingSupplier = batchItems.value.find((item) => !item.supplierGuid)
  if (missingSupplier) {
    ElMessage.warning(`请为「${missingSupplier.fileName}」选择供应商`)
    return
  }

  batchUploading.value = true
  try {
    const result = await batchUploadAttachments(
      batchItems.value.map((item) => ({
        file: item.file,
        supplierGuid: item.supplierGuid,
      })),
      query.ownerType,
    )

    query.current = 1
    await loadAttachments()

    if (result.failureCount === 0) {
      ElMessage.success(`批量上传成功，共 ${result.successCount} 个文件`)
      batchDialogVisible.value = false
      return
    }

    const failedNames = result.items
      .filter((item) => !item.success)
      .map((item) => `${item.fileName}：${item.message}`)
      .join('；')

    if (result.successCount > 0) {
      ElMessage.warning(`成功 ${result.successCount} 个，失败 ${result.failureCount} 个。${failedNames}`)
      batchItems.value = batchItems.value.filter((item) =>
        result.items.some((resultItem) => !resultItem.success && resultItem.fileName === item.fileName),
      )
      return
    }

    ElMessage.error(`批量上传失败。${failedNames}`)
  } finally {
    batchUploading.value = false
  }
}

const clean = async (row: Attachment) => {
  if (!isExcelAttachment(row)) {
    ElMessage.warning('仅支持 Excel 电子发票清洗')
    return
  }
  await cleanRows([row])
}

const batchClean = async () => {
  const excelRows = selectedRows.value.filter(isExcelAttachment)
  if (!excelRows.length) {
    ElMessage.warning('请选择 Excel 电子发票进行清洗')
    return
  }
  if (excelRows.length !== selectedRows.value.length) {
    ElMessage.warning('已自动忽略非 Excel 文件')
  }
  batchCleaning.value = true
  try {
    await cleanRows(excelRows)
  } finally {
    batchCleaning.value = false
  }
}

const oneClickClean = async () => {
  oneClickCleaning.value = true
  try {
    const all = await fetchAllAttachments({
      ownerType: query.ownerType,
      supplierGuid: query.supplierGuid || undefined,
      cleanStatus: 'NOT_CLEANED',
    })
    const excelRows = all.filter(isExcelAttachment)
    if (!excelRows.length) {
      ElMessage.info('当前列表没有未清洗的 Excel 发票')
      return
    }
    try {
      await ElMessageBox.confirm(
        `确定清洗「${ownerTabLabel.value}」下全部 ${excelRows.length} 个未清洗 Excel 发票吗？${supplierFilterHint()}`,
        '一键清洗确认',
        {
          type: 'warning',
          confirmButtonText: '开始清洗',
          cancelButtonText: '取消',
        },
      )
    } catch {
      return
    }
    batchCleaning.value = true
    await cleanRows(excelRows)
  } finally {
    oneClickCleaning.value = false
    batchCleaning.value = false
  }
}

const batchImport = async () => {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选要导入的发票')
    return
  }
  batchImporting.value = true
  try {
    await importRows(selectedRows.value)
  } finally {
    batchImporting.value = false
  }
}

const oneClickImport = async () => {
  oneClickImporting.value = true
  try {
    const all = await fetchAllAttachments({
      ownerType: query.ownerType,
      supplierGuid: query.supplierGuid || undefined,
      importStatus: 'NOT_IMPORTED',
    })
    if (!all.length) {
      ElMessage.info('当前列表没有未导入的发票')
      return
    }
    try {
      await ElMessageBox.confirm(
        `确定导入「${ownerTabLabel.value}」下全部 ${all.length} 个未导入发票吗？${supplierFilterHint()}`,
        '一键导入确认',
        {
          type: 'warning',
          confirmButtonText: '开始导入',
          cancelButtonText: '取消',
        },
      )
    } catch {
      return
    }
    await importRows(all)
  } finally {
    oneClickImporting.value = false
  }
}

const handleRowAction = (command: RowAction, row: Attachment) => {
  if (command === 'clean') {
    clean(row)
    return
  }
  if (command === 'import') {
    importToTalent(row)
    return
  }
  if (command === 'delete') {
    remove(row)
  }
}

const cleanRows = async (rows: Attachment[]) => {
  for (const row of rows) {
    if (!['xls', 'xlsx'].includes(row.extensionName.toLowerCase())) {
      continue
    }

    let templates: InvoiceTemplate[] = []
    try {
      templates = await getInvoiceTemplatesBySupplier(row.supplierGuid)
    } catch {
      return
    }

    if (templates.length === 0) {
      ElMessage.warning(`「${fullFilename(row)}」的供应商尚未配置清洗模板`)
      continue
    }

    if (templates.length === 1) {
      const success = await runClean(row, templates[0].id)
      if (!success) {
        return
      }
      continue
    }

    cleanQueue.value = rows.slice(rows.indexOf(row))
    cleanTarget.value = row
    cleanTemplateOptions.value = templates
    cleanTemplateId.value = templates[0].id
    cleanDialogVisible.value = true
    return
  }
  await loadAttachments()
}

const itemLabel = (item: InvoiceTemplate) => {
  const tags = [item.name]
  if (item.enabled) tags.push('启用')
  return tags.join(' · ')
}

const confirmClean = async () => {
  if (!cleanTarget.value || !cleanTemplateId.value) return
  const target = cleanTarget.value
  const remaining = cleanQueue.value
  cleanDialogVisible.value = false
  cleanTarget.value = null
  cleanQueue.value = []

  const success = await runClean(target, cleanTemplateId.value)
  if (!success) {
    return
  }

  const nextIndex = remaining.indexOf(target) + 1
  if (nextIndex < remaining.length) {
    await cleanRows(remaining.slice(nextIndex))
    return
  }
  await loadAttachments()
}

const runClean = async (row: Attachment, templateId: number): Promise<boolean> => {
  if (row.cleanStatus === 'CLEANED') {
    try {
      await ElMessageBox.confirm(
        `「${fullFilename(row)}」已清洗过，确定重新清洗吗？`,
        '重新清洗确认',
        {
          type: 'warning',
          confirmButtonText: '重新清洗',
          cancelButtonText: '取消',
        },
      )
    } catch {
      return false
    }
  }

  cleaningUuid.value = row.uuid
  try {
    const archive = await cleanAttachment(row.uuid, row.supplierGuid, templateId)
    ElMessage.success(`清洗成功，归档文件：${archive.fileName}.${archive.extensionName}`)
    row.cleanStatus = 'CLEANED'
    row.cleanStatusName = '已清洗'
    return true
  } catch {
    return false
  } finally {
    cleaningUuid.value = ''
  }
}

const importToTalent = async (row: Attachment, options?: { silent?: boolean }): Promise<boolean> => {
  if (row.importStatus === 'SUCCESS') {
    if (!options?.silent) {
      ElMessage.warning(`「${fullFilename(row)}」已导入成功，无需重复导入`)
    }
    return false
  }
  if (!options?.silent) {
    ElMessage.info(`导入功能待后端实现：${row.fileName}`)
  }
  return false
}

const importRows = async (rows: Attachment[]) => {
  if (!rows.length) {
    return
  }
  let successCount = 0
  let skipCount = 0
  for (const row of rows) {
    if (row.importStatus === 'SUCCESS') {
      skipCount += 1
      continue
    }
    const ok = await importToTalent(row, { silent: true })
    if (ok) {
      successCount += 1
    }
  }
  await loadAttachments()
  if (successCount > 0) {
    ElMessage.success(`导入完成，共 ${successCount} 个`)
    return
  }
  if (skipCount === rows.length) {
    ElMessage.warning('所选发票均已导入成功')
    return
  }
  ElMessage.info(`导入功能待后端实现，已处理 ${rows.length - skipCount} 个未导入发票`)
}

const remove = async (row: Attachment) => {
  try {
    await ElMessageBox.confirm(`确定删除「${fullFilename(row)}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await deleteAttachment(row.uuid)
  if (attachments.value.length === 1 && query.current > 1) {
    query.current -= 1
  }
  await loadAttachments()
  ElMessage.success('删除成功')
}

const download = (row: Attachment) => {
  window.open(attachmentDownloadUrl(row.uuid), '_blank')
}

const fullFilename = (row: Attachment) => `${row.fileName}.${row.extensionName}`

const attachmentDetailItems = computed<DetailItem[]>(() => {
  const row = detailAttachment.value
  if (!row) return []
  return [
    { label: '文件名', value: fullFilename(row) },
    { label: '文件大小', value: formatSize(row.fileSize) },
    { label: '上传日期', value: formatDateTime(row.uploadDate) },
    { label: '供应商中文名', value: row.supplierChineseName || '-' },
    { label: '供应商外文名', value: row.supplierForeignName || '-' },
    { label: '所属人员', value: row.ownerTypeName || '-' },
    { label: '清洗状态', value: row.cleanStatusName || '-' },
    { label: '导入状态', value: row.importStatusName },
  ]
})

const openAttachmentDetail = (row: Attachment) => {
  detailAttachment.value = row
  detailVisible.value = true
}

const supplierLabel = (supplier: SupplierOption) =>
  [supplier.chineseName, supplier.foreignName].filter(Boolean).join(' / ')

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const isAllowedInvoiceFile = (filename: string) =>
  ['xls', 'xlsx', 'pdf'].includes(filename.split('.').pop()?.toLowerCase() || '')

const formatDateTime = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const statusTagType = (status: Attachment['importStatus']) => {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  return 'info'
}

onMounted(async () => {
  loadSuppliers()
  await loadAttachments()
  await nextTick()
  recalcTableHeight()
})
</script>

<style scoped>
.upload-form {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.upload-form :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}

.inline-upload {
  display: flex;
  align-items: center;
  min-width: 200px;
}

.inline-upload :deep(.el-upload) {
  display: inline-flex;
}

.inline-upload :deep(.el-upload-list) {
  display: inline-flex;
  align-items: center;
  margin: 0 0 0 8px;
  min-width: 220px;
}

.inline-upload :deep(.el-upload-list__item) {
  margin: 0;
  min-width: 220px;
}

.inline-upload :deep(.el-upload-list__item-name) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.filter-bar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.action-dropdown-icon {
  margin-left: 2px;
}

.action-danger {
  color: var(--el-color-danger);
}

.owner-tabs {
  flex-shrink: 0;
  margin-bottom: 4px;
}

.owner-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.filter-bar :deep(.el-select__selected-item) {
  overflow: hidden;
}

.filter-bar :deep(.el-select__selected-item span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.supplier-option {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.download-link {
  color: #409eff;
  cursor: pointer;
}

.download-link:hover {
  text-decoration: underline;
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 10px;
  box-sizing: border-box;
}

:global(.supplier-select-dropdown) {
  max-width: 520px;
}

.hidden-file-input {
  display: none;
}

.batch-tip {
  margin-bottom: 12px;
  color: #606266;
  font-size: 12px;
}

.batch-file-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clean-dialog-hint {
  margin: 0 0 16px;
  color: #606266;
  font-size: 12px;
}
</style>
