<template>
  <div class="page-layout">
    <div class="page-title">归档发票</div>
    <el-card class="page-card page-card--grow">
      <div class="filter-bar">
        <el-input v-model="keyword" clearable placeholder="搜索供应商名称" class="field-select" @input="resetSupplierPage"
          @clear="resetSupplierPage" />
      </div>
      <div ref="tableShellRef" class="table-shell">
        <el-table ref="tableRef" v-loading="loading" :data="supplierRows" row-key="id" lazy :load="loadArchiveChildren"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }" border :max-height="tableMaxHeight"
          @expand-change="onExpandChange">
          <el-table-column label="供应商 / 文件名" min-width="180">
            <template #default="{ row }">
              <span v-if="row.rowType === 'supplier'" class="supplier-name">{{ row.supplierLabel }}</span>
              <span v-else class="download-link" @click="downloadArchive(row)">
                {{ archiveFilename(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="商品数" width="86" align="right">
            <template #default="{ row }">
              {{ row.rowType === 'archive' ? formatQuantity(row.totalQuantity) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="折前金额" width="96" align="right">
            <template #default="{ row }">
              {{ row.rowType === 'archive' ? formatMoney(row.amountBeforeDiscount) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="折扣金额" width="96" align="right">
            <template #default="{ row }">
              {{ row.rowType === 'archive' ? formatMoney(row.discountAmount) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="总金额" width="96" align="right">
            <template #default="{ row }">
              {{ row.rowType === 'archive' ? formatMoney(row.totalAmount) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="含税" width="76" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.rowType === 'archive'" :type="row.taxIncluded ? 'success' : 'info'" effect="light">
                {{ row.taxIncluded ? '含税' : '不含税' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="人员" width="76" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.rowType === 'archive'" :type="row.ownerType === 'PARENT' ? 'warning' : 'info'" effect="light" size="small">
                {{ row.ownerTypeName || '-' }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="行数" width="70" align="center">
            <template #default="{ row }">
              {{ row.rowType === 'archive' ? row.rowCount : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="备注" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.rowType === 'archive' && row.remark" type="warning" effect="light" size="small">
                有备注
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="154" align="center" fixed="right">
            <template #default="{ row }">
              <div v-if="row.rowType === 'archive'" class="table-actions">
                <el-button link type="primary" @click="openArchivePreview(row)">预览</el-button>
                <el-button link type="primary" @click="openArchiveDetail(row)">详情</el-button>
                <el-button v-if="row.deletable" link type="danger" @click="removeArchive(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination">
        <el-pagination v-model:current-page="query.current" v-model:page-size="query.pageSize" :total="supplierTotal"
          :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" @size-change="loadSuppliers"
          @current-change="loadSuppliers" />
      </div>
    </el-card>
    <ExcelPreviewDialog
      v-model:visible="archivePreviewVisible"
      :title="archivePreviewTitle"
      :download-url="archivePreviewUrl"
      :load-preview="archivePreviewLoader"
    />
    <ReadonlyDetailDialog v-model:visible="detailVisible" title="归档详情" :items="archiveDetailItems" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type TableInstance } from 'element-plus'
import ExcelPreviewDialog from '../components/ExcelPreviewDialog.vue'
import ReadonlyDetailDialog, { type DetailItem } from '../components/ReadonlyDetailDialog.vue'
import {
  deleteInvoiceArchive,
  getInvoiceArchiveSuppliers,
  getInvoiceArchives,
  invoiceArchiveDownloadUrl,
  previewInvoiceArchiveExcel,
} from '../api/invoice'
import type { ExcelPreview, InvoiceArchive, InvoiceArchiveSupplier } from '../types/api'
import { formatDateTime, formatMoney, formatQuantity, formatSize, supplierLabel } from '../utils/display'
import { useTableMaxHeight } from '../utils/layout'

interface SupplierTreeRow {
  id: string
  rowType: 'supplier'
  supplierGuid: string
  supplierLabel: string
  hasChildren: boolean
  children?: ArchiveTreeRow[]
}


interface ArchiveTreeRow extends InvoiceArchive {
  id: string
  rowType: 'archive'
  supplierLabel: string
  hasChildren?: false
}

const tableShellRef = ref<HTMLElement | null>(null)
const { tableMaxHeight, recalc: recalcTableHeight } = useTableMaxHeight(tableShellRef)
const loading = ref(false)
const tableRef = ref<TableInstance>()
const expandedSupplierIds = ref<Set<string>>(new Set())
const keyword = ref('')
const supplierTotal = ref(0)
const supplierRows = ref<SupplierTreeRow[]>([])
const archivePreviewVisible = ref(false)
const archivePreviewTitle = ref('')
const archivePreviewUrl = ref('')
const archivePreviewLoader = ref<() => Promise<ExcelPreview>>(() => Promise.resolve({ sheets: [] }))
const detailVisible = ref(false)
const detailArchive = ref<ArchiveTreeRow | null>(null)

const query = reactive({
  current: 1,
  pageSize: 10,
})


const supplierLabelOf = (supplier: InvoiceArchiveSupplier) =>
  supplierLabel({
    chineseName: supplier.supplierChineseName,
    foreignName: supplier.supplierForeignName,
  }) || supplier.supplierGuid

const archiveFilename = (row: ArchiveTreeRow) => `${row.fileName}.${row.extensionName}`

const archiveDetailItems = computed<DetailItem[]>(() => {
  const row = detailArchive.value
  if (!row) return []
  return [
    { label: '文件名', value: archiveFilename(row), wrap: true },
    { label: '供应商', value: row.supplierLabel },
    { label: '所属人员', value: row.ownerTypeName || '-' },
    { label: '文件大小', value: formatSize(row.fileSize) },
    { label: '商品总数', value: formatQuantity(row.totalQuantity) },
    { label: '折扣前金额', value: formatMoney(row.amountBeforeDiscount) },
    { label: '折扣', value: formatMoney(row.discountAmount) },
    { label: '总金额', value: formatMoney(row.totalAmount) },
    { label: '是否含税', value: row.taxIncluded == null ? '-' : row.taxIncluded ? '含税' : '不含税' },
    { label: '清洗行数', value: row.rowCount },
    { label: '备注', value: row.remark || '-', wrap: true },
    { label: '归档时间', value: formatDateTime(row.createdAt) },
  ]
})

const openArchivePreview = (row: ArchiveTreeRow) => {
  archivePreviewTitle.value = `归档预览：${archiveFilename(row)}`
  archivePreviewUrl.value = invoiceArchiveDownloadUrl(row.uuid)
  archivePreviewLoader.value = () => previewInvoiceArchiveExcel(row.uuid)
  archivePreviewVisible.value = true
}

const openArchiveDetail = (row: ArchiveTreeRow) => {
  detailArchive.value = row
  detailVisible.value = true
}

const toArchiveRows = (archives: InvoiceArchive[], label: string): ArchiveTreeRow[] =>
  archives.map((archive) => ({
    ...archive,
    id: archive.uuid,
    rowType: 'archive' as const,
    supplierLabel: label,
  }))

const onExpandChange = (row: SupplierTreeRow | ArchiveTreeRow, expanded: boolean) => {
  if (row.rowType !== 'supplier') return
  if (expanded) {
    expandedSupplierIds.value.add(row.id)
  } else {
    expandedSupplierIds.value.delete(row.id)
  }
}

const restoreExpandedSuppliers = async () => {
  await nextTick()
  const table = tableRef.value
  if (!table) return
  for (const id of expandedSupplierIds.value) {
    const row = supplierRows.value.find((item) => item.id === id)
    if (row?.hasChildren) {
      table.toggleRowExpansion(row, true)
    }
  }
}


const refreshSupplierChildren = async (supplierGuid: string) => {
  const supplierRow = supplierRows.value.find((row) => row.supplierGuid === supplierGuid)
  if (!supplierRow) return false
  const page = await getInvoiceArchives({
    current: 1,
    pageSize: 100,
    supplierGuid,
  })
  const children = toArchiveRows(page.records, supplierRow.supplierLabel)
  supplierRow.hasChildren = children.length > 0
  supplierRow.children = children
  tableRef.value?.store.updateKeyChildren(supplierRow.id, children)
  return children.length > 0
}

const resetSupplierPage = () => {
  query.current = 1
  loadSuppliers()
}

const buildSupplierRows = (suppliers: InvoiceArchiveSupplier[]) => {
  supplierRows.value = suppliers.map((supplier) => ({
    id: `supplier-${supplier.supplierGuid}`,
    rowType: 'supplier' as const,
    supplierGuid: supplier.supplierGuid,
    supplierLabel: supplierLabelOf(supplier),
    hasChildren: supplier.archiveCount > 0,
  }))
}

const loadArchiveChildren = async (
  row: SupplierTreeRow,
  _treeNode: unknown,
  resolve: (data: ArchiveTreeRow[]) => void,
) => {
  try {
    const page = await getInvoiceArchives({
      current: 1,
      pageSize: 100,
      supplierGuid: row.supplierGuid,
    })
    resolve(toArchiveRows(page.records, row.supplierLabel))
  } catch {
    resolve([])
  }
}

const downloadArchive = (row: ArchiveTreeRow) => {
  window.open(invoiceArchiveDownloadUrl(row.uuid), '_blank')
}

const removeArchive = async (row: ArchiveTreeRow) => {
  try {
    await ElMessageBox.confirm(`确定删除归档「${archiveFilename(row)}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await deleteInvoiceArchive(row.uuid)
  ElMessage.success('删除成功')
  const stillHasArchives = await refreshSupplierChildren(row.supplierGuid)
  if (!stillHasArchives) {
    expandedSupplierIds.value.delete(`supplier-${row.supplierGuid}`)
    await loadSuppliers({ preserveExpand: true })
  }
}

const loadSuppliers = async (options?: { preserveExpand?: boolean }) => {
  const preserveExpand = options?.preserveExpand ?? false
  if (!preserveExpand) {
    expandedSupplierIds.value.clear()
  }
  loading.value = true
  try {
    const page = await getInvoiceArchiveSuppliers({
      current: query.current,
      pageSize: query.pageSize,
      keyword: keyword.value.trim() || undefined,
    })
    supplierTotal.value = page.total
    buildSupplierRows(page.records)
    if (preserveExpand) {
      await restoreExpandedSuppliers()
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadSuppliers()
  await nextTick()
  recalcTableHeight()
})

</script>



<style scoped>
.supplier-name {
  font-weight: 600;
}


.download-link {
  color: #409eff;
  cursor: pointer;
}

.download-link:hover {
  text-decoration: underline;
}

.table-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
</style>