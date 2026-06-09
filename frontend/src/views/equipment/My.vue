<template>
  <div class="page-container">
    <div class="card" v-loading="loading">
      <h2 class="page-title" style="margin:0 0 20px 0">我的装备借用记录</h2>
      <el-empty v-if="list.length === 0 && !loading" description="暂无借用记录" />
      <el-table v-else :data="list" border stripe>
        <el-table-column label="装备信息" min-width="200">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="equip-icon">{{ catIcon(row.category) }}</div>
              <div>
                <div style="font-weight:500;color:#1f2937">{{ row.equipment_name }}</div>
                <div class="text-muted" style="font-size:12px">{{ row.category }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="关联活动" min-width="180">
          <template #default="{ row }">
            <span v-if="row.activity_title">{{ row.activity_title }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="借用时间" width="160">
          <template #default="{ row }">{{ formatDate(row.loan_date) }}</template>
        </el-table-column>
        <el-table-column label="预计归还" width="160">
          <template #default="{ row }">
            <span v-if="row.due_date" :class="isOverdue(row) ? 'text-danger' : ''">{{ formatDate(row.due_date) }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="实际归还" width="160">
          <template #default="{ row }">
            <span v-if="row.return_date">{{ formatDate(row.return_date) }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'returned'" type="success">已归还</el-tag>
            <el-tag v-else-if="isOverdue(row)" type="danger">逾期</el-tag>
            <el-tag v-else type="warning">借用中</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140">
          <template #default="{ row }">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'returned'"
              type="success" link size="small"
              @click="returnItem(row)"
            >归还</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../utils/request'
import dayjs from 'dayjs'

const list = ref([])
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/api/equipment/loans/mine')
    list.value = res.data.list
  } finally {
    loading.value = false
  }
}

function catIcon(c) {
  return { '防护装备': '🪖', '照明设备': '🔦', '维修工具': '🔧', '医疗用品': '💊', '通信设备': '📻' }[c] || '🎒'
}

function formatDate(d) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '' }

function isOverdue(row) {
  if (row.status === 'overdue') return true
  if (row.status !== 'borrowed' || !row.due_date) return false
  return dayjs().isAfter(dayjs(row.due_date))
}

async function returnItem(row) {
  try {
    await ElMessageBox.confirm(
      `确定归还「${row.equipment_name}」（数量: ${row.quantity}）吗？`,
      '确认归还',
      { type: 'info', confirmButtonText: '确定归还', cancelButtonText: '取消' }
    )
    await request.post(`/api/equipment/loans/${row.id}/return-self`)
    ElMessage.success('归还成功')
    loadData()
  } catch(e) {}
}

onMounted(loadData)
</script>

<style scoped>
.equip-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
</style>
