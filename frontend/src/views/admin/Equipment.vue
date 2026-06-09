<template>
  <div class="page-container">
    <div class="card mb-20">
      <div class="search-bar">
        <el-select v-model="categoryFilter" placeholder="分类" clearable style="width:140px">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width:120px">
          <el-option label="良好" value="good" />
          <el-option label="维护中" value="maintenance" />
          <el-option label="损坏" value="damaged" />
        </el-select>
        <el-input v-model="keyword" placeholder="名称/品牌" clearable style="width:220px" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
        <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>添加装备</el-button>
      </div>
    </div>

    <div class="card" v-loading="loading">
      <el-table :data="list" border stripe>
        <el-table-column label="名称" min-width="160">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="eq-icon" :class="'cat-' + catClass(row.category)">{{ catIcon(row.category) }}</div>
              <div>
                <div style="font-weight:500">{{ row.name }}</div>
                <div class="text-muted" style="font-size:12px">{{ row.brand }} {{ row.model }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="serial_number" label="序列号" width="140">
          <template #default="{ row }">
            <span v-if="row.serial_number">{{ row.serial_number }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="140">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <el-progress
                :percentage="Math.round((row.total_count - row.available_count) / row.total_count * 100)"
                :stroke-width="6" style="flex:1" :show-text="false"
              />
              <span :class="row.available_count > 0 ? 'text-success' : 'text-danger'" style="font-weight:600">
                {{ row.available_count }}/{{ row.total_count }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small" @change="updateStatus(row)">
              <el-option label="良好" value="good" />
              <el-option label="维护中" value="maintenance" />
              <el-option label="损坏" value="damaged" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="purchase_date" label="购入日期" width="110">
          <template #default="{ row }">
            <span v-if="row.purchase_date">{{ row.purchase_date }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="备注" show-overflow-tooltip />
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

    <el-dialog v-model="showDialog" :title="form.id ? '编辑装备' : '添加装备'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="装备名称" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select v-model="form.category" style="width:100%">
                <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌">
              <el-input v-model="form.brand" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号">
              <el-input v-model="form.model" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="序列号">
              <el-input v-model="form.serialNumber" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总数" prop="totalCount">
              <el-input-number v-model="form.totalCount" :min="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width:100%">
                <el-option label="良好" value="good" />
                <el-option label="维护中" value="maintenance" />
                <el-option label="损坏" value="damaged" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="购入日期">
              <el-date-picker v-model="form.purchaseDate" type="date" style="width:100%" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注说明">
              <el-input v-model="form.description" type="textarea" :rows="3" />
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

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const categoryFilter = ref('')
const statusFilter = ref('')
const keyword = ref('')
const loading = ref(false)
const saving = ref(false)

const showDialog = ref(false)
const formRef = ref()

const categories = ['防护装备', '照明设备', '维修工具', '医疗用品', '通信设备', '其他']

const defaultForm = () => ({
  id: null, name: '', category: '防护装备', brand: '', model: '',
  serialNumber: '', totalCount: 1, status: 'good', description: '', purchaseDate: ''
})
const form = reactive(defaultForm())
const rules = {
  name: [{ required: true, message: '请输入装备名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  totalCount: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

function catIcon(c) {
  return { '防护装备': '🪖', '照明设备': '🔦', '维修工具': '🔧', '医疗用品': '💊', '通信设备': '📻' }[c] || '🎒'
}
function catClass(c) {
  return { '防护装备': 'green', '照明设备': 'yellow', '维修工具': 'blue', '医疗用品': 'red' }[c] || 'gray'
}

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/api/equipment', {
      params: {
        page: page.value, pageSize: pageSize.value,
        category: categoryFilter.value || undefined,
        status: statusFilter.value || undefined,
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
      id: row.id, name: row.name, category: row.category, brand: row.brand || '',
      model: row.model || '', serialNumber: row.serial_number || '',
      totalCount: row.total_count, status: row.status,
      description: row.description || '', purchaseDate: row.purchase_date || ''
    })
  }
  showDialog.value = true
}

async function saveItem() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      name: form.name, category: form.category, brand: form.brand, model: form.model,
      serialNumber: form.serialNumber, totalCount: form.totalCount, status: form.status,
      description: form.description, purchaseDate: form.purchaseDate
    }
    if (form.id) {
      await request.put(`/api/equipment/${form.id}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/api/equipment', payload)
      ElMessage.success('添加成功')
    }
    showDialog.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

async function updateStatus(row) {
  try {
    await request.put(`/api/equipment/${row.id}`, {
      name: row.name, category: row.category, brand: row.brand, model: row.model,
      serialNumber: row.serial_number, totalCount: row.total_count,
      status: row.status, description: row.description
    })
    ElMessage.success('状态已更新')
  } catch(e) { loadData() }
}

async function deleteItem(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '危险操作', { type: 'danger' })
    await request.delete(`/api/equipment/${row.id}`)
    ElMessage.success('已删除')
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.cat-green { background: #dcfce7; }
.cat-yellow { background: #fef9c3; }
.cat-blue { background: #dbeafe; }
.cat-red { background: #fee2e2; }
.cat-gray { background: #f3f4f6; }
</style>
