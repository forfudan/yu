<!--
  SchemeSelector.vue - 共享的方案選擇器組件
  
  用於 TabbedSearch 和 ZigenMap 的統一方案切換按鈕
-->

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { BaseScheme } from './schemes'

interface Props {
    schemes: BaseScheme[]
    activeScheme: string
}

interface Emits {
    (e: 'scheme-changed', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 获取方案对应的汉字
function getSchemeChar(schemeId: string): string {
    const charMap: Record<string, string> = {
        'joy': '卿',
        'light': '光',
        'star': '星',
        'ming': '明'
    }
    return charMap[schemeId] || '?'
}

// 切换方案
function switchScheme(schemeId: string) {
    emit('scheme-changed', schemeId)
}
</script>

<template>
    <div class="scheme-selector">
        <div class="flex justify-center mb-6 space-x-4">
            <button v-for="scheme in schemes" :key="scheme.id" @click="switchScheme(scheme.id)" :class="[
                'scheme-button',
                { 'scheme-button-active': activeScheme === scheme.id }
            ]" :title="scheme.description || scheme.name">
                <span class="scheme-text">{{ getSchemeChar(scheme.id) }}</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
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
    font-family: 'Noto Serif SC', serif;
    /* 使用宋體字體 */
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