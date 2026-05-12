import type { AdminAuthStatus } from "@copilot-api/admin-contracts"

import { defineStore } from "pinia"

import {
  fetchAdminSession,
  loginAdmin,
  logoutAdmin,
  setupAdmin,
} from "@/api/session"

let pendingHydration: Promise<AdminAuthStatus> | null = null

export const useSessionStore = defineStore("admin-session", {
  state: () => ({
    loaded: false,
    loading: false,
    status: null as AdminAuthStatus | null,
  }),
  getters: {
    authenticated: (state) => state.status?.authenticated === true,
    configured: (state) => state.status?.configured === true,
  },
  actions: {
    async hydrate(force = false): Promise<AdminAuthStatus> {
      if (this.loaded && !force && this.status) {
        return this.status
      }

      if (pendingHydration) {
        return pendingHydration
      }

      this.loading = true
      pendingHydration = fetchAdminSession()
        .then((status) => {
          this.status = status
          this.loaded = true
          return status
        })
        .finally(() => {
          this.loading = false
          pendingHydration = null
        })

      return pendingHydration
    },
    async login(secret: string): Promise<void> {
      await loginAdmin(secret)
      await this.hydrate(true)
    },
    async setup(secret: string, confirmSecret: string): Promise<void> {
      await setupAdmin(secret, confirmSecret)
      await this.hydrate(true)
    },
    async logout(): Promise<void> {
      await logoutAdmin()
      await this.hydrate(true)
    },
  },
})
