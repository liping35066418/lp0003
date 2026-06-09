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
            <div class="stat-item points">
              <div class="stat-value">{{ stats.totalPoints }}</div>
              <div class="stat-label">总积分</div>
            </div>
          </div>
          <div class="rank-banner">
            <div class="rank-left">
              <span class="rank-icon">🏆</span>
              <div>
                <div class="rank-label">当前积分排名</div>
                <div class="rank-value">
                  {{ stats.rank > 0 ? `第 ${stats.rank} 名` : '暂无排名' }}
                  <span v-if="stats.rank > 0" class="rank-total">/ 共 {{ stats.totalMembers }} 位成员</span>
                </div>
              </div>
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
        <div class="card mb-20">
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

        <div class="card">
          <div class="flex-between mb-20">
            <h3 class="section-title" style="margin:0">
              <el-icon><Trophy /></el-icon>我的积分记录
              <el-tag size="small" type="warning" effect="plain" style="margin-left:10px">
                🏆 累计 {{ stats.totalPoints }} 分
              </el-tag>
            </h3>
          </div>
          <div v-loading="pointsLoading">
            <el-empty v-if="pointsList.length === 0 && !pointsLoading" description="暂无积分记录，多参加活动就能获得积分哦～" />
            <el-table v-else :data="pointsList" border stripe size="small">
              <el-table-column label="时间" width="160">
                <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
              </el-table-column>
              <el-table-column label="类型" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.type === 'activity'" type="primary" size="small">活动</el-tag>
                  <el-tag v-else-if="row.type === 'manual'" type="warning" size="small">手动</el-tag>
                  <el-tag v-else type="info" size="small">其他</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="积分" width="100" align="center">
                <template #default="{ row }">
                  <span :style="{ color: row.points >= 0 ? '#67c23a' : '#f56c6c', fontWeight: 700, fontSize: '15px' }">
                    {{ row.points >= 0 ? '+' : '' }}{{ row.points }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="说明" min-width="220">
                <template #default="{ row }">
                  <span>{{ row.reason || '-' }}</span>
                  <el-tag v-if="row.activity_title" size="small" type="info" effect="plain" style="margin-left:8px">
                    📋 {{ row.activity_title }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div class="mt-20 flex-center">
              <el-pagination
                v-model:current-page="pointsPage"
                v-model:page-size="pointsPageSize"
                :total="pointsTotal"
                layout="total, prev, pager, next"
                @current-change="loadPoints"
              />
            </div>
          </div>
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
import dayjs from 'dayjs'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)
const user = computed(() => userStore.user)

const editing = ref(false)
const saving = ref(false)
const pwdLoading = ref(false)

const stats = reactive({
  activityCount: 0, borrowingCount: 0,
  totalPoints: 0, rank: 0, totalMembers: 0
})

const pointsList = ref([])
const pointsPage = ref(1)
const pointsPageSize = ref(8)
const pointsTotal = ref(0)
const pointsLoading = ref(false)

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

function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }

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
    await loadPoints()
    const lbRes = await request.get('/api/points/leaderboard', { params: { limit: 10 } })
    stats.rank = lbRes.data.myRank || 0
  } catch(e) {}
}

async function loadPoints() {
  pointsLoading.value = true
  try {
    const res = await request.get('/api/points/mine', {
      params: { page: pointsPage.value, pageSize: pointsPageSize.value }
    })
    pointsList.value = res.data.list
    pointsTotal.value = res.data.total
    stats.totalPoints = res.data.totalPoints
    stats.rank = res.data.rank
  } catch (e) {} finally {
    pointsLoading.value = false
  }
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
  padding: 10px 0 20px 0;
  border-bottom: 1px dashed #e5e7eb;
  margin-bottom: 16px;
}
.stat-item {
  text-align: center;
}
.stat-item.points .stat-value {
  color: #d97706;
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
.rank-banner {
  padding: 14px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  text-align: left;
}
.rank-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rank-icon {
  font-size: 36px;
  flex-shrink: 0;
}
.rank-label {
  font-size: 12px;
  color: #92400e;
  margin-bottom: 3px;
}
.rank-value {
  font-size: 20px;
  font-weight: 700;
  color: #92400e;
}
.rank-total {
  font-size: 12px;
  font-weight: 500;
  color: #b45309;
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
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.mt-20 { margin-top: 20px; }
</style>
