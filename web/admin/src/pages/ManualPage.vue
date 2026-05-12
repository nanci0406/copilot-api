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
  <section class="page-card">
    <h1 class="page-title">{{ t("manual.title") }}</h1>
    <p class="page-subtitle">{{ t("manual.subtitle") }}</p>

    <article class="page-section markdown-body" v-html="manualHtml" />
  </section>
</template>
