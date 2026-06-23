import { request } from './http'
import type { ExcelPreview, InvoiceArchive, InvoiceArchiveSupplier, PageResponse } from '../types/api'

export interface PageQuery {
  current: number
  pageSize: number
  supplierGuid?: string
}

export const getInvoiceArchiveSuppliers = (params: PageQuery & { keyword?: string }) =>
  request<PageResponse<InvoiceArchiveSupplier>>({
    url: '/invoiceArchive/getSupplierPage',
    method: 'GET',
    params,
  })

export const getInvoiceArchives = (params: PageQuery) =>
  request<PageResponse<InvoiceArchive>>({ url: '/invoiceArchive/getPage', method: 'GET', params })

export const deleteInvoiceArchive = (uuid: string) =>
  request<void>({ url: `/invoiceArchive/${uuid}`, method: 'DELETE' })

export const invoiceArchiveDownloadUrl = (uuid: string) =>
  `/api/invoiceArchive/${uuid}/download`

export const previewInvoiceArchiveExcel = (uuid: string) =>
  request<ExcelPreview>({ url: `/invoiceArchive/${uuid}/preview`, method: 'GET' })

