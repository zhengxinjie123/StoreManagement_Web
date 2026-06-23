<template>
  <el-dialog :model-value="visible" :title="title" width="520px" destroy-on-close class="dialog"
    @update:model-value="emit('update:visible', $event)">
    <el-descriptions :column="1" border size="default" :label-width="160">
      <el-descriptions-item v-for="item in items" :key="item.label" :label="item.label">
        <slot :name="item.slot" :item="item">
          {{ displayValue(item) }}
        </slot>
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script setup lang="ts">
export interface DetailItem {
  label: string
  value?: string | number | null
  slot?: string
  /** 长文本自动换行；未指定时「备注」字段默认开启 */
  wrap?: boolean
}

defineProps<{
  visible: boolean
  title: string
  items: DetailItem[]
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const shouldWrap = (item: DetailItem) => item.wrap ?? item.label === '备注'

/** 爱国者等条码映射备注形如 123->456;789->012，按分号分行展示 */
const displayValue = (item: DetailItem) => {
  const raw = item.value ?? '-'
  if (!shouldWrap(item) || typeof raw !== 'string') {
    return raw
  }
  if (raw.includes(';')) {
    return raw
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n')
  }
  return raw
}
</script>

<style>
.dialog {
  max-height: 75vh;
  overflow-y: auto;
}
</style>
