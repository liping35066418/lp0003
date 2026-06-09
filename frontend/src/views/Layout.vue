<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo-area" @click="goHome">
        <span class="logo-icon">🚴</span>
        <span v-if="!isCollapse" class="logo-text">骑行俱乐部</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#1f2937"
        text-color="#9ca3af"
        active-text-color="#60a5fa"
        class="sidebar-menu"
      >
        <el-menu-item-group>
          <template v-if="!isCollapse" #title><span class="group-title">会员功能</span></template>
          <el-menu-item index="/activities">
            <el-icon><List /></el-icon>
            <template #title>活动列表</template>
          </el-menu-item>
          <el-menu-item index="/my-activities">
            <el-icon><Calendar /></el-icon>
            <template #title>我的活动</template>
          </el-menu-item>
          <el-menu-item index="/equipment">
            <el-icon><Goods /></el-icon>
            <template #title>装备中心</template>
          </el-menu-item>
          <el-menu-item index="/my-equipment">
            <el-icon><Tickets /></el-icon>
            <template #title>我的借用</template>
          </el-menu-item>
          <el-menu-item index="/profile">
            <el-icon><User /></el-icon>
            <template #title>个人中心</template>
          </el-menu-item>
        </el-menu-item-group>

        <el-menu-item-group v-if="isAdmin">
          <template v-if="!isCollapse" #title><span class="group-title">管理后台</span></template>
          <el-menu-item index="/admin/dashboard">
            <el-icon><DataLine /></el-icon>
            <template #title>数据统计</template>
          </el-menu-item>
          <el-menu-item index="/admin/activities">
            <el-icon><EditPen /></el-icon>
            <template #title>活动管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/equipment">
            <el-icon><Tools /></el-icon>
            <template #title>装备管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/loans">
            <el-icon><Tickets /></el-icon>
            <template #title>借用管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/ledger">
            <el-icon><Notebook /></el-icon>
            <template #title>出行台账</template>
          </el-menu-item>
          <el-menu-item index="/admin/users">
            <el-icon><Avatar /></el-icon>
            <template #title>成员管理</template>
          </el-menu-item>
        </el-menu-item-group>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/activities' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click" @command="handleUserCommand">
            <span class="user-info">
              <el-avatar :size="32" style="background:#3b82f6">{{ initialName }}</el-avatar>
              <span class="user-name">{{ username }}</span>
              <el-tag v-if="isAdmin" type="danger" size="small" effect="dark" class="role-tag">管理员</el-tag>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile"><el-icon><User /></el-icon>个人中心</el-dropdown-item>
                <el-dropdown-item divided command="logout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const isAdmin = computed(() => userStore.isAdmin)
const username = computed(() => userStore.username)
const initialName = computed(() => username.value?.charAt(0) || 'U')
const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title)

function goHome() {
  router.push('/activities')
}

function handleUserCommand(command) {
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      ElMessage.success('已退出登录')
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.sidebar {
  background: #1f2937;
  transition: width 0.3s;
  overflow: hidden;
}
.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  cursor: pointer;
  border-bottom: 1px solid #374151;
}
.logo-icon {
  font-size: 28px;
}
.logo-text {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}
.sidebar-menu {
  border: none;
  height: calc(100vh - 60px);
}
.group-title {
  color: #6b7280;
  font-size: 12px;
  padding-left: 8px;
}
:deep(.el-menu-item-group__title) {
  padding: 12px 0 4px 20px;
}
:deep(.el-menu-item) {
  height: 46px;
  line-height: 46px;
}
.header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}
.collapse-btn:hover {
  background: #f3f4f6;
  color: #374151;
}
.header-right {
  display: flex;
  align-items: center;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}
.user-info:hover {
  background: #f3f4f6;
}
.user-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}
.role-tag {
  margin-left: 4px;
}
.main-content {
  padding: 0;
  background: #f5f7fa;
  overflow-y: auto;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
