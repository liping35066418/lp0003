<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">数据统计概览</h2>
    </div>

    <el-row :gutter="20" class="mb-20">
      <el-col :xs="12" :sm="6">
        <div class="stat-card blue">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-label">注册成员</div>
            <div class="stat-value">{{ overview.userCount }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card green">
          <div class="stat-icon">🚴</div>
          <div class="stat-content">
            <div class="stat-label">活动总数</div>
            <div class="stat-value">{{ overview.activityCount }} <span class="small-text">({{ overview.upcomingActivities }}进行中)</span></div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card orange">
          <div class="stat-icon">📝</div>
          <div class="stat-content">
            <div class="stat-label">总报名人次</div>
            <div class="stat-value">{{ overview.registrationCount }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card purple">
          <div class="stat-icon">🎒</div>
          <div class="stat-content">
            <div class="stat-label">装备 / 借用中</div>
            <div class="stat-value">{{ overview.equipmentCount }} <span class="small-text">({{ overview.borrowedCount }})</span></div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :xs="24" :sm="8">
        <div class="stat-card income">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-label">活动报名费收入</div>
            <div class="stat-value">¥{{ formatMoney(overview.activityFeeIncome || 0) }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card success">
          <div class="stat-icon">💵</div>
          <div class="stat-content">
            <div class="stat-label">其他收入</div>
            <div class="stat-value">¥{{ formatMoney(overview.totalIncome - (overview.activityFeeIncome || 0)) }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card balance">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-label">结余 (收入 - 支出)</div>
            <div class="stat-value" :class="overview.balance >= 0 ? 'pos' : 'neg'">¥{{ formatMoney(overview.balance || 0) }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :xs="24" :md="12">
        <div class="card">
          <h3 class="section-title">月度活动与报名趋势</h3>
          <div ref="monthlyChart" style="height:300px"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="12">
        <div class="card">
          <h3 class="section-title">月度财务收支</h3>
          <div ref="financeChart" style="height:300px"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :xs="24" :md="8">
        <div class="card">
          <h3 class="section-title">活动难度分布</h3>
          <div ref="difficultyChart" style="height:280px"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="16">
        <div class="card">
          <h3 class="section-title">装备使用排行</h3>
          <el-table :data="equipmentUsage" size="small" border>
            <el-table-column prop="name" label="装备名称" />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column label="库存" width="100">
              <template #default="{ row }">{{ row.available_count }}/{{ row.total_count }}</template>
            </el-table-column>
            <el-table-column prop="loan_count" label="累计借出" width="100" sortable />
            <el-table-column prop="active_loans" label="当前借出" width="100" />
          </el-table>
        </div>
      </el-col>
    </el-row>

    <div class="card">
      <h3 class="section-title">活动营收明细</h3>
      <el-table :data="activities" border stripe size="small">
        <el-table-column prop="title" label="活动名称" min-width="180" />
        <el-table-column label="时间" width="110">
          <template #default="{ row }">{{ formatDate(row.start_date) }}</template>
        </el-table-column>
        <el-table-column label="难度" width="80">
          <template #default="{ row }">
            <el-tag :type="diffType(row.difficulty)" size="small">{{ diffText(row.difficulty) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名" width="110">
          <template #default="{ row }">
            {{ row.registered_count }}/{{ row.max_participants }}
          </template>
        </el-table-column>
        <el-table-column label="报名率" width="110">
          <template #default="{ row }">
            <el-progress :percentage="row.occupancy_rate" :stroke-width="6" />
          </template>
        </el-table-column>
        <el-table-column prop="fee" label="人均费" width="80">
          <template #default="{ row }">
            <span v-if="row.fee > 0">¥{{ row.fee }}</span>
            <span class="text-success">免费</span>
          </template>
        </el-table-column>
        <el-table-column label="报名费" width="100">
          <template #default="{ row }">¥{{ formatMoney(row.fee_income) }}</template>
        </el-table-column>
        <el-table-column label="其他收入" width="100">
          <template #default="{ row }">¥{{ formatMoney(row.ledger_income) }}</template>
        </el-table-column>
        <el-table-column label="支出" width="100">
          <template #default="{ row }">¥{{ formatMoney(row.ledger_expense) }}</template>
        </el-table-column>
        <el-table-column label="净利润" width="100">
          <template #default="{ row }">
            <span :style="{ color: row.profit >= 0 ? '#67c23a' : '#f56c6c', fontWeight: 600 }">
              ¥{{ formatMoney(row.profit) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="照片" width="70" prop="photo_count" align="center" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import request from '../../utils/request'
import dayjs from 'dayjs'

const overview = reactive({
  userCount: 0, activityCount: 0, upcomingActivities: 0, registrationCount: 0,
  equipmentCount: 0, borrowedCount: 0, totalIncome: 0, totalExpense: 0,
  balance: 0, activityFeeIncome: 0
})
const activities = ref([])
const equipmentUsage = ref([])
const monthlyChart = ref()
const financeChart = ref()
const difficultyChart = ref()

let monthlyInstance, financeInstance, difficultyInstance

function formatMoney(n) {
  return Number(n || 0).toFixed(2)
}
function formatDate(d) { return dayjs(d).format('MM-DD') }
function diffType(d) { return { easy: 'success', medium: 'warning', hard: 'danger' }[d] || 'info' }
function diffText(d) { return { easy: '休闲', medium: '中等', hard: '挑战', extreme: '极限' }[d] || '未知' }
function statusType(s) { return { upcoming: 'success', ongoing: 'warning', completed: 'info', cancelled: 'danger' }[s] || 'info' }
function statusText(s) { return { upcoming: '即将', ongoing: '进行', completed: '结束', cancelled: '取消' }[s] || '未知' }

async function loadData() {
  const [ov, act, diff, mon, fin, equ] = await Promise.all([
    request.get('/api/stats/overview'),
    request.get('/api/stats/activities'),
    request.get('/api/stats/difficulty-distribution'),
    request.get('/api/stats/monthly-activities'),
    request.get('/api/stats/monthly-finance'),
    request.get('/api/stats/equipment-usage')
  ])
  Object.assign(overview, ov.data)
  activities.value = act.data.list
  equipmentUsage.value = equ.data.list

  await nextTick()
  renderMonthly(mon.data.list)
  renderFinance(fin.data.list)
  renderDifficulty(diff.data.list)
}

function renderMonthly(data) {
  if (!monthlyChart.value) return
  monthlyInstance?.dispose()
  monthlyInstance = echarts.init(monthlyChart.value)
  monthlyInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['活动数', '报名人次'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: data.map(d => d.month) },
    yAxis: [{ type: 'value', name: '数量' }],
    series: [
      { name: '活动数', type: 'bar', data: data.map(d => d.activity_count), itemStyle: { color: '#3b82f6' } },
      { name: '报名人次', type: 'line', data: data.map(d => d.registration_count), itemStyle: { color: '#10b981' }, smooth: true }
    ]
  })
}

function renderFinance(data) {
  if (!financeChart.value) return
  financeInstance?.dispose()
  financeInstance = echarts.init(financeChart.value)
  financeInstance.setOption({
    tooltip: { trigger: 'axis', formatter: p => p.map(x => `${x.seriesName}: ¥${x.value.toFixed(2)}`).join('<br/>') },
    legend: { data: ['收入', '支出'], bottom: 0 },
    grid: { left: 50, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: data.map(d => d.month) },
    yAxis: { type: 'value', name: '金额' },
    series: [
      { name: '收入', type: 'bar', data: data.map(d => d.income), itemStyle: { color: '#10b981' }, stack: 'a' },
      { name: '支出', type: 'bar', data: data.map(d => -d.expense), itemStyle: { color: '#ef4444' } }
    ]
  })
}

function renderDifficulty(data) {
  if (!difficultyChart.value) return
  difficultyInstance?.dispose()
  difficultyInstance = echarts.init(difficultyChart.value)
  const labelMap = { easy: '休闲', medium: '中等', hard: '挑战', extreme: '极限' }
  const colorMap = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', extreme: '#7c3aed' }
  difficultyInstance.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}个 ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}: {c}' },
      data: data.map(d => ({
        value: d.count,
        name: labelMap[d.difficulty] || d.difficulty,
        itemStyle: { color: colorMap[d.difficulty] || '#6b7280' }
      }))
    }]
  })
}

onMounted(loadData)
</script>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  transition: transform 0.2s;
}
.stat-card:hover { transform: translateY(-2px); }
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}
.blue .stat-icon { background: #dbeafe; }
.green .stat-icon { background: #dcfce7; }
.orange .stat-icon { background: #ffedd5; }
.purple .stat-icon { background: #ede9fe; }
.income .stat-icon { background: #dcfce7; }
.success .stat-icon { background: #cffafe; }
.balance .stat-icon { background: #fef3c7; }
.stat-content { flex: 1; overflow: hidden; }
.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
}
.stat-value .small-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: normal;
}
.stat-value.pos { color: #10b981; }
.stat-value.neg { color: #ef4444; }
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}
</style>
