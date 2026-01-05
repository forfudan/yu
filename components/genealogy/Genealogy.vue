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
import type { SchemaData, YearLabel, GenealogyConfig, LayoutNode, Connection } from './types.ts'
import {
    loadSchemas,
    sortSchemasByDate,
    generateYearLabels,
    calculateYPosition,
    calculateYearSpacingMap,
    getYearRange,
    getAllFeatures,
    getAllAuthors,
    formatDate,
    parseYear
} from './dataLoader'
import { calculateLayout, optimizeLayout, calculateLayoutQuality } from './layoutEngine'
import { calculateConnections, getConnectionStats } from './connectionEngine'
import {
    generateConnectionPaths,
    getConnectionColor,
    getConnectionStrokeWidth,
    shouldShowConnection
} from './connectionRenderer'

// Props
const props = withDefaults(defineProps<{
    config?: Partial<GenealogyConfig>
}>(), {
    config: () => ({})
})

// 默認配置
const defaultConfig: GenealogyConfig = {
    width: 900,
    height: 1200,
    nodeSpacing: 15,           // 卡片間距從 20 減少到 15
    baseSpacing: 20,           // 短空白期從 30 減少到 20
    schemaSpacing: 50,         // 每個輸入法從 90 減少到 50（卡片更小）
    emptyYearThreshold: 3,     // 連續3年以上空白將被壓縮
    emptySegmentSpacing: 40,   // 空白段總高度從 60 減少到 40
    labelInterval: 5,          // 空白段內每5年顯示一次標籤
    yearSpacing: 100,          // 已棄用，保留以兼容舊配置
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

// 连接关系狀態
const connections = ref<Connection[]>([])
const connectionFilterType = ref<'feature' | 'author' | null>(null)

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

// 計算屬性：年份間距映射表（動態間距）
const yearSpacingMap = computed(() => {
    if (schemas.value.length === 0) return new Map<number, number>()
    return calculateYearSpacingMap(
        schemas.value,
        config.value.baseSpacing || 30,
        config.value.schemaSpacing || 90,
        config.value.emptyYearThreshold || 3,
        config.value.emptySegmentSpacing || 60
    )
})

// 佈局優化選項
const useOptimization = ref(false) // 是否使用力導向優化（可選功能）

// 計算屬性：佈局節點（使用智能佈局算法）
const layoutNodes = computed<LayoutNode[]>(() => {
    if (sortedSchemas.value.length === 0 || minYear.value === 0) {
        return []
    }

    // 使用佈局引擎計算初始佈局（使用動態間距）
    let nodes = calculateLayout(
        sortedSchemas.value,
        config.value,
        minYear.value,
        yearSpacingMap.value
    )

    // 可選：使用力導向算法優化佈局
    if (useOptimization.value && nodes.length > 0) {
        nodes = optimizeLayout(nodes, 30)
    }

    return nodes
})

// 計算屬性：佈局質量分數
const layoutQuality = computed(() => {
    return calculateLayoutQuality(layoutNodes.value)
})

// 計算屬性：動態畫布高度（基於年份間距映射表）
const canvasHeight = computed(() => {
    if (minYear.value === 0 || maxYear.value === 0 || yearSpacingMap.value.size === 0) {
        return config.value.height || 1200
    }
    // 獲取最後一年的累積高度
    const lastYearY = yearSpacingMap.value.get(maxYear.value) || 0
    const baseSpacing = config.value.baseSpacing || 30
    const topPadding = 100
    const bottomPadding = 100
    return lastYearY + baseSpacing + topPadding + bottomPadding
})

// 計算屬性：節點映射（用於連接線繪製）
const nodesMap = computed(() => {
    const map = new Map<string, LayoutNode>()
    layoutNodes.value.forEach(node => {
        map.set(node.schema.id, node)
    })
    return map
})

// 計算屬性：連接路徑
const connectionPaths = computed(() => {
    if (connections.value.length === 0) return []

    return generateConnectionPaths(connections.value, nodesMap.value)
})

// 計算屬性：過濾後的連接
const visibleConnections = computed(() => {
    return connectionPaths.value.filter(({ connection }) =>
        shouldShowConnection(
            connection,
            focusedSchemaId.value,
            connectionFilterType.value
        )
    )
})

// 計算屬性：連接統計
const connectionStats = computed(() => {
    if (connections.value.length === 0) {
        return {
            total: 0,
            featureConnections: 0,
            authorConnections: 0,
            byFeature: new Map(),
            byAuthor: new Map()
        }
    }
    return getConnectionStats(connections.value)
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

        // 生成年份標籤（使用動態間距）
        yearLabels.value = generateYearLabels(
            data,
            yearSpacingMap.value,
            config.value.emptyYearThreshold || 3,
            config.value.labelInterval || 5
        )

        // 獲取所有特性和作者
        allFeatures.value = getAllFeatures(data)
        allAuthors.value = getAllAuthors(data)

        // 計算連接關係
        const sortedData = sortSchemasByDate(data, config.value.reverseTimeline)
        connections.value = calculateConnections(sortedData)

        console.log('數據加載完成:', {
            總數: data.length,
            年份範圍: `${minYear.value}-${maxYear.value}`,
            特性數: allFeatures.value.length,
            作者數: allAuthors.value.length,
            連接數: connections.value.length,
            特性連接: connectionStats.value.featureConnections,
            作者連接: connectionStats.value.authorConnections
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
            yearSpacingMap.value,
            config.value.emptyYearThreshold || 3,
            config.value.labelInterval || 5
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
        yearSpacingMap.value,
        config.value.emptyYearThreshold || 3,
        config.value.labelInterval || 5
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
                    <span v-if="layoutNodes.length > 0" class="text-xs px-2 py-1 rounded" :class="{
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': layoutQuality >= 90,
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': layoutQuality >= 70 && layoutQuality < 90,
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': layoutQuality < 70
                    }" title="佈局質量分數">
                        佈局: {{ Math.round(layoutQuality) }}分
                    </span>
                </div>

                <div class="toolbar-right">
                    <!-- 搜索框 -->
                    <input v-model="searchQuery" type="text" placeholder="搜索輸入法..."
                        class="input input-sm input-bordered" />

                    <!-- 連接類型篩選 -->
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-sm" :class="{ 'btn-active': connectionFilterType === null }"
                            @click="connectionFilterType = null" title="顯示所有連接">
                            全部
                        </button>
                        <button class="btn btn-sm" :class="{ 'btn-active': connectionFilterType === 'feature' }"
                            @click="connectionFilterType = connectionFilterType === 'feature' ? null : 'feature'"
                            title="只顯示特性繼承">
                            特性
                        </button>
                        <button class="btn btn-sm" :class="{ 'btn-active': connectionFilterType === 'author' }"
                            @click="connectionFilterType = connectionFilterType === 'author' ? null : 'author'"
                            title="只顯示作者繼承">
                            作者
                        </button>
                    </div>

                    <!-- 佈局優化開關 -->
                    <label class="flex items-center gap-2 cursor-pointer text-sm">
                        <input v-model="useOptimization" type="checkbox" class="checkbox checkbox-sm" />
                        <span class="text-gray-600 dark:text-gray-400">優化佈局</span>
                    </label>

                    <!-- 反轉時間軸按鈕 -->
                    <button @click="toggleTimeline" class="btn btn-sm btn-outline" title="反轉時間軸">
                        ⇅
                    </button>
                </div>
            </div>

            <!-- 畫布區域 -->
            <div class="canvas-wrapper">
                <svg :width="config.width" :height="canvasHeight" class="genealogy-svg">
                    <!-- 定義箭頭標記 -->
                    <defs>
                        <marker id="arrow-feature" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6"
                            markerHeight="6" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(99, 102, 241, 0.6)" />
                        </marker>
                        <marker id="arrow-author" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6"
                            orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(34, 197, 94, 0.6)" />
                        </marker>
                    </defs>

                    <!-- 連接線（在節點下方） -->
                    <g class="connections">
                        <path v-for="({ connection, path }, index) in visibleConnections"
                            :key="`${connection.from}-${connection.to}-${connection.type}`" :d="path"
                            :stroke="getConnectionColor(connection, 'light')" :stroke-width="getConnectionStrokeWidth(
                                connection,
                                focusedSchemaId === connection.from || focusedSchemaId === connection.to
                            )" fill="none" :marker-end="`url(#arrow-${connection.type})`" :class="{
                                'connection-line': true,
                                [`connection-${connection.type}`]: true,
                                'connection-focused': focusedSchemaId === connection.from || focusedSchemaId === connection.to,
                                'connection-dimmed': focusedSchemaId && focusedSchemaId !== connection.from && focusedSchemaId !== connection.to
                            }">
                            <title>{{ connection.label }}</title>
                        </path>
                    </g>

                    <!-- 年份標籤 -->
                    <g class="year-labels">
                        <line :x1="50" :y1="50" :x2="50" :y2="canvasHeight - 50" class="timeline-axis" />
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

                            <!-- 單行顯示：輸入法名 作者名 | 年份 -->
                            <text :x="10" :y="28" class="node-compact-text" text-anchor="start"
                                shape-rendering="crispEdges" text-rendering="geometricPrecision">
                                <tspan class="node-name">{{ node.schema.name }}</tspan>
                                <tspan class="node-author" dx="8">{{ node.schema.authors.join(' ') }}</tspan>
                                <tspan class="node-separator" dx="6"> </tspan>
                                <tspan class="node-date" dx="6">{{ formatDate(node.schema.date) }}</tspan>
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
    stroke: none;
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

:global(.dark) .node-bg {
    /* 使用主題默認色 */
}

.schema-node.hovered .node-bg {
    fill: var(--fallback-b3, oklch(var(--b3)));
    stroke-width: 3;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

:global(.dark) .schema-node.hovered .node-bg {
    /* 使用主題默認色 */
}

.schema-node.focused .node-bg {
    fill: rgba(99, 102, 241, 0.1);
    stroke: rgb(99, 102, 241);
    stroke-width: 3;
    filter: drop-shadow(0 6px 12px rgba(99, 102, 241, 0.3));
}

:global(.dark) .schema-node.focused .node-bg {
    /* 使用主題默認色 */
}

/* 單行緊湊文字樣式 - 與字根圖保持一致 */
.node-compact-text {
    font-size: 12px;
    stroke: none;
}

.node-name {
    fill: var(--fallback-nc, oklch(var(--nc)));
    font-weight: 600;
    font-size: 13px;
    stroke: none;
}

:global(.dark) .node-name {
    fill: var(--fallback-nc, oklch(var(--nc)));
}

.node-author {
    fill: var(--fallback-nc, oklch(var(--nc)/0.7));
    font-size: 11px;
    font-weight: 400;
    stroke: none;
}

:global(.dark) .node-author {
    fill: var(--fallback-nc, oklch(var(--nc)/0.7));
}

.node-separator {
    fill: var(--fallback-nc, oklch(var(--nc)/0.5));
    font-size: 11px;
    stroke: none;
}

:global(.dark) .node-separator {
    fill: var(--fallback-nc, oklch(var(--nc)/0.5));
}

.node-date {
    fill: rgb(55, 65, 81);
    font-size: 11px;
    font-weight: 400;
    stroke: none;
}

:global(.dark) .node-separator {
    fill: #707070;
}

.node-date {
    fill: #666666;
    font-size: 11px;
    font-weight: 400;
}

:global(.dark) .node-date {
    fill: var(--fallback-nc, oklch(var(--nc)/0.6));
}

/* 舊版樣式（已棄用，保留以防遷移需要）*/
.node-title {
    fill: rgb(79, 70, 229);
    font-size: 14px;
    font-weight: 600;
}

:global(.dark) .node-title {
    fill: rgb(165, 180, 252);
}

/* 連接線樣式 */
.connection-line {
    transition: all 0.3s ease;
    cursor: pointer;
}

.connection-feature {
    stroke-dasharray: none;
}

.connection-author {
    stroke-dasharray: 5, 5;
}

.connection-focused {
    stroke-width: 3 !important;
    opacity: 1 !important;
    filter: drop-shadow(0 0 4px currentColor);
}

.connection-dimmed {
    opacity: 0.2;
}

.connection-line:hover {
    opacity: 1;
    stroke-width: 3;
    filter: drop-shadow(0 0 4px currentColor);
}

/* 暗色模式下的連接線 */
:global(.dark) .connection-feature {
    stroke: rgba(165, 180, 252, 0.6);
}

:global(.dark) .connection-author {
    stroke: rgba(134, 239, 172, 0.6);
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
