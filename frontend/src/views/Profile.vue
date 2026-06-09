<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :xs="24" :md="8">
        <div class="card profile-card">
          <div class="avatar-area">
            <el-avatar :size="100" style="background:#3b82f6; font-size:36px">
              {{ user?.name?.charAt(0) || 'U' }}
            </el-avatar>
            <h2 class="user-name">{{ user?.name }}</h2>
            <p class="user-username">@{{ user?.username }}</p>
            <el-tag v-if="isAdmin" type="danger" effect="dark">管理员</el-tag>
            <el-tag v-else type="primary" effect="light">普通成员</el-tag>
          </div>
          <div class="profile-stats">
            <div class="stat-item">
              <div class="stat-value">{{ stats.activityCount }}</div>
              <div class="stat-label">参与活动</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.borrowingCount }}</div>
              <div class="stat-label">借用中</div>
            </div>
          </div>
        </div>

        <div class="card mt-20">
          <h3 class="section-title"><el-icon><Key /></el-icon>修改密码</h3>
          <el-form :model="pwdForm" ref="pwdRef" :rules="pwdRules" label-width="90px">
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="pwdForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="pwdForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
            </el-form-item>
            <el-button type="primary" :loading="pwdLoading" @click="updatePassword">确认修改</el-button>
          </el-form>
        </div>
      </el-col>

      <el-col :xs="24" :md="16">
        <div class="card">
          <div class="flex-between mb-20">
            <h3 class="section-title" style="margin:0"><el-icon><Edit /></el-icon>个人信息</h3>
            <el-button v-if="!editing" type="primary" size="small" @click="editing = true">编辑</el-button>
            <div v-else>
              <el-button size="small" @click="cancelEdit">取消</el-button>
              <el-button type="primary" size="small" :loading="saving" @click="saveProfile">保存</el-button>
            </div>
          </div>
          <el-form :model="profileForm" label-width="110px" :disabled="!editing">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="用户名">
                  <el-input v-model="profileForm.username" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="姓名">
                  <el-input v-model="profileForm.name" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系电话">
                  <el-input v-model="profileForm.phone" placeholder="请输入联系电话" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="邮箱">
                  <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="紧急联系人">
                  <el-input v-model="profileForm.emergency_contact" placeholder="紧急联系人姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="紧急电话">
                  <el-input v-model="profileForm.emergency_phone" placeholder="紧急联系电话" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import request from '../utils/request'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)
const user = computed(() => userStore.user)

const editing = ref(false)
const saving = ref(false)
const pwdLoading = ref(false)

const stats = reactive({ activityCount: 0, borrowingCount: 0 })

const profileForm = reactive({
  username: '', name: '', phone: '', email: '',
  emergency_contact: '', emergency_phone: ''
})

const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdRef = ref()
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_, v, cb) => {
        if (v !== pwdForm.newPassword) cb(new Error('两次密码不一致'))
        else cb()
      }, trigger: 'blur'
    }
  ]
}

async function loadProfile() {
  try {
    const u = await userStore.fetchProfile()
    Object.assign(profileForm, {
      username: u.username, name: u.name, phone: u.phone || '', email: u.email || '',
      emergency_contact: u.emergency_contact || '', emergency_phone: u.emergency_phone || ''
    })
    const res = await request.get('/api/registrations/mine', { params: { page: 1, pageSize: 1, status: 'all' } })
    stats.activityCount = res.data.total
    const loanRes = await request.get('/api/equipment/loans/mine')
    stats.borrowingCount = loanRes.data.list.filter(l => l.status === 'borrowed').length
  } catch(e) {}
}

function cancelEdit() {
  editing.value = false
  const u = userStore.user
  Object.assign(profileForm, {
    username: u.username, name: u.name, phone: u.phone || '', email: u.email || '',
    emergency_contact: u.emergency_contact || '', emergency_phone: u.emergency_phone || ''
  })
}

async function saveProfile() {
  saving.value = true
  try {
    await request.put('/api/auth/profile', {
      name: profileForm.name,
      phone: profileForm.phone,
      email: profileForm.email,
      emergencyContact: profileForm.emergency_contact,
      emergencyPhone: profileForm.emergency_phone
    })
    ElMessage.success('信息已更新')
    editing.value = false
    await loadProfile()
  } finally {
    saving.value = false
  }
}

async function updatePassword() {
  await pwdRef.value.validate()
  pwdLoading.value = true
  try {
    await request.put('/api/auth/password', {
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword
    })
    ElMessage.success('密码修改成功')
    Object.assign(pwdForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
  } finally {
    pwdLoading.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.profile-card {
  text-align: center;
}
.avatar-area {
  padding: 20px 0;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.user-name {
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  margin: 14px 0 4px 0;
}
.user-username {
  color: #9ca3af;
  font-size: 13px;
  margin: 0 0 8px 0;
}
.profile-stats {
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
}
.stat-item {
  text-align: center;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #3b82f6;
}
.stat-label {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 4px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
