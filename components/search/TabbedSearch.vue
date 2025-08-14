<!--
  TabbedSearch.vue - 带标签页的搜索组件
  
  Features:
  - 為不同的方案提供標籤式的搜索頁面
  - 根據選項的不同，動態加載不同的字根表和拆分規則
  - 優化數據讀取性能，支持懶惰加載

  Modification History:
  - 2025-08-14 by 朱複丹: 初版
-->

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import OptimizedFetchSearch from "./OptimizedFetchSearch.vue";

// Define available schemes
interface SearchScheme {
    id: string
    name: string
    chaifenUrl: string
    zigenUrl: string
    description?: string
    supplement?: boolean    // 是否支持回頭碼
    ming?: boolean          // 日月方案
}

const props = defineProps<{
    defaultScheme?: string
    supplement?: boolean
}>()

// 共享的用戶輸入狀態，切換標籤時保持不變
const sharedUserInput = ref('')

// Available search schemes
const schemes: SearchScheme[] = [
    {
        id: 'joy',
        name: '卿雲',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-joy.csv',
        description: '卿雲爛兮糾縵縵兮',
        supplement: false,
        ming: false
    },
    {
        id: 'light',
        name: '光華',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-light.csv',
        description: '日月光華旦復旦兮',
        supplement: true,
        ming: false
    },
    {
        id: 'star',
        name: '星陳',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-star.csv',
        description: '明明上天爛然星陳',
        supplement: true,
        ming: false
    },

    {
        id: 'ming',
        name: '日月',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-ming.csv',
        description: '日月有常星辰有行',
        supplement: false,
        ming: true
    },
]

// Current active scheme
const activeScheme = ref(props.defaultScheme || 'star')

// Get current scheme data
const currentScheme = computed(() => {
    return schemes.find(s => s.id === activeScheme.value) || schemes[0]
})

// Computed properties for supplement and ming based on current scheme
const effectiveSupplement = computed(() => {
    // 使用当前方案的supplement配置
    return currentScheme.value.supplement || false
})

const effectiveMing = computed(() => {
    // ming 屬性主要由當前方案決定
    return currentScheme.value.ming || false
})

// Switch to a different scheme
function switchScheme(schemeId: string) {
    if (schemes.find(s => s.id === schemeId)) {
        activeScheme.value = schemeId
    }
}

// Key for forcing component refresh when scheme changes, but keep input content
const componentKey = computed(() => `search-${activeScheme.value}`)
</script>

<template>
    <div class="tabbed-search-container">
        <!-- Tab Navigation -->
        <div class="tabs tabs-boxed mb-4 bg-base-200">
            <button v-for="scheme in schemes" :key="scheme.id" @click="switchScheme(scheme.id)" :class="[
                'tab tab-lg tab-override',
                { 'tab-active': activeScheme === scheme.id }
            ]" :title="scheme.description">
                {{ scheme.name }}
            </button>
        </div>

        <!-- Current Scheme Info -->
        <div class="mb-3 text-sm text-gray-600 dark:text-gray-400 text-center">
            <span class="font-medium">當前方案</span>：{{ currentScheme.name }}
            <span v-if="currentScheme.description" class="ml-2 text-xs opacity-75">{{ currentScheme.description
            }}</span>
        </div>

        <!-- Search Component -->
        <OptimizedFetchSearch :key="componentKey" :chaifenUrl="currentScheme.chaifenUrl"
            :zigenUrl="currentScheme.zigenUrl" :supplement="effectiveSupplement" :ming="effectiveMing"
            v-model="sharedUserInput" />
    </div>
</template>

<style scoped>
.tabbed-search-container {
    width: 100%;
    max-width: 56rem;
    margin: 0 auto;
}

/* Tab 顏色覆蓋 - 使用專門的 override 類 */
.tab-override {
    color: rgb(107 114 128) !important;
    /* 覆蓋 zigen-font 的黑色 */
}

.tab-override:hover {
    color: rgb(75 85 99) !important;
}

.tab-override.tab-active {
    color: white !important;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
    .tab-override {
        color: rgb(156 163 175) !important;
    }

    .tab-override:hover {
        color: rgb(209 213 219) !important;
    }
}

/* Custom styling for better visual hierarchy */
.tabs-boxed {
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    border: 1px solid var(--fallback-b3, oklch(var(--b3)/var(--tw-border-opacity)));
}

/* Responsive design */
@media (max-width: 640px) {
    .tab {
        font-size: 0.75rem;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }

    .tabs-boxed {
        flex-wrap: wrap;
        gap: 0.25rem;
    }
}
</style>
