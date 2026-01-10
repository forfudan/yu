<!--
    Genealogy.vue - 輸入法繫絡圖組件

  Features:
  - 展示輸入法發展歷史和演化關係
  - 基於時間軸的可視化佈局
  - 支持按特性和作者追溯繫絡關係
  - 響應式設計和暗色模式支持
  
  Major Modification History:
  - 2026-01-05 by 朱宇浩: 初版，實現基礎功能
-->

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
    formatDateToMonth,
    parseYear
} from './dataLoader'
import { calculateLayout } from './layoutEngine'
import { calculateConnections, getConnectionStats } from './connectionEngine'
import {
    generateConnectionPaths,
    getConnectionColor,
    getConnectionStrokeWidth,
    shouldShowConnection
} from './connectionRenderer'
import { GenealogyExportService } from './exportService'

// Props
const props = withDefaults(defineProps<{
    config?: Partial<GenealogyConfig>
}>(), {
    config: () => ({})
})

// 默認配置
const defaultConfig: GenealogyConfig = {
    width: 840,  // 默認畫布寬度
    height: 1200,
    nodeSpacing: 10,
    baseSpacing: 15,
    schemaSpacing: 35,
    emptyYearThreshold: 3,
    emptySegmentSpacing: 30,
    labelInterval: 5,
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
const pinnedLabelConnection = ref<Connection | null>(null)   // 被固定的標籤對應的連接

// 拖動狀態
const draggedNodeId = ref<string | null>(null)
const dragStartX = ref(0)
const dragCurrentX = ref(0)
const dragTimer = ref<number | null>(null)
const isDragging = ref(false)
const customOffsets = ref<Map<string, number>>(new Map()) // 存儲每個節點的x偏移量

// 全屏模式狀態
const isFullscreen = ref(false)
const genealogyContainer = ref<HTMLElement | null>(null)

// Y軸縮放狀態
const yScaleFactor = ref(0.64) // 1.0 = 100%

// 篩選狀態
const selectedCategory = ref<'字形' | '拼音' | '全部'>('字形') // 大類篩選
const selectedSchemas = ref<string[]>([])
const selectedFeatures = ref<string[]>([])
const selectedAuthors = ref<string[]>([])
const searchQuery = ref('')

// 下拉菜單狀態
const showCategoryDropdown = ref(false)
const showSchemaDropdown = ref(false)
const showFeatureDropdown = ref(false)
const showAuthorDropdown = ref(false)

// 連接關係狀態
const connections = ref<Connection[]>([])
const connectionFilterType = ref<'feature' | 'author' | null>(null)

// 導出功能相關狀態
const isExporting = ref(false)
const exportMessage = ref('')
const canvasWrapper = ref<HTMLElement | null>(null)

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

// 計算屬性：根據類別生成標題
const pageTitle = computed(() => {
    switch (selectedCategory.value) {
        case '字形':
            return '漢字字形輸入法繫絡圖'
        case '拼音':
            return '漢字拼音輸入法繫絡圖'
        case '全部':
        default:
            return '漢字輸入法繫絡圖'
    }
})

// 計算屬性：過濾後的輸入法
const filteredSchemas = computed(() => {
    let result = schemas.value

    // 按類別過濾
    if (selectedCategory.value !== '全部') {
        result = result.filter(s => s.category === selectedCategory.value)
    }

    // 過濾停止維護的
    if (!config.value.showDeprecated) {
        result = result.filter(s => !s.deprecated)
    }

    // 按方案過濾
    if (selectedSchemas.value.length > 0) {
        result = result.filter(s =>
            selectedSchemas.value.includes(s.id)
        )
    }

    // 按特性過濾
    if (selectedFeatures.value.length > 0) {
        result = result.filter(s =>
            selectedFeatures.value.some(f => s.features.includes(f))
        )
    }

    // 按作者過濾（包括維護者）
    if (selectedAuthors.value.length > 0) {
        result = result.filter(s =>
            selectedAuthors.value.some(a =>
                s.authors.includes(a) ||
                (s.maintainers && s.maintainers.includes(a))
            )
        )
    }

    // 搜索過濾
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.authors.some(a => a.toLowerCase().includes(query)) ||
            (s.maintainers && s.maintainers.some(m => m.toLowerCase().includes(query))) ||
            s.description?.toLowerCase().includes(query)
        )
    }

    return result
})

// 計算屬性：排序後的所有輸入法（用於佈局，始終基於全部數據，不受篩選影響）
const sortedSchemas = computed(() => {
    return sortSchemasByDate(schemas.value, false)
})

// 計算屬性：應該顯示的節點ID集合（用於控制可見性）
const visibleNodeIds = computed(() => {
    // 如果有關注節點，顯示關注節點及其父子節點
    if (focusedSchemaId.value) {
        const ids = new Set<string>([focusedSchemaId.value])
        connections.value.forEach(conn => {
            if (conn.from === focusedSchemaId.value) {
                ids.add(conn.to)
            }
            if (conn.to === focusedSchemaId.value) {
                ids.add(conn.from)
            }
        })
        // 添加所有篩選後的節點
        filteredSchemas.value.forEach(s => ids.add(s.id))
        return ids
    }

    // 沒有關注節點時，顯示所有篩選後的節點
    return new Set(filteredSchemas.value.map(s => s.id))
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

// 輔助函數：檢查節點是否應該可見
function isNodeVisible(nodeId: string): boolean {
    return visibleNodeIds.value.has(nodeId)
}

// 輔助函數：檢查節點是否在篩選結果中（用於樣式）
function isNodeInFilter(nodeId: string): boolean {
    return filteredSchemas.value.some(s => s.id === nodeId)
}

// 輔助函數：檢查連接線是否應該可見（兩端節點都可見時才顯示）
function isConnectionVisible(connection: Connection): boolean {
    return isNodeVisible(connection.from) && isNodeVisible(connection.to)
}

// 計算屬性：佈局節點（使用智能佈局算法，始終基於所有數據）
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

    return nodes
})

// 計算屬性：動態畫布高度（基於年份間距映射表和Y軸縮放）
const canvasHeight = computed(() => {
    if (minYear.value === 0 || maxYear.value === 0 || yearSpacingMap.value.size === 0) {
        return (config.value.height || 1200) * yScaleFactor.value
    }

    // 如果有布局节点，使用实际最大Y坐标
    if (layoutNodes.value.length > 0) {
        const maxY = Math.max(...layoutNodes.value.map(n => n.y + n.height))
        const topPadding = 100
        const bottomPadding = 150  // 增加底部padding确保不会被截断
        return (maxY + topPadding + bottomPadding) * yScaleFactor.value
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

    return (lastYearY + lastYearHeight + topPadding + bottomPadding) * yScaleFactor.value
})

// 計算屬性：應用自定義偏移和Y軸縮放後的節點
const adjustedNodes = computed(() => {
    return layoutNodes.value.map(node => {
        const xOffset = customOffsets.value.get(node.schema.id) || 0
        return {
            ...node,
            x: node.x + xOffset,
            y: node.y * yScaleFactor.value
        }
    })
})

// 計算屬性：應用Y軸縮放後的年份標籤
const adjustedYearLabels = computed(() => {
    return yearLabels.value.map(label => ({
        ...label,
        y: label.y * yScaleFactor.value
    }))
})

// 計算屬性：節點映射（用於連接線繪製，使用調整後的位置）
const nodesMap = computed(() => {
    const map = new Map<string, LayoutNode>()
    adjustedNodes.value.forEach(node => {
        map.set(node.schema.id, node)
    })
    return map
})

// 計算屬性：獲取 focused 節點的父節點 ID 集合
const parentNodeIds = computed(() => {
    if (!focusedSchemaId.value) return new Set<string>()

    const parents = new Set<string>()
    connections.value.forEach(conn => {
        // 父系（蓝色）：箭頭從 focused 指向父（focused → parent），即 from === focused 時，to 是父
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
        // 子系（绿色）：箭頭從子指向 focused（child → focused），即 to === focused 時，from 是子
        if (conn.to === focusedSchemaId.value) {
            children.add(conn.from)
        }
    })
    return children
})

// 計算屬性：獲取 focused 節點的相似節點 ID 集合
const similarNodeIds = computed(() => {
    if (!focusedSchemaId.value) return new Set<string>()

    const similar = new Set<string>()
    connections.value.forEach(conn => {
        // 相似節點（橙色）：任一方向的 similar 連接
        if (conn.type === 'similar') {
            if (conn.from === focusedSchemaId.value) {
                similar.add(conn.to)
            } else if (conn.to === focusedSchemaId.value) {
                similar.add(conn.from)
            }
        }
    })
    return similar
})

// 計算屬性：連接路徑
const connectionPaths = computed(() => {
    if (connections.value.length === 0) return []

    return generateConnectionPaths(connections.value, nodesMap.value)
})

// 計算屬性：過濾後的連接（始終返回所有連接，通過CSS控制顯示）
const visibleConnections = computed(() => {
    // 僅應用類型篩選，不再根據focus狀態過濾連接
    return connectionPaths.value.filter(({ connection }) => {
        // 應用連接類型篩選
        if (connectionFilterType.value && connection.type !== connectionFilterType.value) {
            return false
        }
        return true
    })
})

// 計算屬性：連接渲染緩存（預計算所有屬性以優化性能）
interface ConnectionRenderData {
    connection: Connection
    path: string
    strokeColor: string
    strokeWidth: number
    isParent: boolean
    isChild: boolean
    isSimilar: boolean
    isFocused: boolean
    isDimmed: boolean
}

const connectionRenderCache = computed<ConnectionRenderData[]>(() => {
    const theme = isDark.value ? 'dark' : 'light'
    const focused = focusedSchemaId.value
    const hoveredLabel = hoveredLabelConnection.value
    const pinnedLabel = pinnedLabelConnection.value

    return visibleConnections.value.map(({ connection, path }) => {
        const isParent = focused === connection.from
        const isChild = focused === connection.to
        const isSimilar = connection.type === 'similar' &&
            (connection.from === focused || connection.to === focused)
        const isFocusedConnection = isParent || isChild || isSimilar

        // 計算是否高亮
        const isHighlighted = (!hoveredLabel && !pinnedLabel && isFocusedConnection) ||
            (hoveredLabel?.from === connection.from && hoveredLabel?.to === connection.to) ||
            (pinnedLabel?.from === connection.from && pinnedLabel?.to === connection.to)

        // 計算是否變暗
        const isDimmed = (hoveredLabel || pinnedLabel)
            ? !(hoveredLabel?.from === connection.from && hoveredLabel?.to === connection.to ||
                pinnedLabel?.from === connection.from && pinnedLabel?.to === connection.to)
            : (focused && !isFocusedConnection)

        return {
            connection,
            path,
            strokeColor: getConnectionColor(connection, theme),
            strokeWidth: getConnectionStrokeWidth(connection, isHighlighted),
            isParent,
            isChild,
            isSimilar,
            isFocused: isFocusedConnection && !hoveredLabel && !pinnedLabel || isHighlighted,
            isDimmed
        }
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

    // 檢測碰撞並調整位置（優化：減少迭代次數）
    const padding = 4  // 標籤之間的最小間距
    const maxIterations = 10  // 從 20 降至 10，減少計算量

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
            similarConnections: 0,
            byFeature: new Map(),
            byAuthor: new Map()
        }
    }
    return getConnectionStats(connections.value)
})

// 計算屬性：獲取當前關注節點的詳細信息
const focusedSchemaDetails = computed(() => {
    if (!focusedSchemaId.value) return null
    return schemas.value.find(s => s.id === focusedSchemaId.value) || null
})

// 加載數據
async function loadData() {
    loading.value = true
    error.value = null

    try {
        // 同時加載兩個數據源
        const [xingData, yinData] = await Promise.all([
            loadSchemas('/genealogy/schemas.json'),
            loadSchemas('/genealogy/schemas_yin.json')
        ])

        // 標記類別
        const xingSchemas = xingData.map(s => ({ ...s, category: '字形' as const }))
        const yinSchemas = yinData.map(s => ({ ...s, category: '拼音' as const }))

        // 合併數據
        const allData = [...xingSchemas, ...yinSchemas]

        if (allData.length === 0) {
            throw new Error('無法加載數據')
        }

        schemas.value = allData

        // 計算年份範圍
        const range = getYearRange(allData)
        minYear.value = range.minYear
        maxYear.value = range.maxYear

        // 生成年份標籤（使用動態間距）
        yearLabels.value = generateYearLabels(
            allData,
            yearSpacingMap.value,
            config.value.emptyYearThreshold || 3,
            config.value.labelInterval || 5
        )

        // 獲取所有特性和作者
        allFeatures.value = getAllFeatures(allData)
        allAuthors.value = getAllAuthors(allData)

        // 計算連接關係（連接關係始終基於時間順序，不受倒序影響）
        const sortedData = sortSchemasByDate(allData, false)
        connections.value = calculateConnections(sortedData)

        console.log('數據加載完成:', {
            總數: allData.length,
            字形: xingSchemas.length,
            拼音: yinSchemas.length,
            年份範圍: `${minYear.value}-${maxYear.value}`,
            特性數: allFeatures.value.length,
            作者數: allAuthors.value.length,
            連接數: connections.value.length,
            特性連接: connectionStats.value.featureConnections,
            作者連接: connectionStats.value.authorConnections,
            相似連接: connectionStats.value.similarConnections
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
    const startTime = performance.now()

    if (focusedSchemaId.value === schemaId) {
        // 退出 focus 模式
        focusedSchemaId.value = null
        pinnedLabelConnection.value = null
    } else {
        // 進入 focus 模式
        focusedSchemaId.value = schemaId
        pinnedLabelConnection.value = null
    }

    // 性能監控
    nextTick(() => {
        const endTime = performance.now()
        const duration = endTime - startTime
        console.log(`關注模式切換耗時: ${duration.toFixed(2)}ms`, {
            連接數: connectionPaths.value.length,
            渲染緩存: connectionRenderCache.value.length,
            標籤數: labeledConnections.value.length,
            節點數: adjustedNodes.value.length
        })
    })
}

// Hover 卡片
function handleCardHover(schemaId: string | null) {
    hoveredSchemaId.value = schemaId
}

// Hover 連接標籤
function handleLabelHover(connection: Connection | null) {
    // 如果有固定的連接，hover 不起作用
    if (!pinnedLabelConnection.value) {
        hoveredLabelConnection.value = connection
    }
}

// 點擊連接標籤（固定/取消固定）
function handleLabelClick(connection: Connection) {
    if (pinnedLabelConnection.value &&
        pinnedLabelConnection.value.from === connection.from &&
        pinnedLabelConnection.value.to === connection.to) {
        // 取消固定
        pinnedLabelConnection.value = null
    } else {
        // 固定連接
        pinnedLabelConnection.value = connection
        // 清除 hover 狀態
        hoveredLabelConnection.value = null
    }
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

// 切換方案選擇
function toggleSchema(schemaId: string) {
    const index = selectedSchemas.value.indexOf(schemaId)
    if (index > -1) {
        selectedSchemas.value.splice(index, 1)
    } else {
        selectedSchemas.value.push(schemaId)
    }
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

// 拖動相關函數
function handleNodeMouseDown(event: MouseEvent, schemaId: string) {
    // 記錄初始位置
    dragStartX.value = event.clientX
    dragCurrentX.value = event.clientX
    draggedNodeId.value = schemaId

    // 設置長按定時器（200ms後認為是拖動）
    dragTimer.value = window.setTimeout(() => {
        isDragging.value = true
        document.body.style.cursor = 'grabbing'
    }, 200)
}

function handleNodeMouseMove(event: MouseEvent) {
    if (!draggedNodeId.value) return

    dragCurrentX.value = event.clientX

    // 如果已經進入拖動模式，更新虛影位置
    if (isDragging.value) {
        event.preventDefault()
    }
}

function handleNodeMouseUp() {
    // 清除定時器
    if (dragTimer.value !== null) {
        clearTimeout(dragTimer.value)
        dragTimer.value = null
    }

    // 如果是拖動模式，應用偏移量並重繪
    if (isDragging.value && draggedNodeId.value) {
        const deltaX = dragCurrentX.value - dragStartX.value
        const currentOffset = customOffsets.value.get(draggedNodeId.value) || 0
        customOffsets.value.set(draggedNodeId.value, currentOffset + deltaX)

        document.body.style.cursor = ''
    } else if (draggedNodeId.value) {
        // 如果不是拖動模式，執行正常的點擊行為
        handleCardClick(draggedNodeId.value)
    }

    // 重置狀態
    isDragging.value = false
    draggedNodeId.value = null
}

// 全屏相關函數
function toggleFullscreen() {
    if (!genealogyContainer.value) return

    if (!isFullscreen.value) {
        // 進入全屏
        if (genealogyContainer.value.requestFullscreen) {
            genealogyContainer.value.requestFullscreen()
        } else if ((genealogyContainer.value as any).webkitRequestFullscreen) {
            (genealogyContainer.value as any).webkitRequestFullscreen()
        } else if ((genealogyContainer.value as any).mozRequestFullScreen) {
            (genealogyContainer.value as any).mozRequestFullScreen()
        } else if ((genealogyContainer.value as any).msRequestFullscreen) {
            (genealogyContainer.value as any).msRequestFullscreen()
        }
    } else {
        // 退出全屏
        if (document.exitFullscreen) {
            document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen()
        }
    }
}

function handleFullscreenChange() {
    isFullscreen.value = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
    )
}

// 導出繫絡圖功能
async function exportGenealogy() {
    if (isExporting.value || !canvasWrapper.value) return

    isExporting.value = true
    exportMessage.value = ''

    try {
        const result = await GenealogyExportService.exportGenealogyToPNG(
            canvasWrapper.value,
            {
                copyToClipboard: false,
                download: true,
                scale: 2,
                addWatermark: true,
                focusedSchemaDetails: focusedSchemaDetails.value,
                title: pageTitle.value
            }
        )

        if (result.success) {
            exportMessage.value = result.message
            console.log('繫絡圖導出成功:', result.filename)
        } else {
            exportMessage.value = result.message
            console.error('繫絡圖導出失敗:', result.message)
        }

        // 3秒後清除消息
        setTimeout(() => {
            exportMessage.value = ''
        }, 3000)
    } catch (error) {
        exportMessage.value = `導出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
        console.error('導出繫絡圖時出錯:', error)

        setTimeout(() => {
            exportMessage.value = ''
        }, 5000)
    } finally {
        isExporting.value = false
    }
}

// 組件掛載時加載數據
onMounted(() => {
    loadData()
    // 添加全局事件監聽器
    document.addEventListener('mousemove', handleNodeMouseMove)
    document.addEventListener('mouseup', handleNodeMouseUp)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
})

// 組件卸載時清理
onUnmounted(() => {
    document.removeEventListener('mousemove', handleNodeMouseMove)
    document.removeEventListener('mouseup', handleNodeMouseUp)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    if (dragTimer.value !== null) {
        clearTimeout(dragTimer.value)
    }
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
    <div ref="genealogyContainer" class="genealogy-container" :class="{ 'fullscreen-mode': isFullscreen }">
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
            <!-- 工具欄 - 兩行版本 -->
            <div class="toolbar-compact">
                <!-- 第一行：標題 -->
                <div class="toolbar-header">
                    <h2 class="toolbar-title">{{ pageTitle }}</h2>
                    <!-- 統計信息 -->
                    <span class="toolbar-stats">
                        共 {{ filteredSchemas.length }} 個輸入法 ({{ minYear }}-{{ maxYear }})
                    </span>
                </div>

                <!-- 第二行：控制按鈕 -->
                <div class="toolbar-controls">
                    <div class="toolbar-left">
                        <!-- 大類篩選下拉菜單 -->
                        <div class="dropdown-wrapper">
                            <button @click="showCategoryDropdown = !showCategoryDropdown" class="dropdown-trigger">
                                {{ selectedCategory }}
                                <span class="dropdown-arrow">▼</span>
                            </button>
                            <div v-if="showCategoryDropdown" class="dropdown-menu">
                                <div class="dropdown-item"
                                    @click="selectedCategory = '字形'; showCategoryDropdown = false">
                                    <input type="radio" :checked="selectedCategory === '字形'" readonly>
                                    <span>字形</span>
                                </div>
                                <div class="dropdown-item"
                                    @click="selectedCategory = '拼音'; showCategoryDropdown = false">
                                    <input type="radio" :checked="selectedCategory === '拼音'" readonly>
                                    <span>拼音</span>
                                </div>
                                <div class="dropdown-item"
                                    @click="selectedCategory = '全部'; showCategoryDropdown = false">
                                    <input type="radio" :checked="selectedCategory === '全部'" readonly>
                                    <span>全部</span>
                                </div>
                            </div>
                        </div>

                        <!-- 方案篩選下拉菜單 -->
                        <div class="dropdown-wrapper">
                            <button @click="showSchemaDropdown = !showSchemaDropdown" class="dropdown-trigger">
                                方案
                                <span v-if="selectedSchemas.length > 0" class="badge">{{ selectedSchemas.length
                                }}</span>
                                <span class="arrow">▼</span>
                            </button>
                            <div v-if="showSchemaDropdown" class="dropdown-menu" @click.stop>
                                <div class="dropdown-header">
                                    <button @click="selectedSchemas = []" class="clear-btn">清除</button>
                                </div>
                                <label v-for="schema in schemas" :key="schema.id" class="dropdown-item">
                                    <input type="checkbox" :checked="selectedSchemas.includes(schema.id)"
                                        @change="toggleSchema(schema.id)" />
                                    <span>{{ schema.name }}</span>
                                </label>
                            </div>
                        </div>

                        <!-- 作者篩選下拉菜單 -->
                        <div class="dropdown-wrapper">
                            <button @click="showAuthorDropdown = !showAuthorDropdown" class="dropdown-trigger">
                                作者
                                <span v-if="selectedAuthors.length > 0" class="badge">{{ selectedAuthors.length
                                }}</span>
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

                        <!-- 特徵篩選下拉菜單 -->
                        <div class="dropdown-wrapper">
                            <button @click="showFeatureDropdown = !showFeatureDropdown" class="dropdown-trigger">
                                特徵
                                <span v-if="selectedFeatures.length > 0" class="badge">{{ selectedFeatures.length
                                }}</span>
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
                    </div>

                    <div class="toolbar-right">
                        <!-- Y軸縮放控制 -->
                        <div class="scale-control-inline">
                            <input type="range" v-model.number="yScaleFactor" min="0.25" max="1.0" step="0.05"
                                class="scale-slider-inline" />
                        </div>

                        <!-- 導出按鈕 -->
                        <button @click="exportGenealogy" class="btn-compact export-btn" :disabled="isExporting"
                            :title="isExporting ? '正在導出...' : '截圖下載當前可見的繫絡圖'">
                            {{ isExporting ? '⏳' : '📷' }}
                        </button>

                        <!-- 全屏按鈕 -->
                        <button @click="toggleFullscreen" class="btn-compact"
                            :title="isFullscreen ? '退出全屏 (ESC)' : '進入全屏'">
                            {{ isFullscreen ? '✕ 退出' : '⛶' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- 點擊外部關閉下拉菜單 -->
            <div v-if="showSchemaDropdown || showFeatureDropdown || showAuthorDropdown" class="dropdown-backdrop"
                @click="showSchemaDropdown = false; showFeatureDropdown = false; showAuthorDropdown = false">
            </div>

            <!-- 導出消息提示 -->
            <div v-if="exportMessage" class="export-message">
                {{ exportMessage }}
            </div>

            <!-- 畫布區域 -->
            <div ref="canvasWrapper" class="canvas-wrapper">
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
                        <marker id="arrow-similar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="3"
                            markerHeight="3" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z"
                                :fill="isDark ? 'rgba(251, 191, 36, 0.8)' : 'rgba(245, 158, 11, 0.7)'" />
                        </marker>
                    </defs>

                    <!-- 連接線（在節點下方） -->
                    <g class="connections">
                        <g v-for="(data, index) in connectionRenderCache"
                            :key="`${data.connection.from}-${data.connection.to}-${data.connection.type}-${index}`"
                            v-show="isConnectionVisible(data.connection)"
                            @mouseenter="focusedSchemaId && !data.isDimmed && handleLabelHover(data.connection)"
                            @mouseleave="focusedSchemaId && !data.isDimmed && handleLabelHover(null)"
                            @click="focusedSchemaId && !data.isDimmed && handleLabelClick(data.connection)">
                            <!-- 連接線路徑 -->
                            <path :d="data.path" :stroke="data.strokeColor" :stroke-width="data.strokeWidth" fill="none"
                                :marker-end="data.connection.type !== 'similar' ? `url(#arrow-${data.connection.type})` : undefined"
                                :stroke-dasharray="data.connection.type === 'similar' ? '5, 5' : data.connection.type === 'author' ? '10, 6' : 'none'"
                                :class="{
                                    'connection-line': true,
                                    [`connection-${data.connection.type}`]: true,
                                    'connection-parent': data.isParent,
                                    'connection-child': data.isChild,
                                    'connection-similar': data.isSimilar,
                                    'connection-focused': data.isFocused,
                                    'connection-dimmed': data.isDimmed,
                                    'connection-interactive': !data.isDimmed
                                }">
                                <title>{{ data.connection.label }}</title>
                            </path>
                        </g>
                    </g>

                    <!-- 年份標籤 -->
                    <g class="year-labels">
                        <line :x1="50" :y1="50" :x2="50" :y2="canvasHeight - 50" class="timeline-axis" />
                        <text v-for="label in adjustedYearLabels" :key="label.year" :x="40" :y="label.y + 54"
                            class="year-label-text" text-anchor="end">
                            {{ label.year }}
                        </text>
                    </g>

                    <!-- 統一渲染所有節點，用 CSS 類控制樣式 -->
                    <g class="schema-nodes-all">
                        <g v-for="node in adjustedNodes" :key="node.schema.id" v-show="isNodeVisible(node.schema.id)"
                            :transform="`translate(${node.x}, ${node.y})`"
                            @mousedown="handleNodeMouseDown($event, node.schema.id)" class="schema-node" :class="{
                                hovered: hoveredSchemaId === node.schema.id,
                                'schema-node-dimmed': focusedSchemaId &&
                                    node.schema.id !== focusedSchemaId &&
                                    !parentNodeIds.has(node.schema.id) &&
                                    !childNodeIds.has(node.schema.id) &&
                                    !similarNodeIds.has(node.schema.id),
                                'schema-node-parent': focusedSchemaId && parentNodeIds.has(node.schema.id),
                                'schema-node-child': focusedSchemaId && childNodeIds.has(node.schema.id),
                                'schema-node-similar': focusedSchemaId && similarNodeIds.has(node.schema.id),
                                'schema-node-extended': focusedSchemaId &&
                                    !isNodeInFilter(node.schema.id),
                                'focused': focusedSchemaId === node.schema.id,
                                'dragging': isDragging && draggedNodeId === node.schema.id
                            }">
                            <!-- 卡片背景 -->
                            <rect :width="node.width" :height="node.height" class="node-bg" rx="8" />

                            <!-- 第一行：名稱 -->
                            <text :x="10" :y="16" class="node-name" text-anchor="start" shape-rendering="crispEdges"
                                text-rendering="geometricPrecision">
                                {{ node.schema.name }}
                            </text>

                            <!-- 如果有維護者，顯示第二行：維護者 -->
                            <text v-if="node.schema.maintainers" :x="10" :y="31" class="node-author" text-anchor="start"
                                shape-rendering="crispEdges" text-rendering="geometricPrecision">
                                {{ node.schema.maintainers.join(' ') }}
                            </text>

                            <!-- 第三行（有維護者時）或第二行（無維護者時）：作者 -->
                            <text :x="10" :y="node.schema.maintainers ? 46 : 31" class="node-author" text-anchor="start"
                                shape-rendering="crispEdges" text-rendering="geometricPrecision">
                                {{ node.schema.authors.join(' ') }}
                            </text>

                            <!-- 第四行（有維護者時）或第三行（無維護者時）：日期 -->
                            <text :x="10" :y="node.schema.maintainers ? 61 : 46" class="node-date" text-anchor="start"
                                shape-rendering="crispEdges" text-rendering="geometricPrecision">
                                {{ formatDateToMonth(node.schema.date) }}
                            </text>
                        </g>
                    </g>

                    <!-- 拖動虛影 -->
                    <g v-if="isDragging && draggedNodeId" class="drag-ghost">
                        <g v-for="node in layoutNodes.filter(n => n.schema.id === draggedNodeId)"
                            :key="'ghost-' + node.schema.id"
                            :transform="`translate(${node.x + (dragCurrentX - dragStartX)}, ${node.y})`">
                            <rect :width="node.width" :height="node.height" class="ghost-bg" rx="8" />
                        </g>
                    </g>

                    <!-- Focus 狀態：在連接線上顯示特徵標籤（在最上層，所有卡片之後） -->
                    <g v-if="focusedSchemaId" class="connection-labels">
                        <g v-for="(labelBox, idx) in labeledConnections" :key="`label-${idx}`"
                            @mouseenter="handleLabelHover(labelBox.connection)" @mouseleave="handleLabelHover(null)"
                            @click="handleLabelClick(labelBox.connection)" class="connection-label-group" :class="{
                                'label-hovered': hoveredLabelConnection &&
                                    hoveredLabelConnection.from === labelBox.connection.from &&
                                    hoveredLabelConnection.to === labelBox.connection.to,
                                'label-pinned': pinnedLabelConnection &&
                                    pinnedLabelConnection.from === labelBox.connection.from &&
                                    pinnedLabelConnection.to === labelBox.connection.to,
                                'label-dimmed': (hoveredLabelConnection || pinnedLabelConnection) &&
                                    !((hoveredLabelConnection?.from === labelBox.connection.from &&
                                        hoveredLabelConnection?.to === labelBox.connection.to) ||
                                        (pinnedLabelConnection?.from === labelBox.connection.from &&
                                            pinnedLabelConnection?.to === labelBox.connection.to)),
                                'label-parent': labelBox.connection.from === focusedSchemaId && labelBox.connection.type !== 'similar',
                                'label-child': labelBox.connection.to === focusedSchemaId && labelBox.connection.type !== 'similar',
                                'label-similar': labelBox.connection.type === 'similar' &&
                                    (labelBox.connection.from === focusedSchemaId || labelBox.connection.to === focusedSchemaId)
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

            <!-- 浮動提示（右下角） -->
            <div v-if="focusedSchemaId || pinnedLabelConnection" class="floating-hint">
                <!-- 關注節點的詳細信息 -->
                <div v-if="focusedSchemaDetails" class="schema-details">
                    <div class="schema-details-name">
                        {{ focusedSchemaDetails.name }}
                        <a v-if="focusedSchemaDetails.url" :href="focusedSchemaDetails.url" target="_blank"
                            rel="noopener noreferrer" class="schema-link-icon" title="訪問網站">🔗</a>
                    </div>
                    <div v-if="focusedSchemaDetails.maintainers" class="schema-details-maintainers">
                        {{ focusedSchemaDetails.maintainers.join('、') }} (修訂維護)
                    </div>
                    <div class="schema-details-authors">{{ focusedSchemaDetails.authors.join('、') }}</div>
                    <div class="schema-details-date">{{ formatDate(focusedSchemaDetails.date) }}</div>
                    <div class="schema-details-features">
                        <span v-for="feature in focusedSchemaDetails.features" :key="feature" class="feature-tag">
                            {{ feature }}
                        </span>
                    </div>
                    <div v-if="focusedSchemaDetails.description" class="schema-details-description">
                        <span class="description-label"></span>{{ focusedSchemaDetails.description }}
                    </div>
                </div>

                <!-- 操作提示 -->
                <div class="hint-text">
                    <span v-if="pinnedLabelConnection">再次點擊特徵標籤解除釘選模式</span>
                    <span v-else-if="hoveredLabelConnection">點擊特徵標籤進入釘選模式</span>
                    <span v-else>再次點擊方案卡片解除關注模式</span>
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

/* 全屏模式 */
.genealogy-container.fullscreen-mode {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
}

:global(.dark) .genealogy-container.fullscreen-mode {
    background: rgba(0, 0, 0, 0.9);
}

.fullscreen-mode .genealogy-content {
    width: fit-content;
    max-width: 90vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--vp-c-bg, #ffffff);
    border-radius: 0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
}

:global(.dark) .fullscreen-mode .genealogy-content {
    background: var(--vp-c-bg, #1f2937);
}

.fullscreen-mode .canvas-wrapper {
    flex: 1;
    overflow: auto;
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
    width: fit-content;
    max-width: 100%;
}

/* 簡化工具欄 - 兩行版本 */
.toolbar-compact {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--vp-c-bg-soft, #f8fafc);
    border-radius: 0.5rem;
    position: relative;
}

:global(.dark) .toolbar-compact {
    background: var(--vp-c-bg-soft, #374151);
}

.toolbar-header {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.toolbar-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--vp-c-text-1, #1e293b);
    margin: 0;
    padding: 0;
    border: none;
    border-top: none;
    font-family: "Noto Serif SC", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

:global(.dark) .toolbar-title {
    color: var(--vp-c-text-1, #f1f5f9);
}

.toolbar-stats {
    font-size: 0.875rem;
    color: var(--vp-c-text-2, #64748b);
}

:global(.dark) .toolbar-stats {
    color: var(--vp-c-text-2, #94a3b8);
}

.toolbar-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 0;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 0;
}

/* 內聯Y軸縮放控制 */
.scale-control-inline {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--vp-c-divider, #e2e8f0);
    border-radius: 0.375rem;
    background: var(--vp-c-bg, #ffffff);
}

:global(.dark) .scale-control-inline {
    border-color: var(--vp-c-divider, #4b5563);
    background: var(--vp-c-bg, #374151);
}

.scale-slider-inline {
    width: 120px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--vp-c-divider, #e2e8f0);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
}

:global(.dark) .scale-slider-inline {
    background: var(--vp-c-divider, #4b5563);
}

.scale-slider-inline::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: rgb(99, 102, 241);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
}

.scale-slider-inline::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
}

:global(.dark) .scale-slider-inline::-webkit-slider-thumb {
    background: rgb(165, 180, 252);
}

.scale-slider-inline::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: rgb(99, 102, 241);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
}

.scale-slider-inline::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
}

:global(.dark) .scale-slider-inline::-moz-range-thumb {
    background: rgb(165, 180, 252);
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

/* 導出按鈕特殊樣式 */
.export-btn {
    position: relative;
}

.export-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.export-btn:disabled:hover {
    transform: none;
    background: var(--vp-c-bg, #ffffff);
}

:global(.dark) .export-btn:disabled:hover {
    background: var(--vp-c-bg, #1f2937);
}

/* 導出消息提示 */
.export-message {
    padding: 0.75rem 1rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 0.5rem;
    color: rgb(21, 128, 61);
    font-size: 0.875rem;
    text-align: center;
    animation: slideDown 0.3s ease-out;
}

:global(.dark) .export-message {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.4);
    color: rgb(134, 239, 172);
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.canvas-wrapper {
    position: relative;
    width: fit-content;
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

/* SVG 性能優化：限制重排範圍 */
.connections {
    contain: layout style paint;
}

.schema-nodes-all {
    contain: layout style paint;
}

.connection-labels {
    contain: layout style paint;
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
    cursor: grab;
    transition: all 0.3s ease;
}

.schema-node.dragging {
    cursor: grabbing;
    opacity: 0.5;
}

/* 拖動虛影 */
.drag-ghost .ghost-bg {
    fill: var(--vp-c-brand, rgb(99, 102, 241));
    opacity: 0.3;
    stroke: var(--vp-c-brand, rgb(99, 102, 241));
    stroke-width: 2;
    stroke-dasharray: 5, 5;
}

:global(.dark) .drag-ghost .ghost-bg {
    fill: rgb(165, 180, 252);
    stroke: rgb(165, 180, 252);
}

/* 淡化的背景節點 */
.schema-node-dimmed {
    opacity: 0.25;
}

.schema-node-dimmed:hover {
    opacity: 0.5;
}

.node-bg {
    fill: var(--vp-c-bg-soft, #f1f5f9);
    stroke: rgb(99, 102, 241);
    stroke-width: 2;
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

/* 相似節點樣式（橙色） */
.schema-node-similar .node-bg {
    stroke: rgb(245, 158, 11);
    fill: rgba(245, 158, 11, 0.05);
}

:global(.dark) .schema-node-similar .node-bg {
    stroke: rgb(251, 191, 36);
    fill: rgba(251, 191, 36, 0.05);
}

.schema-node-similar.hovered .node-bg {
    stroke: rgb(245, 158, 11);
    fill: rgba(245, 158, 11, 0.15);
    stroke-width: 3;
}

:global(.dark) .schema-node-similar.hovered .node-bg {
    stroke: rgb(251, 191, 36);
    fill: rgba(251, 191, 36, 0.15);
}

/* 擴展節點樣式（篩選外但因關注模式顯示的父子節點） */
.schema-node-extended .node-bg {
    stroke-dasharray: 4, 2;
    opacity: 0.7;
}

.schema-node-extended.hovered .node-bg {
    opacity: 1;
}

.schema-node-extended .node-name,
.schema-node-extended .node-author,
.schema-node-extended .node-date {
    opacity: 0.7;
}

.schema-node-extended.hovered .node-name,
.schema-node-extended.hovered .node-author,
.schema-node-extended.hovered .node-date {
    opacity: 1;
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

/* 連接線樣式 */
.connection-line {
    opacity: 0.15;
    /* 默认非常淡 */
}

.connection-interactive {
    cursor: pointer;
}

.connection-feature {
    stroke-dasharray: none;
}

.connection-author {
    stroke-dasharray: 10, 6;
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

/* 相似連接線（橙色） */
.connection-similar {
    stroke-dasharray: 5, 5 !important;
    stroke: rgba(245, 158, 11, 0.7);
}

:global(.dark) .connection-similar {
    stroke: rgba(251, 191, 36, 0.8);
}

.connection-focused {
    stroke-width: 3 !important;
    opacity: 0.9 !important;
}

.connection-dimmed {
    opacity: 0.05;
    /* 其他线更淡 */
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
    stroke: var(--vp-c-divider, #e5e7eb);
    stroke-width: 1;
}

:global(.dark) .connection-label-bg {
    fill: var(--vp-c-bg, #1e293b);
    stroke: var(--vp-c-divider, #4b5563);
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

/* 子系標籤（綠色） */
.connection-label-group.label-child .connection-label {
    fill: rgb(34, 197, 94);
}

:global(.dark) .connection-label-group.label-child .connection-label {
    fill: rgb(134, 239, 172);
}

/* 相似標籤（紫灰色） */
.connection-label-group.label-similar .connection-label {
    fill: rgb(245, 158, 11);
}

:global(.dark) .connection-label-group.label-similar .connection-label {
    fill: rgb(251, 191, 36);
}

/* 標籤 hover 效果 - 統一處理 */
.connection-label-group.label-parent:hover .connection-label-bg,
.connection-label-group.label-parent.label-hovered .connection-label-bg {
    fill: rgb(99, 102, 241);
}

:global(.dark) .connection-label-group.label-parent:hover .connection-label-bg,
:global(.dark) .connection-label-group.label-parent.label-hovered .connection-label-bg {
    fill: rgb(165, 180, 252);
}

.connection-label-group.label-child:hover .connection-label-bg,
.connection-label-group.label-child.label-hovered .connection-label-bg {
    fill: rgb(34, 197, 94);
}

:global(.dark) .connection-label-group.label-child:hover .connection-label-bg,
:global(.dark) .connection-label-group.label-child.label-hovered .connection-label-bg {
    fill: rgb(134, 239, 172);
}

.connection-label-group.label-similar:hover .connection-label-bg,
.connection-label-group.label-similar.label-hovered .connection-label-bg {
    fill: rgb(245, 158, 11);
}

:global(.dark) .connection-label-group.label-similar:hover .connection-label-bg,
:global(.dark) .connection-label-group.label-similar.label-hovered .connection-label-bg {
    fill: rgb(251, 191, 36);
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

/* 固定的標籤（pinned） */
.connection-label-group.label-pinned .connection-label-bg {
    opacity: 1 !important;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
    stroke: currentColor;
    stroke-width: 2;
}

.connection-label-group.label-pinned .connection-label {
    fill: white !important;
    font-weight: 700;
}

:global(.dark) .connection-label-group.label-pinned .connection-label {
    fill: #1e293b !important;
}

/* 父系固定標籤 */
.connection-label-group.label-pinned.label-parent .connection-label-bg {
    fill: rgb(99, 102, 241);
    stroke: rgb(79, 70, 229);
}

:global(.dark) .connection-label-group.label-pinned.label-parent .connection-label-bg {
    fill: rgb(165, 180, 252);
    stroke: rgb(129, 140, 248);
}

/* 子系固定標籤 */
.connection-label-group.label-pinned.label-child .connection-label-bg {
    fill: rgb(34, 197, 94);
    stroke: rgb(22, 163, 74);
}

:global(.dark) .connection-label-group.label-pinned.label-child .connection-label-bg {
    fill: rgb(134, 239, 172);
    stroke: rgb(74, 222, 128);
}

/* 相似固定標籤 */
.connection-label-group.label-pinned.label-similar .connection-label-bg {
    fill: rgb(71, 85, 105);
    stroke: rgb(51, 65, 85);
}

:global(.dark) .connection-label-group.label-pinned.label-similar .connection-label-bg {
    fill: rgb(226, 232, 240);
    stroke: rgb(241, 245, 249);
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
    opacity: 1;
    pointer-events: none;
    stroke: none;
    transition: all 0.2s ease;
}

:global(.dark) .connection-label {
    fill: rgb(165, 180, 252);
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

/* 浮動提示樣式 */
.floating-hint {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 0.75rem 1.25rem;
    background: rgba(99, 102, 241, 0.95);
    color: white;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 1000;
    pointer-events: auto;
    user-select: text;
    animation: fadeIn 0.3s ease-in-out;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
}

:global(.dark) .floating-hint {
    background: rgba(165, 180, 252, 0.95);
    color: #1e293b;
}

/* 方案詳細信息樣式 */
.schema-details {
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

:global(.dark) .schema-details {
    border-bottom-color: rgba(30, 41, 59, 0.3);
}

.schema-details-name {
    font-family: 'Noto Serif SC';
    font-size: 1.2rem;
    font-weight: 900;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.schema-link-icon {
    font-size: 0.875rem;
    text-decoration: none;
    opacity: 0.7;
    transition: opacity 0.2s;
    cursor: pointer;
}

.schema-link-icon:hover {
    opacity: 1;
}

.schema-details-maintainers {
    font-size: 0.875rem;
    opacity: 0.9;
    /* margin-top: 0.1rem; */
}

.schema-details-authors {
    font-size: 0.875rem;
    opacity: 0.9;
    /* margin-top: 0.1rem; */
}

.schema-details-date {
    font-size: 0.875rem;
    opacity: 0.8;
}

.schema-details-features {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    /* margin-top: 0.25rem; */
}

.schema-details .feature-tag {
    padding: 0.125rem 0.5rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    white-space: nowrap;
}

:global(.dark) .schema-details .feature-tag {
    background: rgba(30, 41, 59, 0.3);
}

.schema-details-description {
    font-size: 0.875rem;
    opacity: 0.9;
    /* margin-top: 0.25rem; */
    /* padding-top: 0.25rem; */
    /* border-top: 1px solid rgba(255, 255, 255, 0.2); */
}

:global(.dark) .schema-details-description {
    border-top-color: rgba(30, 41, 59, 0.3);
}

.description-label {
    font-weight: 600;
    opacity: 1;
}

.hint-text {
    font-size: 0.875rem;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(0.5rem);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
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

    .floating-hint {
        bottom: 1rem;
        right: 1rem;
        font-size: 0.8125rem;
        padding: 0.625rem 1rem;
    }
}
</style>
