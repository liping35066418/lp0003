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
        <el-table-column label="紧急联系人" width="260">
          <template #default="{ row }">
            <div v-if="row.emergency_contact || row.emergency_phone">
              <span>{{ row.emergency_contact || '未填' }}</span>
              <span v-if="row.emergency_phone" style="color:#6b7280;margin-left:8px">{{ row.emergency_phone }}</span>
            </div>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-select v-model="row.role" size="small" @change="updateRole(row)">
              <el-option label="管理员" value="admin" />
              <el-option label="普通成员" value="member" />
            </el-select>
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
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
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

const showDialog = ref(false)
const formRef = ref()

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
  } finally {
    loading.value = false
  }
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

onMounted(loadData)
</script>
