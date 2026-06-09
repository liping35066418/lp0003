<template>
  <div class="page-container" v-loading="loading">
    <div class="detail-header card mb-20">
      <button class="back-btn" @click="$router.back()"><el-icon><ArrowLeft /></el-icon>返回</button>
      <div class="header-content" v-if="activity">
        <div class="activity-cover">
          <img v-if="activity.cover_image" :src="activity.cover_image" />
          <div v-else class="default-cover"><span>🚵‍♂️</span></div>
        </div>
        <div class="activity-meta">
          <div class="title-row">
            <h1 class="activity-title">{{ activity.title }}</h1>
            <el-tag :type="statusType" size="large" effect="light">{{ statusText }}</el-tag>
            <el-tag v-if="activity.fee > 0" type="warning" size="large">收费 ¥{{ activity.fee }}</el-tag>
            <el-tag v-else type="success" size="large">免费</el-tag>
          </div>
          <div class="info-grid">
            <div class="info-block">
              <span class="label">路线</span>
              <span class="value"><el-icon><Location /></el-icon>{{ activity.route }}</span>
            </div>
            <div class="info-block">
              <span class="label">出发时间</span>
              <span class="value"><el-icon><Clock /></el-icon>{{ formatDate(activity.start_date) }}</span>
            </div>
            <div class="info-block">
              <span class="label">难度</span>
              <el-tag :type="diffType" effect="light">{{ diffText }}</el-tag>
            </div>
            <div class="info-block">
              <span class="label">时长</span>
              <span class="value">{{ activity.duration }}</span>
            </div>
            <div class="info-block">
              <span class="label">里程</span>
              <span class="value">{{ activity.distance }} km</span>
            </div>
            <div class="info-block">
              <span class="label">集合地点</span>
              <span class="value">{{ activity.meeting_place || '待定' }}</span>
            </div>
          </div>
          <div class="register-section">
            <div class="register-info">
              <el-progress :percentage="occupancy" :status="activity.is_full ? 'exception' : 'success'" :stroke-width="10" style="width: 300px" />
              <div class="register-text">
                已报名 <strong>{{ activity.registered_count }}</strong> / {{ activity.max_participants }} 人
                <el-tag v-if="activity.is_full" type="danger" size="small" effect="dark" style="margin-left:8px">名额已满</el-tag>
              </div>
            </div>
            <div class="register-actions">
              <template v-if="checkStatus.registered">
                <el-button type="danger" :loading="registering" @click="cancelRegister">取消报名</el-button>
                <el-tag type="success" effect="dark">已报名</el-tag>
              </template>
              <template v-else>
                <el-button type="primary" size="large" :loading="registering" :disabled="activity.is_full || !canRegister" @click="handleRegister">
                  <el-icon><Check /></el-icon>立即报名
                </el-button>
              </template>
              <el-button v-if="isAdmin" @click="showParticipants = true">
                <el-icon><User /></el-icon>查看名单
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activity" class="detail-grid">
      <div class="main-col">
        <div class="card mb-20">
          <h3 class="section-title"><el-icon><Document /></el-icon>活动介绍</h3>
          <div class="description-content">{{ activity.description || '暂无活动介绍' }}</div>
          <div v-if="activity.fee_description" class="fee-desc">
            <el-icon><Money /></el-icon>费用说明：{{ activity.fee_description }}
          </div>
        </div>

        <div class="card mb-20">
          <div class="flex-between mb-20">
            <h3 class="section-title" style="margin:0"><el-icon><ChatDotRound /></el-icon>活动动态</h3>
            <el-button v-if="isAdmin" type="primary" size="small" @click="showUpdateDialog = true">
              <el-icon><Plus /></el-icon>发布动态
            </el-button>
          </div>
          <div v-if="updates.length === 0" class="text-muted" style="padding:20px;text-align:center">暂无动态</div>
          <div v-else class="timeline">
            <div v-for="upd in updates" :key="upd.id" class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="updater">{{ upd.creator_name || '管理员' }}</span>
                  <span class="time">{{ formatDate(upd.created_at) }}</span>
                </div>
                <div class="timeline-body">{{ upd.content }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-20">
          <div class="flex-between mb-20">
            <h3 class="section-title" style="margin:0"><el-icon><Picture /></el-icon>活动相册</h3>
            <el-button v-if="isAdmin" type="primary" size="small" @click="showPhotoDialog = true">
              <el-icon><Plus /></el-icon>上传照片
            </el-button>
          </div>
          <el-empty v-if="photos.length === 0" description="暂无照片" />
          <div v-else class="photo-grid">
            <div v-for="p in photos" :key="p.id" class="photo-item">
              <img :src="p.image_url" :alt="p.title" @click="previewPhoto(p.image_url)" />
              <div class="photo-meta">
                <span v-if="p.title">{{ p.title }}</span>
                <span class="text-muted">{{ formatDate(p.created_at) }}</span>
              </div>
              <el-button v-if="isAdmin" class="del-btn" type="danger" size="small" circle @click.stop="deletePhoto(p)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="side-col">
        <div class="card mb-20">
          <h3 class="section-title"><el-icon><User /></el-icon>发起者</h3>
          <div class="creator-info">
            <el-avatar :size="50" style="background:#3b82f6">{{ activity.creator_name?.charAt(0) || 'A' }}</el-avatar>
            <div>
              <div class="creator-name">{{ activity.creator_name || '俱乐部' }}</div>
              <div class="text-muted" style="font-size:12px">发布于 {{ formatDate(activity.created_at) }}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="section-title"><el-icon><Avatar /></el-icon>报名成员 ({{ registrations.length }})</h3>
          <div v-if="registrations.length === 0" class="text-muted" style="padding:16px;text-align:center;font-size:13px">
            暂无成员报名
          </div>
          <div v-else class="registrant-list">
            <div v-for="r in registrations" :key="r.id" class="registrant-item">
              <el-avatar :size="36" style="background:#10b981">{{ r.name?.charAt(0) }}</el-avatar>
              <div class="registrant-info" style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <span class="name">{{ r.name }}</span>
                  <el-tag
                    v-if="r.loans && r.loans.length > 0"
                    type="warning"
                    size="small"
                    effect="light"
                  >
                    🎒 已借装备 ×{{ r.loans.reduce((s, l) => s + l.quantity, 0) }}
                  </el-tag>
                </div>
                <div class="text-muted" style="font-size:12px">{{ formatDate(r.registered_at) }}</div>
                <div v-if="r.loans && r.loans.length > 0" class="loan-tags">
                  <el-tag
                    v-for="l in r.loans"
                    :key="l.equipment_id"
                    size="small"
                    :type="l.status === 'overdue' ? 'danger' : 'info'"
                    style="margin-top:4px"
                  >
                    {{ l.equipment_name }} ×{{ l.quantity }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showUpdateDialog" title="发布活动动态" width="500px">
      <el-input v-model="updateContent" type="textarea" :rows="5" placeholder="请输入动态内容..." />
      <template #footer>
        <el-button @click="showUpdateDialog = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="publishUpdate">发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPhotoDialog" title="上传照片" width="500px">
      <el-upload
        class="photo-uploader"
        action="/api/upload/image?dir=photos"
        :headers="uploadHeaders"
        :show-file-list="false"
        :on-success="handlePhotoUploaded"
        accept="image/*"
      >
        <div class="upload-area">
          <el-icon :size="40" color="#909399"><Plus /></el-icon>
          <div class="text-muted">点击上传照片</div>
        </div>
      </el-upload>
      <el-form class="mt-20" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="photoForm.title" placeholder="照片标题（选填）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="photoForm.description" type="textarea" :rows="3" placeholder="照片描述（选填）" />
        </el-form-item>
      </el-form>
    </el-dialog>

    <el-dialog v-model="showParticipants" title="参与名单与联系方式" width="900px">
      <el-table :data="registrations" border stripe>
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="emergency_contact" label="紧急联系人" width="120" />
        <el-table-column prop="emergency_phone" label="紧急联系电话" width="140" />
        <el-table-column label="借用装备" min-width="180">
          <template #default="{ row }">
            <div v-if="row.loans && row.loans.length > 0" style="display:flex;gap:4px;flex-wrap:wrap">
              <el-tag
                v-for="l in row.loans"
                :key="l.equipment_id"
                size="small"
                :type="l.status === 'overdue' ? 'danger' : 'warning'"
              >
                {{ l.equipment_name }} ×{{ l.quantity }}
              </el-tag>
            </div>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="registered_at" label="报名时间">
          <template #default="{ row }">{{ formatDate(row.registered_at) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-image-viewer
      v-if="showViewer"
      :url-list="[previewUrl]"
      @close="showViewer = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../stores/user'
import request from '../../utils/request'
import dayjs from 'dayjs'

const route = useRoute()
const userStore = useUserStore()

const activity = ref(null)
const registrations = ref([])
const updates = ref([])
const photos = ref([])
const checkStatus = ref({ registered: false })
const loading = ref(false)
const registering = ref(false)
const isAdmin = computed(() => userStore.isAdmin)

const showUpdateDialog = ref(false)
const updateContent = ref('')
const publishing = ref(false)

const showPhotoDialog = ref(false)
const photoForm = ref({ title: '', description: '', imageUrl: '' })
const showViewer = ref(false)
const previewUrl = ref('')

const showParticipants = ref(false)

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

const statusType = computed(() => ({
  upcoming: 'success', ongoing: 'warning', completed: 'info', cancelled: 'danger'
}[activity.value?.status] || 'info'))

const statusText = computed(() => ({
  upcoming: '即将开始', ongoing: '进行中', completed: '已结束', cancelled: '已取消'
}[activity.value?.status] || '未知'))

const canRegister = computed(() => activity.value?.status === 'upcoming')

const diffText = computed(() => ({
  easy: '休闲', medium: '中等', hard: '挑战', extreme: '极限'
}[activity.value?.difficulty] || '未知'))

const diffType = computed(() => ({
  easy: 'success', medium: 'warning', hard: 'danger', extreme: ''
}[activity.value?.difficulty] || 'info'))

const occupancy = computed(() => {
  if (!activity.value?.max_participants) return 0
  return Math.min(100, Math.round((activity.value.registered_count / activity.value.max_participants) * 100))
})

function formatDate(d) {
  return dayjs(d).format('YYYY-MM-DD HH:mm')
}

async function loadDetail() {
  loading.value = true
  try {
    const res = await request.get(`/api/activities/${route.params.id}`)
    activity.value = res.data.activity
    registrations.value = res.data.registrations || []
    photos.value = res.data.photos || []
    updates.value = res.data.updates || []
    await loadRegisterStatus()
    if (isAdmin.value) {
      const partRes = await request.get(`/api/activities/${route.params.id}/participants`)
      registrations.value = partRes.data.list
    }
  } finally {
    loading.value = false
  }
}

async function loadRegisterStatus() {
  const res = await request.get(`/api/registrations/activity/${route.params.id}/check`)
  checkStatus.value = res.data
}

async function handleRegister() {
  try {
    await ElMessageBox.prompt('有什么想备注的吗？（选填）', '确认报名', {
      confirmButtonText: '确定报名',
      cancelButtonText: '取消',
      inputPlaceholder: '备注信息（可不填）',
      type: 'info'
    }).then(async ({ value: remark }) => {
      registering.value = true
      await request.post(`/api/registrations/${route.params.id}`, { remark })
      ElMessage.success('报名成功！')
      await loadDetail()
    }).catch(() => {})
  } finally {
    registering.value = false
  }
}

async function cancelRegister() {
  try {
    await ElMessageBox.confirm('确定要取消报名吗？', '提示', { type: 'warning' })
    registering.value = true
    await request.delete(`/api/registrations/${route.params.id}`)
    ElMessage.success('已取消报名')
    await loadDetail()
  } catch(e) {
    if (e !== 'cancel') {
      throw e
    }
  } finally {
    registering.value = false
  }
}

async function publishUpdate() {
  if (!updateContent.value.trim()) {
    ElMessage.warning('请输入动态内容')
    return
  }
  publishing.value = true
  try {
    await request.post(`/api/activities/${route.params.id}/updates`, { content: updateContent.value })
    ElMessage.success('动态已发布')
    showUpdateDialog.value = false
    updateContent.value = ''
    await loadDetail()
  } finally {
    publishing.value = false
  }
}

function handlePhotoUploaded(res) {
  if (res.code === 200) {
    photoForm.value.imageUrl = res.data.url
    savePhoto()
  }
}

async function savePhoto() {
  if (!photoForm.value.imageUrl) {
    ElMessage.warning('请先上传图片')
    return
  }
  try {
    await request.post('/api/photos', {
      activityId: route.params.id,
      title: photoForm.value.title,
      description: photoForm.value.description,
      imageUrl: photoForm.value.imageUrl
    })
    ElMessage.success('照片已添加')
    showPhotoDialog.value = false
    photoForm.value = { title: '', description: '', imageUrl: '' }
    await loadDetail()
  } catch(e) {}
}

async function deletePhoto(p) {
  try {
    await ElMessageBox.confirm('确定删除这张照片吗？', '提示', { type: 'warning' })
    await request.delete(`/api/photos/${p.id}`)
    ElMessage.success('已删除')
    photos.value = photos.value.filter(x => x.id !== p.id)
  } catch(e) {}
}

function previewPhoto(url) {
  previewUrl.value = url
  showViewer.value = true
}

watch(() => route.params.id, () => {
  if (route.params.id) loadDetail()
})

onMounted(loadDetail)
</script>

<style scoped>
.detail-header {
  padding: 20px;
}
.back-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  margin-bottom: 16px;
  padding: 0;
}
.back-btn:hover { color: #3b82f6; }
.header-content {
  display: flex;
  gap: 28px;
}
.activity-cover {
  width: 320px;
  height: 220px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}
.activity-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.default-cover {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
}
.activity-meta { flex: 1; }
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.activity-title {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 20px;
  margin-bottom: 24px;
}
.info-block .label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 4px;
}
.info-block .value {
  font-size: 14px;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
}
.register-section {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.register-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.register-text {
  font-size: 13px;
  color: #6b7280;
}
.register-text strong { color: #ef4444; font-size: 18px; }
.register-actions { display: flex; gap: 10px; align-items: center; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.description-content {
  color: #4b5563;
  line-height: 1.8;
  font-size: 14px;
  white-space: pre-wrap;
}
.fee-desc {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  color: #92400e;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.timeline { padding-left: 8px; }
.timeline-item {
  display: flex;
  gap: 14px;
  padding-bottom: 20px;
  position: relative;
}
.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 14px;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.timeline-content { flex: 1; }
.timeline-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.updater { font-weight: 500; color: #1f2937; font-size: 14px; }
.time { color: #9ca3af; font-size: 12px; }
.timeline-body {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
  padding: 10px 14px;
  background: #f9fafb;
  border-radius: 8px;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
.photo-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}
.photo-item img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}
.photo-meta {
  padding: 8px 10px;
  font-size: 12px;
  color: #6b7280;
  background: #f9fafb;
}
.del-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}
.creator-info {
  display: flex;
  gap: 14px;
  align-items: center;
}
.creator-name { font-weight: 600; color: #1f2937; }
.registrant-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.registrant-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background: #f9fafb;
  border-radius: 8px;
}
.registrant-info .name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}
.upload-area {
  width: 100%;
  height: 200px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.upload-area:hover { border-color: #409eff; }
.photo-uploader { width: 100%; }

@media (max-width: 900px) {
  .header-content { flex-direction: column; }
  .activity-cover { width: 100%; height: 200px; }
  .info-grid { grid-template-columns: 1fr 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .register-section { flex-direction: column; align-items: flex-start; }
}
</style>
