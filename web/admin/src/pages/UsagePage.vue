<script setup lang="ts">
import type { UsageLogEntry } from "@copilot-api/admin-contracts"

import { useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

import { fetchAccounts } from "@/api/accounts"
import { fetchAdminSettings, updateAdminSettings } from "@/api/settings"
import { fetchUsageLogs, fetchUsageSummary } from "@/api/usage"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { getErrorMessage } from "@/utils/errors"
import { formatNumber } from "@/utils/format"

const USAGE_PAGE_SIZE_OPTIONS = [13, 20, 50, 100] as const
const INFINITY_TEXT = "\u221e"

type UsagePageSize = (typeof USAGE_PAGE_SIZE_OPTIONS)[number]

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const noticeStore = useNoticeStore()

const endpoint = ref(
  typeof route.query.endpoint === "string" ? route.query.endpoint : "",
)
const limit = ref<UsagePageSize>(resolveUsagePageSize(route.query.limit))
const currentCursor = ref<string | null>(null)
const nextCursor = ref<string | null>(null)
const pageIndex = ref(1)
const cursorStack = ref<Array<string | null>>([])
const editingTestInterval = ref(false)
const savingUsageKey = ref("")
const skipTestIntervalSave = ref(false)
const testIntervalDraft = ref("")
const testIntervalInputRef = ref<HTMLInputElement | null>(null)
const usageLogCountMode = ref<"conversation" | "request">("request")

watch([endpoint, limit], () => {
  resetPagination()

  void router.replace({
    query: {
      ...route.query,
      endpoint: endpoint.value || undefined,
      limit: String(limit.value),
      source: undefined,
    },
  })
})

const summaryQuery = useQuery({
  queryKey: adminQueryKeys.usageSummary,
  queryFn: fetchUsageSummary,
})
const settingsQuery = useQuery({
  queryKey: adminQueryKeys.settings,
  queryFn: fetchAdminSettings,
})
const accountsQuery = useQuery({
  queryKey: adminQueryKeys.accounts,
  queryFn: fetchAccounts,
})
const logsQuery = useQuery({
  queryKey: computed(() =>
    adminQueryKeys.usageLogs({
      cursor: currentCursor.value,
      endpoint: endpoint.value,
      limit: limit.value,
      source: "all",
    }),
  ),
  queryFn: () =>
    fetchUsageLogs({
      cursor: currentCursor.value,
      endpoint: endpoint.value,
      limit: limit.value,
      source: "all",
    }),
})

watch(
  () => logsQuery.data.value,
  (payload) => {
    nextCursor.value = payload?.pagination.nextCursor ?? null
  },
)

watch(
  () => settingsQuery.data.value?.usageLogCountMode,
  (value) => {
    usageLogCountMode.value =
      value === "conversation" ? "conversation" : "request"
  },
  {
    immediate: true,
  },
)

watch(
  () => settingsQuery.data.value?.usageTestIntervalMinutes,
  (value) => {
    if (editingTestInterval.value) {
      return
    }

    testIntervalDraft.value =
      typeof value === "number" && Number.isFinite(value) ? String(value) : ""
  },
  {
    immediate: true,
  },
)

const quotaCards = computed(() => {
  const snapshots = summaryQuery.data.value?.quota_snapshots
  if (!snapshots) {
    return []
  }

  return Object.entries(snapshots).map(([key, quota]) => {
    const percentUsed =
      quota.unlimited ? 100 : Math.max(0, Math.min(100, 100 - quota.percent_remaining))
    const used = quota.unlimited ? null : quota.entitlement - quota.remaining

    let toneClass = "green"
    if (quota.unlimited) {
      toneClass = "blue"
    } else if (percentUsed > 90) {
      toneClass = "red"
    } else if (percentUsed > 75) {
      toneClass = "yellow"
    }

    return {
      key,
      percentUsed,
      quota,
      title: formatQuotaTitle(key),
      toneClass,
      used,
    }
  })
})

const hasConfiguredAccounts = computed(
  () => (accountsQuery.data.value?.accounts.length ?? 0) > 0,
)
const showConversationColumns = computed(
  () => usageLogCountMode.value === "conversation",
)
const logs = computed<Array<UsageLogEntry>>(() => logsQuery.data.value?.logs ?? [])
const endpointOptions = computed(
  () => logsQuery.data.value?.pagination.endpoints ?? [],
)
const testIntervalDisplayValue = computed(() => {
  if (editingTestInterval.value) {
    return testIntervalDraft.value
  }

  if (settingsQuery.isLoading.value && !settingsQuery.data.value) {
    return "--"
  }

  return testIntervalDraft.value || getUsageText("testDisabled")
})

function getUsageText(
  key:
    | "chatEnabled"
    | "countMode"
    | "countModeConversation"
    | "countModeRequest"
    | "failedSaveCountMode"
    | "failedSaveTestInterval"
    | "logChat"
    | "logCompletions"
    | "logEmpty"
    | "logEndpoint"
    | "logEndpointAll"
    | "logLastSeen"
    | "logModel"
    | "logMultiplier"
    | "logPageNext"
    | "logPagePrev"
    | "logPageSize"
    | "logPremium"
    | "logQuotaDelta"
    | "logRequestCount"
    | "logResponseType"
    | "logResponseTypeNonStreaming"
    | "logResponseTypeStreaming"
    | "logTime"
    | "remaining"
    | "testDisabled"
    | "testInterval"
    | "unlimited"
    | "unknown"
    | "validationTestInterval",
  params?: Record<string, string | number>,
): string {
  const messages =
    locale.value === "zh" ?
      {
        chatEnabled: "聊天可用（定时测试）",
        countMode: "统计模式",
        countModeConversation: "按对话",
        countModeRequest: "按请求",
        failedSaveCountMode: "保存统计模式失败",
        failedSaveTestInterval: "保存测试间隔失败",
        logChat: "聊天用量",
        logCompletions: "补全用量",
        logEmpty: "暂无使用日志",
        logEndpoint: "端点",
        logEndpointAll: "全部端点",
        logLastSeen: "最后请求时间",
        logModel: "模型",
        logMultiplier: "倍率",
        logPageNext: "下一页",
        logPagePrev: "上一页",
        logPageSize: "每页",
        logPremium: "高级额度",
        logQuotaDelta: "额度增量",
        logRequestCount: "请求次数",
        logResponseType: "响应类型",
        logResponseTypeNonStreaming: "非流",
        logResponseTypeStreaming: "流式",
        logTime: "时间",
        remaining: "剩余 {value}",
        testDisabled: "不测试",
        testInterval: "测试时间间隔（分钟）",
        unlimited: "无限制",
        unknown: "未知",
        validationTestInterval: "测试间隔必须是大于 0 的整数，或留空。",
      }
    : {
        chatEnabled: "Chat Enabled (periodic test)",
        countMode: "Count Mode",
        countModeConversation: "Per Conversation",
        countModeRequest: "Per Request",
        failedSaveCountMode: "Failed to save count mode.",
        failedSaveTestInterval: "Failed to save test interval.",
        logChat: "Chat",
        logCompletions: "Completions",
        logEmpty: "No usage logs yet",
        logEndpoint: "Endpoint",
        logEndpointAll: "All Endpoints",
        logLastSeen: "Last Seen",
        logModel: "Model",
        logMultiplier: "Multiplier",
        logPageNext: "Next",
        logPagePrev: "Prev",
        logPageSize: "Rows",
        logPremium: "Premium",
        logQuotaDelta: "Quota Delta",
        logRequestCount: "Requests",
        logResponseType: "Response Type",
        logResponseTypeNonStreaming: "Non-streaming",
        logResponseTypeStreaming: "Streaming",
        logTime: "Time",
        remaining: "{value} remaining",
        testDisabled: "No test",
        testInterval: "Test Interval (min)",
        unlimited: "Unlimited",
        unknown: "Unknown",
        validationTestInterval:
          "The test interval must be a positive integer, or left empty.",
      }

  let text = messages[key]
  if (!params) {
    return text
  }

  for (const [paramKey, value] of Object.entries(params)) {
    text = text.replace(`{${paramKey}}`, String(value))
  }

  return text
}

function formatUsagePageIndicator(page: number): string {
  return locale.value === "zh" ? `第 ${page} 页` : `Page ${page}`
}

function resetPagination(): void {
  currentCursor.value = null
  nextCursor.value = null
  pageIndex.value = 1
  cursorStack.value = []
}

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

async function refreshAll(): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: ["admin"],
  })
}

async function startUsageTestIntervalEdit(): Promise<void> {
  if (savingUsageKey.value || settingsQuery.isLoading.value) {
    return
  }

  editingTestInterval.value = true
  testIntervalDraft.value =
    typeof settingsQuery.data.value?.usageTestIntervalMinutes === "number" ?
      String(settingsQuery.data.value.usageTestIntervalMinutes)
    : ""

  await nextTick()
  testIntervalInputRef.value?.focus()
  testIntervalInputRef.value?.select()
}

async function finishUsageTestIntervalEdit(shouldSave: boolean): Promise<void> {
  if (!editingTestInterval.value) {
    return
  }

  if (skipTestIntervalSave.value) {
    skipTestIntervalSave.value = false
    editingTestInterval.value = false
    testIntervalDraft.value =
      typeof settingsQuery.data.value?.usageTestIntervalMinutes === "number" ?
        String(settingsQuery.data.value.usageTestIntervalMinutes)
      : ""
    return
  }

  if (!shouldSave) {
    editingTestInterval.value = false
    testIntervalDraft.value =
      typeof settingsQuery.data.value?.usageTestIntervalMinutes === "number" ?
        String(settingsQuery.data.value.usageTestIntervalMinutes)
      : ""
    return
  }

  const rawValue = testIntervalDraft.value.trim()
  const nextValue =
    rawValue === "" ? null : Number(rawValue)

  if (
    nextValue !== null
    && (!Number.isFinite(nextValue) || nextValue <= 0 || !Number.isInteger(nextValue))
  ) {
    noticeStore.error(getUsageText("validationTestInterval"))
    return
  }

  const previousValue = settingsQuery.data.value?.usageTestIntervalMinutes ?? null
  if (nextValue === previousValue) {
    editingTestInterval.value = false
    return
  }

  savingUsageKey.value = "usage-test-interval"

  try {
    await updateAdminSettings({
      usageTestIntervalMinutes: nextValue,
    })
    editingTestInterval.value = false
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.settings,
    })
  } catch (error) {
    noticeStore.error(
      getErrorMessage(error, getUsageText("failedSaveTestInterval")),
    )
  } finally {
    savingUsageKey.value = ""
  }
}

function cancelUsageTestIntervalEdit(): void {
  skipTestIntervalSave.value = true
  testIntervalInputRef.value?.blur()
}

async function handleUsageLogCountModeChange(value: string): Promise<void> {
  const nextValue =
    value === "conversation" ? "conversation" : "request"
  const previousValue = settingsQuery.data.value?.usageLogCountMode ?? "request"

  usageLogCountMode.value = nextValue
  if (nextValue === previousValue) {
    return
  }

  savingUsageKey.value = "usage-count-mode"

  try {
    await updateAdminSettings({
      usageLogCountMode: nextValue,
    })
    resetPagination()
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.settings,
      }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "usage-logs"],
      }),
    ])
  } catch (error) {
    usageLogCountMode.value = previousValue
    noticeStore.error(
      getErrorMessage(error, getUsageText("failedSaveCountMode")),
    )
  } finally {
    savingUsageKey.value = ""
  }
}

function resolveUsagePageSize(value: unknown): UsagePageSize {
  if (typeof value !== "string") {
    return 13
  }

  const parsed = Number(value)
  if (USAGE_PAGE_SIZE_OPTIONS.includes(parsed as UsagePageSize)) {
    return parsed as UsagePageSize
  }

  return 13
}

function formatQuotaTitle(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function formatQuotaPercent(percentUsed: number, unlimited: boolean): string {
  if (unlimited) {
    return getUsageText("unlimited")
  }

  return locale.value === "zh" ?
      `已使用 ${percentUsed.toFixed(1)}%`
    : `${percentUsed.toFixed(1)}% used`
}

function formatQuotaUsedAndEntitlement(
  used: number | null,
  entitlement: number,
  unlimited: boolean,
): string {
  if (unlimited) {
    return `${INFINITY_TEXT} / ${INFINITY_TEXT}`
  }

  return `${formatNumber(used)} / ${formatNumber(entitlement)}`
}

function formatQuotaRemaining(remaining: number, unlimited: boolean): string {
  if (unlimited) {
    return INFINITY_TEXT
  }

  return getUsageText("remaining", {
    value: formatNumber(remaining),
  })
}

function formatUsageDateTime(value: string | null | undefined): string {
  if (!value) {
    return getUsageText("unknown")
  }

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }

  return new Intl.DateTimeFormat(locale.value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp)
}

function formatUsageResponseType(log: UsageLogEntry): {
  className: string
  text: string
} {
  if (log.responseType === "streaming") {
    return {
      className: "streaming",
      text: getUsageText("logResponseTypeStreaming"),
    }
  }

  if (log.responseType === "non_streaming") {
    return {
      className: "non-streaming",
      text: getUsageText("logResponseTypeNonStreaming"),
    }
  }

  return {
    className: "",
    text: getUsageText("unknown"),
  }
}

function formatUsageLogCell(value: number | null | undefined, fallback = "--"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return formatNumber(value)
}
</script>

<template>
  <div id="tab-usage" class="tab-content active">
    <div class="card">
      <div class="card-header">
        <span class="card-title">{{ t("usage.statistics") }}</span>
        <button type="button" class="btn btn-sm refresh-btn" @click="refreshAll">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
          </svg>
          <span>{{ t("common.refresh") }}</span>
        </button>
      </div>

      <div
        v-if="
          accountsQuery.isLoading.value ||
            (hasConfiguredAccounts && summaryQuery.isLoading.value)
        "
        class="empty-state"
      >
        {{ t("common.loading") }}
      </div>
      <div v-else-if="!hasConfiguredAccounts || summaryQuery.isError.value" class="empty-state">
        {{ t("usage.failedLoad") }}
      </div>
      <template v-else>
        <div class="usage-grid">
          <article v-for="card in quotaCards" :key="card.key" class="usage-card">
            <div class="usage-header">
              <span class="usage-title">{{ card.title }}</span>
              <span class="usage-percent">
                {{ formatQuotaPercent(card.percentUsed, card.quota.unlimited) }}
              </span>
            </div>
            <div class="usage-bar">
              <div
                class="usage-bar-fill"
                :class="card.toneClass"
                :style="{ width: `${card.percentUsed}%` }"
              />
            </div>
            <div class="usage-stats">
              <span>
                {{
                  formatQuotaUsedAndEntitlement(
                    card.used,
                    card.quota.entitlement,
                    card.quota.unlimited,
                  )
                }}
              </span>
              <span>{{ formatQuotaRemaining(card.quota.remaining, card.quota.unlimited) }}</span>
            </div>
          </article>

          <article class="usage-card usage-summary-card">
            <div class="usage-info-row">
              <span class="usage-info-label">{{ getUsageText("chatEnabled") }}</span>
              <span>
                {{ summaryQuery.data.value?.chat_enabled ? t("common.yes") : t("common.no") }}
              </span>
            </div>
            <div class="usage-info-row">
              <span class="usage-info-label">{{ getUsageText("testInterval") }}</span>
              <span class="usage-info-control">
                <input
                  ref="testIntervalInputRef"
                  class="usage-summary-input"
                  :class="{ editing: editingTestInterval }"
                  type="text"
                  :value="testIntervalDisplayValue"
                  :readonly="!editingTestInterval"
                  autocomplete="off"
                  spellcheck="false"
                  :disabled="savingUsageKey === 'usage-test-interval'"
                  @dblclick="startUsageTestIntervalEdit"
                  @input="testIntervalDraft = ($event.target as HTMLInputElement).value"
                  @keydown.enter.prevent="finishUsageTestIntervalEdit(true)"
                  @keydown.escape.prevent="cancelUsageTestIntervalEdit"
                  @blur="finishUsageTestIntervalEdit(true)"
                >
              </span>
            </div>
            <div class="usage-info-row">
              <span class="usage-info-label">{{ getUsageText("countMode") }}</span>
              <span class="usage-info-control">
                <select
                  class="usage-summary-input"
                  :value="usageLogCountMode"
                  :disabled="savingUsageKey === 'usage-count-mode'"
                  @change="handleUsageLogCountModeChange(($event.target as HTMLSelectElement).value)"
                >
                  <option value="request">{{ getUsageText("countModeRequest") }}</option>
                  <option value="conversation">{{ getUsageText("countModeConversation") }}</option>
                </select>
              </span>
            </div>
          </article>
        </div>

        <div class="usage-log-card">
          <div v-if="logsQuery.isLoading.value && logs.length === 0" class="empty-state">
            {{ t("common.loading") }}
          </div>
          <div v-else-if="logsQuery.isError.value" class="empty-state">
            {{ t("usage.failedLoad") }}
          </div>
          <div v-else-if="logs.length === 0" class="empty-state">
            {{ getUsageText("logEmpty") }}
          </div>
          <template v-else>
            <div class="usage-log-table-wrap">
              <table class="usage-log-table">
                <thead>
                  <tr>
                    <th>{{ showConversationColumns ? getUsageText("logLastSeen") : getUsageText("logTime") }}</th>
                    <th>{{ getUsageText("logResponseType") }}</th>
                    <th class="usage-log-source-head">
                      <span class="usage-log-source-text">{{ getUsageText("logEndpoint") }}</span>
                      <select v-model="endpoint" class="usage-log-source-filter">
                        <option value="">{{ getUsageText("logEndpointAll") }}</option>
                        <option v-for="item in endpointOptions" :key="item" :value="item">
                          {{ item }}
                        </option>
                      </select>
                    </th>
                    <th>{{ getUsageText("logModel") }}</th>
                    <th>{{ getUsageText("logMultiplier") }}</th>
                    <th v-if="showConversationColumns">{{ getUsageText("logRequestCount") }}</th>
                    <th>{{ getUsageText("logQuotaDelta") }}</th>
                    <th>{{ getUsageText("logPremium") }}</th>
                    <th>{{ getUsageText("logChat") }}</th>
                    <th>{{ getUsageText("logCompletions") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in logs" :key="log.id">
                    <td>
                      {{ formatUsageDateTime(showConversationColumns ? log.lastSeenAt : log.createdAt) }}
                    </td>
                    <td>
                      <span
                        class="usage-response-badge"
                        :class="formatUsageResponseType(log).className"
                      >
                        {{ formatUsageResponseType(log).text }}
                      </span>
                    </td>
                    <td>{{ log.endpoint || "--" }}</td>
                    <td>{{ log.model || "--" }}</td>
                    <td>{{ formatUsageLogCell(log.multiplier) }}</td>
                    <td v-if="showConversationColumns">
                      {{ formatUsageLogCell(log.requestCount, "1") }}
                    </td>
                    <td>{{ formatUsageLogCell(log.quotaDelta, "0") }}</td>
                    <td>
                      {{ `${formatUsageLogCell(log.premiumUsed)} / ${formatUsageLogCell(log.premiumEntitlement)}` }}
                    </td>
                    <td>{{ formatUsageLogCell(log.chatUsed) }}</td>
                    <td>{{ formatUsageLogCell(log.completionsUsed) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="usage-log-pagination">
              <label class="usage-log-page-size-wrap">
                <span class="usage-log-page-size-label">{{ getUsageText("logPageSize") }}</span>
                <select v-model="limit" class="usage-log-source-filter">
                  <option v-for="size in USAGE_PAGE_SIZE_OPTIONS" :key="size" :value="size">
                    {{ size }}
                  </option>
                </select>
              </label>
              <button
                type="button"
                class="btn btn-sm usage-log-page-btn"
                :disabled="pageIndex === 1"
                @click="previousPage"
              >
                {{ getUsageText("logPagePrev") }}
              </button>
              <span class="usage-log-page-info">
                {{ formatUsagePageIndicator(pageIndex) }}
              </span>
              <button
                type="button"
                class="btn btn-sm usage-log-page-btn"
                :disabled="!nextCursor"
                @click="followingPage"
              >
                {{ getUsageText("logPageNext") }}
              </button>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
