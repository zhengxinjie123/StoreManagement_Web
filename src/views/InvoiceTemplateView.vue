<template>
  <div class="page-layout">
    <div class="page-title">清洗模板配置</div>

    <el-alert
      class="tip-alert page-card--static"
      type="info"
      :closable="false"
      show-icon
      title="维护说明"
      description="配置模板不需要上传 Excel。请确认表头行、数据起始行、列映射及是否含税入库。保存后可选择已上传的电子发票进行「试清洗」验证，不会生成归档文件。"
    />

    <el-card class="page-card page-card--grow">
      <div class="toolbar">
        <el-select
          v-model="query.supplierGuid"
          filterable
          clearable
          placeholder="按供应商筛选"
          class="field-select"
          @change="loadTemplates"
          @clear="loadTemplates"
        >
          <el-option
            v-for="supplier in suppliers"
            :key="supplier.guid"
            :label="supplierLabel(supplier)"
            :value="supplier.guid"
          />
        </el-select>
        <el-button type="primary" @click="openCreate">新建模板</el-button>
      </div>

      <div ref="tableShellRef" class="table-shell">
      <el-table v-loading="loading" :data="templates" border :max-height="tableMaxHeight">
        <el-table-column label="供应商" min-width="180">
          <template #default="{ row }">{{ supplierLabelOf(row.supplierGuid) }}</template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="140" />
        <el-table-column label="含税入库" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.taxIncluded ? 'success' : 'info'" effect="light">
              {{ row.taxIncluded ? '含税' : '不含税' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button link type="primary" @click="openTemplateDetail(row)">详情</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="primary" @click="openPreview(row)">试清洗</el-button>
              <!-- <el-button link type="danger" @click="remove(row)">删除</el-button> -->
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
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadTemplates"
          @current-change="loadTemplates"
        />
      </div>
    </el-card>

    <ReadonlyDetailDialog
      v-model:visible="detailVisible"
      title="模板详情"
      :items="templateDetailItems"
    />

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑模板' : '新建模板'"
      width="680px"
      top="7vh"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="供应商" prop="supplierGuid">
          <el-select v-model="form.supplierGuid" filterable placeholder="请选择供应商" style="width: 100%">
            <el-option
              v-for="supplier in suppliers"
              :key="supplier.guid"
              :label="supplierLabel(supplier)"
              :value="supplier.guid"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="如：标准模板 v1" />
        </el-form-item>
        <el-form-item label="含税入库" prop="taxIncluded">
          <el-switch
            v-model="form.taxIncluded"
            inline-prompt
            active-text="含税"
            inactive-text="不含税"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="表头行" prop="headerRow">
              <el-input-number v-model="form.headerRow" :min="1" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据起始行" prop="dataStartRow">
              <el-input-number v-model="form.dataStartRow" :min="1" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Sheet 名称">
          <el-input v-model="form.sheetName" placeholder="留空则读取第一个 Sheet" />
        </el-form-item>
        <el-divider content-position="left">列映射（Excel 列字母）</el-divider>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="条码列" prop="barcodeCol" label-width="76px">
              <el-select v-model="form.barcodeCol" filterable placeholder="选择列" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="新条码列" label-width="76px">
              <el-select v-model="form.newBarcodeCol" filterable clearable placeholder="可选" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="外文名列" prop="foreignNameCol" label-width="76px">
              <el-select v-model="form.foreignNameCol" filterable placeholder="选择列" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="中文名列" label-width="76px">
              <el-select v-model="form.chineseNameCol" filterable clearable placeholder="可选" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="数量列" prop="quantityCol" label-width="76px">
              <el-select v-model="form.quantityCol" filterable placeholder="选择列" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="进价列" prop="priceCol" label-width="76px">
              <el-select v-model="form.priceCol" filterable clearable placeholder="不含税（可选）" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="含税价列" prop="priceTaxIncludedCol" label-width="76px">
              <el-select v-model="form.priceTaxIncludedCol" filterable clearable placeholder="可选" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="税率列" label-width="76px">
              <el-select v-model="form.taxRateCol" filterable clearable placeholder="可选" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="行小计列" label-width="76px">
              <el-select v-model="form.lineSubtotalCol" filterable clearable placeholder="可选" style="width: 100%">
                <el-option v-for="col in excelColumns" :key="col" :label="col" :value="col" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="默认税率" label-width="76px">
              <div class="readonly-field">
                <span>{{ displayDefaultTaxRate }}%</span>
                <span v-if="form.taxRateCol" class="field-hint">已配置税率列，清洗时不使用默认税率</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="试清洗" width="480px" destroy-on-close>
      <p class="preview-hint">选择该供应商已上传的 Excel 电子发票，按当前模板试算，不会写入归档。</p>
      <el-form label-width="88px">
        <el-form-item label="电子发票">
          <el-select
            v-model="previewAttachmentUuid"
            filterable
            clearable
            placeholder="请选择电子发票"
            style="width: 100%"
            :loading="previewAttachmentsLoading"
          >
            <el-option
              v-for="item in previewAttachments"
              :key="item.uuid"
              :label="`${item.fileName}.${item.extensionName}`"
              :value="item.uuid"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <el-descriptions v-if="previewResult" :column="1" border class="preview-result">
        <el-descriptions-item label="模板">{{ previewResult.templateName }}</el-descriptions-item>
        <el-descriptions-item label="清洗行数">{{ previewResult.rowCount }}</el-descriptions-item>
        <el-descriptions-item label="商品总数">{{ formatQuantity(previewResult.summary.totalQuantity) }}</el-descriptions-item>
        <el-descriptions-item label="折扣前">{{ formatMoney(previewResult.summary.amountBeforeDiscount) }}</el-descriptions-item>
        <el-descriptions-item label="折扣">{{ formatMoney(previewResult.summary.discountAmount) }}</el-descriptions-item>
        <el-descriptions-item label="总金额">{{ formatMoney(previewResult.summary.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="入库方式">
          {{ previewResult.taxIncluded ? '含税' : '不含税' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="previewResult.summary.remark" label="备注">
          {{ previewResult.summary.remark }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" :loading="previewing" :disabled="!previewAttachmentUuid" @click="runPreview">
          开始试清洗
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useTableMaxHeight } from '../utils/layout'
import ReadonlyDetailDialog, { type DetailItem } from '../components/ReadonlyDetailDialog.vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getAttachments } from '../api/attachments'
import {
  createInvoiceTemplate,
  deleteInvoiceTemplate,
  getInvoiceTemplates,
  previewInvoiceTemplate,
  updateInvoiceTemplate,
} from '../api/invoiceTemplate'
import { getSupplierOptions } from '../api/talent'
import type { Attachment, InvoiceCleanPreview, InvoiceTemplate, InvoiceTemplateForm, SupplierOption } from '../types/api'
import { formatDateTime, formatMoney, formatQuantity, supplierLabel } from '../utils/display'

const tableShellRef = ref<HTMLElement | null>(null)
const { tableMaxHeight, recalc: recalcTableHeight } = useTableMaxHeight(tableShellRef)
const detailVisible = ref(false)
const detailTemplate = ref<InvoiceTemplate | null>(null)

const loading = ref(false)
const saving = ref(false)
const previewing = ref(false)
const previewAttachmentsLoading = ref(false)
const templates = ref<InvoiceTemplate[]>([])
const suppliers = ref<SupplierOption[]>([])
const total = ref(0)
const formVisible = ref(false)
const previewVisible = ref(false)
const editingId = ref<number | null>(null)
const previewTemplateId = ref<number | null>(null)
const previewSupplierGuid = ref('')
const previewAttachmentUuid = ref('')
const previewAttachments = ref<Attachment[]>([])
const previewResult = ref<InvoiceCleanPreview | null>(null)
const formRef = ref<FormInstance>()

const excelColumns = (() => {
  const cols: string[] = []
  for (let i = 0; i < 26; i++) {
    cols.push(String.fromCharCode(65 + i))
  }
  for (let i = 0; i < 26; i++) {
    cols.push('A' + String.fromCharCode(65 + i))
  }
  return cols
})()

const query = reactive({
  current: 1,
  pageSize: 10,
  supplierGuid: '',
})

const defaultForm = (): InvoiceTemplateForm => ({
  supplierGuid: '',
  name: '',
  headerRow: 1,
  dataStartRow: 2,
  sheetName: '',
  barcodeCol: 'A',
  newBarcodeCol: '',
  foreignNameCol: 'B',
  chineseNameCol: '',
  quantityCol: 'C',
  priceCol: '',
  priceTaxIncludedCol: '',
  taxRateCol: '',
  lineSubtotalCol: '',
  defaultTaxRate: 23,
  taxIncluded: false,
  enabled: false,
  remark: '',
})

const displayDefaultTaxRate = computed(() => {
  const value = form.defaultTaxRate ?? 23
  return Number.isInteger(value) ? value : value.toFixed(2)
})

const form = reactive<InvoiceTemplateForm>(defaultForm())

const validatePriceColumns = (_rule: unknown, _value: unknown, callback: (error?: Error) => void) => {
  if (!form.priceCol && !form.priceTaxIncludedCol) {
    callback(new Error('进价列与含税价列至少选择一项'))
    return
  }
  callback()
}

const rules: FormRules = {
  supplierGuid: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  headerRow: [{ required: true, message: '请输入表头行', trigger: 'change' }],
  dataStartRow: [{ required: true, message: '请输入数据起始行', trigger: 'change' }],
  taxIncluded: [{ required: true, message: '请选择是否含税入库', trigger: 'change' }],
  barcodeCol: [{ required: true, message: '请选择条码列', trigger: 'change' }],
  foreignNameCol: [{ required: true, message: '请选择外文名列', trigger: 'change' }],
  quantityCol: [{ required: true, message: '请选择数量列', trigger: 'change' }],
  priceCol: [{ validator: validatePriceColumns, trigger: 'change' }],
  priceTaxIncludedCol: [{ validator: validatePriceColumns, trigger: 'change' }],
}

const supplierLabelOf = (supplierGuid: string) => {
  const supplier = suppliers.value.find((item) => item.guid.toLowerCase() === supplierGuid.toLowerCase())
  return supplier ? supplierLabel(supplier) : supplierGuid
}

const columnMappingText = (row: InvoiceTemplate) =>
  [
    `条码${row.barcodeCol}`,
    row.newBarcodeCol ? `新条码${row.newBarcodeCol}` : null,
    `外文名${row.foreignNameCol}`,
    row.chineseNameCol ? `中文名${row.chineseNameCol}` : null,
    `数量${row.quantityCol}`,
    row.priceCol ? `进价${row.priceCol}` : null,
    row.priceTaxIncludedCol ? `含税价${row.priceTaxIncludedCol}` : null,
    row.taxRateCol ? `税率${row.taxRateCol}` : null,
    row.lineSubtotalCol ? `行小计${row.lineSubtotalCol}` : null,
  ].filter(Boolean).join(' · ')

const templateDetailItems = computed<DetailItem[]>(() => {
  const row = detailTemplate.value
  if (!row) return []
  return [
    { label: '供应商', value: supplierLabelOf(row.supplierGuid) },
    { label: '模板名称', value: row.name },
    { label: '表头行 / 数据起始行', value: `${row.headerRow} / ${row.dataStartRow}` },
    { label: 'Sheet 名称', value: row.sheetName || '-' },
    { label: '列映射', value: columnMappingText(row) },
    { label: '默认税率', value: row.defaultTaxRate == null ? '-' : `${row.defaultTaxRate}%` },
    { label: '含税入库', value: row.taxIncluded ? '含税' : '不含税' },
    { label: '备注', value: row.remark || '-' },
    { label: '更新时间', value: formatDateTime(row.updatedAt) },
  ]
})

const openTemplateDetail = (row: InvoiceTemplate) => {
  detailTemplate.value = row
  detailVisible.value = true
}

const resetForm = () => {
  Object.assign(form, defaultForm())
}

const openCreate = () => {
  editingId.value = null
  resetForm()
  if (query.supplierGuid) {
    form.supplierGuid = query.supplierGuid
  }
  formVisible.value = true
}

const openEdit = (row: InvoiceTemplate) => {
  editingId.value = row.id
  Object.assign(form, {
    supplierGuid: row.supplierGuid,
    name: row.name,
    headerRow: row.headerRow,
    dataStartRow: row.dataStartRow,
    sheetName: row.sheetName ?? '',
    barcodeCol: row.barcodeCol,
    newBarcodeCol: row.newBarcodeCol ?? '',
    foreignNameCol: row.foreignNameCol,
    chineseNameCol: row.chineseNameCol ?? '',
    quantityCol: row.quantityCol,
    priceCol: row.priceCol ?? '',
    priceTaxIncludedCol: row.priceTaxIncludedCol ?? '',
    taxRateCol: row.taxRateCol ?? '',
    lineSubtotalCol: row.lineSubtotalCol ?? '',
    defaultTaxRate: row.defaultTaxRate ?? 23,
    taxIncluded: row.taxIncluded ?? false,
    enabled: row.enabled,
    remark: row.remark ?? '',
  })
  formVisible.value = true
}

const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const payload: InvoiceTemplateForm = {
      ...form,
      sheetName: form.sheetName?.trim() || undefined,
      chineseNameCol: form.chineseNameCol?.trim() || undefined,
      newBarcodeCol: form.newBarcodeCol?.trim() || undefined,
      priceCol: form.priceCol?.trim() || undefined,
      priceTaxIncludedCol: form.priceTaxIncludedCol?.trim() || undefined,
      taxRateCol: form.taxRateCol?.trim() || undefined,
      lineSubtotalCol: form.lineSubtotalCol?.trim() || undefined,
      remark: form.remark?.trim() || undefined,
    }
    if (editingId.value) {
      await updateInvoiceTemplate(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createInvoiceTemplate(payload)
      ElMessage.success('创建成功')
    }
    formVisible.value = false
    await loadTemplates()
  } finally {
    saving.value = false
  }
}

const openPreview = async (row: InvoiceTemplate) => {
  previewTemplateId.value = row.id
  previewSupplierGuid.value = row.supplierGuid
  previewAttachmentUuid.value = ''
  previewResult.value = null
  previewVisible.value = true
  previewAttachmentsLoading.value = true
  try {
    const page = await getAttachments({ current: 1, pageSize: 100, supplierGuid: row.supplierGuid })
    previewAttachments.value = page.records.filter((item) => ['xls', 'xlsx'].includes(item.extensionName.toLowerCase()))
  } finally {
    previewAttachmentsLoading.value = false
  }
}

const runPreview = async () => {
  if (!previewTemplateId.value || !previewAttachmentUuid.value) return
  previewing.value = true
  try {
    previewResult.value = await previewInvoiceTemplate(
      previewTemplateId.value,
      previewAttachmentUuid.value,
      previewSupplierGuid.value,
    )
    ElMessage.success('试清洗完成')
  } finally {
    previewing.value = false
  }
}


const remove = async (row: InvoiceTemplate) => {
  try {
    await ElMessageBox.confirm(`确定删除模板「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await deleteInvoiceTemplate(row.id)
  ElMessage.success('删除成功')
  await loadTemplates()
}

const loadTemplates = async () => {
  loading.value = true
  try {
    const page = await getInvoiceTemplates({
      current: query.current,
      pageSize: query.pageSize,
      supplierGuid: query.supplierGuid || undefined,
    })
    templates.value = page.records
    total.value = page.total
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  suppliers.value = await getSupplierOptions()
  await loadTemplates()
  await nextTick()
  recalcTableHeight()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-hint {
  margin: 0 0 16px;
  color: #606266;
  font-size: 13px;
}

.preview-result {
  margin-top: 12px;
}

.readonly-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 26px;
  justify-content: center;
  line-height: 1.4;
}

.field-hint {
  color: #909399;
  font-size: 11px;
}
</style>
