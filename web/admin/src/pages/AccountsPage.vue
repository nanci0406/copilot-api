<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, onBeforeUnmount, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"

import {
  activateAccount,
  deleteAccount,
  fetchAccounts,
  reorderAccounts,
} from "@/api/accounts"
import { pollDeviceCode, startDeviceCodeFlow } from "@/api/auth"
import { adminQueryKeys } from "@/query/keys"
import { useNoticeStore } from "@/stores/notices"
import { getErrorMessage } from "@/utils/errors"
import { formatDateTime, formatPercent } from "@/utils/format"

const { t } = useI18n()
const queryClient = useQueryClient()
const noticeStore = useNoticeStore()

const accountsQuery = useQuery({
  queryKey: adminQueryKeys.accounts,
  queryFn: fetchAccounts,
})

const authFlow = reactive({
  accountType: "individual",
  deviceCode: "",
  interval: 5,
  open: false,
  userCode: "",
  verificationUri: "",
})
const authBusy = ref(false)
const authError = ref("")
const actionBusyId = ref("")

let pollTimer: number | null = null

const accounts = computed(() => accountsQuery.data.value?.accounts ?? [])

function clearPollTimer(): void {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer)
    pollTimer = null
  }
}

function resetAuthFlow(): void {
  clearPollTimer()
  authFlow.open = false
  authFlow.deviceCode = ""
  authFlow.userCode = ""
  authFlow.verificationUri = ""
  authFlow.interval = 5
  authError.value = ""
  authBusy.value = false
}

async function refreshAll(): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: ["admin"],
  })
}

async function schedulePoll(): Promise<void> {
  clearPollTimer()
  pollTimer = window.setTimeout(() => {
    void pollForCompletion()
  }, authFlow.interval * 1000)
}

async function pollForCompletion(): Promise<void> {
  try {
    const result = await pollDeviceCode(
      authFlow.deviceCode,
      authFlow.accountType,
    )

    if ("success" in result && result.success) {
      noticeStore.success(t("accounts.authSuccess"))
      resetAuthFlow()
      await refreshAll()
      return
    }

    if ("slowDown" in result && result.slowDown && result.interval) {
      authFlow.interval = result.interval
      noticeStore.success(t("accounts.rateLimited"))
    }

    await schedulePoll()
  } catch (error) {
    authError.value = getErrorMessage(error, t("accounts.pollFailed"))
    authBusy.value = false
    clearPollTimer()
  }
}

async function startFlow(): Promise<void> {
  authBusy.value = true
  authError.value = ""

  try {
    const result = await startDeviceCodeFlow(authFlow.accountType)
    authFlow.deviceCode = result.deviceCode
    authFlow.userCode = result.userCode
    authFlow.verificationUri = result.verificationUri
    authFlow.interval = result.interval
    authFlow.open = true
    await schedulePoll()
  } catch (error) {
    authError.value = getErrorMessage(error, t("accounts.deviceFlowFailed"))
  } finally {
    authBusy.value = false
  }
}

const activateMutation = useMutation({
  mutationFn: async (accountId: string) => {
    actionBusyId.value = `activate:${accountId}`
    return activateAccount(accountId)
  },
  onSuccess: async () => {
    noticeStore.success(t("accounts.switchSuccess"))
    await refreshAll()
  },
  onError: (error) => {
    noticeStore.error(getErrorMessage(error, t("accounts.switchFailed")))
  },
  onSettled: () => {
    actionBusyId.value = ""
  },
})

const deleteMutation = useMutation({
  mutationFn: async (accountId: string) => {
    actionBusyId.value = `delete:${accountId}`
    return deleteAccount(accountId)
  },
  onSuccess: async () => {
    noticeStore.success(t("accounts.deleteSuccess"))
    await refreshAll()
  },
  onError: (error) => {
    noticeStore.error(getErrorMessage(error, t("accounts.deleteFailed")))
  },
  onSettled: () => {
    actionBusyId.value = ""
  },
})

async function moveAccount(accountId: string, offset: -1 | 1): Promise<void> {
  const currentIndex = accounts.value.findIndex((account) => account.id === accountId)
  if (currentIndex < 0) {
    return
  }

  const nextIndex = currentIndex + offset
  if (nextIndex < 0 || nextIndex >= accounts.value.length) {
    return
  }

  const nextOrder = accounts.value.map((account) => account.id)
  const [moved] = nextOrder.splice(currentIndex, 1)
  nextOrder.splice(nextIndex, 0, moved)

  actionBusyId.value = `reorder:${accountId}`
  try {
    await reorderAccounts(nextOrder)
    noticeStore.success(t("accounts.reorderSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("accounts.reorderFailed")))
  } finally {
    actionBusyId.value = ""
  }
}

function resolveUsageLabel(status: {
  status: "error" | "ok"
  premiumPercent?: number
  chatPercent?: number
  completionsPercent?: number
}): string {
  if (status.status === "error") {
    return "--"
  }

  return [
    `P ${formatPercent(status.premiumPercent)}`,
    `C ${formatPercent(status.chatPercent)}`,
    `Com ${formatPercent(status.completionsPercent)}`,
  ].join(" / ")
}

onBeforeUnmount(() => {
  clearPollTimer()
})
</script>

<template>
  <section class="page-card">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t("accounts.title") }}</h1>
        <p class="page-subtitle">{{ t("accounts.subtitle") }}</p>
      </div>

      <button
        type="button"
        class="btn btn-ghost"
        :disabled="accountsQuery.isFetching.value"
        @click="accountsQuery.refetch()"
      >
        {{ t("common.refresh") }}
      </button>
    </div>

    <div class="page-section split-panel">
      <section class="sub-card">
        <h2 class="section-title">{{ t("accounts.addTitle") }}</h2>
        <p class="section-copy">{{ t("accounts.addCopy") }}</p>

        <div class="form-grid">
          <label class="field">
            <span>{{ t("accounts.accountType") }}</span>
            <select v-model="authFlow.accountType">
              <option value="individual">
                {{ t("accounts.accountTypeIndividual") }}
              </option>
              <option value="business">
                {{ t("accounts.accountTypeBusiness") }}
              </option>
              <option value="enterprise">
                {{ t("accounts.accountTypeEnterprise") }}
              </option>
            </select>
          </label>

          <div class="inline-actions">
            <button type="button" class="btn btn-primary" :disabled="authBusy" @click="startFlow">
              {{ authBusy ? t("common.loading") : t("accounts.startAuth") }}
            </button>
            <button
              v-if="authFlow.open"
              type="button"
              class="btn btn-ghost"
              @click="resetAuthFlow"
            >
              {{ t("accounts.stopAuth") }}
            </button>
          </div>

          <p v-if="authError" class="inline-error">{{ authError }}</p>
        </div>

        <div v-if="authFlow.open" class="auth-flow-panel">
          <div class="metric-row">
            <span>{{ t("accounts.userCode") }}</span>
            <strong>{{ authFlow.userCode }}</strong>
          </div>
          <p class="helper-text">{{ t("accounts.devicePending") }}</p>
          <a
            class="btn btn-secondary"
            :href="authFlow.verificationUri"
            target="_blank"
            rel="noreferrer"
          >
            {{ t("accounts.verificationLink") }}
          </a>
        </div>
      </section>

      <section class="sub-card">
        <h2 class="section-title">{{ t("accounts.title") }}</h2>

        <div v-if="accountsQuery.isLoading.value" class="empty-state">
          {{ t("common.loading") }}
        </div>
        <div v-else-if="accounts.length === 0" class="empty-state">
          {{ t("accounts.noAccounts") }}
        </div>
        <div v-else class="account-list">
          <article
            v-for="(account, index) in accounts"
            :key="account.id"
            class="account-card"
            :data-active="account.isActive"
          >
            <div class="account-card-head">
              <div>
                <div class="account-name-row">
                  <h3>{{ account.login }}</h3>
                  <span v-if="account.isActive" class="badge badge-success">
                    {{ t("common.active") }}
                  </span>
                </div>
                <p class="helper-text">
                  {{ formatDateTime(account.createdAt) }}
                </p>
              </div>

              <div class="card-actions">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  :disabled="index === 0 || actionBusyId === `reorder:${account.id}`"
                  @click="moveAccount(account.id, -1)"
                >
                  {{ t("accounts.moveUp") }}
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  :disabled="index === accounts.length - 1 || actionBusyId === `reorder:${account.id}`"
                  @click="moveAccount(account.id, 1)"
                >
                  {{ t("accounts.moveDown") }}
                </button>
                <button
                  v-if="!account.isActive"
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="actionBusyId === `activate:${account.id}`"
                  @click="activateMutation.mutate(account.id)"
                >
                  {{ t("accounts.activate") }}
                </button>
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  :disabled="actionBusyId === `delete:${account.id}`"
                  @click="deleteMutation.mutate(account.id)"
                >
                  {{ t("accounts.remove") }}
                </button>
              </div>
            </div>

            <div class="metric-grid">
              <div class="metric-row">
                <span>{{ t("accounts.accountType") }}</span>
                <strong>
                  {{
                    account.accountType === "individual" ? t("accounts.accountTypeIndividual")
                    : account.accountType === "business" ? t("accounts.accountTypeBusiness")
                    : t("accounts.accountTypeEnterprise")
                  }}
                </strong>
              </div>
              <div class="metric-row">
                <span>{{ t("accounts.usageLabel") }}</span>
                <strong>{{ resolveUsageLabel(account.usage) }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
