<template>
  <div class="page-container">
    <div class="card mb-20">
      <div class="search-bar">
        <el-select v-model="statusFilter" placeholder="活动状态" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="即将开始" value="upcoming" />
          <el-option label="进行中" value="ongoing" />
          <el-option label="已结束" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索活动标题或路线" clearable style="width: 280px" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col v-for="activity in list" :key="activity.id" :xs="24" :sm="12" :lg="8" :xl="6">
        <el-card class="activity-card" shadow="hover" @click="goDetail(activity.id)">
          <div class="card-cover">
            <img v-if="activity.cover_image" :src="activity.cover_image" :alt="activity.title" />
            <div v-else class="default-cover">
              <span class="cover-icon">🚵</span>
            </div>
            <el-tag v-if="activity.status === 'upcoming'" type="success" class="status-tag">报名中</el-tag>
            <el-tag v-else-if="activity.status === 'ongoing'" type="warning" class="status-tag">进行中</el-tag>
            <el-tag v-else-if="activity.status === 'completed'" type="info" class="status-tag">已结束</el-tag>
            <el-tag v-else type="danger" class="status-tag">已取消</el-tag>
            <el-tag v-if="activity.fee > 0" type="warning" effect="light" class="fee-tag">¥{{ activity.fee }}</el-tag>
          </div>
          <div class="card-body">
            <h3 class="card-title">{{ activity.title }}</h3>
            <div class="card-info">
              <div class="info-item"><el-icon><Location /></el-icon>{{ activity.route }}</div>
              <div class="info-item"><el-icon><Clock /></el-icon>{{ formatDate(activity.start_date) }}</div>
              <div class="info-row">
                <el-tag :type="diffType(activity.difficulty)" size="small" effect="light">{{ diffText(activity.difficulty) }}</el-tag>
                <span class="duration-text">{{ activity.duration }}</span>
              </div>
            </div>
            <div class="card-footer">
              <div class="progress-area">
                <el-progress :percentage="occupancy(activity)" :status="activity.is_full ? 'exception' : 'success'" :show-text="false" :stroke-width="6" />
                <span class="register-count">
                  <span v-if="activity.is_full" class="text-danger">名额已满</span>
                  <span v-else>{{ activity.registered_count }}/{{ activity.max_participants }}人</span>
                </span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="list.length === 0 && !loading" description="暂无活动" class="mt-20" />

    <div v-if="total > 0" class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[8, 12, 24]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadData"
        @size-change="handleSizeChange"
      />
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
const pageSize = ref(8)
const statusFilter = ref('')
const keyword = ref('')
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/api/activities', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
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

function resetFilter() {
  statusFilter.value = ''
  keyword.value = ''
  page.value = 1
  loadData()
}

function handleSizeChange() {
  page.value = 1
  loadData()
}

function goDetail(id) {
  router.push(`/activities/${id}`)
}

function formatDate(d) {
  return dayjs(d).format('YYYY-MM-DD HH:mm')
}

function occupancy(item) {
  if (!item.max_participants) return 0
  return Math.min(100, Math.round((item.registered_count / item.max_participants) * 100))
}

function diffType(d) {
  return { easy: 'success', medium: 'warning', hard: 'danger', extreme: '' }[d] || 'info'
}
function diffText(d) {
  return { easy: '休闲', medium: '中等', hard: '挑战', extreme: '极限' }[d] || '未知'
}

onMounted(loadData)
</script>

<style scoped>
.activity-card {
  margin-bottom: 20px;
  cursor: pointer;
  overflow: hidden;
}
:deep(.el-card__body) {
  padding: 0;
}
.card-cover {
  position: relative;
  height: 180px;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  overflow: hidden;
}
.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.default-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-icon {
  font-size: 72px;
  opacity: 0.8;
}
.status-tag {
  position: absolute;
  top: 12px;
  left: 12px;
}
.fee-tag {
  position: absolute;
  top: 12px;
  right: 12px;
}
.card-body {
  padding: 16px;
}
.card-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.duration-text {
  font-size: 13px;
  color: #6b7280;
}
.card-footer {
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
}
.progress-area {
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-area .el-progress {
  flex: 1;
}
.register-count {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}
</style>
