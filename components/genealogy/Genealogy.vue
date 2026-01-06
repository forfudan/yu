<!--
    Genealogy.vue - 輸入法源流圖組件

  Features:
  - 展示輸入法發展歷史和演化關係
  - 基於時間軸的可視化佈局
  - 支持按特性和作者追溯源流關係
  - 響應式設計和暗色模式支持
  
  Major Modification History:
  - 2026-01-05 by 朱宇浩: 初版，實現基礎功能
-->

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { SchemaData, YearLabel, GenealogyConfig, LayoutNode } from './types'
import {
    loadSchemas,
    sortSchemasByDate,
    generateYearLabels,
    calculateYPosition,
    getYearRange,
    getAllFeatures,
    getAllAuthors,
    formatDate,
    parseYear
} from './dataLoader'

// Props
const props = withDefaults(defineProps<{
    config?: Partial<GenealogyConfig>
}>(), {
    config: () => ({})
})

// 默認配置
const defaultConfig: GenealogyConfig = {
    width: 1200,
    height: 800,
    nodeSpacing: 20,
    yearSpacing: 100,
    reverseTimeline: false,
    showDeprecated: true,
    highlightFeatures: []
}

// 合併配置
const config = computed<GenealogyConfig>(() => ({
    ...defaultConfig,
    ...props.config
}))

// 數據狀態
const schemas = ref<SchemaData[]>([])
const yearLabels = ref<YearLabel[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// 佈局狀態
const minYear = ref(0)
const maxYear = ref(0)
const allFeatures = ref<string[]>([])
const allAuthors = ref<string[]>([])

// 交互狀態
const focusedSchemaId = ref<string | null>(null)
const hoveredSchemaId = ref<string | null>(null)

// 篩選狀態
const selectedFeatures = ref<string[]>([])
const selectedAuthors = ref<string[]>([])
const searchQuery = ref('')

// 計算屬性：過濾後的輸入法
const filteredSchemas = computed(() => {
    let result = schemas.value

    // 過濾停止維護的
    if (!config.value.showDeprecated) {
        result = result.filter(s => !s.deprecated)
    }

    // 按特性過濾
    if (selectedFeatures.value.length > 0) {
        result = result.filter(s =>
            selectedFeatures.value.some(f => s.features.includes(f))
        )
    }

    // 按作者過濾
    if (selectedAuthors.value.length > 0) {
        result = result.filter(s =>
            selectedAuthors.value.some(a => s.authors.includes(a))
        )
    }

    // 搜索過濾
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.authors.some(a => a.toLowerCase().includes(query)) ||
            s.description?.toLowerCase().includes(query)
        )
    }

    return result
})

// 計算屬性：排序後的輸入法
const sortedSchemas = computed(() => {
    return sortSchemasByDate(filteredSchemas.value, config.value.reverseTimeline)
})

// 計算屬性：佈局節點（簡化版，後續會實現完整的佈局算法）
const layoutNodes = computed<LayoutNode[]>(() => {
    const nodes: LayoutNode[] = []
    const yearSpacing = config.value.yearSpacing || 100

    sortedSchemas.value.forEach((schema, index) => {
        const y = calculateYPosition(
            schema,
            minYear.value,
            yearSpacing,
            config.value.reverseTimeline
        )

        // 簡單的X坐標分配（後續會改進）
        const x = 300 + (index % 3) * 250

        nodes.push({
            schema,
            x,
            y: y + 50, // 預留頂部空間
            width: 200,
            height: 80
        })
    })

    return nodes
})

// 加載數據
async function loadData() {
    loading.value = true
    error.value = null

    try {
        // 加載輸入法數據
        const data = await loadSchemas()
        if (data.length === 0) {
            throw new Error('無法加載數據')
        }

        schemas.value = data

        // 計算年份範圍
        const range = getYearRange(data)
        minYear.value = range.minYear
        maxYear.value = range.maxYear

        // 生成年份標籤
        yearLabels.value = generateYearLabels(
            data,
            config.value.yearSpacing,
            config.value.reverseTimeline
        )

        // 獲取所有特性和作者
        allFeatures.value = getAllFeatures(data)
        allAuthors.value = getAllAuthors(data)

        console.log('數據加載完成:', {
            總數: data.length,
            年份範圍: `${minYear.value}-${maxYear.value}`,
            特性數: allFeatures.value.length,
            作者數: allAuthors.value.length
        })

    } catch (err) {
        error.value = err instanceof Error ? err.message : '加載失敗'
        console.error('加載數據時出錯:', err)
    } finally {
        loading.value = false
    }
}

// 點擊卡片
function handleCardClick(schemaId: string) {
    focusedSchemaId.value = focusedSchemaId.value === schemaId ? null : schemaId
}

// Hover 卡片
function handleCardHover(schemaId: string | null) {
    hoveredSchemaId.value = schemaId
}

// 反轉時間軸
function toggleTimeline() {
    if (config.value.reverseTimeline !== undefined) {
        config.value.reverseTimeline = !config.value.reverseTimeline

        // 重新生成年份標籤
        yearLabels.value = generateYearLabels(
            schemas.value,
            config.value.yearSpacing,
            config.value.reverseTimeline
        )
    }
}

// 組件掛載時加載數據
onMounted(() => {
    loadData()
})

// 監聽配置變化
watch(() => props.config, () => {
    yearLabels.value = generateYearLabels(
        schemas.value,
        config.value.yearSpacing,
        config.value.reverseTimeline
    )
}, { deep: true })
</script>

<template>
    <div class="genealogy-container">
        <!-- 加載狀態 -->
        <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>加載中...</p>
        </div>

        <!-- 錯誤狀態 -->
        <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button @click="loadData" class="btn btn-sm btn-primary">重試</button>
        </div>

        <!-- 主內容 -->
        <div v-else class="genealogy-content">
            <!-- 工具欄 -->
            <div class="toolbar">
                <div class="toolbar-left">
                    <h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-300">
                        輸入法源流圖
                    </h2>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                        共 {{ filteredSchemas.length }} 個輸入法
                        ({{ minYear }}-{{ maxYear }})
                    </span>
                </div>

                <div class="toolbar-right">
                    <!-- 搜索框 -->
                    <input v-model="searchQuery" type="text" placeholder="搜索輸入法..."
                        class="input input-sm input-bordered" />

                    <!-- 反轉時間軸按鈕 -->
                    <button @click="toggleTimeline" class="btn btn-sm btn-outline" title="反轉時間軸">
                        ⇅
                    </button>
                </div>
            </div>

            <!-- 畫布區域 -->
            <div class="canvas-wrapper">
                <svg :width="config.width" :height="config.height" class="genealogy-svg">
                    <!-- 年份標籤 -->
                    <g class="year-labels">
                        <line :x1="50" :y1="50" :x2="50" :y2="config.height! - 50" class="timeline-axis" />
                        <text v-for="label in yearLabels" :key="label.year" :x="40" :y="label.y + 54"
                            class="year-label-text" text-anchor="end">
                            {{ label.year }}
                        </text>
                    </g>

                    <!-- 輸入法卡片 -->
                    <g class="schema-nodes">
                        <g v-for="node in layoutNodes" :key="node.schema.id"
                            :transform="`translate(${node.x}, ${node.y})`" @click="handleCardClick(node.schema.id)"
                            @mouseenter="handleCardHover(node.schema.id)" @mouseleave="handleCardHover(null)"
                            class="schema-node" :class="{
                                focused: focusedSchemaId === node.schema.id,
                                hovered: hoveredSchemaId === node.schema.id
                            }">
                            <!-- 卡片背景 -->
                            <rect :width="node.width" :height="node.height" class="node-bg" rx="8" />

                            <!-- 輸入法名稱 -->
                            <text :x="node.width / 2" :y="30" class="node-title" text-anchor="middle">
                                {{ node.schema.name }}
                            </text>

                            <!-- 作者 -->
                            <text :x="node.width / 2" :y="50" class="node-author" text-anchor="middle">
                                {{ node.schema.authors.join('、') }}
                            </text>

                            <!-- 時間 -->
                            <text :x="node.width / 2" :y="68" class="node-date" text-anchor="middle">
                                {{ formatDate(node.schema.date) }}
                            </text>
                        </g>
                    </g>
                </svg>
            </div>

            <!-- 側邊信息面板 -->
            <div v-if="focusedSchemaId" class="info-panel">
                <div class="info-content">
                    <h3>詳細信息</h3>
                    <button @click="focusedSchemaId = null" class="close-btn">✕</button>
                    <!-- 詳細內容後續添加 -->
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.genealogy-container {
    width: 100%;
    min-height: 600px;
    position: relative;
}

.loading-state,
.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(99, 102, 241, 0.2);
    border-top-color: rgb(99, 102, 241);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.genealogy-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--fallback-b2, oklch(var(--b2)));
    border-radius: 0.5rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.toolbar-left,
.toolbar-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.canvas-wrapper {
    overflow: auto;
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.2));
    border-radius: 0.5rem;
    background: var(--fallback-b1, oklch(var(--b1)));
}

.genealogy-svg {
    display: block;
}

/* 時間軸樣式 */
.timeline-axis {
    stroke: var(--fallback-bc, oklch(var(--bc)/0.3));
    stroke-width: 2;
}

.year-label-text {
    fill: var(--fallback-bc, oklch(var(--bc)/0.6));
    font-size: 12px;
    font-weight: 600;
}

/* 節點樣式 */
.schema-node {
    cursor: pointer;
    transition: all 0.3s ease;
}

.node-bg {
    fill: var(--fallback-b2, oklch(var(--b2)));
    stroke: rgb(99, 102, 241);
    stroke-width: 2;
    transition: all 0.3s ease;
}

.schema-node.hovered .node-bg {
    fill: var(--fallback-b3, oklch(var(--b3)));
    stroke-width: 3;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.schema-node.focused .node-bg {
    fill: rgba(99, 102, 241, 0.1);
    stroke: rgb(99, 102, 241);
    stroke-width: 3;
    filter: drop-shadow(0 6px 12px rgba(99, 102, 241, 0.3));
}

.node-title {
    fill: rgb(79, 70, 229);
    font-size: 14px;
    font-weight: 600;
}

:global(.dark) .node-title {
    fill: rgb(165, 180, 252);
}

.node-author {
    fill: var(--fallback-bc, oklch(var(--bc)/0.7));
    font-size: 12px;
}

.node-date {
    fill: var(--fallback-bc, oklch(var(--bc)/0.5));
    font-size: 10px;
}

/* 信息面板 */
.info-panel {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 300px;
    background: var(--fallback-b1, oklch(var(--b1)));
    border-left: 1px solid var(--fallback-bc, oklch(var(--bc)/0.2));
    padding: 1rem;
    overflow-y: auto;
    z-index: 1000;
}

.info-content {
    position: relative;
}

.close-btn {
    position: absolute;
    right: 0;
    top: 0;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--fallback-bc, oklch(var(--bc)/0.6));
}

.close-btn:hover {
    color: var(--fallback-bc, oklch(var(--bc)));
}

/* 響應式 */
@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .toolbar-left,
    .toolbar-right {
        justify-content: space-between;
    }

    .info-panel {
        width: 100%;
    }
}
</style>
