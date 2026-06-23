import { request } from './http'
import type { DataSourceForm, DataSourceStatus, SupplierOption } from '../types/api'

const baseUrl = '/talentOpos/dataSource'

export const getDataSourceStatus = () =>
  request<DataSourceStatus>({ url: `${baseUrl}/getStatus`, method: 'GET' })

export const saveDataSource = (data: DataSourceForm) =>
  request<DataSourceStatus>({ url: `${baseUrl}/save`, method: 'POST', data })

export const verifyDataSource = () =>
  request<{ productCount: number }>({ url: `${baseUrl}/verify`, method: 'GET' })

export const getSupplierOptions = () =>
  request<SupplierOption[]>({ url: '/talentOpos/supplier/getList', method: 'GET' })
