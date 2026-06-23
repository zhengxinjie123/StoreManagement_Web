import { request } from './http'
import type {
  Attachment,
  BatchUploadResult,
  BatchUploadSupplierMatch,
  InvoiceArchive,
  InvoiceCleanConfirmPayload,
  PageResponse,
} from '../types/api'

export type AttachmentOwnerType = 'SELF' | 'PARENT'
export type AttachmentCleanStatus = 'NOT_CLEANED' | 'CLEANED'
export type AttachmentImportStatus = 'NOT_IMPORTED' | 'FAILED' | 'SUCCESS'

export interface AttachmentQuery {
  current: number
  pageSize: number
  supplierGuid?: string
  ownerType?: AttachmentOwnerType
  cleanStatus?: AttachmentCleanStatus
  importStatus?: AttachmentImportStatus
}

export interface BatchUploadPayload {
  file: File
  supplierGuid: string
}

export const getAttachments = (params: AttachmentQuery) =>
  request<PageResponse<Attachment>>({ url: '/importAttachment/getPage', method: 'GET', params })

/** 分页拉取全部符合条件的电子发票（用于一键清洗/一键导入） */
export const fetchAllAttachments = async (
  filters: Omit<AttachmentQuery, 'current' | 'pageSize'>,
): Promise<Attachment[]> => {
  const pageSize = 100
  let current = 1
  const records: Attachment[] = []
  while (true) {
    const page = await getAttachments({ ...filters, current, pageSize })
    records.push(...page.records)
    if (records.length >= page.total || page.records.length === 0) {
      break
    }
    current += 1
  }
  return records
}

export const uploadAttachment = (file: File, supplierGuid: string, ownerType: AttachmentOwnerType = 'SELF') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('supplierGuid', supplierGuid)
  formData.append('ownerType', ownerType)

  return request<Attachment>({
    url: '/importAttachment/upload',
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const batchUploadAttachments = (
  items: BatchUploadPayload[],
  ownerType: AttachmentOwnerType = 'SELF',
) => {
  const formData = new FormData()
  items.forEach((item) => {
    formData.append('files', item.file)
    formData.append('supplierGuids', item.supplierGuid)
  })
  formData.append('ownerType', ownerType)

  return request<BatchUploadResult>({
    url: '/importAttachment/batchUpload',
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const matchSuppliersByFileName = (fileNames: string[]) =>
  request<BatchUploadSupplierMatch[]>({
    url: '/importAttachment/matchSuppliersByFileName',
    method: 'POST',
    data: { fileNames },
  })

export const attachmentDownloadUrl = (uuid: string) =>
  `/api/importAttachment/${uuid}/download`

export const deleteAttachment = (uuid: string) =>
  request<void>({ url: `/importAttachment/${uuid}`, method: 'DELETE' })

export const cleanAttachment = (uuid: string, supplierGuid: string, templateId: number) =>
  request<InvoiceArchive>({
    url: `/importAttachment/${uuid}/clean`,
    method: 'POST',
    params: { supplierGuid, templateId },
  })

/** 预览确认后归档（携带前端编辑后的明细行与汇总） */
export const confirmCleanAttachment = (uuid: string, payload: InvoiceCleanConfirmPayload) =>
  request<InvoiceArchive>({
    url: `/importAttachment/${uuid}/clean/confirm`,
    method: 'POST',
    data: payload,
  })
