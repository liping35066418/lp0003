<template>
  <div class="page-container">
    <div class="card mb-20">
      <div class="search-bar">
        <el-select v-model="typeFilter" placeholder="类型" clearable style="width:120px">
          <el-option label="收入" value="income" />
          <el-option label="支出" value="expense" />
        </el-select>
        <el-select v-model="activityFilter" placeholder="关联活动" filterable clearable style="width:200px">
          <el-option v-for="a in activities" :key="a.id" :label="a.title" :value="a.id" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:260px" />
        <el-input v-model="keyword" placeholder="搜索描述/人员" clearable style="width:220px" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
        <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>添加记录</el-button>
      </div>
      <div class="summary-row">
        <div class="summary-item income">
          <span>总收入</span>
          <strong>¥{{ formatMoney(summary.total_income) }}</strong>
        </div>
        <div class="summary-item expense">
          <span>总支出</span>
          <strong>¥{{ formatMoney(summary.total_expense) }}</strong>
        </div>
        <div class="summary-item balance" :class="summary.balance >= 0 ? 'pos' : 'neg'">
          <span>净结余</span>
          <strong>¥{{ formatMoney(summary.balance) }}</strong>
        </div>
        <div class="summary-item count">
          <span>记录数</span>
          <strong>{{ total }} 条</strong>
        </div>
      </div>
    </div>

    <div class="card" v-loading="loading">
      <el-table :data="list" border stripe>
        <el-table-column label="日期" width="110">
          <template #default="{ row }">{{ formatDate(row.record_date) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'" effect="dark">
              {{ row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.type === 'income' ? '#10b981' : '#ef4444', fontWeight: 600 }">
              {{ row.type === 'income' ? '+' : '-' }}¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="关联活动" min-width="160">
          <template #default="{ row }">
            <span v-if="row.activity_title">{{ row.activity_title }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="payer_name" label="付款方" width="120">
          <template #default="{ row }">
            <span v-if="row.payer_name">{{ row.payer_name }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="payee_name" label="收款方" width="120">
          <template #default="{ row }">
            <span v-if="row.payee_name">{{ row.payee_name }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="登记人" width="100">
          <template #default="{ row }">
            <span v-if="row.creator_name">{{ row.creator_name }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="deleteItem(row)">删除</el-button>
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

    <el-dialog v-model="showDialog" :title="form.id ? '编辑记录' : '添加记录'" width="560px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-radio-group v-model="form.type">
                <el-radio-button value="income">收入</el-radio-button>
                <el-radio-button value="expense">支出</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="金额" prop="amount">
              <el-input-number v-model="form.amount" :min="0.01" :step="10" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="描述" prop="description">
              <el-input v-model="form.description" placeholder="如：活动报名费收入/补给品采购" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联活动">
              <el-select v-model="form.activityId" filterable clearable style="width:100%">
                <el-option v-for="a in activities" :key="a.id" :label="a.title" :value="a.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="记账日期" prop="recordDate">
              <el-date-picker v-model="form.recordDate" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="付款方">
              <el-input v-model="form.payerName" placeholder="如：张三/俱乐部" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收款方">
              <el-input v-model="form.payeeName" placeholder="如：俱乐部/户外店" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../utils/request'
import dayjs from 'dayjs'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const typeFilter = ref('')
const activityFilter = ref('')
const keyword = ref('')
const dateRange = ref([])
const loading = ref(false)
const saving = ref(false)

const summary = reactive({ total_income: 0, total_expense: 0, balance: 0 })
const activities = ref([])

const showDialog = ref(false)
const formRef = ref()

const defaultForm = () => ({
  id: null, type: 'income', amount: 0, description: '', activityId: null,
  recordDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  payerName: '', payeeName: ''
})
const form = reactive(defaultForm())
const rules = {
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }]
}

function formatMoney(n) { return Number(n || 0).toFixed(2) }
function formatDate(d) { return dayjs(d).format('YYYY-MM-DD') }

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: page.value, pageSize: pageSize.value,
      type: typeFilter.value || undefined,
      activityId: activityFilter.value || undefined,
      keyword: keyword.value || undefined
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await request.get('/api/ledger', { params })
    list.value = res.data.list
    total.value = res.data.total
    Object.assign(summary, res.data.summary)
  } finally {
    loading.value = false
  }
}

async function openDialog(row) {
  Object.assign(form, defaultForm())
  if (!activities.value.length) {
    const a = await request.get('/api/activities', { params: { page: 1, pageSize: 200 } })
    activities.value = a.data.list
  }
  if (row) {
    Object.assign(form, {
      id: row.id, type: row.type, amount: row.amount, description: row.description,
      activityId: row.activity_id, recordDate: row.record_date,
      payerName: row.payer_name || '', payeeName: row.payee_name || ''
    })
  }
  showDialog.value = true
}

async function saveItem() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      type: form.type, amount: form.amount, description: form.description,
      activityId: form.activityId, recordDate: form.recordDate,
      payerName: form.payerName, payeeName: form.payeeName
    }
    if (form.id) {
      await request.put(`/api/ledger/${form.id}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/api/ledger', payload)
      ElMessage.success('添加成功')
    }
    showDialog.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

async function deleteItem(row) {
  try {
    await ElMessageBox.confirm(`确定删除这条记录吗？`, '危险操作', { type: 'danger' })
    await request.delete(`/api/ledger/${row.id}`)
    ElMessage.success('已删除')
    loadData()
  } catch(e) {}
}

onMounted(async () => {
  const a = await request.get('/api/activities', { params: { page: 1, pageSize: 200 } })
  activities.value = a.data.list
  loadData()
})
</script>

<style scoped>
.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.summary-item {
  padding: 16px 20px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.summary-item span {
  font-size: 13px;
  color: #6b7280;
}
.summary-item strong {
  font-size: 22px;
}
.summary-item.income { background: #ecfdf5; }
.summary-item.income strong { color: #059669; }
.summary-item.expense { background: #fef2f2; }
.summary-item.expense strong { color: #dc2626; }
.summary-item.balance { background: #fffbeb; }
.summary-item.balance.pos strong { color: #059669; }
.summary-item.balance.neg strong { color: #dc2626; }
.summary-item.count { background: #eff6ff; }
.summary-item.count strong { color: #2563eb; }
</style>
