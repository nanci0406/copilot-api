import type { Component } from "vue"

import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from "vue-router"

import { pinia } from "@/app/pinia"
import AdminLayout from "@/layouts/AdminLayout.vue"
import AccountsPage from "@/pages/AccountsPage.vue"
import LoginPage from "@/pages/LoginPage.vue"
import ManualPage from "@/pages/ManualPage.vue"
import ModelMappingsPage from "@/pages/ModelMappingsPage.vue"
import ModelsPage from "@/pages/ModelsPage.vue"
import SettingsPage from "@/pages/SettingsPage.vue"
import SetupPage from "@/pages/SetupPage.vue"
import UsagePage from "@/pages/UsagePage.vue"
import { useSessionStore } from "@/stores/session"

type AdminRouteAccess = "login" | "setup" | "protected"

declare module "vue-router" {
  interface RouteMeta {
    access?: AdminRouteAccess
  }
}

function resolveRedirectTarget(to: RouteLocationNormalized): string {
  return typeof to.query.redirect === "string" && to.query.redirect ?
      to.query.redirect
    : "/accounts"
}

const routes: Array<RouteRecordRaw> = [
  {
    path: "/login",
    component: LoginPage as Component,
    meta: {
      access: "login",
    },
  },
  {
    path: "/setup",
    component: SetupPage as Component,
    meta: {
      access: "setup",
    },
  },
  {
    path: "/",
    component: AdminLayout as Component,
    meta: {
      access: "protected",
    },
    children: [
      {
        path: "",
        redirect: "/accounts",
      },
      {
        path: "accounts",
        component: AccountsPage as Component,
      },
      {
        path: "models",
        component: ModelsPage as Component,
      },
      {
        path: "settings",
        component: SettingsPage as Component,
      },
      {
        path: "usage",
        component: UsagePage as Component,
      },
      {
        path: "model-mappings",
        component: ModelMappingsPage as Component,
      },
      {
        path: "manual",
        component: ManualPage as Component,
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory("/admin/"),
  routes,
})

router.beforeEach(async (to) => {
  const sessionStore = useSessionStore(pinia)
  const status = await sessionStore.hydrate()
  const access = to.meta.access ?? "protected"

  if (access === "login") {
    if (!status.configured) {
      return "/setup"
    }

    if (status.authenticated) {
      return resolveRedirectTarget(to)
    }

    return true
  }

  if (access === "setup") {
    if (!status.configured) {
      return true
    }

    if (!status.authenticated) {
      return {
        path: "/login",
        query: {
          redirect: "/setup",
        },
      }
    }

    return true
  }

  if (!status.configured) {
    return "/setup"
  }

  if (!status.authenticated) {
    return {
      path: "/login",
      query: {
        redirect: to.fullPath,
      },
    }
  }

  return true
})
