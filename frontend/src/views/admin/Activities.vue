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
        <el-input v-model="keyword" placeholder="搜索标题/路线" clearable style="width: 260px" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
        <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>发布新活动</el-button>
      </div>
    </div>

    <div class="card" v-loading="loading">
      <el-table :data="list" border stripe>
        <el-table-column label="封面" width="90">
          <template #default="{ row }">
            <div class="thumb">
              <img v-if="row.cover_image" :src="row.cover_image" />
              <span v-else>🚵</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="活动标题" min-width="180">
          <template #default="{ row }">
            <span style="cursor:pointer;color:#3b82f6" @click="goDetail(row.id)">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="route" label="路线" min-width="160" show-overflow-tooltip />
        <el-table-column label="难度" width="80">
          <template #default="{ row }">
            <el-tag :type="diffType(row.difficulty)" size="small">{{ diffText(row.difficulty) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.start_date) }}</template>
        </el-table-column>
        <el-table-column label="报名" width="120">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:6px">
              <el-progress :percentage="Math.round(row.registered_count/row.max_participants*100)" :stroke-width="6" style="flex:1" :show-text="false" />
              <span style="font-size:12px">{{ row.registered_count }}/{{ row.max_participants }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="费用" width="90">
          <template #default="{ row }">
            <span v-if="row.fee > 0" class="text-warning">¥{{ row.fee }}</span>
            <span v-else class="text-success">免费</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small" @change="updateStatus(row)">
              <el-option label="即将开始" value="upcoming" />
              <el-option label="进行中" value="ongoing" />
              <el-option label="已结束" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goDetail(row.id)">详情</el-button>
            <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="primary" link size="small" @click="exportParticipants(row)">名单</el-button>
            <el-button type="danger" link size="small" @click="deleteActivity(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-20 flex-center">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next, jumper"
          @current-change="loadData"
        />
      </div>
    </div>

    <el-dialog v-model="showDialog" :title="form.id ? '编辑活动' : '发布新活动'" width="720px" top="5vh">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="活动标题" prop="title">
              <el-input v-model="form.title" placeholder="例如：周末环西湖休闲骑行" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="路线" prop="route">
              <el-input v-model="form.route" placeholder="如：黄龙体育中心-龙井-梅家坞" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="难度" prop="difficulty">
              <el-select v-model="form.difficulty">
                <el-option label="休闲" value="easy" />
                <el-option label="中等" value="medium" />
                <el-option label="挑战" value="hard" />
                <el-option label="极限" value="extreme" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="时长" prop="duration">
              <el-input v-model="form.duration" placeholder="如：约4小时" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="开始时间" prop="startDate">
              <el-date-picker v-model="form.startDate" type="datetime" placeholder="选择日期时间" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结束时间">
              <el-date-picker v-model="form.endDate" type="datetime" placeholder="选填" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="里程(km)">
              <el-input-number v-model="form.distance" :min="0" :step="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="集合地点" prop="meetingPlace">
              <el-input v-model="form.meetingPlace" placeholder="具体集合点" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="人数上限" prop="maxParticipants">
              <el-input-number v-model="form.maxParticipants" :min="1" :max="500" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="费用(元)">
              <el-input-number v-model="form.fee" :min="0" :step="10" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="费用说明" v-if="form.fee > 0">
              <el-input v-model="form.feeDescription" placeholder="费用包含/不包含项说明" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="封面图">
              <el-upload
                action="/api/upload/image?dir=covers"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleCoverUpload"
                accept="image/*"
              >
                <div class="cover-upload">
                  <img v-if="form.coverImage" :src="form.coverImage" />
                  <div v-else class="upload-tip">
                    <el-icon :size="28"><Plus /></el-icon>
                    <div>点击上传封面</div>
                  </div>
                </div>
              </el-upload>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="活动介绍" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="5" placeholder="详细介绍活动内容、注意事项等" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="活动状态">
              <el-radio-group v-model="form.status">
                <el-radio-button value="upcoming">即将开始</el-radio-button>
                <el-radio-button value="ongoing">进行中</el-radio-button>
                <el-radio-button value="completed">已结束</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveActivity">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../stores/user'
import request from '../../utils/request'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

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

const defaultForm = () => ({
  id: null, title: '', description: '', route: '',
  difficulty: 'easy', duration: '', distance: 0,
  startDate: dayjs().add(3, 'day').hour(8).minute(0).format('YYYY-MM-DD HH:mm:ss'),
  endDate: '', meetingPlace: '',
  maxParticipants: 20, fee: 0, feeDescription: '',
  coverImage: '', status: 'upcoming'
})
const form = reactive(defaultForm())
const rules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  route: [{ required: true, message: '请输入路线', trigger: 'blur' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  duration: [{ required: true, message: '请输入时长', trigger: 'blur' }],
  startDate: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  meetingPlace: [{ required: true, message: '请输入集合地点', trigger: 'blur' }],
  maxParticipants: [{ required: true, message: '请输入人数上限', trigger: 'blur' }],
  description: [{ required: true, message: '请填写活动介绍', trigger: 'blur' }]
}

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }
function diffType(d) { return { easy: 'success', medium: 'warning', hard: 'danger', extreme: '' }[d] || 'info' }
function diffText(d) { return { easy: '休闲', medium: '中等', hard: '挑战', extreme: '极限' }[d] || '未知' }

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/api/activities', {
      params: {
        page: page.value, pageSize: pageSize.value,
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
      id: row.id,
      title: row.title, description: row.description || '', route: row.route,
      difficulty: row.difficulty, duration: row.duration || '', distance: row.distance || 0,
      startDate: row.start_date, endDate: row.end_date || '', meetingPlace: row.meeting_place || '',
      maxParticipants: row.max_participants, fee: row.fee || 0, feeDescription: row.fee_description || '',
      coverImage: row.cover_image || '', status: row.status
    })
  }
  showDialog.value = true
}

function handleCoverUpload(res) {
  if (res.code === 200) {
    form.coverImage = res.data.url
  }
}

async function saveActivity() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      title: form.title, description: form.description, route: form.route,
      difficulty: form.difficulty, duration: form.duration, distance: form.distance,
      startDate: form.startDate, endDate: form.endDate, meetingPlace: form.meetingPlace,
      maxParticipants: form.maxParticipants, fee: form.fee, feeDescription: form.feeDescription,
      coverImage: form.coverImage, status: form.status
    }
    if (form.id) {
      await request.put(`/api/activities/${form.id}`, payload)
      ElMessage.success('活动更新成功')
    } else {
      await request.post('/api/activities', payload)
      ElMessage.success('活动发布成功')
    }
    showDialog.value = false
    loadData()
  } finally {
    saving.value = false
  }
}

async function updateStatus(row) {
  try {
    await request.put(`/api/activities/${row.id}`, {
      title: row.title, route: row.route, difficulty: row.difficulty,
      duration: row.duration, distance: row.distance || 0,
      startDate: row.start_date, endDate: row.end_date, meetingPlace: row.meeting_place,
      maxParticipants: row.max_participants, fee: row.fee || 0,
      coverImage: row.cover_image, status: row.status,
      description: row.description, feeDescription: row.fee_description
    })
    ElMessage.success('状态已更新')
  } catch(e) {
    loadData()
  }
}

async function deleteActivity(row) {
  try {
    await ElMessageBox.confirm(`确定删除活动「${row.title}」吗？报名记录也会被清除`, '危险操作', {
      type: 'danger', confirmButtonText: '删除'
    })
    await request.delete(`/api/activities/${row.id}`)
    ElMessage.success('已删除')
    loadData()
  } catch(e) {}
}

async function exportParticipants(row) {
  try {
    const res = await request.get(`/api/activities/${row.id}/participants`)
    const list = res.data.list
    let csv = '序号,姓名,联系电话,邮箱,紧急联系人,紧急联系电话,报名时间\n'
    list.forEach((p, i) => {
      csv += `${i+1},${p.name},${p.phone || ''},${p.email || ''},${p.emergency_contact || ''},${p.emergency_phone || ''},${p.registered_at}\n`
    })
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${row.title}_参与名单.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出${list.length}条名单`)
  } catch(e) {}
}

function goDetail(id) {
  router.push(`/activities/${id}`)
}

onMounted(loadData)
</script>

<style scoped>
.thumb {
  width: 56px;
  height: 44px;
  border-radius: 4px;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  overflow: hidden;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.cover-upload {
  width: 100%;
  height: 160px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
  cursor: pointer;
  position: relative;
}
.cover-upload img { width: 100%; height: 100%; object-fit: cover; }
.upload-tip {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  font-size: 13px;
}
.cover-upload:hover { border-color: #409eff; }
</style>
