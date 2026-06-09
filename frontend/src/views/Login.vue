<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="login-container">
        <div class="login-left">
          <div class="brand-logo">🚴</div>
          <h1 class="brand-title">户外骑行俱乐部</h1>
          <p class="brand-desc">探索自然 · 健康生活 · 结伴同行</p>
          <div class="feature-list">
            <div class="feature-item"><el-icon><Bicycle /></el-icon> 精彩活动发布</div>
            <div class="feature-item"><el-icon><User /></el-icon> 便捷报名管理</div>
            <div class="feature-item"><el-icon><Goods /></el-icon> 装备共享借用</div>
            <div class="feature-item"><el-icon><DataLine /></el-icon> 完整数据台账</div>
          </div>
        </div>
        <div class="login-right">
          <h2 class="form-title">欢迎登录</h2>
          <el-tabs v-model="activeTab" class="login-tabs">
            <el-tab-pane label="登录" name="login">
              <el-form :model="loginForm" :rules="loginRules" ref="loginRef" label-width="0" class="login-form">
                <el-form-item prop="username">
                  <el-input v-model="loginForm.username" placeholder="请输入用户名" size="large" prefix-icon="User" />
                </el-form-item>
                <el-form-item prop="password">
                  <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
                </el-form-item>
                <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="handleLogin">登 录</el-button>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="注册" name="register">
              <el-form :model="registerForm" :rules="registerRules" ref="registerRef" label-width="0" class="login-form">
                <el-form-item prop="username">
                  <el-input v-model="registerForm.username" placeholder="设置用户名" size="large" prefix-icon="User" />
                </el-form-item>
                <el-form-item prop="name">
                  <el-input v-model="registerForm.name" placeholder="真实姓名" size="large" prefix-icon="Avatar" />
                </el-form-item>
                <el-form-item prop="password">
                  <el-input v-model="registerForm.password" type="password" placeholder="设置密码（至少6位）" size="large" prefix-icon="Lock" show-password />
                </el-form-item>
                <el-form-item prop="phone">
                  <el-input v-model="registerForm.phone" placeholder="联系电话（选填）" size="large" prefix-icon="Phone" />
                </el-form-item>
                <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="handleRegister">注 册</el-button>
              </el-form>
            </el-tab-pane>
          </el-tabs>
          <div class="tip-box">
            <p>测试账号：admin / admin123（管理员）</p>
            <p>普通成员：zhangsan / 123456</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)
const loginRef = ref()
const registerRef = ref()

const loginForm = reactive({ username: '', password: '' })
const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const registerForm = reactive({ username: '', name: '', password: '', phone: '' })
const registerRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, min: 6, message: '密码至少6位', trigger: 'blur' }]
}

async function handleLogin() {
  await loginRef.value.validate()
  loading.value = true
  try {
    await userStore.login(loginForm)
    ElMessage.success('登录成功')
    router.push(route.query.redirect || '/activities')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  await registerRef.value.validate()
  loading.value = true
  try {
    await userStore.register(registerForm)
    ElMessage.success('注册成功')
    router.push('/activities')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.login-bg {
  width: 100%;
  max-width: 900px;
}
.login-container {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  display: flex;
}
.login-left {
  flex: 1;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%);
  padding: 60px 40px;
  color: #fff;
  min-width: 320px;
}
.brand-logo {
  font-size: 72px;
  margin-bottom: 16px;
}
.brand-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
}
.brand-desc {
  font-size: 15px;
  opacity: 0.9;
  margin-bottom: 40px;
}
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  opacity: 0.95;
}
.login-right {
  flex: 1;
  padding: 60px 40px;
  min-width: 320px;
}
.form-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1f2937;
}
.login-tabs {
  margin-bottom: 20px;
}
.login-form {
  margin-top: 8px;
}
.submit-btn {
  width: 100%;
  margin-top: 8px;
  height: 44px;
}
.tip-box {
  margin-top: 20px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.8;
}
@media (max-width: 768px) {
  .login-container { flex-direction: column; }
  .login-left { padding: 40px 24px; min-width: auto; }
  .login-right { padding: 40px 24px; min-width: auto; }
}
</style>
