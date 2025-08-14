<!--
  UnifiedSchemeInterface.vue - 統一的方案切換界面
  
  功能：
  - 統一管理 TabbedSearch 和 ZigenMap 的方案切換
  - 單一按鈕組控制兩個組件同時切換方案
  - 保持搜索輸入狀態
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
                <div class="scheme-info">
                    <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        當前方案：{{ currentScheme.name }}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ currentScheme.description }}
                    </p>
                </div>

                <!-- 方案按鈕 -->
                <div class="scheme-buttons">
                    <SchemeSelector :schemes="SCHEMES" :active-scheme="activeScheme"
                        @scheme-changed="handleSchemeChange" />
                </div>
            </div>
        </div>

        <!-- 搜索組件 -->
        <div class="search-section">
            <TabbedSearch :key="`search-${activeScheme}`" :default-scheme="activeScheme" :hide-scheme-buttons="true" />
        </div>

        <!-- 字根圖組件 -->
        <div class="zigen-section mt-8">
            <ZigenMap :key="`zigen-${activeScheme}`" :default-scheme="activeScheme" :hide-scheme-buttons="true" />
        </div>
    </div>
</template>

<style scoped>
.unified-scheme-interface {
    width: 100%;
    max-width: 56rem;
    margin: 0 auto;
}

.unified-scheme-selector {
    background: var(--vp-c-bg-soft);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border: 1px solid var(--vp-c-divider);
}

.scheme-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
}

.scheme-info {
    flex: 1;
    text-align: left;
}

.scheme-buttons {
    flex-shrink: 0;
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
        gap: 1rem;
        align-items: flex-start;
    }

    .scheme-info {
        text-align: center;
        width: 100%;
    }

    .scheme-buttons {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    .section-title {
        font-size: 1.1rem;
    }
}
</style>
