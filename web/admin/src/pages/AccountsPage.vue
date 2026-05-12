<script setup lang="ts">
import type { AccountListItem, AccountType } from "@copilot-api/admin-contracts"

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
const draggedAccountId = ref("")
const dragTargetAccountId = ref("")
const dragTargetPosition = ref<"after" | "before" | "">("")

let pollTimer: number | null = null

const accounts = computed(() => accountsQuery.data.value?.accounts ?? [])
const canReorder = computed(() => accounts.value.length > 1)

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

function resolveUsageLabel(status: {
  status: "error" | "ok"
  premiumPercent?: number
  chatPercent?: number
  completionsPercent?: number
}): string {
  if (status.status === "error") {
    return t("accounts.fetchFailed")
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
    chatUnlimited?: boolean
    completionsUnlimited?: boolean
    premiumUnlimited?: boolean
  },
  key: "chatPercent" | "completionsPercent" | "premiumPercent",
): number {
  if (status.status === "error") {
    return 0
  }

  if (
    (key === "chatPercent" && status.chatUnlimited) ||
    (key === "completionsPercent" && status.completionsUnlimited) ||
    (key === "premiumPercent" && status.premiumUnlimited)
  ) {
    return 100
  }

  return status[key] ?? 0
}

function resolveUsageValue(
  status: AccountListItem["usage"],
  key: "chatPercent" | "completionsPercent" | "premiumPercent",
): string {
  if (status.status === "error") {
    return t("accounts.fetchFailed")
  }

  if (
    (key === "chatPercent" && status.chatUnlimited) ||
    (key === "completionsPercent" && status.completionsUnlimited) ||
    (key === "premiumPercent" && status.premiumUnlimited)
  ) {
    return "\u221e"
  }

  return formatPercent(status[key])
}

function formatAccountType(accountType: AccountType): string {
  if (accountType === "business") {
    return t("accounts.accountTypeBusiness")
  }

  if (accountType === "enterprise") {
    return t("accounts.accountTypeEnterprise")
  }

  return t("accounts.accountTypeIndividual")
}

function hideBrokenAvatar(event: Event): void {
  ;(event.target as HTMLImageElement).style.display = "none"
}

function clearDragState(): void {
  draggedAccountId.value = ""
  dragTargetAccountId.value = ""
  dragTargetPosition.value = ""
}

function handleDragStart(event: DragEvent, account: AccountListItem): void {
  if (!canReorder.value) {
    event.preventDefault()
    return
  }

  draggedAccountId.value = account.id
  event.dataTransfer?.setData("text/plain", account.id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move"
  }
}

function handleDragOver(event: DragEvent, account: AccountListItem): void {
  if (!draggedAccountId.value || draggedAccountId.value === account.id) {
    return
  }

  event.preventDefault()

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  dragTargetAccountId.value = account.id
  dragTargetPosition.value =
    event.clientY < rect.top + rect.height / 2 ? "before" : "after"
}

function hasOrderChanged(nextOrder: Array<string>): boolean {
  return nextOrder.some((accountId, index) => accountId !== accounts.value[index]?.id)
}

async function handleDrop(event: DragEvent, targetAccount: AccountListItem): Promise<void> {
  event.preventDefault()

  const sourceAccountId =
    draggedAccountId.value || event.dataTransfer?.getData("text/plain") || ""
  const position = dragTargetPosition.value || "after"

  if (!sourceAccountId || sourceAccountId === targetAccount.id) {
    clearDragState()
    return
  }

  const nextOrder = accounts.value
    .map((account) => account.id)
    .filter((accountId) => accountId !== sourceAccountId)
  const targetIndex = nextOrder.indexOf(targetAccount.id)

  if (targetIndex < 0) {
    clearDragState()
    return
  }

  nextOrder.splice(position === "before" ? targetIndex : targetIndex + 1, 0, sourceAccountId)

  if (!hasOrderChanged(nextOrder)) {
    clearDragState()
    return
  }

  actionBusyId.value = `reorder:${sourceAccountId}`

  try {
    await reorderAccounts(nextOrder)
    noticeStore.success(t("accounts.reorderSuccess"))
    await refreshAll()
  } catch (error) {
    noticeStore.error(getErrorMessage(error, t("accounts.reorderFailed")))
  } finally {
    actionBusyId.value = ""
    clearDragState()
  }
}

onBeforeUnmount(() => {
  clearPollTimer()
})
</script>

<template>
  <div id="tab-accounts" class="tab-content active">
      <div class="card">
        <div class="card-header">
          <span class="card-title">{{ t("accounts.githubAccounts") }}</span>
          <button type="button" class="btn btn-primary" @click="openAuthModal">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
            </svg>
            <span>{{ t("accounts.addAccount") }}</span>
          </button>
      </div>

      <ul v-if="accountsQuery.isLoading.value" class="account-list">
        <li class="empty-state">{{ t("accounts.loadingAccounts") }}</li>
      </ul>
      <ul v-else-if="accounts.length === 0" class="account-list">
        <li class="empty-state">{{ t("accounts.noAccounts") }}</li>
      </ul>
      <ul v-else class="account-list">
        <li
          v-for="account in accounts"
          :key="account.id"
          class="account-item"
          :class="{
            active: account.isActive,
            'drag-source': draggedAccountId === account.id,
            'drag-target-before': dragTargetAccountId === account.id && dragTargetPosition === 'before',
            'drag-target-after': dragTargetAccountId === account.id && dragTargetPosition === 'after',
          }"
          :data-account-id="account.id"
          @dragover="handleDragOver($event, account)"
          @drop="handleDrop($event, account)"
          @dragend="clearDragState"
        >
          <div
            class="account-drag-handle"
            :class="{
              disabled: !canReorder,
              dragging: draggedAccountId === account.id,
            }"
            :draggable="canReorder"
            :title="canReorder ? t('accounts.dragToSort') : undefined"
            :aria-label="canReorder ? t('accounts.dragToSort') : undefined"
            @dragstart="handleDragStart($event, account)"
          >
            <img
              class="account-avatar"
              :src="account.avatarUrl"
              alt=""
              draggable="false"
              @error="hideBrokenAvatar"
            >
          </div>
          <div class="account-info">
            <div class="account-name">{{ account.login }}</div>
            <div class="account-type">
              {{ formatAccountType(account.accountType) }}
            </div>
          </div>

          <div class="account-usage">
            <div v-if="account.usage.status === 'error'" class="account-usage-error">
              {{ resolveUsageLabel(account.usage) }}
            </div>
            <div v-else class="account-usage-bars">
              <div class="account-usage-row">
                <span class="account-usage-type">{{ t("accounts.metricPremium") }}</span>
                <span class="account-usage-track">
                  <span
                    class="account-usage-fill premium"
                    :style="{ '--usage': resolveUsagePercent(account.usage, 'premiumPercent') }"
                  />
                </span>
                <span class="account-usage-value">{{ resolveUsageValue(account.usage, "premiumPercent") }}</span>
              </div>
              <div class="account-usage-row">
                <span class="account-usage-type">{{ t("accounts.metricChat") }}</span>
                <span class="account-usage-track">
                  <span
                    class="account-usage-fill chat"
                    :style="{ '--usage': resolveUsagePercent(account.usage, 'chatPercent') }"
                  />
                </span>
                <span class="account-usage-value">{{ resolveUsageValue(account.usage, "chatPercent") }}</span>
              </div>
              <div class="account-usage-row">
                <span class="account-usage-type">{{ t("accounts.metricCompletions") }}</span>
                <span class="account-usage-track">
                  <span
                    class="account-usage-fill completions"
                    :style="{ '--usage': resolveUsagePercent(account.usage, 'completionsPercent') }"
                  />
                </span>
                <span class="account-usage-value">{{ resolveUsageValue(account.usage, "completionsPercent") }}</span>
              </div>
            </div>
          </div>

          <div class="account-actions">
            <button
              v-if="account.isActive"
              type="button"
              class="btn btn-primary btn-sm"
            >
              {{ t("accounts.active") }}
            </button>
            <button
              v-else
              type="button"
              class="btn btn-sm"
              :disabled="actionBusyId === `activate:${account.id}`"
              @click="activateMutation.mutate(account.id)"
            >
              {{ t("accounts.switch") }}
            </button>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              :disabled="actionBusyId === `delete:${account.id}`"
              @click="deleteMutation.mutate(account.id)"
            >
              {{ t("accounts.delete") }}
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
