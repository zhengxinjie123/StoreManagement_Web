<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="520px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-descriptions :column="1" border size="default">
      <el-descriptions-item v-for="item in items" :key="item.label" :label="item.label">
        <slot :name="item.slot" :item="item">
          {{ item.value ?? '-' }}
        </slot>
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button type="primary" @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
export interface DetailItem {
  label: string
  value?: string | number | null
  slot?: string
}

defineProps<{
  visible: boolean
  title: string
  items: DetailItem[]
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
}>()
</script>
