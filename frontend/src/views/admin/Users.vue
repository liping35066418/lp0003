<template>
  <div class="page-container">
    <div class="card mb-20">
      <div class="search-bar">
        <el-select v-model="roleFilter" placeholder="角色" clearable style="width:120px">
          <el-option label="管理员" value="admin" />
          <el-option label="普通成员" value="member" />
        </el-select>
        <el-input v-model="keyword" placeholder="姓名/用户名/手机号" clearable style="width:260px" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
        <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>添加成员</el-button>
      </div>
    </div>

    <div class="card" v-loading="loading">
      <el-table :data="list" border stripe>
        <el-table-column label="成员" width="180">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:10px">
              <el-avatar :size="36" style="background:#10b981">{{ row.name?.charAt(0) }}</el-avatar>
              <div>
                <div style="font-weight:500">{{ row.name }}</div>
                <div class="text-muted" style="font-size:12px">@{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130">
          <template #default="{ row }">
            <span v-if="row.phone">{{ row.phone }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" width="180">
          <template #default="{ row }">
            <span v-if="row.email">{{ row.email }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="累计积分" width="110" align="center" sortable="custom" :sort-orders="['ascending', 'descending']" @sort-change="handlePointSort">
          <template #default="{ row }">
            <el-tag type="warning" effect="dark" size="small">
              🏆 {{ row.total_points || 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="活动" width="80" align="center" prop="activity_count">
          <template #default="{ row }">
            <el-tag type="primary" effect="plain" size="small">{{ row.activity_count || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="借用中" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.borrowing_count" type="warning" size="small">{{ row.borrowing_count }}</el-tag>
            <span v-else class="text-muted">0</span>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="160">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openPointsDialog(row)">积分明细</el-button>
            <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="deleteItem(row)" :disabled="row.id === currentUserId">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-20 flex-center">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </div>

    <el-dialog v-model="showDialog" :title="form.id ? '编辑成员' : '添加成员'" width="560px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" :disabled="!!form.id" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="form.id ? '重置密码' : '初始密码'" prop="password">
              <el-input v-model="form.password" type="password" show-password :placeholder="form.id ? '不修改留空' : '请输入密码'" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="form.phone" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="form.email" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色" prop="role">
              <el-select v-model="form.role" style="width:100%">
                <el-option label="管理员" value="admin" />
                <el-option label="普通成员" value="member" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急联系人">
              <el-input v-model="form.emergencyContact" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急电话">
              <el-input v-model="form.emergencyPhone" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPointsDialog" :title="`${selectedUser?.name || ''} - 积分明细`" width="720px">
      <div class="points-summary">
        <div class="points-card total">
          <div class="points-label">累计积分</div>
          <div class="points-value">🏆 {{ pointsTotal || 0 }}</div>
        </div>
        <div class="points-card add">
          <el-button type="warning" size="small" @click="showAddPointsDialog = true">
            <el-icon><Plus /></el-icon>手动加分
          </el-button>
        </div>
      </div>

      <div v-loading="pointsLoading" style="min-height:300px">
        <el-empty v-if="pointsList.length === 0 && !pointsLoading" description="暂无积分记录" />
        <el-table v-else :data="pointsList" border stripe size="small">
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.type === 'activity'" type="primary" size="small">活动</el-tag>
              <el-tag v-else type="warning" size="small">手动</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="积分变化" width="100">
            <template #default="{ row }">
              <span :style="{ color: row.points >= 0 ? '#67c23a' : '#f56c6c', fontWeight: 600 }">
                {{ row.points >= 0 ? '+' : '' }}{{ row.points }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="200">
            <template #default="{ row }">
              {{ row.reason || '-' }}
              <el-tag v-if="row.activity_title" size="small" type="info" effect="plain" style="margin-left:6px">
                📋 {{ row.activity_title }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="mt-16 flex-center">
          <el-pagination
            v-model:current-page="pointsPage"
            v-model:page-size="pointsPageSize"
            :total="pointsTotalCount"
            layout="total, prev, pager, next"
            @current-change="loadPoints"
          />
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="showPointsDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showAddPointsDialog" title="手动调整积分" width="460px">
      <el-form label-width="80px">
        <el-form-item label="调整积分">
          <el-input-number v-model="addPointsForm.points" :min="1" :max="10000" />
          <span class="text-muted" style="margin-left:10px;font-size:12px">填入正数为加分，建议1-100</span>
        </el-form-item>
        <el-form-item label="原因说明">
          <el-input v-model="addPointsForm.reason" type="textarea" :rows="3" placeholder="请说明加分原因（如：优秀贡献、志愿活动等）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddPointsDialog = false">取消</el-button>
        <el-button type="primary" :loading="addingPoints" @click="submitAddPoints">确认加分</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../stores/user'
import request from '../../utils/request'
import dayjs from 'dayjs'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.user?.id)

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const roleFilter = ref('')
const keyword = ref('')
const loading = ref(false)
const saving = ref(false)
const sortField = ref('')
const sortOrder = ref('')

const showDialog = ref(false)
const formRef = ref()

const showPointsDialog = ref(false)
const selectedUser = ref(null)
const pointsList = ref([])
const pointsPage = ref(1)
const pointsPageSize = ref(10)
const pointsTotal = ref(0)
const pointsTotalCount = ref(0)
const pointsLoading = ref(false)

const showAddPointsDialog = ref(false)
const addPointsForm = reactive({ points: 10, reason: '' })
const addingPoints = ref(false)

const defaultForm = () => ({
  id: null, username: '', password: '', name: '', phone: '', email: '',
  role: 'member', emergencyContact: '', emergencyPhone: ''
})
const form = reactive(defaultForm())
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/api/users', {
      params: {
        page: page.value, pageSize: pageSize.value,
        role: roleFilter.value || undefined,
        keyword: keyword.value || undefined
      }
    })
    list.value = res.data.list
    total.value = res.data.total
    if (sortField.value === 'total_points') {
      list.value.sort((a, b) => {
        const diff = (a.total_points || 0) - (b.total_points || 0)
        return sortOrder.value === 'ascending' ? diff : -diff
      })
    }
  } finally {
    loading.value = false
  }
}

function handlePointSort({ order }) {
  sortField.value = 'total_points'
  sortOrder.value = order
  if (order) loadData()
}

function openDialog(row) {
  Object.assign(form, defaultForm())
  if (row) {
    Object.assign(form, {
      id: row.id, username: row.username, password: '', name: row.name,
      phone: row.phone || '', email: row.email || '', role: row.role,
      emergencyContact: row.emergency_contact || '', emergencyPhone: row.emergency_phone || ''
    })
  }
  showDialog.value = true
}

async function saveItem() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      username: form.username, name: form.name, phone: form.phone, email: form.email,
      role: form.role, emergencyContact: form.emergencyContact, emergencyPhone: form.emergencyPhone
    }
    if (form.password) payload.password = form.password
    if (form.id) {
      await request.put(`/api/users/${form.id}`, payload)
      ElMessage.success('更新成功')
    } else {
      if (!form.password) {
        ElMessage.warning('请设置初始密码')
        saving.value = false
        return
      }
      await request.post('/api/users', payload)
      ElMessage.success('添加成功')
    }
    showDialog.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

async function updateRole(row) {
  try {
    await request.put(`/api/users/${row.id}`, {
      name: row.name, role: row.role, phone: row.phone, email: row.email,
      emergencyContact: row.emergency_contact, emergencyPhone: row.emergency_phone
    })
    ElMessage.success('角色已更新')
  } catch(e) { loadData() }
}

async function deleteItem(row) {
  try {
    await ElMessageBox.confirm(`确定删除成员「${row.name}」吗？`, '危险操作', { type: 'danger' })
    await request.delete(`/api/users/${row.id}`)
    ElMessage.success('已删除')
    loadData()
  } catch(e) {}
}

function openPointsDialog(row) {
  selectedUser.value = row
  pointsPage.value = 1
  loadPoints()
  showPointsDialog.value = true
}

async function loadPoints() {
  pointsLoading.value = true
  try {
    const res = await request.get(`/api/points/user/${selectedUser.value.id}`, {
      params: { page: pointsPage.value, pageSize: pointsPageSize.value }
    })
    pointsList.value = res.data.list
    pointsTotal.value = res.data.totalPoints
    pointsTotalCount.value = res.data.total
  } finally {
    pointsLoading.value = false
  }
}

async function submitAddPoints() {
  if (!addPointsForm.points) {
    ElMessage.warning('请填写积分值')
    return
  }
  addingPoints.value = true
  try {
    await request.post('/api/points/manual', {
      userId: selectedUser.value.id,
      points: addPointsForm.points,
      reason: addPointsForm.reason
    })
    ElMessage.success(`已为「${selectedUser.value.name}」添加 ${addPointsForm.points} 积分`)
    showAddPointsDialog.value = false
    addPointsForm.points = 10
    addPointsForm.reason = ''
    await loadPoints()
    await loadData()
  } finally {
    addingPoints.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.points-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff7e6 0%, #fff1f0 100%);
  border-radius: 12px;
}
.points-card.total .points-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}
.points-card.total .points-value {
  font-size: 28px;
  font-weight: 700;
  color: #d97706;
}
.mt-16 { margin-top: 16px; }
</style>
