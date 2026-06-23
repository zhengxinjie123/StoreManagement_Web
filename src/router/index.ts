import { createRouter, createWebHistory } from 'vue-router'
import TalentDataSourceView from '../views/TalentDataSourceView.vue'
import AttachmentsView from '../views/AttachmentsView.vue'
import InvoiceArchiveView from '../views/InvoiceArchiveView.vue'
import InvoiceTemplateView from '../views/InvoiceTemplateView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/talent-datasource' },
    { path: '/talent-datasource', component: TalentDataSourceView },
    { path: '/attachments', component: AttachmentsView },
    { path: '/invoice-templates', component: InvoiceTemplateView },
    { path: '/invoice-archives', component: InvoiceArchiveView },
  ],
})

export default router
