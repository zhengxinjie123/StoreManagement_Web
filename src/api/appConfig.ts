import { request } from './http'
import type { AppConfig, AppConfigForm } from '../types/api'

export const getAppConfigTree = () =>
  request<AppConfig[]>({ url: '/appConfig/tree', method: 'GET' })

export const createAppConfig = (data: AppConfigForm) =>
  request<AppConfig>({ url: '/appConfig/insert', method: 'POST', data })

export const updateAppConfig = (id: number, data: AppConfigForm) =>
  request<AppConfig>({ url: `/appConfig/update/${id}`, method: 'PUT', data })

export const deleteAppConfig = (id: number) =>
  request<void>({ url: `/appConfig/${id}`, method: 'DELETE' })
