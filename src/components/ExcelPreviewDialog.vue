<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="1120px"
    top="5vh"
    destroy-on-close
    @update:model-value="updateVisible"
    @closed="resetPreview"
  >
    <div v-loading="loading" class="excel-preview">
      <el-alert
        v-if="errorMessage"
        type="warning"
        :closable="false"
        show-icon
        class="preview-message"
      >
        {{ errorMessage }}
      </el-alert>

      <template v-if="sheets.length">
        <el-tabs v-model="activeSheet" class="sheet-tabs">
          <el-tab-pane
            v-for="sheet in sheets"
            :key="sheet.name"
            :label="sheet.name"
            :name="sheet.name"
          />
        </el-tabs>
        <div class="excel-table-wrap">
          <table class="excel-table">
            <tbody>
              <tr v-for="(row, rowIndex) in activeRows" :key="rowIndex">
                <th class="row-index">{{ rowIndex + 1 }}</th>
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                  {{ cell || '' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="activeSheetInfo?.truncated" class="preview-limit-tip">
          仅预览前 {{ MAX_PREVIEW_ROWS }} 行、{{ MAX_PREVIEW_COLS }} 列，完整内容请下载查看。
        </div>
      </template>

      <el-empty v-else-if="!loading" description="当前文件暂不支持在线预览，请下载查看" />
    </div>

    <template #footer>
      <el-button @click="updateVisible(false)">关闭</el-button>
      <el-button type="primary" @click="downloadFile">下载</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ExcelPreview, ExcelSheetPreview } from '../types/api'

const MAX_PREVIEW_ROWS = 500
const MAX_PREVIEW_COLS = 80

const props = defineProps<{
  visible: boolean
  title: string
  downloadUrl: string
  loadPreview: () => Promise<ExcelPreview>
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const loading = ref(false)
const errorMessage = ref('')
const sheets = ref<ExcelSheetPreview[]>([])
const activeSheet = ref('')

const activeSheetInfo = computed(() =>
  sheets.value.find((sheet) => sheet.name === activeSheet.value),
)
const activeRows = computed(() => activeSheetInfo.value?.rows ?? [])

const updateVisible = (value: boolean) => {
  emit('update:visible', value)
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadPreview()
    }
  },
)

const resetPreview = () => {
  loading.value = false
  errorMessage.value = ''
  sheets.value = []
  activeSheet.value = ''
}

const loadPreview = async () => {
  resetPreview()
  loading.value = true
  try {
    const preview = await props.loadPreview()
    sheets.value = preview.sheets ?? []
    activeSheet.value = sheets.value[0]?.name ?? ''
    if (!sheets.value.length || !activeRows.value.length) {
      errorMessage.value = 'Excel 中未读取到可预览的数据。'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '文件预览失败'
  } finally {
    loading.value = false
  }
}

const downloadFile = () => {
  if (props.downloadUrl) {
    window.open(props.downloadUrl, '_blank')
  }
}
</script>

<style scoped>
.excel-preview {
  display: flex;
  flex-direction: column;
  height: 68vh;
  min-height: 280px;
}

.preview-message {
  margin-bottom: 8px;
}

.sheet-tabs {
  flex-shrink: 0;
}

.excel-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
}

.excel-table {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
  font-size: 12px;
}

.excel-table th,
.excel-table td {
  min-width: 80px;
  max-width: 260px;
  height: 26px;
  padding: 4px 8px;
  border: 1px solid var(--el-border-color-lighter);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.excel-table .row-index {
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 48px;
  width: 48px;
  text-align: center;
  color: #909399;
  background: var(--el-fill-color-light);
}

.preview-limit-tip {
  flex-shrink: 0;
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
}
</style>
