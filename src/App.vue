<template>
  <el-container class="app-shell">
    <el-aside width="var(--aside-width)" class="app-aside">
      <div class="brand">Store Management</div>
      <el-menu
        router
        :default-active="activeMenu"
        background-color="#111827"
        text-color="#cbd5e1"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/talent-datasource">
          <el-icon><Connection /></el-icon>
          <span>Talent 数据源</span>
        </el-menu-item>
        <el-menu-item index="/attachments">
          <el-icon><Document /></el-icon>
          <span>电子发票</span>
        </el-menu-item>
        <el-menu-item index="/invoice-templates">
          <el-icon><Grid /></el-icon>
          <span>清洗模板配置</span>
        </el-menu-item>
        <el-menu-item index="/invoice-archives">
          <el-icon><FolderOpened /></el-icon>
          <span>归档发票</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="app-body">
      <el-main class="app-main">
        <div class="page-container">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Connection, Document, FolderOpened, Grid } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>
