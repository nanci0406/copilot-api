<script setup lang="ts">
import DOMPurify from "dompurify"
import { marked } from "marked"
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import manualEn from "@/content/manual.en.md?raw"
import manualZh from "@/content/manual.zh.md?raw"

const { locale, t } = useI18n()

const manualHtml = computed(() =>
  DOMPurify.sanitize(
    String(marked.parse(locale.value === "zh" ? manualZh : manualEn)),
  ),
)
</script>

<template>
  <div class="tab-content active">
    <div class="card">
      <div class="card-header">
        <div class="settings-header-main">
          <span class="card-title">{{ t("manual.title") }}</span>
          <p class="settings-subtitle">{{ t("manual.subtitle") }}</p>
        </div>
      </div>
      <article class="manual-doc markdown-body" v-html="manualHtml" />
    </div>
  </div>
</template>
