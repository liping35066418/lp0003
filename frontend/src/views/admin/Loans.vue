<template>
  <div class="page-container">
    <div class="card mb-20">
      <div class="search-bar">
        <el-select v-model="statusFilter" placeholder="借用状态" clearable style="width:140px">
          <el-option label="借用中" value="borrowed" />
          <el-option label="已归还" value="returned" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索借用人/装备名" clearable style="width:240px" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
        <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>登记借用</el-button>
      </div>
    </div>

    <div class="card" v-loading="loading">
      <el-table :data="list" border stripe>
        <el-table-column label="装备" min-width="180">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="eq-icon">{{ catIcon(row.category) }}</div>
              <div>
                <div style="font-weight:500">{{ row.equipment_name }}</div>
                <div class="text-muted" style="font-size:12px">{{ row.category }} × {{ row.quantity }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="借用人" width="140">
          <template #default="{ row }">
            <div>
              <div>{{ row.user_name }}</div>
              <div class="text-muted" style="font-size:12px">{{ row.phone }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="关联活动" min-width="160">
          <template #default="{ row }">
            <span v-if="row.activity_title">{{ row.activity_title }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="借用时间" width="160">
          <template #default="{ row }">{{ formatDate(row.loan_date) }}</template>
        </el-table-column>
        <el-table-column label="应还日期" width="160">
          <template #default="{ row }">
            <span v-if="row.due_date" :class="isOverdue(row) ? 'text-danger' : ''">{{ formatDate(row.due_date) }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="归还时间" width="160">
          <template #default="{ row }">
            <span v-if="row.return_date">{{ formatDate(row.return_date) }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'borrowed'" :type="isOverdue(row) ? 'danger' : 'warning'">
              {{ isOverdue(row) ? '已逾期' : '借用中' }}
            </el-tag>
            <el-tag v-else type="success">已归还</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'borrowed'"
              type="success" link size="small"
              @click="returnItem(row)"
            >登记归还</el-button>
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

    <el-dialog v-model="showDialog" title="登记装备借用" width="520px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="装备" prop="equipmentId">
          <el-select v-model="form.equipmentId" filterable placeholder="选择装备" style="width:100%" @change="onEquipChange">
            <el-option
              v-for="e in availableEquip"
              :key="e.id"
              :label="`${e.name}（可用:${e.available_count}/${e.total_count}）`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" :max="maxQty" style="width:100%" />
        </el-form-item>
        <el-form-item label="借用人" prop="userId">
          <el-select v-model="form.userId" filterable placeholder="选择成员" style="width:100%">
            <el-option v-for="u in users" :key="u.id" :label="`${u.name} (${u.phone || u.username})`" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联活动">
          <el-select v-model="form.activityId" filterable clearable placeholder="选填" style="width:100%">
            <el-option v-for="a in activities" :key="a.id" :label="a.title" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="借用日期" prop="loanDate">
          <el-date-picker v-model="form.loanDate" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="预计归还">
          <el-date-picker v-model="form.dueDate" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveItem">登记</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../utils/request'
import dayjs from 'dayjs'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const statusFilter = ref('')
const keyword = ref('')
const loading = ref(false)
const saving = ref(false)

const showDialog = ref(false)
const formRef = ref()
const availableEquip = ref([])
const users = ref([])
const activities = ref([])

const defaultForm = () => ({
  equipmentId: null, userId: null, activityId: null,
  quantity: 1, loanDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  dueDate: '', remark: ''
})
const form = reactive(defaultForm())
const rules = {
  equipmentId: [{ required: true, message: '请选择装备', trigger: 'change' }],
  userId: [{ required: true, message: '请选择借用人', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  loanDate: [{ required: true, message: '请选择借用日期', trigger: 'change' }]
}

const maxQty = computed(() => {
  const e = availableEquip.value.find(x => x.id === form.equipmentId)
  return e?.available_count || 1
})

function catIcon(c) {
  return { '防护装备': '🪖', '照明设备': '🔦', '维修工具': '🔧', '医疗用品': '💊', '通信设备': '📻' }[c] || '🎒'
}
function formatDate(d) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '' }
function isOverdue(row) {
  return row.status === 'borrowed' && row.due_date && dayjs().isAfter(dayjs(row.due_date))
}

function onEquipChange() {
  if (form.quantity > maxQty.value) form.quantity = maxQty.value
}

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/api/equipment/loans', {
      params: {
        page: page.value, pageSize: pageSize.value,
        status: statusFilter.value || undefined,
        keyword: keyword.value || undefined
      }
    })
    let data = res.data.list
    if (keyword.value) {
      const k = keyword.value.toLowerCase()
      data = data.filter(x =>
        x.equipment_name?.toLowerCase().includes(k) || x.user_name?.toLowerCase().includes(k)
      )
    }
    list.value = data
    total.value = keyword.value ? data.length : res.data.total
  } finally {
    loading.value = false
  }
}

async function openDialog() {
  Object.assign(form, defaultForm())
  const [e, u, a] = await Promise.all([
    request.get('/api/equipment/all'),
    request.get('/api/users/all'),
    request.get('/api/activities', { params: { page: 1, pageSize: 100 } })
  ])
  availableEquip.value = e.data.list
  users.value = u.data.list
  activities.value = a.data.list
  showDialog.value = true
}

async function saveItem() {
  await formRef.value.validate()
  saving.value = true
  try {
    await request.post('/api/equipment/loans', {
      equipmentId: form.equipmentId, userId: form.userId, activityId: form.activityId,
      quantity: form.quantity, loanDate: form.loanDate, dueDate: form.dueDate, remark: form.remark
    })
    ElMessage.success('借用已登记')
    showDialog.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

async function returnItem(row) {
  try {
    await ElMessageBox.confirm(`确定登记「${row.equipment_name}」归还吗？`, '提示', { type: 'info' })
    await request.post(`/api/equipment/loans/${row.id}/return`)
    ElMessage.success('已登记归还')
    loadData()
  } catch(e) {}
}

onMounted(loadData)
</script>

<style scoped>
.eq-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
</style>
