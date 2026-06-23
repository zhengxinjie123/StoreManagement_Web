export const supplierLabel = (supplier: { chineseName?: string; foreignName?: string }) =>
  [supplier.chineseName, supplier.foreignName].filter(Boolean).join(' / ') || '-'

export const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export const formatMoney = (value?: number | null) => {
  if (value == null) return '-'
  return value.toFixed(2)
}

export const formatQuantity = (value?: number | null) => {
  if (value == null) return '-'
  return Number.isInteger(value) ? String(value) : value.toFixed(4)
}
