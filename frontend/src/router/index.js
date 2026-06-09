import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/activities' },
      {
        path: 'activities',
        component: () => import('../views/activities/List.vue'),
        meta: { title: '活动列表', icon: 'List' }
      },
      {
        path: 'activities/:id',
        component: () => import('../views/activities/Detail.vue'),
        meta: { title: '活动详情', icon: 'Document' }
      },
      {
        path: 'my-activities',
        component: () => import('../views/activities/My.vue'),
        meta: { title: '我的活动', icon: 'Calendar' }
      },
      {
        path: 'equipment',
        component: () => import('../views/equipment/List.vue'),
        meta: { title: '装备中心', icon: 'Goods' }
      },
      {
        path: 'my-equipment',
        component: () => import('../views/equipment/My.vue'),
        meta: { title: '我的装备借用', icon: 'Tickets' }
      },
      {
        path: 'profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '个人中心', icon: 'User' }
      },
      {
        path: 'admin/dashboard',
        component: () => import('../views/admin/Dashboard.vue'),
        meta: { title: '数据统计', icon: 'DataLine', requiresAdmin: true }
      },
      {
        path: 'admin/activities',
        component: () => import('../views/admin/Activities.vue'),
        meta: { title: '活动管理', icon: 'EditPen', requiresAdmin: true }
      },
      {
        path: 'admin/equipment',
        component: () => import('../views/admin/Equipment.vue'),
        meta: { title: '装备管理', icon: 'Tools', requiresAdmin: true }
      },
      {
        path: 'admin/loans',
        component: () => import('../views/admin/Loans.vue'),
        meta: { title: '借用管理', icon: 'Tickets', requiresAdmin: true }
      },
      {
        path: 'admin/ledger',
        component: () => import('../views/admin/Ledger.vue'),
        meta: { title: '出行台账', icon: 'Notebook', requiresAdmin: true }
      },
      {
        path: 'admin/users',
        component: () => import('../views/admin/Users.vue'),
        meta: { title: '成员管理', icon: 'Avatar', requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  document.title = to.meta.title ? `${to.meta.title} - 骑行俱乐部管理系统` : '骑行俱乐部管理系统'
  if (to.meta.requiresAuth && !userStore.isLogin) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/activities')
  } else if (to.path === '/login' && userStore.isLogin) {
    next('/')
  } else {
    next()
  }
})

export default router
