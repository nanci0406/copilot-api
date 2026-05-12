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
import { formatPercent } from "@/utils/format"

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
const authModalOpen = ref(false)
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
  authModalOpen.value = false
  authFlow.open = false
  authFlow.deviceCode = ""
  authFlow.userCode = ""
  authFlow.verificationUri = ""
  authFlow.interval = 5
  authError.value = ""
  authBusy.value = false
}

function openAuthModal(): void {
  authModalOpen.value = true
  authError.value = ""
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

function resolveUsagePercent(
  status: {
    status: "error" | "ok"
    premiumPercent?: number
    chatPercent?: number
    completionsPercent?: number
  },
  key: "chatPercent" | "completionsPercent" | "premiumPercent",
): number {
  if (status.status === "error") {
    return 0
  }

  return status[key] ?? 0
}

onBeforeUnmount(() => {
  clearPollTimer()
})
</script>

<template>
  <div class="tab-content active">
    <div class="card">
      <div class="card-header">
        <span class="card-title">{{ t("accounts.githubAccounts") }}</span>
        <div class="inline-actions">
          <button type="button" class="btn btn-primary" @click="openAuthModal">
            <span>+</span>
            <span>{{ t("accounts.addAccount") }}</span>
          </button>
          <button
            type="button"
            class="btn"
            :disabled="accountsQuery.isFetching.value"
            @click="accountsQuery.refetch()"
          >
            {{ t("common.refresh") }}
          </button>
        </div>
      </div>

      <ul v-if="accountsQuery.isLoading.value" class="account-list">
        <li class="empty-state">{{ t("accounts.loadingAccounts") }}</li>
      </ul>
      <ul v-else-if="accounts.length === 0" class="account-list">
        <li class="empty-state">{{ t("accounts.noAccounts") }}</li>
      </ul>
      <ul v-else class="account-list">
        <li
          v-for="(account, index) in accounts"
          :key="account.id"
          class="account-item"
          :class="{ active: account.isActive }"
        >
          <div class="account-drag-handle" :class="{ disabled: accounts.length <= 1 }">
            ::
          </div>
          <img class="account-avatar" :src="account.avatarUrl" :alt="account.login">
          <div class="account-info">
            <div class="account-name">{{ account.login }}</div>
            <div class="account-type">
              {{ account.accountType }}
              <span v-if="account.isActive"> · {{ t("common.active") }}</span>
            </div>
          </div>

          <div class="account-usage">
            <div v-if="account.usage.status === 'error'" class="account-usage-error">
              {{ resolveUsageLabel(account.usage) }}
            </div>
            <div v-else class="account-usage-bars">
              <div class="account-usage-row">
                <span class="account-usage-type">Premium</span>
                <span class="account-usage-track">
                  <span
                    class="account-usage-fill premium"
                    :style="{ '--usage': resolveUsagePercent(account.usage, 'premiumPercent') }"
                  />
                </span>
                <span class="account-usage-value">{{ formatPercent(account.usage.premiumPercent) }}</span>
              </div>
              <div class="account-usage-row">
                <span class="account-usage-type">Chat</span>
                <span class="account-usage-track">
                  <span
                    class="account-usage-fill chat"
                    :style="{ '--usage': resolveUsagePercent(account.usage, 'chatPercent') }"
                  />
                </span>
                <span class="account-usage-value">{{ formatPercent(account.usage.chatPercent) }}</span>
              </div>
              <div class="account-usage-row">
                <span class="account-usage-type">Completions</span>
                <span class="account-usage-track">
                  <span
                    class="account-usage-fill completions"
                    :style="{ '--usage': resolveUsagePercent(account.usage, 'completionsPercent') }"
                  />
                </span>
                <span class="account-usage-value">{{ formatPercent(account.usage.completionsPercent) }}</span>
              </div>
            </div>
          </div>

          <div class="account-actions">
            <button
              type="button"
              class="btn btn-sm"
              :disabled="index === 0 || actionBusyId === `reorder:${account.id}`"
              @click="moveAccount(account.id, -1)"
            >
              {{ t("accounts.moveUp") }}
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :disabled="index === accounts.length - 1 || actionBusyId === `reorder:${account.id}`"
              @click="moveAccount(account.id, 1)"
            >
              {{ t("accounts.moveDown") }}
            </button>
            <button
              v-if="!account.isActive"
              type="button"
              class="btn btn-sm"
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
        </li>
      </ul>
    </div>

    <div class="modal-overlay" :class="{ active: authModalOpen }">
      <div class="modal">
        <h2 class="modal-title">{{ t("auth.addAccount") }}</h2>
        <div v-if="!authFlow.open">
          <label class="label">
            {{ t("accounts.accountType") }}
            <select v-model="authFlow.accountType" class="select">
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
          <p class="modal-text">{{ t("accounts.addCopy") }}</p>
          <p v-if="authError" class="notice error">{{ authError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn" @click="resetAuthFlow">
              {{ t("common.cancel") }}
            </button>
            <button type="button" class="btn btn-primary" :disabled="authBusy" @click="startFlow">
              {{ authBusy ? t("common.loading") : t("accounts.startAuth") }}
            </button>
          </div>
        </div>
        <div v-else>
          <p class="modal-text">{{ t("accounts.userCode") }}</p>
          <div class="device-code">{{ authFlow.userCode }}</div>
          <p class="modal-text">
            <a :href="authFlow.verificationUri" target="_blank" rel="noreferrer">
              {{ t("accounts.verificationLink") }}
            </a>
          </p>
          <p class="modal-text">
            <span class="spinner" />
            <span>{{ t("accounts.devicePending") }}</span>
          </p>
          <p v-if="authError" class="notice error">{{ authError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn" @click="resetAuthFlow">
              {{ t("common.cancel") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
