/**
 * 輸入法源流圖佈局算法
 * 
 * 負責計算節點位置，防止重疊，優化視覺效果
 */

import type { SchemaData, LayoutNode, GenealogyConfig } from './types'
import { calculateYPosition, parseYear, formatDate } from './dataLoader'

/**
 * 分組：將相近時間的輸入法分到同一組
 */
interface TimeGroup {
    /** 組的基準Y坐標 */
    y: number
    /** 組內的輸入法 */
    schemas: SchemaData[]
    /** Y坐標範圍的最小值 */
    minY: number
    /** Y坐標範圍的最大值 */
    maxY: number
}

/**
 * 計算文本寬度（考慮中英文混合）
 * @param text 文本內容
 * @returns 寬度（像素）
 */
function getTextWidth(text: string, is_schema_name: boolean): number {
    let width = 0
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i)
        // 檢測是否為中文字符或全角字符
        if ((char >= 0x4E00 && char <= 0x9FFF) ||
            (char >= 0x3400 && char <= 0x4DBF) ||
            (char >= 0x20000 && char <= 0x2A6DF)) {
            if (is_schema_name) {
                width += 15  // 中文字符寬度}
            }
            else {
                width += 12  // 中文字符寬度
            }
        } else {
            width += 6.5  // 英文字符寬度
        }
    }
    return width
}

/**
 * 計算卡片所需的寬度（基於內容）
 * @param schema 輸入法數據
 * @returns 卡片寬度（像素）
 */
function calculateCardWidth(schema: SchemaData): number {
    // 計算各部分文本寬度
    const nameWidth = getTextWidth(schema.name, true)
    const authorWidth = getTextWidth(schema.authors.join(' '), false)
    const dateWidth = getTextWidth(formatDate(schema.date), false)  // "2024年3月12日" 等格式

    // 三行布局：取三行中最宽的一行
    // 格式: [10px內邊距] 第1行：名稱 [10px內邊距]
    //       [10px內邊距] 第2行：作者 [10px內邊距]
    //       [10px內邊距] 第3行：日期 [10px內邊距]
    const maxTextWidth = Math.max(nameWidth, authorWidth, dateWidth)
    const padding = 10  // 左右各5px
    const minWidth = 60  // 最小寬度
    const maxWidth = 350  // 最大寬度

    return Math.max(minWidth, Math.min(maxWidth, maxTextWidth + padding))
}

/**
 * 格式化年份顯示
 */
function formatYear(date: string): string {
    if (date.length === 4) {
        return date  // 只有年份
    } else if (date.length === 7) {
        return date  // 年-月
    } else {
        return date.slice(0, 7)  // 年-月-日 -> 年-月
    }
}

/**
 * 計算完整的佈局
 * @param schemas 輸入法數據數組
 * @param config 配置項
 * @param minYear 最小年份
 * @param yearSpacingMap 年份間距映射表
 * @returns 佈局節點數組
 */
export function calculateLayout(
    schemas: SchemaData[],
    config: GenealogyConfig,
    minYear: number,
    yearSpacingMap: Map<number, number>
): LayoutNode[] {
    if (schemas.length === 0) return []

    const baseSpacing = config.baseSpacing || 30
    const schemaSpacing = config.schemaSpacing || 90
    const nodeSpacing = config.nodeSpacing || 20
    const canvasWidth = config.width || 1200

    // 節點支持3行顯示
    const nodeHeight = 54

    // 計算每個輸入法的Y坐標和寬度
    const schemasWithY = schemas.map(schema => ({
        schema,
        y: calculateYPosition(schema, minYear, yearSpacingMap, baseSpacing, schemaSpacing, schemas),
        width: calculateCardWidth(schema)  // 根據內容計算寬度
    }))

    // 按Y坐標排序（時間順序）
    schemasWithY.sort((a, b) => a.y - b.y)

    // 直接按時間順序填充 4 列
    const layoutNodes = layoutInColumnsSequentially(
        schemasWithY,
        nodeHeight,
        nodeSpacing,
        canvasWidth
    )

    return layoutNodes
}

/**
 * 按時間順序循環填充 4 列
 * @param schemasWithY 帶Y坐標和寬度的輸入法數組（已按時間排序）
 * @param nodeHeight 節點高度
 * @param nodeSpacing 節點間距
 * @param canvasWidth 畫布寬度
 * @returns 佈局節點數組
 */
function layoutInColumnsSequentially(
    schemasWithY: Array<{ schema: SchemaData; y: number; width: number }>,
    nodeHeight: number,
    nodeSpacing: number,
    canvasWidth: number = 1200
): LayoutNode[] {
    const nodes: LayoutNode[] = []

    if (schemasWithY.length === 0) return nodes

    // 畫布左右邊距
    const leftMargin = 80
    const rightMargin = 50
    const availableWidth = canvasWidth - leftMargin - rightMargin

    // 固定 4 列
    const columnsCount = 4
    const columnWidth = availableWidth / columnsCount

    // 三次哈希函數：用於生成穩定的隨機偏移
    const getStableOffset = (schema: SchemaData, maxOffset: number): number => {
        const str = schema.id + schema.name + schema.authors.join('') + schema.date
        let hash = 0

        // 第一次哈希
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i)
            hash = hash & hash
        }

        // 第二次哈希
        hash = Math.abs(hash * 2654435761)

        // 第三次哈希
        hash = Math.abs(hash * 1597334677)

        // 映射到 [-maxOffset/2, maxOffset/2] 範圍
        return (hash % maxOffset) - maxOffset / 2
    }

    // 按時間順序循環分配：1 - 2 - 3 - 0 - 1 - 2 - 3 - 0 ...
    schemasWithY.forEach((item, index) => {
        // 列索引：循環 1, 2, 3, 0, 1, 2, 3, 0 ...
        const colIndex = (index + 1) % columnsCount

        // 列的基礎 X 坐標（列中心）
        const baseX = leftMargin + columnWidth * colIndex + columnWidth / 2

        // 三次哈希偏移（在列寬的 60% 範圍內隨機偏移）
        const maxOffset = columnWidth * 0.6
        const offset = getStableOffset(item.schema, maxOffset)

        // 最終 X 坐標
        const x = baseX + offset - item.width / 2

        // 限制在畫布範圍內
        const finalX = Math.max(
            leftMargin,
            Math.min(x, canvasWidth - rightMargin - item.width)
        )

        nodes.push({
            schema: item.schema,
            x: finalX,
            y: item.y + 50, // 保留頂部空間
            width: item.width,
            height: nodeHeight
        })
    })

    return nodes
}

/**
 * 優化佈局：使用力導向算法微調位置（可選的高級功能）
 * @param nodes 初始佈局節點
 * @param iterations 迭代次數
 * @returns 優化後的節點
 */
export function optimizeLayout(
    nodes: LayoutNode[],
    iterations: number = 50
): LayoutNode[] {
    // 創建節點副本
    const optimizedNodes = nodes.map(node => ({ ...node }))

    // 參數
    const repulsionStrength = 100 // 排斥力強度
    const minDistance = 50 // 最小距離

    for (let iter = 0; iter < iterations; iter++) {
        // 計算每個節點受到的力
        const forces = optimizedNodes.map(() => ({ fx: 0, fy: 0 }))

        for (let i = 0; i < optimizedNodes.length; i++) {
            for (let j = i + 1; j < optimizedNodes.length; j++) {
                const node1 = optimizedNodes[i]
                const node2 = optimizedNodes[j]

                // 計算兩節點中心點的距離
                const dx = (node2.x + node2.width / 2) - (node1.x + node1.width / 2)
                const dy = (node2.y + node2.height / 2) - (node1.y + node1.height / 2)
                const distance = Math.sqrt(dx * dx + dy * dy)

                // 如果距離太近，施加排斥力
                if (distance < minDistance && distance > 0) {
                    const force = repulsionStrength / (distance * distance)
                    const fx = (dx / distance) * force
                    const fy = (dy / distance) * force

                    forces[i].fx -= fx
                    forces[i].fy -= fy
                    forces[j].fx += fx
                    forces[j].fy += fy
                }
            }
        }

        // 應用力（主要在X軸方向，Y軸受限）
        const dampingX = 0.1 // X軸阻尼
        const dampingY = 0.02 // Y軸阻尼（較小，保持時間軸對齊）

        optimizedNodes.forEach((node, i) => {
            node.x += forces[i].fx * dampingX
            node.y += forces[i].fy * dampingY

            // 限制X坐標在合理範圍內
            node.x = Math.max(100, Math.min(1000, node.x))
        })
    }

    return optimizedNodes
}

/**
 * 檢測兩個節點是否重疊
 * @param node1 節點1
 * @param node2 節點2
 * @param padding 額外的邊距
 * @returns 是否重疊
 */
export function isOverlapping(
    node1: LayoutNode,
    node2: LayoutNode,
    padding: number = 10
): boolean {
    return !(
        node1.x + node1.width + padding < node2.x ||
        node2.x + node2.width + padding < node1.x ||
        node1.y + node1.height + padding < node2.y ||
        node2.y + node2.height + padding < node1.y
    )
}

/**
 * 計算佈局質量分數（用於評估佈局效果）
 * @param nodes 佈局節點
 * @returns 質量分數（0-100，越高越好）
 */
export function calculateLayoutQuality(nodes: LayoutNode[]): number {
    if (nodes.length === 0) return 100

    let overlapCount = 0
    let totalPairs = 0

    // 檢查重疊
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            totalPairs++
            if (isOverlapping(nodes[i], nodes[j])) {
                overlapCount++
            }
        }
    }

    // 計算分數
    const overlapPenalty = totalPairs > 0 ? (overlapCount / totalPairs) * 50 : 0
    const score = 100 - overlapPenalty

    return Math.max(0, Math.min(100, score))
}
