<!--
  TabbedSearch.vue - 带标签页的搜索组件
  
  Features:
  - 為不同的方案提供標籤式的搜索頁面
  - 根據選項的不同，動態加載不同的字根表和拆分規則
  - 優化數據讀取性能，支持懶惰加載

  Modification History:
  - 2025-08-14 by 朱複丹: 初版
  - 2025-12-16 by 朱複丹: 增加靈明方案.
-->

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import OptimizedFetchSearch from "./OptimizedFetchSearch.vue";
import { SCHEMES } from '../shared/schemes';

// Define available schemes
interface SearchScheme {
    id: string
    name: string
    chaifenUrl: string
    zigenUrl: string
    description?: string
    supplement?: boolean    // 是否支持回頭碼
    ming?: boolean          // 日月方案
    wafel?: boolean         // 華方案
    ling?: boolean          // 靈明方案
}

const props = defineProps<{
    defaultScheme?: string
    supplement?: boolean
    hideSchemeButtons?: boolean
}>()

const { hideSchemeButtons } = props

// 共享的用戶輸入狀態，切換標籤時保持不變
const sharedUserInput = ref('')

// Available search schemes
const schemes: SearchScheme[] = SCHEMES

// Current active scheme
const activeScheme = ref(props.defaultScheme || 'star')

// 監聽 props.defaultScheme 的變化
watch(() => props.defaultScheme, (newScheme) => {
    if (newScheme && newScheme !== activeScheme.value) {
        activeScheme.value = newScheme;
    }
}, { immediate: true });

// Get current scheme data
const currentScheme = computed(() => {
    return schemes.find(s => s.id === activeScheme.value) || schemes[0]
})

// Computed property for rule based on current scheme
const effectiveRule = computed(() => {
    // 直接使用方案的 id 作为 rule
    return currentScheme.value.id
})

// Switch to a different scheme
function switchScheme(schemeId: string) {
    if (schemes.find(s => s.id === schemeId)) {
        activeScheme.value = schemeId
    }
}

// 获取方案对应的汉字
function getSchemeChar(schemeId: string): string {
    const charMap: Record<string, string> = {
        'joy': '卿',
        'light': '光',
        'star': '星',
        'ming': '明',
        'ling': '靈',
        'wafel': '華'
    };
    return charMap[schemeId] || '?';
}

// Key for forcing component refresh when scheme changes, but keep input content
const componentKey = computed(() => `search-${activeScheme.value}`)
</script>

<template>
    <div class="tabbed-search-container">
        <!-- 方案切换圆形按钮 -->
        <div v-if="!hideSchemeButtons" class="flex justify-center mb-6 space-x-4">
            <button v-for="scheme in schemes" :key="scheme.id" @click="switchScheme(scheme.id)" :class="[
                'scheme-button',
                { 'scheme-button-active': activeScheme === scheme.id }
            ]" :title="scheme.description">
                <span class="scheme-text">{{ getSchemeChar(scheme.id) }}</span>
            </button>
        </div>

        <!-- Current Scheme Info -->
        <div v-if="!hideSchemeButtons" class="mb-3 text-sm text-gray-600 dark:text-gray-400 text-center">
            <span class="font-medium">當前方案</span>：{{ currentScheme.name }}
            <span v-if="currentScheme.description" class="ml-2 text-xs opacity-75">{{ currentScheme.description
                }}</span>
        </div>

        <!-- Search Component -->
        <OptimizedFetchSearch :key="componentKey" :chaifenUrl="currentScheme.chaifenUrl"
            :zigenUrl="currentScheme.zigenUrl" :rule="effectiveRule" v-model="sharedUserInput" />
    </div>
</template>

<style scoped>
.tabbed-search-container {
    width: 100%;
    max-width: 56rem;
    margin: 0 auto;
}

/* 圓形方案按鈕樣式 */
.scheme-button {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background-color: rgb(59 130 246);
    /* 藍色背景 */
    border: 2px solid rgb(59 130 246);
    color: white;
    font-weight: 600;
    font-size: 1.1rem;
    transition: all 0.3s ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.scheme-button:hover {
    background-color: rgb(37 99 235);
    /* 更深的藍色 */
    border-color: rgb(37 99 235);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.scheme-button-active {
    background-color: rgb(29 78 216);
    /* 活躍狀態的深藍色 */
    border-color: rgb(29 78 216);
    box-shadow: 0 0 0 3px rgba(59 130 246, 0.3);
    /* 外發光效果 */
}

.scheme-button-active:hover {
    background-color: rgb(29 78 216);
    border-color: rgb(29 78 216);
}

.scheme-text {
    font-family: 'Noto Serif TC', 'Noto Serif SC', 'Source Han Serif', 'Source Han Serif TC',
        'Source Han Serif SC', serif;
    /* 使用支持繁體字的字體 */
}

/* 暗色模式下的圓形按鈕 */
@media (prefers-color-scheme: dark) {
    .scheme-button {
        background-color: rgb(37 99 235);
        border-color: rgb(37 99 235);
    }

    .scheme-button:hover {
        background-color: rgb(29 78 216);
        border-color: rgb(29 78 216);
    }

    .scheme-button-active {
        background-color: rgb(29 78 216);
        border-color: rgb(29 78 216);
        box-shadow: 0 0 0 3px rgba(59 130 246, 0.4);
    }
}
</style>
