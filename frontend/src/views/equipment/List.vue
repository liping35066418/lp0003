<template>
  <div class="page-container">
    <div class="card mb-20">
      <div class="search-bar">
        <el-select v-model="categoryFilter" placeholder="装备分类" clearable style="width: 160px">
          <el-option label="全部" value="" />
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索装备名称/品牌" clearable style="width: 240px" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
    </div>

    <el-row :gutter="16" v-loading="loading">
      <el-col v-for="item in list" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="equip-card" shadow="hover">
          <div class="equip-icon" :class="catClass(item.category)">
            {{ catIcon(item.category) }}
          </div>
          <div class="equip-info">
            <h3 class="equip-name">{{ item.name }}</h3>
            <div class="equip-meta">
              <el-tag size="small" effect="light">{{ item.category }}</el-tag>
              <span v-if="item.brand" class="text-muted" style="font-size:12px">{{ item.brand }} {{ item.model }}</span>
            </div>
            <div class="stock-row">
              <span class="text-muted">库存</span>
              <span :class="item.available_count > 0 ? 'text-success' : 'text-danger'">
                {{ item.available_count }} / {{ item.total_count }}
              </span>
            </div>
            <el-progress
              :percentage="Math.round((item.total_count - item.available_count) / item.total_count * 100)"
              :stroke-width="6"
              :show-text="false"
              style="margin:8px 0"
            />
            <div class="status-row">
              <span v-if="item.status === 'good'" class="text-success"><el-icon><CircleCheck /></el-icon>状态良好</span>
              <span v-else-if="item.status === 'maintenance'" class="text-warning"><el-icon><Warning /></el-icon>维护中</span>
              <span v-else class="text-danger"><el-icon><CircleClose /></el-icon>已损坏</span>
            </div>
            <div style="margin-top:14px">
              <el-button
                type="primary"
                size="default"
                style="width:100%"
                :disabled="item.available_count <= 0 || item.status !== 'good'"
                @click="openLoanDialog(item)"
              >
                <el-icon><Tickets /></el-icon>借用
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="list.length === 0 && !loading" description="暂无装备" class="mt-20" />

    <div v-if="total > 0" class="mt-20 flex-center">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[12, 24, 48]"
        layout="total, prev, pager, next"
        @current-change="loadData"
        @size-change="() => { page = 1; loadData() }"
      />
    </div>

    <el-dialog v-model="showLoanDialog" :title="`借用 - ${currentEquipment?.name}`" width="520px">
      <el-form :model="loanForm" :rules="loanRules" ref="loanFormRef" label-width="110px">
        <el-form-item label="装备名称">
          <span>{{ currentEquipment?.name }}（可用: {{ currentEquipment?.available_count }}）</span>
        </el-form-item>
        <el-form-item label="关联活动">
          <el-select
            v-model="loanForm.activityId"
            filterable
            clearable
            placeholder="选择已报名的活动（选填）"
            style="width:100%"
          >
            <el-option
              v-for="a in registeredActivities"
              :key="a.id"
              :label="a.title"
              :value="a.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="借用数量" prop="quantity">
          <el-input-number
            v-model="loanForm.quantity"
            :min="1"
            :max="currentEquipment?.available_count || 1"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="预计归还" prop="dueDate">
          <el-date-picker
            v-model="loanForm.dueDate"
            type="date"
            style="width:100%"
            :disabled-date="disabledDate"
            value-format="YYYY-MM-DD HH:mm:ss"
            :placeholder="'选择归还日期（选填）'"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="loanForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLoanDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitLoan">确认借用</el-button>
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
const pageSize = ref(12)
const categoryFilter = ref('')
const keyword = ref('')
const loading = ref(false)

const showLoanDialog = ref(false)
const loanFormRef = ref()
const currentEquipment = ref(null)
const registeredActivities = ref([])
const submitting = ref(false)

const defaultLoanForm = () => ({
  activityId: null,
  quantity: 1,
  dueDate: '',
  remark: ''
})
const loanForm = reactive(defaultLoanForm())
const loanRules = {
  quantity: [{ required: true, message: '请输入借用数量', trigger: 'blur' }]
}

const categories = ['防护装备', '照明设备', '维修工具', '医疗用品', '通信设备', '其他']

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/api/equipment', {
      params: {
        page: page.value, pageSize: pageSize.value,
        category: categoryFilter.value || undefined,
        keyword: keyword.value || undefined
      }
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function catIcon(c) {
  return { '防护装备': '🪖', '照明设备': '🔦', '维修工具': '🔧', '医疗用品': '💊', '通信设备': '📻' }[c] || '🎒'
}
function catClass(c) {
  return 'cat-' + ({ '防护装备': 'green', '照明设备': 'yellow', '维修工具': 'blue', '医疗用品': 'red' }[c] || 'gray')
}

function disabledDate(time) {
  return time.getTime() < Date.now() - 8.64e7
}

async function openLoanDialog(item) {
  currentEquipment.value = item
  Object.assign(loanForm, defaultLoanForm())
  try {
    const res = await request.get('/api/activities/my/registered')
    registeredActivities.value = res.data.list || []
  } catch (e) {
    registeredActivities.value = []
  }
  showLoanDialog.value = true
}

async function submitLoan() {
  await loanFormRef.value.validate()
  if (!currentEquipment.value) return
  submitting.value = true
  try {
    await request.post('/api/equipment/loans/self', {
      equipmentId: currentEquipment.value.id,
      activityId: loanForm.activityId || undefined,
      quantity: loanForm.quantity,
      dueDate: loanForm.dueDate || undefined,
      remark: loanForm.remark || undefined
    })
    ElMessage.success('借用成功')
    showLoanDialog.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.equip-card { margin-bottom: 16px; }
.equip-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 14px;
  background: #f3f4f6;
}
.cat-green { background: #dcfce7; }
.cat-yellow { background: #fef9c3; }
.cat-blue { background: #dbeafe; }
.cat-red { background: #fee2e2; }
.equip-info { text-align: center; }
.equip-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 10px 0;
}
.equip-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.stock-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
}
.status-row {
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
</style>
