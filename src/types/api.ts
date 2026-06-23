export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface PageResponse<T> {
  current: number
  pageSize: number
  total: number
  records: T[]
}

export interface DataSourceForm {
  host: string
  port: number
  databaseName: string
  username: string
  password: string
}

export interface DataSourceStatus {
  configured: boolean
  connected: boolean
  host?: string
  port?: number
  databaseName?: string
  username?: string
  lastAppliedAt?: string
  message: string
}

export interface SupplierOption {
  guid: string
  chineseName: string
  foreignName: string
}

export interface Attachment {
  uuid: string
  fileName: string
  fileSize: number
  uploadDate: string
  extensionName: string
  supplierGuid: string
  supplierChineseName: string
  supplierForeignName: string
  importStatusCode: number | null
  importStatus: 'FAILED' | 'SUCCESS' | 'NOT_IMPORTED'
  importStatusName: string
  ownerType: 'SELF' | 'PARENT'
  ownerTypeCode: number
  ownerTypeName: string
  cleanStatus: 'NOT_CLEANED' | 'CLEANED'
  cleanStatusCode: number
  cleanStatusName: string
  deletable: boolean
}

export interface BatchUploadItem {
  fileName: string
  success: boolean
  message: string
  attachment?: Attachment
}

export interface BatchUploadResult {
  total: number
  successCount: number
  failureCount: number
  items: BatchUploadItem[]
}

export interface BatchUploadSupplierMatch {
  fileName: string
  supplierGuid?: string | null
  supplierChineseName?: string | null
  supplierForeignName?: string | null
}

export interface InvoiceArchive {
  uuid: string
  attachmentUuid: string
  supplierGuid: string
  fileName: string
  extensionName: string
  fileSize: number
  filePath: string
  rowCount: number
  totalQuantity: number | null
  amountBeforeDiscount: number | null
  discountAmount: number | null
  totalAmount: number | null
  taxIncluded: boolean | null
  createdAt: string
  remark?: string | null
  deletable: boolean
}

export interface InvoiceArchiveSupplier {
  supplierGuid: string
  supplierChineseName: string
  supplierForeignName: string
  archiveCount: number
  latestCreatedAt?: string
}

export interface InvoiceTemplate {
  id: number
  supplierGuid: string
  name: string
  headerRow: number
  dataStartRow: number
  sheetName?: string | null
  barcodeCol: string
  newBarcodeCol?: string | null
  foreignNameCol: string
  chineseNameCol?: string | null
  quantityCol: string
  priceCol?: string | null
  priceTaxIncludedCol?: string | null
  taxRateCol?: string | null
  lineSubtotalCol?: string | null
  defaultTaxRate?: number | null
  taxIncluded: boolean
  enabled: boolean
  remark?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface InvoiceTemplateForm {
  supplierGuid: string
  name: string
  headerRow: number
  dataStartRow: number
  sheetName?: string
  barcodeCol: string
  newBarcodeCol?: string | null
  foreignNameCol: string
  chineseNameCol?: string | null
  quantityCol: string
  priceCol?: string | null
  priceTaxIncludedCol?: string
  taxRateCol?: string
  lineSubtotalCol?: string
  defaultTaxRate?: number
  taxIncluded: boolean
  enabled?: boolean
  remark?: string
}

export interface InvoiceCleanPreview {
  rowCount: number
  templateName: string
  taxIncluded: boolean
  summary: {
    totalQuantity: number
    amountBeforeDiscount: number
    discountAmount: number
    totalAmount: number
    taxIncluded: boolean
    filteredCount?: number | null
    filteredAmount?: number | null
    remark?: string | null
  }
}
