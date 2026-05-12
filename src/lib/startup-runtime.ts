import consola from "consola"

import type { ReadonlyAppConfig } from "./config"

import { getActiveAccount, setActiveAccount } from "./accounts"
import { runtimeManager } from "./runtime-manager"
import { state } from "./state"

export async function initializeStartupRuntime(
  config: ReadonlyAppConfig,
): Promise<void> {
  const activeAccount = await getActiveAccount()

  if (!activeAccount) {
    runtimeManager.clearActiveContext()
    consola.warn("No account configured. Visit /admin to add an account.")
    return
  }

  if (!config.activeAccountId) {
    await setActiveAccount(activeAccount.id)
  }

  if (state.showToken) {
    consola.info("GitHub token:", activeAccount.token)
  }

  try {
    await runtimeManager.initialize(activeAccount)
    consola.info(`Logged in as ${activeAccount.login}`)

    const availableModels = state.models?.data
      .map((model) => `- ${model.id}`)
      .join("\n")

    if (availableModels) {
      consola.info(`Available models: \n${availableModels}`)
    }
  } catch (error) {
    runtimeManager.clearActiveContext()
    consola.error(
      `Failed to initialize active account ${activeAccount.login}; continuing without an active runtime account. Visit /admin to refresh or replace this account.`,
      error,
    )
  }
}
