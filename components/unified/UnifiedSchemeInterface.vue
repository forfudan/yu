<!--
  UnifiedSchemeInterface.vue - 統一的方案切換界面
  
  功能：
  - 統一管理 TabbedSearch 和 ZigenMap 的方案切換
  - 單一按鈕組控制兩個組件同時切換方案
  - 保持搜索輸入狀態

  Modification History:
  - 2025-08-14 by 朱複丹: 初版
-->

<script setup lang="ts">
import { ref, computed } from 'vue'
import TabbedSearch from '../search/TabbedSearch.vue'
import ZigenMap from '../zigen/ZigenMap.vue'
import SchemeSelector from '../shared/SchemeSelector.vue'
import { SCHEMES, DEFAULT_SCHEME } from '../shared/schemes'

const props = defineProps<{
    defaultScheme?: string
}>()

// 統一的方案狀態
const activeScheme = ref(props.defaultScheme || DEFAULT_SCHEME)

// 當前方案信息
const currentScheme = computed(() => {
    return SCHEMES.find(s => s.id === activeScheme.value) || SCHEMES[0]
})

// 根據方案決定字根列寬度
const columnMinWidth = computed(() => {
    switch (activeScheme.value) {
        case 'ming':
            return '1.0rem'
        case 'ling':
            return '1.0rem'
        default:
            return '1.0rem'
    }
})


// 方案切換處理
function handleSchemeChange(schemeId: string) {
    activeScheme.value = schemeId
}
</script>

<template>
    <div class="unified-scheme-interface">
        <!-- 統一的方案選擇器 -->
        <div class="unified-scheme-selector">
            <div class="scheme-header-row">
                <!-- 方案信息 -->
                <div class="scheme-info hidden md:block">
                    <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        {{ currentScheme.name }}輸入法
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ currentScheme.description }}
                    </p>
                </div>

                <!-- 方案按鈕 -->
                <div class="scheme-buttons">
                    <!-- 方案選擇提示 -->
                    <div class="scheme-hint">
                        <span class="hint-text">點擊下方按鈕選擇輸入法</span>
                        <div class="hint-divider"></div>
                    </div>
                    <SchemeSelector :schemes="SCHEMES" :active-scheme="activeScheme"
                        @scheme-changed="handleSchemeChange" />
                </div>
            </div>
        </div>

        <!-- 搜索組件 -->
        <div class="search-section">
            <TabbedSearch :default-scheme="activeScheme" :hide-scheme-buttons="true" />
        </div>

        <!-- 字根圖組件 -->
        <div class="zigen-section mt-8">
            <ZigenMap :default-scheme="activeScheme" :column-min-width="columnMinWidth" />
        </div>
    </div>
</template>

<style scoped>
.unified-scheme-interface {
    width: 100%;
    max-width: 66rem;
    margin: 0 auto;
}

.unified-scheme-selector {
    background: var(--vp-c-bg-soft);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border: 1px solid var(--vp-c-divider);
    max-width: 56rem;
    margin-left: auto;
    margin-right: auto;
}

.scheme-header-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2.5rem;
}

.scheme-info {
    flex-shrink: 0;
    text-align: left;
}

.scheme-buttons {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    /* 增加间距，让提示离按钮更远 */
}

/* 方案選擇提示樣式 */
.scheme-hint {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: -0.5rem;
    /* 向上移动，缩小与上方边框的距离 */
    gap: 0.5rem;
    /* 文字和分割线之间的间距 */
}

.hint-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(to right,
            transparent 0%,
            var(--vp-c-divider) 20%,
            var(--vp-c-divider) 80%,
            transparent 100%);
    opacity: 0.5;
}

.hint-text {
    font-size: 0.75rem;
    color: var(--vp-c-text-2);
    font-weight: 500;
    white-space: nowrap;
    /* 移除所有背景、边框和阴影，保持简约 */
}

/* 简约的提示hover效果 */
.hint-text:hover {
    color: var(--vp-c-brand);
}

/* 暗色模式下的提示样式 */
.dark .hint-text {
    color: var(--vp-c-text-2);
}

.scheme-info h3 {
    margin: 0;
    color: var(--vp-c-text-1);
}

.scheme-info p {
    margin: 0;
    color: var(--vp-c-text-2);
}

.search-section,
.zigen-section {
    position: relative;
}

.section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--vp-c-text-1);
    margin-bottom: 1rem;
    text-align: center;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--vp-c-divider);
}

/* 響應式設計 */
@media (max-width: 768px) {
    .unified-scheme-selector {
        padding: 1rem;
        margin-bottom: 1.5rem;
    }

    .scheme-header-row {
        flex-direction: column;
        gap: 1.5rem;
        align-items: center;
        justify-content: center;
    }

    .scheme-info {
        text-align: center;
    }

    .scheme-buttons {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        gap: 1rem;
        /* 移动端稍微缩小间距 */
    }

    .scheme-hint {
        margin-top: -0.25rem;
        /* 移动端向上移动的距离稍小 */
        gap: 0.4rem;
        /* 移动端稍微缩小文字和线的间距 */
    }

    .hint-text {
        font-size: 0.7rem;
    }

    .section-title {
        font-size: 1.1rem;
    }
}
</style>
