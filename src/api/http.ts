import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '../types/api'
import type { AxiosRequestConfig } from 'axios'

const httpClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await httpClient.request<ApiResponse<T>>(config)
    const result = response.data
    if (result.code !== 200) {
      throw new Error(result.msg || '请求失败')
    }
    return result.data
  } catch (error: any) {
    const message = error.response?.data?.msg || error.message || '网络异常'
    console.error('[API Error]', {
      url: config.url,
      method: config.method,
      status: error.response?.status,
      response: error.response?.data,
      message,
    })
    ElMessage.error(message)
    throw error
  }
}
