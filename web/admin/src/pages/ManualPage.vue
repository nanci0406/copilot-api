<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

const { locale } = useI18n()

const manualZhHtml = `<section class="manual-section">
  <div class="manual-section-title">1. 每个端点可用模型</div>
  <div class="manual-table-wrap">
    <table class="manual-table">
      <thead>
        <tr>
          <th>模型</th>
          <th>chat/completions</th>
          <th>responses</th>
          <th>messages</th>
          <th>gemini</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>gpt-4.1</td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td></tr>
        <tr><td>gpt-5.2</td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td></tr>
        <tr><td>gpt-codex 系列</td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td></tr>
        <tr><td>gpt-5.4</td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td></tr>
        <tr><td>gpt-5.4-mini</td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td></tr>
        <tr><td>Claude 系列</td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td></tr>
        <tr><td>Gemini 系列</td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag ok">可用</span></td></tr>
        <tr><td>grok-code-fast-1</td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td><td><span class="manual-tag ok">可用</span></td><td><span class="manual-tag no">不可用</span></td></tr>
      </tbody>
    </table>
  </div>
  <div class="manual-note">规则：responses 仅用于 Codex 与 gpt-5.4 相关模型；gemini 端点仅用于 Gemini 相关模型；chat/completions 与 messages 可用于所有模型。</div>
</section>
<section class="manual-section">
  <div class="manual-section-title">2.推荐结合 <a href="https://github.com/tbphp/gpt-load" target="_blank" rel="noopener noreferrer">GPT-Load</a>（推荐，使用简单，全面，方便）或者 <a href="https://github.com/QuantumNous/new-api" target="_blank" rel="noopener noreferrer">New API</a>使用</div>
  <ol class="manual-list">
    <li>chat 组（openai）：可放全部模型。</li>
    <li>messages 组（anthropic）：可放全部模型。</li>
    <li>responses 组（openai-response）：仅放 Codex 与 gpt-5.4 / gpt-5.4-mini。</li>
    <li>gemini 组（gemini）：仅放 Gemini 相关模型。</li>
  </ol>
</section>`

const manualEnHtml = `<section class="manual-section">
  <div class="manual-section-title">1. Available models by endpoint</div>
  <div class="manual-table-wrap">
    <table class="manual-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>chat/completions</th>
          <th>responses</th>
          <th>messages</th>
          <th>gemini</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>gpt-4.1</td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td></tr>
        <tr><td>gpt-5.2</td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td></tr>
        <tr><td>gpt-codex series</td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td></tr>
        <tr><td>gpt-5.4</td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td></tr>
        <tr><td>gpt-5.4-mini</td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td></tr>
        <tr><td>Claude series</td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td></tr>
        <tr><td>Gemini series</td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag ok">Available</span></td></tr>
        <tr><td>grok-code-fast-1</td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td><td><span class="manual-tag ok">Available</span></td><td><span class="manual-tag no">Unavailable</span></td></tr>
      </tbody>
    </table>
  </div>
  <div class="manual-note">Rules: responses is only for Codex and gpt-5.4 related models; gemini endpoint is only for Gemini models; chat/completions and messages can be used for all models.</div>
</section>
<section class="manual-section">
  <div class="manual-section-title">2. Recommended to use with <a href="https://github.com/tbphp/gpt-load" target="_blank" rel="noopener noreferrer">GPT-Load</a> and <a href="https://github.com/QuantumNous/new-api" target="_blank" rel="noopener noreferrer">New API</a></div>
  <ol class="manual-list">
    <li>chat group (openai): all models are allowed.</li>
    <li>messages group (anthropic): all models are allowed.</li>
    <li>responses group (openai-response): only Codex + gpt-5.4 / gpt-5.4-mini.</li>
    <li>gemini group (gemini): only Gemini models.</li>
  </ol>
</section>`

const manualHtml = computed(() =>
  locale.value === "zh" ? manualZhHtml : manualEnHtml,
)

const manualTitle = computed(() =>
  locale.value === "zh" ? "\u4f7f\u7528\u624b\u518c" : "User Manual",
)

const manualSubtitle = computed(() =>
  locale.value === "zh" ?
      "\u7aef\u70b9\u6620\u5c04 + \u8de8\u9879\u76ee\u63a5\u5165"
    : "Endpoint mapping + cross-project integration",
)
</script>

<template>
  <div id="tab-manual" class="tab-content active">
    <div class="card">
      <div class="card-header">
        <div class="settings-header-main">
          <span class="card-title">{{ manualTitle }}</span>
          <p class="settings-subtitle">{{ manualSubtitle }}</p>
        </div>
      </div>
      <article class="manual-doc" v-html="manualHtml" />
    </div>
  </div>
</template>
