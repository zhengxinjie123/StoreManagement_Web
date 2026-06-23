import { request } from './http'
import type { InvoiceCleanPreview, InvoiceTemplate, InvoiceTemplateForm, PageResponse } from '../types/api'

export interface PageQuery {
  current: number
  pageSize: number
  supplierGuid?: string
}

export const getInvoiceTemplates = (params: PageQuery) =>
  request<PageResponse<InvoiceTemplate>>({ url: '/invoiceTemplate/getPage', method: 'GET', params })

export const getInvoiceTemplatesBySupplier = (supplierGuid: string) =>
  request<InvoiceTemplate[]>({
    url: '/invoiceTemplate/getListBySupplier',
    method: 'GET',
    params: { supplierGuid },
  })

export const getInvoiceTemplate = (id: number) =>
  request<InvoiceTemplate>({ url: `/invoiceTemplate/${id}`, method: 'GET' })

export const createInvoiceTemplate = (data: InvoiceTemplateForm) =>
  request<InvoiceTemplate>({ url: '/invoiceTemplate/insert', method: 'POST', data })

export const updateInvoiceTemplate = (id: number, data: InvoiceTemplateForm) =>
  request<InvoiceTemplate>({ url: `/invoiceTemplate/update/${id}`, method: 'PUT', data })

export const deleteInvoiceTemplate = (id: number) =>
  request<void>({ url: `/invoiceTemplate/${id}`, method: 'DELETE' })

export const previewInvoiceTemplate = (id: number, attachmentUuid: string, supplierGuid: string) =>
  request<InvoiceCleanPreview>({
    url: `/invoiceTemplate/${id}/preview`,
    method: 'POST',
    params: { attachmentUuid, supplierGuid },
  })
