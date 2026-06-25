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
            {{ importActionLabel('批量') }}
          </el-button>
          <el-button
            type="success"
            :loading="oneClickImporting"
            @click="oneClickImport"
          >
            {{ importActionLabel('一键') }}
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
        <el-table-column label="供应商中文名" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span>
              {{ row.supplierChineseName }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="供应商外文名" width="160" show-overflow-tooltip>
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
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button link type="primary" :loading="cleaningUuid === row.uuid" @click="clean(row)">
                清洗
              </el-button>
              <el-button
                link
                type="success"
                :loading="importingUuid === row.uuid"
                @click="importToTalent(row)"
              >
                {{ rowImportActionLabel }}
              </el-button>
              <el-button link type="danger" :disabled="!row.deletable" @click="remove(row)">删除</el-button>
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
        <el-button @click="cancelCleanTemplate">取消</el-button>
        <el-button type="primary" :disabled="!cleanTemplateId" @click="confirmClean">开始清洗</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewTemplateDialogVisible"
      title="选择清洗模板"
      width="420px"
      destroy-on-close
    >
      <p class="clean-dialog-hint">该供应商存在多个模板，请选择用于本次预览清洗的模板。</p>
      <el-form label-width="80px">
        <el-form-item label="模板">
          <el-select v-model="previewTemplateId" filterable placeholder="请选择模板" style="width: 100%">
            <el-option
              v-for="item in previewTemplateOptions"
              :key="item.id"
              :label="itemLabel(item)"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelCleanTemplate">取消</el-button>
        <el-button type="primary" :disabled="!previewTemplateId" @click="confirmPreviewTemplate">
          开始清洗
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewVisible"
      title="清洗预览"
      width="1080px"
      top="6vh"
      class="preview-dialog"
      destroy-on-close
    >
      <div v-loading="previewLoading" class="preview-body">
        <div v-if="previewData" class="preview-head">
          <div class="preview-head-line">
            <span class="preview-template">{{ previewData.templateName }}</span>
            <el-tag size="small" :type="previewData.taxIncluded ? 'warning' : 'info'" effect="light">
              {{ previewData.taxIncluded ? '含税' : '不含税' }}
            </el-tag>
            <span class="preview-manual-hint">
              需人工核对 {{ manualAdjustmentCount }} 行：黄色行可编辑条码 / 名称，确认不需要的可点「不归档」
            </span>
          </div>

          <div class="preview-summary">
            <div class="summary-card" :class="{ 'summary-card--error': previewAmountMismatch }">
              <span class="summary-label">折前金额</span>
              <span class="summary-value">{{ formatMoney(previewAmountBeforeDiscount) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">折扣额</span>
              <span class="summary-value">{{ formatMoney(previewDiscountAmount) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">总金额</span>
              <span class="summary-value">{{ formatMoney(previewTotalAmount) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">总数量</span>
              <span class="summary-value">{{ formatQuantity(previewTotalQuantity) }}</span>
            </div>
          </div>

          <el-alert
            v-if="previewAmountMismatch"
            type="error"
            :closable="false"
            show-icon
            class="preview-alert"
          >
            页脚折前金额 {{ formatMoney(previewData.footerAmountBeforeDiscount) }} 与表格折前金额
            {{ formatMoney(previewAmountBeforeDiscount) }} 不一致，请核对明细。
          </el-alert>
        </div>

        <div class="preview-table-wrap">
          <el-table
            :data="previewRows"
            border
            size="small"
            :height="previewTableHeight"
            :row-class-name="previewRowClassName"
          >
          <el-table-column label="原行号" prop="sourceRowIndex" width="72" align="center" />
          <el-table-column label="条码" min-width="145">
            <template #default="{ row }">
              <el-input v-if="row.filtered" v-model="row.barcode" size="small" />
              <span v-else>{{ row.barcode || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="外文名" min-width="240">
            <template #default="{ row }">
              <el-input v-if="row.filtered" v-model="row.foreignName" size="small" />
              <span v-else>{{ row.foreignName || row.chineseName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="数量" width="72" align="right">
            <template #default="{ row }">
              <span>{{ formatQuantity(row.quantity) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="进价" width="82" align="right">
            <template #default="{ row }">
              <span>{{ formatMoney(row.outputPrice) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="税率" width="68" align="right">
            <template #default="{ row }">
              <span>{{ formatQuantity(row.taxRate) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="行金额" width="92" align="right">
            <template #default="{ row }">
              <span>{{ formatMoney(previewLineAmount(row)) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.filtered" type="warning" effect="light" size="small">
                {{ row.filterReasonName || '已过滤' }}
              </el-tag>
              <el-tag v-else type="success" effect="light" size="small">保留</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.filtered" link type="danger" @click="excludePreviewRow(row)">
                不归档
              </el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelPreviewClean">取消</el-button>
        <el-button
          type="primary"
          :loading="confirmArchiving"
          :disabled="previewLoading"
          @click="confirmArchivePreview"
        >
          确认归档
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useTableMaxHeight } from '../utils/layout'
import { ElMessage, ElMessageBox, type TableInstance, type UploadFile, type UploadInstance } from 'element-plus'
import {
  type AttachmentOwnerType,
  attachmentDownloadUrl,
  batchUploadAttachments,
  cleanAttachment,
  confirmCleanAttachment,
  deleteAttachment,
  fetchAllAttachments,
  getAttachments,
  importAttachmentToTalent,
  matchSuppliersByFileName,
  uploadAttachmentToGoogleDrive,
  uploadAttachment,
} from '../api/attachments'
import { getInvoiceTemplatesBySupplier, previewInvoiceTemplate } from '../api/invoiceTemplate'
import { getSupplierOptions } from '../api/talent'
import type {
  Attachment,
  InvoiceCleanPreview,
  InvoiceCleanPreviewRow,
  InvoiceTemplate,
  SupplierOption,
} from '../types/api'
import dayjs from 'dayjs'

const tableShellRef = ref<HTMLElement | null>(null)
const tableRef = ref<TableInstance>()
const { tableMaxHeight, recalc: recalcTableHeight } = useTableMaxHeight(tableShellRef)

const uploadRef = ref<UploadInstance>()
const batchInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const uploading = ref(false)
const cleaningUuid = ref('')
const importingUuid = ref('')
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
const cleanDialogMode = ref<'clean' | 'import'>('clean')
const importAfterArchive = ref(false)
const selectedRows = ref<Attachment[]>([])
const activeOwnerTab = ref<AttachmentOwnerType>('SELF')
const loading = ref(false)
const total = ref(0)
const attachments = ref<Attachment[]>([])
const suppliers = ref<SupplierOption[]>([])

// 单条清洗预览流程
const previewVisible = ref(false)
const previewLoading = ref(false)
const confirmArchiving = ref(false)
const previewData = ref<InvoiceCleanPreview | null>(null)
const previewRows = ref<InvoiceCleanPreviewRow[]>([])
const excludedPreviewRows = ref<InvoiceCleanPreviewRow[]>([])
const previewTarget = ref<Attachment | null>(null)
const previewTemplateId = ref<number | null>(null)
const previewTemplateDialogVisible = ref(false)
const previewTemplateOptions = ref<InvoiceTemplate[]>([])
const pendingCleanQueue = ref<Attachment[]>([])

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
const rowImportActionLabel = computed(() =>
  activeOwnerTab.value === 'PARENT' ? '上传云端' : '导入',
)

const importActionLabel = (prefix: string) =>
  activeOwnerTab.value === 'PARENT' ? `${prefix}上传谷歌云端` : `${prefix}导入`

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
  await startCleanQueue([row])
}

const confirmPreviewTemplate = async () => {
  if (!previewTarget.value || !previewTemplateId.value) return
  const target = previewTarget.value
  const templateId = previewTemplateId.value
  previewTemplateDialogVisible.value = false
  await runClean(target, templateId)
}

const cancelCleanTemplate = () => {
  cleanDialogVisible.value = false
  previewTemplateDialogVisible.value = false
  cleanTarget.value = null
  previewTarget.value = null
  cleanQueue.value = []
  pendingCleanQueue.value = []
  cleanDialogMode.value = 'clean'
  importAfterArchive.value = false
}

const startCleanQueue = async (rows: Attachment[]) => {
  pendingCleanQueue.value = [...rows]
  await processNextClean()
}

const processNextClean = async () => {
  const row = pendingCleanQueue.value.shift()
  if (!row) {
    await loadAttachments()
    return
  }

  if (!isExcelAttachment(row)) {
    await processNextClean()
    return
  }

  let templates: InvoiceTemplate[] = []
  try {
    templates = await getInvoiceTemplatesBySupplier(row.supplierGuid)
  } catch {
    pendingCleanQueue.value = []
    return
  }

  if (templates.length === 0) {
    ElMessage.warning(`「${fullFilename(row)}」的供应商尚未配置清洗模板`)
    await processNextClean()
    return
  }

  if (templates.length === 1) {
    const result = await runClean(row, templates[0].id)
    if (result === 'archived') {
      await processNextClean()
    }
    return
  }

  cleanQueue.value = [row, ...pendingCleanQueue.value]
  cleanDialogMode.value = 'clean'
  cleanTarget.value = row
  previewTarget.value = row
  cleanTemplateOptions.value = templates
  previewTemplateOptions.value = templates
  cleanTemplateId.value = templates[0].id
  previewTemplateId.value = templates[0].id
  cleanDialogVisible.value = true
}

type CleanRunResult = 'archived' | 'paused' | 'cancelled' | 'failed'

const runClean = async (row: Attachment, templateId: number): Promise<CleanRunResult> => {
  if (row.cleanStatus === 'CLEANED') {
    try {
      await ElMessageBox.confirm(
        `「${fullFilename(row)}」已清洗过，确定重新清洗吗？`,
        '重新清洗确认',
        { type: 'warning', confirmButtonText: '重新清洗', cancelButtonText: '取消' },
      )
    } catch {
      pendingCleanQueue.value = []
      return 'cancelled'
    }
  }

  previewTarget.value = row
  previewTemplateId.value = templateId
  previewData.value = null
  previewRows.value = []
  excludedPreviewRows.value = []
  cleaningUuid.value = row.uuid
  try {
    const data = await previewInvoiceTemplate(templateId, row.uuid, row.supplierGuid)
    const rows = data.rows.map((item) => ({ ...item }))
    if (hasManualAdjustment(rows)) {
      previewData.value = data
      previewRows.value = rows
      previewVisible.value = true
      ElMessage.warning(`「${fullFilename(row)}」存在 ${rows.filter((item) => item.filtered).length} 行需要人工调整`)
      return 'paused'
    }

    const archive = await cleanAttachment(row.uuid, row.supplierGuid, templateId)
    ElMessage.success(`清洗成功，归档文件：${archive.fileName}.${archive.extensionName}`)
    row.cleanStatus = 'CLEANED'
    row.cleanStatusName = '已清洗'
    return 'archived'
  } catch {
    pendingCleanQueue.value = []
    return 'failed'
  } finally {
    cleaningUuid.value = ''
  }
}

const previewRowClassName = ({ row }: { row: InvoiceCleanPreviewRow }) =>
  row.filtered ? 'preview-row-filtered' : ''

const hasManualAdjustment = (rows: InvoiceCleanPreviewRow[]) => rows.some((row) => row.filtered)

const excludePreviewRow = (row: InvoiceCleanPreviewRow) => {
  const index = previewRows.value.indexOf(row)
  if (index === -1) {
    return
  }
  previewRows.value.splice(index, 1)
  excludedPreviewRows.value.push({ ...row })
  ElMessage.info(`已将原发票第 ${row.sourceRowIndex} 行从本次归档中排除`)
}

const toNumber = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(Number(value)) ? 0 : Number(value)

const archivePreviewRows = computed(() => previewRows.value)
const manualAdjustmentCount = computed(() =>
  previewRows.value.filter((row) => row.filtered).length,
)

// 预览编辑的目的在于把过滤行补齐后归档，因此汇总跟随当前表格行实时变化。
const previewTotalQuantity = computed(() =>
  archivePreviewRows.value.reduce((sum, row) => sum + toNumber(row.quantity), 0),
)
const previewAmountBeforeDiscount = computed(() =>
  archivePreviewRows.value.reduce(
    (sum, row) => sum + previewLineAmount(row),
    0,
  ),
)
const previewTotalAmount = computed(() => {
  const data = previewData.value
  if (!data) return 0
  if (data.footerParsed) {
    return toNumber(data.summary.totalAmount)
  }
  return previewAmountBeforeDiscount.value - toNumber(data.summary.discountAmount)
})
const previewDiscountAmount = computed(() => {
  const data = previewData.value
  if (!data) return 0
  if (data.footerParsed) {
    return Math.max(previewAmountBeforeDiscount.value - previewTotalAmount.value, 0)
  }
  return toNumber(data.summary.discountAmount)
})

// 过滤行编辑后，使用当前表格折前金额重新与页脚折前金额比较。
const previewAmountMismatch = computed(() => {
  const data = previewData.value
  if (!data?.footerParsed || data.footerAmountBeforeDiscount === null) {
    return false
  }
  return Math.abs(toNumber(data.footerAmountBeforeDiscount) - previewAmountBeforeDiscount.value) > 0.01
})

const previewTableHeight = computed(() =>
  previewAmountMismatch.value ? 'calc(68vh - 120px)' : 'calc(68vh - 84px)',
)

const formatMoney = (value: number | null | undefined) => {
  const num = toNumber(value)
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatQuantity = (value: number | null | undefined) => {
  const num = toNumber(value)
  return Number.isInteger(num) ? String(num) : num.toString()
}

const previewLineAmount = (row: InvoiceCleanPreviewRow) =>
  toNumber(row.outputPrice) * toNumber(row.quantity)

const totalQuantityOf = (rows: InvoiceCleanPreviewRow[]) =>
  rows.reduce((sum, row) => sum + toNumber(row.quantity), 0)

const amountBeforeDiscountOf = (rows: InvoiceCleanPreviewRow[]) =>
  rows.reduce((sum, row) => sum + previewLineAmount(row), 0)

const discountAmountOf = (data: InvoiceCleanPreview, rows: InvoiceCleanPreviewRow[]) => {
  if (data.footerParsed) {
    return Math.max(amountBeforeDiscountOf(rows) - totalAmountOf(data, rows), 0)
  }
  return toNumber(data.summary.discountAmount)
}

const totalAmountOf = (data: InvoiceCleanPreview, rows: InvoiceCleanPreviewRow[]) => {
  if (data.footerParsed) {
    return toNumber(data.summary.totalAmount)
  }
  return amountBeforeDiscountOf(rows) - toNumber(data.summary.discountAmount)
}

const manualArchiveRemark = () => {
  if (!excludedPreviewRows.value.length) {
    return null
  }
  return excludedPreviewRows.value
    .map((row) => `原发票第 ${row.sourceRowIndex} 行不归档，原因：${row.filterReasonName || '已过滤'}`)
    .join('；')
}

const archiveCleanResult = async (
  target: Attachment,
  data: InvoiceCleanPreview,
  rows: InvoiceCleanPreviewRow[],
  options?: { silent?: boolean },
) => {
  const archive = await confirmCleanAttachment(target.uuid, {
    supplierGuid: target.supplierGuid,
    rows: rows.map((row) => ({
      barcode: row.barcode,
      foreignName: row.foreignName ?? '',
      quantity: row.quantity,
      outputPrice: row.outputPrice,
      taxRate: row.taxRate,
    })),
    summary: {
      totalQuantity: totalQuantityOf(rows),
      amountBeforeDiscount: amountBeforeDiscountOf(rows),
      discountAmount: discountAmountOf(data, rows),
      totalAmount: totalAmountOf(data, rows),
      taxIncluded: data.taxIncluded,
      remark: manualArchiveRemark(),
    },
  })
  if (!options?.silent) {
    ElMessage.success(`归档成功，归档文件：${archive.fileName}.${archive.extensionName}`)
  }
  target.cleanStatus = 'CLEANED'
  target.cleanStatusName = '已清洗'
}

const cancelPreviewClean = () => {
  previewVisible.value = false
  previewData.value = null
  previewRows.value = []
  excludedPreviewRows.value = []
  previewTarget.value = null
  pendingCleanQueue.value = []
}

const confirmArchivePreview = async () => {
  const target = previewTarget.value
  const data = previewData.value
  if (!target || !data) return
  if (!archivePreviewRows.value.length) {
    ElMessage.warning('没有可归档的有效明细')
    return
  }
  const invalidRow = archivePreviewRows.value.find((row) =>
    !row.barcode || !row.foreignName,
  )
  if (invalidRow) {
    ElMessage.warning(`请补齐原发票第 ${invalidRow.sourceRowIndex} 行的条码和外文名`)
    return
  }

  if (previewAmountMismatch.value) {
    try {
      await ElMessageBox.confirm(
        '页脚折前金额与表格折前金额不一致，仍要确认归档吗？',
        '金额不一致提醒',
        { type: 'warning', confirmButtonText: '继续归档', cancelButtonText: '返回修改' },
      )
    } catch {
      return
    }
  }

  confirmArchiving.value = true
  try {
    await archiveCleanResult(target, data, archivePreviewRows.value)
    previewVisible.value = false
    excludedPreviewRows.value = []
    if (importAfterArchive.value) {
      importAfterArchive.value = false
      await runTalentImport(target)
      await loadAttachments()
      return
    }
    if (pendingCleanQueue.value.length > 0) {
      await processNextClean()
      return
    }
    await loadAttachments()
  } catch {
    // 错误已由 http 拦截器提示
  } finally {
    confirmArchiving.value = false
  }
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
    await startCleanQueue(excelRows)
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
    await startCleanQueue(excelRows)
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

const itemLabel = (item: InvoiceTemplate) => {
  const tags = [item.name]
  if (item.enabled) tags.push('启用')
  return tags.join(' · ')
}

const confirmClean = async () => {
  if (!cleanTarget.value || !cleanTemplateId.value) return
  const target = cleanTarget.value
  const mode = cleanDialogMode.value
  cleanDialogVisible.value = false
  cleanTarget.value = null
  cleanQueue.value = []

  const result = await runClean(target, cleanTemplateId.value)
  if (mode === 'import') {
    if (result === 'archived') {
      await runTalentImport(target)
      await loadAttachments()
    } else if (result === 'paused') {
      importAfterArchive.value = true
    }
    cleanDialogMode.value = 'clean'
    return
  }
  if (result === 'archived') {
    await processNextClean()
  }
}

type ImportRunResult = 'success' | 'skipped' | 'paused'

const runTalentImport = async (row: Attachment, options?: { silent?: boolean }): Promise<boolean> => {
  importingUuid.value = row.uuid
  try {
    const result = await importAttachmentToTalent(row.uuid)
    row.importStatus = 'SUCCESS'
    row.importStatusName = '导入成功'
    row.deletable = false
    if (!options?.silent) {
      ElMessage.success(`「${fullFilename(row)}」已导入 TALENTOPOS，采购单：${result.purchase.purchaseNo}`)
    }
    return true
  } finally {
    importingUuid.value = ''
  }
}

const ensureCleanedBeforeTalentImport = async (
  row: Attachment,
  options?: { silent?: boolean },
): Promise<'ready' | 'paused' | 'failed'> => {
  if (row.cleanStatus === 'CLEANED') {
    return 'ready'
  }
  if (!isExcelAttachment(row)) {
    if (!options?.silent) {
      ElMessage.warning('仅支持已清洗归档的 Excel 发票导入 TALENTOPOS')
    }
    return 'failed'
  }

  let templates: InvoiceTemplate[] = []
  try {
    templates = await getInvoiceTemplatesBySupplier(row.supplierGuid)
  } catch {
    return 'failed'
  }
  if (templates.length === 0) {
    ElMessage.warning(`「${fullFilename(row)}」的供应商尚未配置清洗模板`)
    return 'failed'
  }

  if (templates.length === 1) {
    const result = await runClean(row, templates[0].id)
    if (result === 'archived') {
      return 'ready'
    }
    if (result === 'paused') {
      importAfterArchive.value = true
      return 'paused'
    }
    return 'failed'
  }

  cleanDialogMode.value = 'import'
  cleanQueue.value = [row]
  cleanTarget.value = row
  previewTarget.value = row
  cleanTemplateOptions.value = templates
  previewTemplateOptions.value = templates
  cleanTemplateId.value = templates[0].id
  previewTemplateId.value = templates[0].id
  cleanDialogVisible.value = true
  return 'paused'
}

const importToTalent = async (row: Attachment, options?: { silent?: boolean }): Promise<ImportRunResult> => {
  if (row.importStatus === 'SUCCESS') {
    if (!options?.silent) {
      const actionName = row.ownerType === 'PARENT' ? '上传云端' : '导入'
      ElMessage.warning(`「${fullFilename(row)}」已${actionName}成功，无需重复${actionName}`)
    }
    return 'skipped'
  }
  if (row.ownerType === 'PARENT') {
    await uploadAttachmentToGoogleDrive(row.uuid)
    if (!options?.silent) {
      ElMessage.success(`「${fullFilename(row)}」已上传谷歌云端`)
      await loadAttachments()
    }
    return 'success'
  }

  const cleanResult = await ensureCleanedBeforeTalentImport(row, options)
  if (cleanResult === 'paused') {
    return 'paused'
  }
  if (cleanResult !== 'ready') {
    return 'skipped'
  }

  return (await runTalentImport(row, options)) ? 'success' : 'skipped'
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
    const result = await importToTalent(row, { silent: true })
    if (result === 'paused') {
      ElMessage.info('导入已暂停，请先完成清洗预览归档')
      return
    }
    if (result === 'success') {
      successCount += 1
    } else {
      skipCount += 1
    }
  }
  await loadAttachments()
  if (successCount > 0) {
    ElMessage.success(`${activeOwnerTab.value === 'PARENT' ? '上传云端' : '导入'}完成，共 ${successCount} 个`)
    return
  }
  if (skipCount === rows.length) {
    ElMessage.warning(`所选发票均已${activeOwnerTab.value === 'PARENT' ? '上传云端' : '导入'}成功`)
    return
  }
  ElMessage.info(`${activeOwnerTab.value === 'PARENT' ? '上传云端' : '导入功能待后端实现'}，已处理 ${rows.length - skipCount} 个未处理发票`)
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

const supplierLabel = (supplier: SupplierOption) =>
  [supplier.chineseName, supplier.foreignName].filter(Boolean).join(' / ')

const isAllowedInvoiceFile = (filename: string) =>
  ['xls', 'xlsx', 'pdf'].includes(filename.split('.').pop()?.toLowerCase() || '')


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

.preview-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 68vh;
}

.preview-head {
  flex-shrink: 0;
}

.preview-head-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #606266;
}

.preview-template {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.preview-manual-hint {
  color: var(--el-color-warning);
}

.preview-table-wrap {
  flex: 1;
  min-height: 0;
}

.preview-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  flex: 1 1 120px;
  padding: 6px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.summary-card--error {
  border-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.summary-card--error .summary-value {
  color: var(--el-color-danger);
}

.summary-label {
  font-size: 11px;
  color: #909399;
  margin-bottom: 2px;
}

.summary-value {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.preview-alert {
  margin-bottom: 8px;
}

.preview-body :deep(.preview-row-filtered) {
  --el-table-tr-bg-color: #fff8e1;
}

.preview-body :deep(.preview-row-filtered:hover > td.el-table__cell) {
  background-color: #fdf0c2 !important;
}
</style>
