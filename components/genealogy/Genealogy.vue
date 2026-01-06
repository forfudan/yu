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
    width: 1024,
    height: 1200,
    nodeSpacing: 10,           // 卡片間距：15 → 10
    baseSpacing: 15,           // 短空白期：20 → 15
    schemaSpacing: 35,         // 每個輸入法：50 → 35
    emptyYearThreshold: 3,     // 連續3年以上空白將被壓縮
    emptySegmentSpacing: 30,   // 空白段總高度：40 → 30
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
const hoveredLabelConnection = ref<Connection | null>(null)  // 鼠標懸停的標籤對應的連接

// 篩選狀態
const selectedFeatures = ref<string[]>([])
const selectedAuthors = ref<string[]>([])
const searchQuery = ref('')

// 下拉菜單狀態
const showFeatureDropdown = ref(false)
const showAuthorDropdown = ref(false)

// 連接關係狀態
const connections = ref<Connection[]>([])
const connectionFilterType = ref<'feature' | 'author' | null>(null)

// 主题检测
const isDark = ref(false)
const updateTheme = () => {
    if (typeof document !== 'undefined') {
        isDark.value = document.documentElement.classList.contains('dark')
        console.log('Theme updated:', isDark.value ? 'dark' : 'light', document.documentElement.className)
    }
}

onMounted(() => {
    updateTheme()
    // 监听主题变化
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
    })
})

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

// 計算屬性：排序後的輸入法（用於佈局，倒序時不影響逻辑顺序）
const sortedSchemas = computed(() => {
    return sortSchemasByDate(filteredSchemas.value, false)
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

    // 使用佈局引擎計算初始佈局
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

    // 如果有布局节点，使用实际最大Y坐标
    if (layoutNodes.value.length > 0) {
        const maxY = Math.max(...layoutNodes.value.map(n => n.y + n.height))
        const topPadding = 100
        const bottomPadding = 150  // 增加底部padding确保不会被截断
        return maxY + topPadding + bottomPadding
    }

    // 否则使用年份映射表估算
    const lastYearY = yearSpacingMap.value.get(maxYear.value) || 0
    const baseSpacing = config.value.baseSpacing || 30
    const schemaSpacing = config.value.schemaSpacing || 90
    const topPadding = 100
    const bottomPadding = 150

    // 计算最后一年有多少个输入法
    const lastYearCount = schemas.value.filter(s => parseYear(s.date) === maxYear.value).length
    const lastYearHeight = lastYearCount > 0 ? baseSpacing + lastYearCount * schemaSpacing : baseSpacing

    return lastYearY + lastYearHeight + topPadding + bottomPadding
})

// 計算屬性：節點映射（用於連接線繪製）
const nodesMap = computed(() => {
    const map = new Map<string, LayoutNode>()
    layoutNodes.value.forEach(node => {
        map.set(node.schema.id, node)
    })
    return map
})

// 計算屬性：獲取 focused 節點的父節點 ID 集合
const parentNodeIds = computed(() => {
    if (!focusedSchemaId.value) return new Set<string>()

    const parents = new Set<string>()
    connections.value.forEach(conn => {
        if (conn.from === focusedSchemaId.value) {
            parents.add(conn.to)
        }
    })
    return parents
})

// 計算屬性：獲取 focused 節點的子節點 ID 集合
const childNodeIds = computed(() => {
    if (!focusedSchemaId.value) return new Set<string>()

    const children = new Set<string>()
    connections.value.forEach(conn => {
        if (conn.to === focusedSchemaId.value) {
            children.add(conn.from)
        }
    })
    return children
})

// 計算屬性：分組節點 - 背景節點、父系節點、子系節點
const groupedNodes = computed(() => {
    if (!focusedSchemaId.value) {
        return {
            backgroundNodes: layoutNodes.value,
            parentNodes: [],
            childNodes: [],
            focusedNode: null
        }
    }

    const backgroundNodes: LayoutNode[] = []
    const parentNodes: LayoutNode[] = []
    const childNodes: LayoutNode[] = []
    let focusedNode: LayoutNode | null = null

    // 收集所有可見連接中涉及的節點ID
    const connectedNodeIds = new Set<string>()
    visibleConnections.value.forEach(({ connection }) => {
        connectedNodeIds.add(connection.from)
        connectedNodeIds.add(connection.to)
    })

    layoutNodes.value.forEach(node => {
        // 如果有標籤被 hover，只高亮該連接的兩端
        if (hoveredLabelConnection.value) {
            if (node.schema.id === hoveredLabelConnection.value.from ||
                node.schema.id === hoveredLabelConnection.value.to) {
                // 判断是父系还是子系
                if (node.schema.id === focusedSchemaId.value) {
                    focusedNode = node
                } else if (parentNodeIds.value.has(node.schema.id)) {
                    parentNodes.push(node)
                } else if (childNodeIds.value.has(node.schema.id)) {
                    childNodes.push(node)
                }
            } else {
                backgroundNodes.push(node)
            }
        } else {
            // 正常 focus 模式
            if (node.schema.id === focusedSchemaId.value) {
                focusedNode = node
            } else if (connectedNodeIds.has(node.schema.id)) {
                // 根據與焦點節點的關係分類
                if (parentNodeIds.value.has(node.schema.id)) {
                    parentNodes.push(node)
                } else if (childNodeIds.value.has(node.schema.id)) {
                    childNodes.push(node)
                } else {
                    // 同作者但無直接父子關係的節點，也放入父系（使用相同顏色）
                    parentNodes.push(node)
                }
            } else {
                backgroundNodes.push(node)
            }
        }
    })

    return { backgroundNodes, parentNodes, childNodes, focusedNode }
})

// 計算屬性：連接路徑
const connectionPaths = computed(() => {
    if (connections.value.length === 0) return []

    return generateConnectionPaths(connections.value, nodesMap.value)
})

// 計算屬性：過濾後的連接
const visibleConnections = computed(() => {
    if (!focusedSchemaId.value) {
        return connectionPaths.value.filter(({ connection }) =>
            shouldShowConnection(
                connection,
                focusedSchemaId.value,
                connectionFilterType.value
            )
        )
    }

    // Focus 模式：顯示與焦點相關的連接，以及同作者之間的所有連接
    const focusedSchema = schemas.value.find(s => s.id === focusedSchemaId.value)
    if (!focusedSchema) {
        return []
    }

    const focusedAuthors = new Set(focusedSchema.authors)

    return connectionPaths.value.filter(({ connection }) => {
        // 應用類型篩選
        if (connectionFilterType.value && connection.type !== connectionFilterType.value) {
            return false
        }

        // 顯示與焦點節點直接相關的連接
        if (connection.from === focusedSchemaId.value || connection.to === focusedSchemaId.value) {
            return true
        }

        // 顯示同作者方案之間的連接
        const fromSchema = schemas.value.find(s => s.id === connection.from)
        const toSchema = schemas.value.find(s => s.id === connection.to)

        if (fromSchema && toSchema) {
            // 檢查 from 和 to 是否都有與焦點方案相同的作者
            const fromHasAuthor = fromSchema.authors.some(a => focusedAuthors.has(a))
            const toHasAuthor = toSchema.authors.some(a => focusedAuthors.has(a))

            // 如果兩個方案都有同作者，顯示它們之間的連接
            if (fromHasAuthor && toHasAuthor) {
                return true
            }
        }

        return false
    })
})

// 計算屬性：分離每個標籤的連接（用於防碰撞）
const separatedConnections = computed(() => {
    const result: Array<{ connection: Connection, path: string, label: string }> = []

    visibleConnections.value.forEach(({ connection, path }) => {
        result.push({
            connection,
            path,
            label: connection.label
        })
    })

    return result
})

// 計算屬性：帶防碰撞的標籤位置
const labeledConnections = computed(() => {
    if (!focusedSchemaId.value) return []

    // 處理焦點節點的父系和子系連接，但排除作者連接（不顯示標籤）
    const focusedItems = separatedConnections.value.filter(
        item => (item.connection.from === focusedSchemaId.value ||
            item.connection.to === focusedSchemaId.value) &&
            item.connection.type !== 'author'  // 排除作者連接
    )

    // 計算每個標籤的初始位置和尺寸
    interface LabelBox {
        connection: Connection
        label: string
        x: number  // 中心點 x
        y: number  // 中心點 y
        width: number
        height: number
        lineStartX: number
        lineStartY: number
        lineEndX: number
        lineEndY: number
        offset: number  // 沿線的偏移量 (0-1)
    }

    const labels: LabelBox[] = focusedItems.map(item => {
        const fromNode = nodesMap.value.get(item.connection.from)
        const toNode = nodesMap.value.get(item.connection.to)

        if (!fromNode || !toNode) {
            return null
        }

        const fromX = fromNode.x + fromNode.width / 2
        const fromY = fromNode.y
        const toX = toNode.x + toNode.width / 2
        const toY = toNode.y + toNode.height

        const textWidth = getTextWidth(item.label)
        const boxWidth = textWidth + 16
        const boxHeight = 18

        return {
            connection: item.connection,
            label: item.label,
            x: (fromX + toX) / 2,
            y: (fromY + toY) / 2,
            width: boxWidth,
            height: boxHeight,
            lineStartX: fromX,
            lineStartY: fromY,
            lineEndX: toX,
            lineEndY: toY,
            offset: 0.5  // 初始在中點
        }
    }).filter(Boolean) as LabelBox[]

    // 檢測碰撞並調整位置
    const padding = 4  // 標籤之間的最小間距
    const maxIterations = 20

    for (let iter = 0; iter < maxIterations; iter++) {
        let hasCollision = false

        for (let i = 0; i < labels.length; i++) {
            for (let j = i + 1; j < labels.length; j++) {
                const a = labels[i]
                const b = labels[j]

                // 檢測矩形碰撞
                const dx = Math.abs(a.x - b.x)
                const dy = Math.abs(a.y - b.y)
                const minDx = (a.width + b.width) / 2 + padding
                const minDy = (a.height + b.height) / 2 + padding

                if (dx < minDx && dy < minDy) {
                    hasCollision = true

                    // 沿各自的線移動標籤
                    // 如果重疊，一個向起點移動，一個向終點移動
                    const adjustAmount = 0.1

                    if (i % 2 === 0) {
                        a.offset = Math.max(0.2, a.offset - adjustAmount)
                        b.offset = Math.min(0.8, b.offset + adjustAmount)
                    } else {
                        a.offset = Math.min(0.8, a.offset + adjustAmount)
                        b.offset = Math.max(0.2, b.offset - adjustAmount)
                    }

                    // 重新計算位置
                    a.x = a.lineStartX + (a.lineEndX - a.lineStartX) * a.offset
                    a.y = a.lineStartY + (a.lineEndY - a.lineStartY) * a.offset

                    b.x = b.lineStartX + (b.lineEndX - b.lineStartX) * b.offset
                    b.y = b.lineStartY + (b.lineEndY - b.lineStartY) * b.offset
                }
            }
        }

        if (!hasCollision) break
    }

    return labels
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

        // 計算連接關係（連接關係始終基於時間順序，不受倒序影響）
        const sortedData = sortSchemasByDate(data, false)
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

// Hover 連接標籤
function handleLabelHover(connection: Connection | null) {
    hoveredLabelConnection.value = connection
}

// 計算文字寬度（考慮中英文混合）
function getTextWidth(text: string): number {
    let width = 0
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i)
        // 中文字符（CJK统一汉字）宽度约为英文的2倍
        if ((char >= 0x4E00 && char <= 0x9FFF) ||
            (char >= 0x3400 && char <= 0x4DBF) ||
            (char >= 0x20000 && char <= 0x2A6DF)) {
            width += 12  // 中文字符宽度
        } else {
            width += 6.5  // 英文字符宽度
        }
    }
    return width
}

// 計算連接線中點位置
function getConnectionMidpoint(connection: Connection, nodes: Map<string, LayoutNode>): string {
    const fromNode = nodes.get(connection.from)
    const toNode = nodes.get(connection.to)

    if (!fromNode || !toNode) {
        return 'translate(0, 0)'
    }

    // 計算兩個節點的中心點
    const fromX = fromNode.x + fromNode.width / 2
    const fromY = fromNode.y
    const toX = toNode.x + toNode.width / 2
    const toY = toNode.y + toNode.height

    // 中點位置
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2

    return `translate(${midX}, ${midY})`
}

// 切換特徵選擇
function toggleFeature(feature: string) {
    const index = selectedFeatures.value.indexOf(feature)
    if (index > -1) {
        selectedFeatures.value.splice(index, 1)
    } else {
        selectedFeatures.value.push(feature)
    }
}

// 切換作者選擇
function toggleAuthor(author: string) {
    const index = selectedAuthors.value.indexOf(author)
    if (index > -1) {
        selectedAuthors.value.splice(index, 1)
    } else {
        selectedAuthors.value.push(author)
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
            <!-- 工具欄 - 簡化單行版本 -->
            <div class="toolbar-compact">
                <!-- 統計信息 -->
                <span class="text-sm text-gray-600 dark:text-gray-400">
                    共 {{ filteredSchemas.length }} 個輸入法 ({{ minYear }}-{{ maxYear }})
                </span>

                <!-- 特徵篩選下拉菜單 -->
                <div class="dropdown-wrapper">
                    <button @click="showFeatureDropdown = !showFeatureDropdown" class="dropdown-trigger">
                        特徵
                        <span v-if="selectedFeatures.length > 0" class="badge">{{ selectedFeatures.length }}</span>
                        <span class="arrow">▼</span>
                    </button>
                    <div v-if="showFeatureDropdown" class="dropdown-menu" @click.stop>
                        <div class="dropdown-header">
                            <button @click="selectedFeatures = []" class="clear-btn">清除</button>
                        </div>
                        <label v-for="feature in allFeatures" :key="feature" class="dropdown-item">
                            <input type="checkbox" :checked="selectedFeatures.includes(feature)"
                                @change="toggleFeature(feature)" />
                            <span>{{ feature }}</span>
                        </label>
                    </div>
                </div>

                <!-- 作者篩選下拉菜單 -->
                <div class="dropdown-wrapper">
                    <button @click="showAuthorDropdown = !showAuthorDropdown" class="dropdown-trigger">
                        作者
                        <span v-if="selectedAuthors.length > 0" class="badge">{{ selectedAuthors.length }}</span>
                        <span class="arrow">▼</span>
                    </button>
                    <div v-if="showAuthorDropdown" class="dropdown-menu" @click.stop>
                        <div class="dropdown-header">
                            <button @click="selectedAuthors = []" class="clear-btn">清除</button>
                        </div>
                        <label v-for="author in allAuthors" :key="author" class="dropdown-item">
                            <input type="checkbox" :checked="selectedAuthors.includes(author)"
                                @change="toggleAuthor(author)" />
                            <span>{{ author }}</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- 點擊外部關閉下拉菜單 -->
            <div v-if="showFeatureDropdown || showAuthorDropdown" class="dropdown-backdrop"
                @click="showFeatureDropdown = false; showAuthorDropdown = false">
            </div>

            <!-- 畫布區域 -->
            <div class="canvas-wrapper">
                <svg :width="config.width" :height="canvasHeight" class="genealogy-svg">
                    <!-- 定義箭頭標記 -->
                    <defs>
                        <marker id="arrow-feature" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5"
                            markerHeight="3" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z"
                                :fill="isDark ? 'rgba(165, 180, 252, 0.6)' : 'rgba(99, 102, 241, 0.6)'" />
                        </marker>
                        <marker id="arrow-author" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="3" markerHeight="3"
                            orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z"
                                :fill="isDark ? 'rgba(134, 239, 172, 0.6)' : 'rgba(34, 197, 94, 0.6)'" />
                        </marker>
                    </defs>

                    <!-- 連接線（在節點下方） -->
                    <g class="connections">
                        <g v-for="({ connection, path }, index) in visibleConnections"
                            :key="`${connection.from}-${connection.to}-${connection.type}-${index}-${focusedSchemaId || 'none'}`">
                            <!-- 連接線路徑 -->
                            <path :d="path" :stroke="getConnectionColor(connection, isDark ? 'dark' : 'light')"
                                :stroke-width="getConnectionStrokeWidth(
                                    connection,
                                    focusedSchemaId === connection.from || focusedSchemaId === connection.to ||
                                    (hoveredLabelConnection && hoveredLabelConnection.from === connection.from &&
                                        hoveredLabelConnection.to === connection.to)
                                )" fill="none" :marker-end="`url(#arrow-${connection.type})`" :class="{
                                    'connection-line': true,
                                    [`connection-${connection.type}`]: true,
                                    'connection-parent': focusedSchemaId === connection.from,
                                    'connection-child': focusedSchemaId === connection.to,
                                    'connection-focused': (focusedSchemaId === connection.from || focusedSchemaId === connection.to) && !hoveredLabelConnection ||
                                        (hoveredLabelConnection && hoveredLabelConnection.from === connection.from &&
                                            hoveredLabelConnection.to === connection.to),
                                    'connection-dimmed': hoveredLabelConnection ?
                                        !(hoveredLabelConnection.from === connection.from && hoveredLabelConnection.to === connection.to) :
                                        (focusedSchemaId && focusedSchemaId !== connection.from && focusedSchemaId !== connection.to)
                                }">
                                <title>{{ connection.label }}</title>
                            </path>
                        </g>
                    </g>

                    <!-- 年份標籤 -->
                    <g class="year-labels">
                        <line :x1="50" :y1="50" :x2="50" :y2="canvasHeight - 50" class="timeline-axis" />
                        <text v-for="label in yearLabels" :key="label.year" :x="40" :y="label.y + 54"
                            class="year-label-text" text-anchor="end">
                            {{ label.year }}
                        </text>
                    </g>

                    <!-- 背景輸入法卡片（淡化） - 只在有 focus 時顯示 -->
                    <g v-if="focusedSchemaId" class="schema-nodes-background">
                        <g v-for="node in groupedNodes.backgroundNodes" :key="'bg-' + node.schema.id"
                            :transform="`translate(${node.x}, ${node.y})`" @click="handleCardClick(node.schema.id)"
                            @mouseenter="handleCardHover(node.schema.id)" @mouseleave="handleCardHover(null)"
                            class="schema-node schema-node-dimmed" :class="{
                                hovered: hoveredSchemaId === node.schema.id
                            }">
                            <!-- 卡片背景 -->
                            <rect :width="node.width" :height="node.height" class="node-bg" rx="8" />

                            <!-- 三行顯示：第一行名稱，第二行作者，第三行日期 -->
                            <!-- 第一行：輸入法名 -->
                            <text :x="10" :y="16" class="node-name" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.name }}
                            </text>
                            <!-- 第二行：作者 -->
                            <text :x="10" :y="31" class="node-author" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.authors.join(' ') }}
                            </text>
                            <!-- 第三行：日期 -->
                            <text :x="10" :y="46" class="node-date" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ formatDate(node.schema.date) }}
                            </text>
                        </g>
                    </g>

                    <!-- 高亮輸入法卡片（在最上層） - 有 focus 時分層顯示 -->
                    <!-- 父系節點（藍色） -->
                    <g v-if="focusedSchemaId" class="schema-nodes-parents">
                        <g v-for="node in groupedNodes.parentNodes" :key="'parent-' + node.schema.id"
                            :transform="`translate(${node.x}, ${node.y})`" @click="handleCardClick(node.schema.id)"
                            @mouseenter="handleCardHover(node.schema.id)" @mouseleave="handleCardHover(null)"
                            class="schema-node schema-node-parent" :class="{
                                hovered: hoveredSchemaId === node.schema.id
                            }">
                            <!-- 卡片背景 -->
                            <rect :width="node.width" :height="node.height" class="node-bg" rx="8" />

                            <!-- 三行顯示：第一行名稱，第二行作者，第三行日期 -->
                            <text :x="10" :y="16" class="node-name" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.name }}
                            </text>
                            <text :x="10" :y="31" class="node-author" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.authors.join(' ') }}
                            </text>
                            <text :x="10" :y="46" class="node-date" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ formatDate(node.schema.date) }}
                            </text>
                        </g>
                    </g>

                    <!-- 子系節點（綠色） -->
                    <g v-if="focusedSchemaId" class="schema-nodes-children">
                        <g v-for="node in groupedNodes.childNodes" :key="'child-' + node.schema.id"
                            :transform="`translate(${node.x}, ${node.y})`" @click="handleCardClick(node.schema.id)"
                            @mouseenter="handleCardHover(node.schema.id)" @mouseleave="handleCardHover(null)"
                            class="schema-node schema-node-child" :class="{
                                hovered: hoveredSchemaId === node.schema.id
                            }">
                            <!-- 卡片背景 -->
                            <rect :width="node.width" :height="node.height" class="node-bg" rx="8" />

                            <!-- 三行顯示：第一行名稱，第二行作者，第三行日期 -->
                            <text :x="10" :y="16" class="node-name" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.name }}
                            </text>
                            <text :x="10" :y="31" class="node-author" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.authors.join(' ') }}
                            </text>
                            <text :x="10" :y="46" class="node-date" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ formatDate(node.schema.date) }}
                            </text>
                        </g>
                    </g>

                    <!-- 焦點節點 -->
                    <g v-if="focusedSchemaId && groupedNodes.focusedNode" class="schema-nodes-focused">
                        <g :transform="`translate(${groupedNodes.focusedNode.x}, ${groupedNodes.focusedNode.y})`"
                            @click="handleCardClick(groupedNodes.focusedNode.schema.id)"
                            @mouseenter="handleCardHover(groupedNodes.focusedNode.schema.id)"
                            @mouseleave="handleCardHover(null)" class="schema-node focused" :class="{
                                hovered: hoveredSchemaId === groupedNodes.focusedNode.schema.id
                            }">
                            <!-- 卡片背景 -->
                            <rect :width="groupedNodes.focusedNode.width" :height="groupedNodes.focusedNode.height"
                                class="node-bg" rx="8" />

                            <!-- 三行顯示：第一行名稱，第二行作者，第三行日期 -->
                            <text :x="10" :y="16" class="node-name" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ groupedNodes.focusedNode.schema.name }}
                            </text>
                            <text :x="10" :y="31" class="node-author" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ groupedNodes.focusedNode.schema.authors.join(' ') }}
                            </text>
                            <text :x="10" :y="46" class="node-date" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ formatDate(groupedNodes.focusedNode.schema.date) }}
                            </text>
                        </g>
                    </g>

                    <!-- 無 focus 時：顯示所有輸入法卡片 -->
                    <g v-if="!focusedSchemaId" class="schema-nodes-all">
                        <g v-for="node in layoutNodes" :key="'all-' + node.schema.id"
                            :transform="`translate(${node.x}, ${node.y})`" @click="handleCardClick(node.schema.id)"
                            @mouseenter="handleCardHover(node.schema.id)" @mouseleave="handleCardHover(null)"
                            class="schema-node" :class="{
                                hovered: hoveredSchemaId === node.schema.id
                            }">
                            <!-- 卡片背景 -->
                            <rect :width="node.width" :height="node.height" class="node-bg" rx="8" />

                            <!-- 三行顯示：第一行名稱，第二行作者，第三行日期 -->
                            <!-- 第一行：輸入法名 -->
                            <text :x="10" :y="16" class="node-name" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.name }}
                            </text>
                            <!-- 第二行：作者 -->
                            <text :x="10" :y="31" class="node-author" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.authors.join(' ') }}
                            </text>
                            <!-- 第三行：日期 -->
                            <text :x="10" :y="46" class="node-date" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ formatDate(node.schema.date) }}
                            </text>
                        </g>
                    </g>

                    <!-- Focus 狀態：在連接線上顯示特徵標籤（在最上層，所有卡片之後） -->
                    <g v-if="focusedSchemaId" class="connection-labels">
                        <g v-for="(labelBox, idx) in labeledConnections" :key="`label-${idx}`"
                            @mouseenter="handleLabelHover(labelBox.connection)" @mouseleave="handleLabelHover(null)"
                            class="connection-label-group" :class="{
                                'label-hovered': hoveredLabelConnection &&
                                    hoveredLabelConnection.from === labelBox.connection.from &&
                                    hoveredLabelConnection.to === labelBox.connection.to,
                                'label-dimmed': hoveredLabelConnection &&
                                    !(hoveredLabelConnection.from === labelBox.connection.from &&
                                        hoveredLabelConnection.to === labelBox.connection.to),
                                'label-parent': labelBox.connection.from === focusedSchemaId,
                                'label-child': labelBox.connection.to === focusedSchemaId
                            }">
                            <!-- 背景圆角方框 -->
                            <rect :x="labelBox.x - labelBox.width / 2" :y="labelBox.y - labelBox.height / 2"
                                :width="labelBox.width" :height="labelBox.height" class="connection-label-bg" rx="4" />
                            <!-- 標籤文字 -->
                            <text :x="labelBox.x" :y="labelBox.y + 4" class="connection-label" text-anchor="middle">
                                {{ labelBox.label }}
                            </text>
                        </g>
                    </g>
                </svg>
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

/* 簡化工具欄 - 單行緊湊版本 */
.toolbar-compact {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--vp-c-bg-soft, #f8fafc);
    border-radius: 0.5rem;
    position: relative;
}

:global(.dark) .toolbar-compact {
    background: var(--vp-c-bg-soft, #374151);
}

/* 下拉菜單容器 */
.dropdown-wrapper {
    position: relative;
}

/* 下拉觸發按鈕 */
.dropdown-trigger {
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--vp-c-divider, #e2e8f0);
    border-radius: 0.375rem;
    background: var(--vp-c-bg, #ffffff);
    color: var(--vp-c-text-1, #1e293b);
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;
}

.dropdown-trigger:hover {
    background: var(--vp-c-bg-soft, #f1f5f9);
}

:global(.dark) .dropdown-trigger {
    border-color: var(--vp-c-divider, #374151);
    background: var(--vp-c-bg, #1f2937);
    color: var(--vp-c-text-1, #f1f5f9);
}

:global(.dark) .dropdown-trigger:hover {
    background: var(--vp-c-bg-soft, #374151);
}

.dropdown-trigger .arrow {
    font-size: 0.7rem;
    opacity: 0.6;
}

.dropdown-trigger .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    background: rgb(99, 102, 241);
    color: white;
    border-radius: 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
}

:global(.dark) .dropdown-trigger .badge {
    background: rgb(165, 180, 252);
    color: #1e293b;
}

/* 下拉菜單面板 */
.dropdown-menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    min-width: 180px;
    max-height: 300px;
    overflow-y: auto;
    background: var(--vp-c-bg, #ffffff);
    border: 1px solid var(--vp-c-divider, #e2e8f0);
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 1000;
}

:global(.dark) .dropdown-menu {
    background: var(--vp-c-bg, #1f2937);
    border-color: var(--vp-c-divider, #374151);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

.dropdown-header {
    padding: 0.5rem;
    border-bottom: 1px solid var(--vp-c-divider, #e2e8f0);
    display: flex;
    justify-content: flex-end;
}

:global(.dark) .dropdown-header {
    border-color: var(--vp-c-divider, #374151);
}

.clear-btn {
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    color: rgb(99, 102, 241);
    font-size: 0.75rem;
    cursor: pointer;
    border-radius: 0.25rem;
}

.clear-btn:hover {
    background: rgba(99, 102, 241, 0.1);
}

:global(.dark) .clear-btn {
    color: rgb(165, 180, 252);
}

:global(.dark) .clear-btn:hover {
    background: rgba(165, 180, 252, 0.1);
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: background 0.2s;
}

.dropdown-item:hover {
    background: var(--vp-c-bg-soft, #f1f5f9);
}

:global(.dark) .dropdown-item:hover {
    background: var(--vp-c-bg-soft, #374151);
}

.dropdown-item input[type="checkbox"] {
    cursor: pointer;
}

.dropdown-item span {
    font-size: 0.875rem;
    color: var(--vp-c-text-1, #1e293b);
}

:global(.dark) .dropdown-item span {
    color: var(--vp-c-text-1, #f1f5f9);
}

/* 下拉菜單背景遮罩 */
.dropdown-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
}

/* 緊湊下拉選擇（已棄用） */
.select-compact {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--vp-c-divider, #e2e8f0);
    border-radius: 0.375rem;
    background: var(--vp-c-bg, #ffffff);
    color: var(--vp-c-text-1, #1e293b);
    font-size: 0.875rem;
    outline: none;
    cursor: pointer;
    min-width: 80px;
    max-width: 150px;
}

.select-compact:focus {
    border-color: rgb(99, 102, 241);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

:global(.dark) .select-compact {
    border-color: var(--vp-c-divider, #374151);
    background: var(--vp-c-bg, #1f2937);
    color: var(--vp-c-text-1, #f1f5f9);
}

/* 緊湊按鈕 */
.btn-compact {
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--vp-c-divider, #e2e8f0);
    border-radius: 0.375rem;
    background: var(--vp-c-bg, #ffffff);
    color: var(--vp-c-text-1, #1e293b);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-compact:hover {
    background: var(--vp-c-bg-soft, #f1f5f9);
}

.btn-compact.active {
    background: rgb(99, 102, 241);
    color: white;
    border-color: rgb(99, 102, 241);
}

:global(.dark) .btn-compact {
    border-color: var(--vp-c-divider, #374151);
    background: var(--vp-c-bg, #1f2937);
    color: var(--vp-c-text-1, #f1f5f9);
}

:global(.dark) .btn-compact:hover {
    background: var(--vp-c-bg-soft, #374151);
}

:global(.dark) .btn-compact.active {
    background: rgb(165, 180, 252);
    color: #1e293b;
    border-color: rgb(165, 180, 252);
}

.canvas-wrapper {
    overflow: auto;
    border: 1px solid var(--vp-c-divider, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--vp-c-bg, #ffffff);
}

:global(.dark) .canvas-wrapper {
    border-color: var(--vp-c-divider, #374151);
    background: var(--vp-c-bg, #1f2937);
}

.genealogy-svg {
    display: block;
}

/* 時間軸樣式 */
.timeline-axis {
    stroke: var(--vp-c-divider, #cbd5e1);
    stroke-width: 2;
}

:global(.dark) .timeline-axis {
    stroke: var(--vp-c-divider, #4b5563);
}

.year-label-text {
    fill: var(--vp-c-text-2, #64748b);
    font-size: 12px;
    font-weight: 600;
    stroke: none;
}

:global(.dark) .year-label-text {
    fill: var(--vp-c-text-2, #9ca3af);
}

/* 節點樣式 */
.schema-node {
    cursor: pointer;
    transition: all 0.3s ease;
}

/* 淡化的背景節點 */
.schema-node-dimmed {
    opacity: 0.25;
    transition: opacity 0.3s ease;
}

.schema-node-dimmed:hover {
    opacity: 0.5;
}

.node-bg {
    fill: var(--vp-c-bg-soft, #f1f5f9);
    stroke: rgb(99, 102, 241);
    stroke-width: 2;
    transition: all 0.3s ease;
}

:global(.dark) .node-bg {
    fill: var(--vp-c-bg-soft, #1e293b);
    stroke: rgb(165, 180, 252);
}

.schema-node.hovered .node-bg {
    fill: var(--vp-c-bg-elv, #e2e8f0);
    stroke-width: 3;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

:global(.dark) .schema-node.hovered .node-bg {
    fill: var(--vp-c-bg-elv, #334155);
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
}

.schema-node.focused .node-bg {
    fill: rgba(99, 102, 241, 0.1);
    stroke: rgb(99, 102, 241);
    stroke-width: 3;
    filter: drop-shadow(0 6px 12px rgba(99, 102, 241, 0.3));
}

:global(.dark) .schema-node.focused .node-bg {
    fill: rgba(165, 180, 252, 0.1);
    stroke: rgb(165, 180, 252);
}

/* 父系節點樣式（藍色） */
.schema-node-parent .node-bg {
    stroke: rgb(99, 102, 241);
    fill: rgba(99, 102, 241, 0.05);
}

:global(.dark) .schema-node-parent .node-bg {
    stroke: rgb(165, 180, 252);
    fill: rgba(165, 180, 252, 0.05);
}

.schema-node-parent.hovered .node-bg {
    stroke: rgb(99, 102, 241);
    fill: rgba(99, 102, 241, 0.15);
    stroke-width: 3;
}

/* 子系節點樣式（綠色） */
.schema-node-child .node-bg {
    stroke: rgb(34, 197, 94);
    fill: rgba(34, 197, 94, 0.05);
}

:global(.dark) .schema-node-child .node-bg {
    stroke: rgb(134, 239, 172);
    fill: rgba(134, 239, 172, 0.05);
}

.schema-node-child.hovered .node-bg {
    stroke: rgb(34, 197, 94);
    fill: rgba(34, 197, 94, 0.15);
    stroke-width: 3;
}

:global(.dark) .schema-node-child.hovered .node-bg {
    stroke: rgb(134, 239, 172);
    fill: rgba(134, 239, 172, 0.15);
}

/* 單行緊湊文字樣式 - 與字根圖保持一致 */
.node-compact-text {
    font-size: 12px;
    stroke: none;
}

.node-name {
    fill: var(--vp-c-text-1, #1e293b);
    font-weight: 600;
    font-size: 13px;
    stroke: none;
}

:global(.dark) .node-name {
    fill: var(--vp-c-text-1, #f1f5f9);
}

.node-author {
    fill: var(--vp-c-text-2, #475569);
    font-size: 11px;
    font-weight: 400;
    stroke: none;
}

:global(.dark) .node-author {
    fill: var(--vp-c-text-2, #cbd5e1);
}

.node-separator {
    fill: var(--vp-c-text-3, #94a3b8);
    font-size: 11px;
    stroke: none;
}

:global(.dark) .node-separator {
    fill: var(--vp-c-text-3, #64748b);
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
    opacity: 0.15;
    /* 默认非常淡 */
}

.connection-feature {
    stroke-dasharray: none;
}

.connection-author {
    stroke-dasharray: 5, 5;
}

/* 父系連接線（藍色，從focused指向父節點） */
.connection-parent {
    stroke: rgba(99, 102, 241, 0.6);
}

:global(.dark) .connection-parent {
    stroke: rgba(165, 180, 252, 0.6);
}

/* 子系連接線（綠色，從子節點指向focused） */
.connection-child {
    stroke: rgba(34, 197, 94, 0.6);
}

:global(.dark) .connection-child {
    stroke: rgba(134, 239, 172, 0.6);
}

.connection-focused {
    stroke-width: 3 !important;
    opacity: 0.9 !important;
    /* focus时明显 */
    filter: drop-shadow(0 0 4px currentColor);
}

.connection-dimmed {
    opacity: 0.05;
    /* 其他线更淡 */
}

.connection-line:hover {
    opacity: 0.8;
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

/* 連接線標籤背景框 */
.connection-label-bg {
    fill: var(--vp-c-bg, #ffffff);
    opacity: 0.95;
    transition: all 0.2s ease;
}

:global(.dark) .connection-label-bg {
    fill: var(--vp-c-bg, #1e293b);
}

/* 連接線標籤組 */
.connection-label-group {
    cursor: pointer;
    transition: all 0.2s ease;
}

/* 父系標籤（藍色） */
.connection-label-group.label-parent .connection-label {
    fill: rgb(99, 102, 241);
}

:global(.dark) .connection-label-group.label-parent .connection-label {
    fill: rgb(165, 180, 252);
}

.connection-label-group.label-parent:hover .connection-label-bg,
.connection-label-group.label-parent.label-hovered .connection-label-bg {
    opacity: 1;
    fill: rgb(99, 102, 241);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

:global(.dark) .connection-label-group.label-parent:hover .connection-label-bg,
:global(.dark) .connection-label-group.label-parent.label-hovered .connection-label-bg {
    fill: rgb(165, 180, 252);
}

/* 子系標籤（綠色） */
.connection-label-group.label-child .connection-label {
    fill: rgb(34, 197, 94);
}

:global(.dark) .connection-label-group.label-child .connection-label {
    fill: rgb(134, 239, 172);
}

.connection-label-group.label-child:hover .connection-label-bg,
.connection-label-group.label-child.label-hovered .connection-label-bg {
    opacity: 1;
    fill: rgb(34, 197, 94);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

:global(.dark) .connection-label-group.label-child:hover .connection-label-bg,
:global(.dark) .connection-label-group.label-child.label-hovered .connection-label-bg {
    fill: rgb(134, 239, 172);
}

.connection-label-group:hover .connection-label-bg,
.connection-label-group.label-hovered .connection-label-bg {
    opacity: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.connection-label-group:hover .connection-label,
.connection-label-group.label-hovered .connection-label {
    fill: white;
    font-weight: 600;
}

:global(.dark) .connection-label-group:hover .connection-label,
:global(.dark) .connection-label-group.label-hovered .connection-label {
    fill: #1e293b;
}

/* 淡化的標籤 */
.connection-label-group.label-dimmed {
    opacity: 0.2;
    transition: opacity 0.2s ease;
}

.connection-label-group.label-dimmed .connection-label-bg,
.connection-label-group.label-dimmed .connection-label {
    opacity: 0.2 !important;
}

/* 連接線標籤文字 */
.connection-label {
    fill: var(--vp-c-brand, rgb(99, 102, 241));
    font-size: 10px;
    font-weight: 500;
    opacity: 0;
    animation: fadeIn 0.3s ease-in 0.2s forwards;
    pointer-events: none;
    stroke: none;
    transition: all 0.2s ease;
}

:global(.dark) .connection-label {
    fill: rgb(165, 180, 252);
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 表單控件樣式 */
.input {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--vp-c-divider, #e2e8f0);
    border-radius: 0.375rem;
    background: var(--vp-c-bg, #ffffff);
    color: var(--vp-c-text-1, #1e293b);
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
}

.input:focus {
    border-color: rgb(99, 102, 241);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

:global(.dark) .input {
    background: var(--vp-c-bg, #1f2937);
    border-color: var(--vp-c-divider, #374151);
    color: var(--vp-c-text-1, #f1f5f9);
}

:global(.dark) .input:focus {
    border-color: rgb(165, 180, 252);
    box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.1);
}

.btn {
    padding: 0.375rem 1rem;
    border: 1px solid var(--vp-c-divider, #e2e8f0);
    border-radius: 0.375rem;
    background: var(--vp-c-bg, #ffffff);
    color: var(--vp-c-text-1, #1e293b);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn:hover {
    background: var(--vp-c-bg-soft, #f8fafc);
    border-color: var(--vp-c-brand, rgb(99, 102, 241));
}

.btn-active {
    background: var(--vp-c-brand, rgb(99, 102, 241));
    color: white;
    border-color: var(--vp-c-brand, rgb(99, 102, 241));
}

.btn-outline {
    border-color: var(--vp-c-brand, rgb(99, 102, 241));
    color: var(--vp-c-brand, rgb(99, 102, 241));
}

.btn-outline:hover {
    background: var(--vp-c-brand, rgb(99, 102, 241));
    color: white;
}

:global(.dark) .btn {
    background: var(--vp-c-bg, #1f2937);
    border-color: var(--vp-c-divider, #374151);
    color: var(--vp-c-text-1, #f1f5f9);
}

:global(.dark) .btn:hover {
    background: var(--vp-c-bg-soft, #374151);
    border-color: rgb(165, 180, 252);
}

:global(.dark) .btn-active {
    background: rgb(165, 180, 252);
    color: #1e293b;
    border-color: rgb(165, 180, 252);
}

:global(.dark) .btn-outline {
    border-color: rgb(165, 180, 252);
    color: rgb(165, 180, 252);
}

:global(.dark) .btn-outline:hover {
    background: rgb(165, 180, 252);
    color: #1e293b;
}

.btn-group {
    display: inline-flex;
    border-radius: 0.375rem;
    overflow: hidden;
}

.btn-group .btn {
    border-radius: 0;
    margin-left: -1px;
}

.btn-group .btn:first-child {
    border-radius: 0.375rem 0 0 0.375rem;
    margin-left: 0;
}

.btn-group .btn:last-child {
    border-radius: 0 0.375rem 0.375rem 0;
}

.checkbox {
    width: 1rem;
    height: 1rem;
    border: 1px solid var(--vp-c-divider, #cbd5e1);
    border-radius: 0.25rem;
    cursor: pointer;
    appearance: none;
    background: var(--vp-c-bg, #ffffff);
    transition: all 0.2s;
}

.checkbox:checked {
    background: var(--vp-c-brand, rgb(99, 102, 241));
    border-color: var(--vp-c-brand, rgb(99, 102, 241));
}

:global(.dark) .checkbox {
    background: var(--vp-c-bg, #1f2937);
    border-color: var(--vp-c-divider, #4b5563);
}

:global(.dark) .checkbox:checked {
    background: rgb(165, 180, 252);
    border-color: rgb(165, 180, 252);
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
}
</style>
