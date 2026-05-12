<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

import {
  clearAllUsageLogs,
  clearUsageLogs,
  fetchUsageLogs,
  fetchUsageSummary,
} from "@/api/usage"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { getErrorMessage } from "@/utils/errors"
import { formatDateTime, formatNumber } from "@/utils/format"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const noticeStore = useNoticeStore()

const source = ref<"all" | "request">(
  route.query.source === "request" ? "request" : "all",
)
const endpoint = ref(typeof route.query.endpoint === "string" ? route.query.endpoint : "")
const limit = ref(
  typeof route.query.limit === "string" && Number(route.query.limit) > 0 ?
    Number(route.query.limit)
  : 50,
)
const currentCursor = ref<string | null>(null)
const nextCursor = ref<string | null>(null)
const pageIndex = ref(1)
const cursorStack = ref<Array<string | null>>([])

watch([source, endpoint, limit], () => {
  currentCursor.value = null
  nextCursor.value = null
  pageIndex.value = 1
  cursorStack.value = []

  void router.replace({
    query: {
      ...route.query,
      endpoint: endpoint.value || undefined,
      limit: String(limit.value),
      source: source.value === "all" ? undefined : source.value,
    },
  })
})

const summaryQuery = useQuery({
  queryKey: adminQueryKeys.usageSummary,
  queryFn: fetchUsageSummary,
})
const logsQuery = useQuery({
  queryKey: computed(() =>
    adminQueryKeys.usageLogs({
      cursor: currentCursor.value,
      endpoint: endpoint.value,
      limit: limit.value,
      source: source.value,
    }),
  ),
  queryFn: () =>
    fetchUsageLogs({
      cursor: currentCursor.value,
      endpoint: endpoint.value,
      limit: limit.value,
      source: source.value,
    }),
})

watch(
  () => logsQuery.data.value,
  (payload) => {
    nextCursor.value = payload?.pagination.nextCursor ?? null
  },
)

const clearMutation = useMutation({
  mutationFn: clearUsageLogs,
  onSuccess: async () => {
    noticeStore.success(t("usage.clearSuccess"))
    await queryClient.invalidateQueries({
      queryKey: ["admin"],
    })
  },
  onError: (error) => {
    noticeStore.error(getErrorMessage(error, t("usage.clearFailed")))
  },
})

const clearAllMutation = useMutation({
  mutationFn: clearAllUsageLogs,
  onSuccess: async () => {
    noticeStore.success(t("usage.clearAllSuccess"))
    await queryClient.invalidateQueries({
      queryKey: ["admin"],
    })
  },
  onError: (error) => {
    noticeStore.error(getErrorMessage(error, t("usage.clearFailed")))
  },
})

const quotaCards = computed(() => {
  const snapshots = summaryQuery.data.value?.quota_snapshots
  if (!snapshots) {
    return []
  }

  return Object.entries(snapshots).map(([key, quota]) => ({
    key,
    percentUsed:
      quota.unlimited ? 0 : Math.max(0, 100 - quota.percent_remaining),
    quota,
    used: quota.unlimited ? 0 : quota.entitlement - quota.remaining,
  }))
})

function previousPage(): void {
  if (pageIndex.value === 1) {
    return
  }

  currentCursor.value = cursorStack.value.pop() ?? null
  pageIndex.value -= 1
}

function followingPage(): void {
  if (!nextCursor.value) {
    return
  }

  cursorStack.value.push(currentCursor.value)
  currentCursor.value = nextCursor.value
  pageIndex.value += 1
}
</script>

<template>
  <section class="page-card">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t("usage.title") }}</h1>
        <p class="page-subtitle">{{ t("usage.subtitle") }}</p>
      </div>
      <button type="button" class="btn btn-ghost" @click="queryClient.invalidateQueries({ queryKey: ['admin'] })">
        {{ t("common.refresh") }}
      </button>
    </div>

    <div class="page-section toolbar-row">
      <label class="field compact-field">
        <span>{{ t("usage.source") }}</span>
        <select v-model="source">
          <option value="all">{{ t("usage.sourceAll") }}</option>
          <option value="request">{{ t("usage.sourceRequest") }}</option>
        </select>
      </label>

      <label class="field compact-field">
        <span>{{ t("usage.endpoint") }}</span>
        <select v-model="endpoint">
          <option value="">{{ t("usage.endpointAll") }}</option>
          <option
            v-for="item in logsQuery.data.value?.pagination.endpoints ?? []"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
      </label>

      <label class="field compact-field">
        <span>{{ t("usage.pageSize") }}</span>
        <select v-model="limit">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
        </select>
      </label>

      <div class="inline-actions">
        <button type="button" class="btn btn-ghost btn-sm" @click="clearMutation.mutate()">
          {{ t("usage.clearCurrent") }}
        </button>
        <button type="button" class="btn btn-danger btn-sm" @click="clearAllMutation.mutate()">
          {{ t("usage.clearAll") }}
        </button>
      </div>
    </div>

    <div v-if="summaryQuery.isLoading.value" class="empty-state">
      {{ t("common.loading") }}
    </div>
    <div v-else class="quota-grid">
      <article v-for="card in quotaCards" :key="card.key" class="quota-card">
        <div class="quota-head">
          <span>{{ card.key }}</span>
          <strong>{{ card.quota.unlimited ? "∞" : `${card.percentUsed.toFixed(1)}%` }}</strong>
        </div>
        <div class="quota-bar">
          <div class="quota-bar-fill" :style="{ width: `${card.quota.unlimited ? 100 : card.percentUsed}%` }" />
        </div>
        <div class="table-subtitle">
          {{ card.quota.unlimited ? "∞" : `${formatNumber(card.used)} / ${formatNumber(card.quota.entitlement)}` }}
        </div>
      </article>
    </div>

    <div class="page-section table-card">
      <div class="toolbar-row">
        <strong>{{ t("usage.logs") }}</strong>
        <div class="inline-actions">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="pageIndex === 1" @click="previousPage">
            {{ t("usage.previousPage") }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="!nextCursor" @click="followingPage">
            {{ t("usage.nextPage") }}
          </button>
        </div>
      </div>

      <div v-if="logsQuery.isLoading.value" class="empty-state">
        {{ t("common.loading") }}
      </div>
      <div v-else-if="(logsQuery.data.value?.logs.length ?? 0) === 0" class="empty-state">
        {{ t("usage.empty") }}
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ t("usage.time") }}</th>
            <th>{{ t("usage.endpoint") }}</th>
            <th>{{ t("usage.model") }}</th>
            <th>{{ t("usage.multiplier") }}</th>
            <th>{{ t("usage.delta") }}</th>
            <th>{{ t("usage.requestCount") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logsQuery.data.value?.logs ?? []" :key="log.id">
            <td>{{ formatDateTime(log.lastSeenAt) }}</td>
            <td>{{ log.endpoint ?? "--" }}</td>
            <td>{{ log.model ?? "--" }}</td>
            <td>{{ log.multiplier ?? "--" }}</td>
            <td>{{ log.quotaDelta }}</td>
            <td>{{ log.requestCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
