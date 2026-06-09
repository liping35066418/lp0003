<template>
  <div class="page-container">
    <div class="card mb-20">
      <div class="flex-between">
        <h2 class="page-title">我的活动报名</h2>
        <el-radio-group v-model="statusFilter" size="default" @change="loadData">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="upcoming">即将开始</el-radio-button>
          <el-radio-button value="ongoing">进行中</el-radio-button>
          <el-radio-button value="completed">已结束</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="card" v-loading="loading">
      <el-empty v-if="list.length === 0 && !loading" description="还没有报名任何活动" />
      <el-table v-else :data="list" border stripe>
        <el-table-column label="活动" min-width="240">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:12px;cursor:pointer" @click="goDetail(row.activity_id)">
              <div class="thumb">
                <img v-if="row.cover_image" :src="row.cover_image" />
                <span v-else>🚵</span>
              </div>
              <div>
                <div class="act-title">{{ row.title }}</div>
                <div class="text-muted" style="font-size:12px">{{ row.route }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="出发时间" width="160">
          <template #default="{ row }">{{ formatDate(row.start_date) }}</template>
        </el-table-column>
        <el-table-column label="难度" width="80">
          <template #default="{ row }">
            <el-tag :type="diffType(row.difficulty)" size="small">{{ diffText(row.difficulty) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="费用" width="100">
          <template #default="{ row }">
            <span v-if="row.fee > 0" class="text-warning">¥{{ row.fee }}</span>
            <span v-else class="text-success">免费</span>
          </template>
        </el-table-column>
        <el-table-column label="报名进度" width="160">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <el-progress :percentage="Math.round(row.registered_count/row.max_participants*100)" :stroke-width="6" style="flex:1" :show-text="false" />
              <span style="font-size:12px;color:#6b7280">{{ row.registered_count }}/{{ row.max_participants }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="活动状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.activity_status)">{{ statusText(row.activity_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'registered'" type="success">已报名</el-tag>
            <el-tag v-else type="danger">已取消</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名时间" width="160">
          <template #default="{ row }">{{ formatDate(row.registered_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.activity_id)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > 0" class="mt-20 flex-center">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../../utils/request'
import dayjs from 'dayjs'

const router = useRouter()
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const statusFilter = ref('')
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/api/registrations/mine', {
      params: { page: page.value, pageSize: pageSize.value, status: statusFilter.value || undefined }
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function goDetail(id) {
  router.push(`/activities/${id}`)
}

function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }
function diffType(d) { return { easy: 'success', medium: 'warning', hard: 'danger' }[d] || 'info' }
function diffText(d) { return { easy: '休闲', medium: '中等', hard: '挑战', extreme: '极限' }[d] || '未知' }
function statusType(s) { return { upcoming: 'success', ongoing: 'warning', completed: 'info', cancelled: 'danger' }[s] || 'info' }
function statusText(s) { return { upcoming: '即将开始', ongoing: '进行中', completed: '已结束', cancelled: '已取消' }[s] || '未知' }

onMounted(loadData)
</script>

<style scoped>
.thumb {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  overflow: hidden;
  flex-shrink: 0;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.act-title {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
}
.act-title:hover { color: #3b82f6; }
</style>
