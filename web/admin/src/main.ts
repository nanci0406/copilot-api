import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query"
import { createApp, type Component } from "vue"

import App from "./App.vue"
import { pinia } from "./app/pinia"
import { i18n } from "./plugins/i18n"
import { router } from "./router"
import { usePreferencesStore } from "./stores/preferences"
import "./styles.css"

const app = createApp(App as Component)
const queryClient = new QueryClient()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(VueQueryPlugin, {
  queryClient,
})

usePreferencesStore(pinia).hydrate()

app.mount("#app")
