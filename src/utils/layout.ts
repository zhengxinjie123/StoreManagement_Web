import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * 计算表格可用最大高度。配合 el-table 的 max-height 使用：
 * 数据少时表格随内容收缩，无滚动条；数据超出时才在表格内滚动。
 */
export function useTableMaxHeight(containerRef: Ref<HTMLElement | null>, bottomGap = 48) {
  const tableMaxHeight = ref<number | undefined>(undefined)

  const recalc = () => {
    const el = containerRef.value
    if (!el) return
    const top = el.getBoundingClientRect().top
    tableMaxHeight.value = Math.max(160, Math.floor(window.innerHeight - top - bottomGap))
  }

  onMounted(() => {
    recalc()
    window.addEventListener('resize', recalc)
    requestAnimationFrame(recalc)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', recalc)
  })

  return { tableMaxHeight, recalc }
}
