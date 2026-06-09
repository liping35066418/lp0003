import { defineStore } from 'pinia'
import request from '../utils/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),
  getters: {
    isLogin: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    username: (state) => state.user?.name || state.user?.username || ''
  },
  actions: {
    async login(loginForm) {
      const res = await request.post('/api/auth/login', loginForm)
      this.setAuth(res.data.token, res.data.user)
      return res.data
    },
    async register(form) {
      const res = await request.post('/api/auth/register', form)
      this.setAuth(res.data.token, res.data.user)
      return res.data
    },
    async fetchProfile() {
      const res = await request.get('/api/auth/profile')
      this.user = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
      return res.data
    },
    setAuth(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})
