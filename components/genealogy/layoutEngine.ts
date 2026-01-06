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

    // 按Y坐標排序
    schemasWithY.sort((a, b) => a.y - b.y)

    // 分組：將Y坐標相近的輸入法分到同一組
    const groups = groupByProximity(schemasWithY, nodeHeight + nodeSpacing)

    // 為每組計算橫向佈局（保留各自的Y坐標和寬度）
    const layoutNodes: LayoutNode[] = []

    groups.forEach(group => {
        const nodesInGroup = layoutHorizontallyWithY(
            schemasWithY.filter(item => group.schemas.includes(item.schema)),
            nodeHeight,
            nodeSpacing,
            canvasWidth
        )
        layoutNodes.push(...nodesInGroup)
    })

    return layoutNodes
}

/**
 * 將相近的輸入法按Y坐標分組
 * @param schemasWithY 帶Y坐標的輸入法數組
 * @param threshold 分組閾值（像素）
 * @returns 分組結果
 */
function groupByProximity(
    schemasWithY: Array<{ schema: SchemaData; y: number; width: number }>,
    threshold: number
): TimeGroup[] {
    if (schemasWithY.length === 0) return []

    const groups: TimeGroup[] = []
    let currentGroup: TimeGroup = {
        y: schemasWithY[0].y,
        schemas: [schemasWithY[0].schema],
        minY: schemasWithY[0].y,
        maxY: schemasWithY[0].y
    }

    for (let i = 1; i < schemasWithY.length; i++) {
        const item = schemasWithY[i]

        // 如果與當前組的距離小於閾值，加入當前組
        if (item.y - currentGroup.maxY < threshold) {
            currentGroup.schemas.push(item.schema)
            currentGroup.maxY = item.y
            // 更新組的中心Y坐標
            currentGroup.y = (currentGroup.minY + currentGroup.maxY) / 2
        } else {
            // 否則創建新組
            groups.push(currentGroup)
            currentGroup = {
                y: item.y,
                schemas: [item.schema],
                minY: item.y,
                maxY: item.y
            }
        }
    }

    // 添加最後一組
    groups.push(currentGroup)

    return groups
}

/**
 * 橫向佈局：為同一時間段的輸入法分配X坐標（保留各自的Y坐標和寬度）
 * @param schemasWithY 帶Y坐標和寬度的輸入法數組
 * @param nodeHeight 節點高度
 * @param nodeSpacing 節點間距
 * @param canvasWidth 畫布寬度
 * @returns 佈局節點數組
 */
function layoutHorizontallyWithY(
    schemasWithY: Array<{ schema: SchemaData; y: number; width: number }>,
    nodeHeight: number,
    nodeSpacing: number,
    canvasWidth: number = 1200
): LayoutNode[] {
    const nodes: LayoutNode[] = []

    if (schemasWithY.length === 0) return nodes

    // 畫布左側預留空間（用於時間軸）
    const leftMargin = 80
    // 畫布右側預留空間
    const rightMargin = 50
    // 可用寬度
    const availableWidth = canvasWidth - leftMargin - rightMargin

    // 計算每個輸入法的哈希值，用於確定其橫向偏移
    const getStableOffset = (schema: SchemaData, totalWidth: number): number => {
        // 使用輸入法名稱、作者和日期生成穩定的哈希值
        const str = schema.id + schema.name + schema.authors.join('') + schema.date
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            // 使用更複雜的哈希算法增加分散度
            hash = ((hash << 5) - hash) + str.charCodeAt(i)
            hash = hash & hash // 轉換為32位整數
        }
        // 使用二次哈希增加隨機性
        hash = Math.abs(hash * 2654435761) % totalWidth
        // 將哈希值映射到 [0, totalWidth] 範圍
        return hash
    }

    if (schemasWithY.length === 1) {
        // 只有一個節點，添加基於名稱的偏移而不是完全居中
        const item = schemasWithY[0]
        const maxOffset = availableWidth - item.width
        const offset = getStableOffset(item.schema, Math.floor(maxOffset * 0.8)) + maxOffset * 0.1
        nodes.push({
            schema: item.schema,
            x: leftMargin + offset,
            y: item.y + 50, // 預留頂部空間，使用實際的y坐標
            width: item.width,
            height: nodeHeight
        })
    } else if (schemasWithY.length === 2) {
        // 兩個節點，使用1/3和2/3位置並添加偏移
        const section = availableWidth / 3
        const maxOffset = section * 0.6

        schemasWithY.forEach((item, i) => {
            const offset = getStableOffset(item.schema, Math.floor(maxOffset))
            const baseX = i === 0 ? section * 0.5 : section * 1.8
            nodes.push({
                schema: item.schema,
                x: leftMargin + baseX + offset,
                y: item.y + 50, // 使用實際的y坐標
                width: item.width,
                height: nodeHeight
            })
        })
    } else if (schemasWithY.length === 3) {
        // 三個節點，均勻分佈
        const section = availableWidth / 4
        const maxOffset = section * 0.5

        schemasWithY.forEach((item, i) => {
            const offset = getStableOffset(item.schema, Math.floor(maxOffset))
            nodes.push({
                schema: item.schema,
                x: leftMargin + section * (i + 0.5) + offset,
                y: item.y + 50, // 使用實際的y坐標
                width: item.width,
                height: nodeHeight
            })
        })
    } else {
        // 多個節點，使用循環列佈局
        // 將節點分成多列，按循環排列，但起始列隨機
        const columnsCount = Math.min(4, Math.ceil(Math.sqrt(schemasWithY.length))) // 最多4列
        const columnWidth = availableWidth / columnsCount
        const verticalSpacing = nodeHeight + nodeSpacing

        // 根據組的第一個節點信息生成隨機起始列
        const startColOffset = getStableOffset(schemasWithY[0].schema, columnsCount)

        schemasWithY.forEach((item, i) => {
            // 確定在第幾列（循環，但從隨機起始列開始）
            // 例如：startColOffset=2 時：2,3,0,1,2,3,0,1...
            const colIndex = (i + startColOffset) % columnsCount

            // 確定在第幾行
            const rowIndex = Math.floor(i / columnsCount)

            // 計算基礎位置
            const baseX = leftMargin + columnWidth * colIndex + columnWidth * 0.1
            const maxOffsetX = columnWidth * 0.6

            // 添加基於哈希的偏移，但範圍更大
            const hashOffset = getStableOffset(item.schema, Math.floor(maxOffsetX))
            const x = baseX + hashOffset

            // Y坐標：使用原始Y坐標加上行偏移
            const yOffset = rowIndex * verticalSpacing * 0.3  // 輕微的行偏移

            nodes.push({
                schema: item.schema,
                x: Math.max(leftMargin, Math.min(x, canvasWidth - rightMargin - item.width)),
                y: item.y + 50 + yOffset,
                width: item.width,
                height: nodeHeight
            })
        })
    }

    return nodes
}

/**
 * 橫向佈局：為同一時間段的輸入法分配X坐標（舊版本，已棄用）
 * @param schemas 輸入法數組
 * @param baseY 基準Y坐標
 * @param nodeWidth 節點寬度
 * @param nodeHeight 節點高度
 * @param canvasWidth 畫布寬度
 * @returns 佈局節點數組
 */
function layoutHorizontally(
    schemas: SchemaData[],
    baseY: number,
    nodeWidth: number,
    nodeHeight: number,
    nodeSpacing: number,
    canvasWidth: number = 1200
): LayoutNode[] {
    const nodes: LayoutNode[] = []

    if (schemas.length === 0) return nodes

    // 畫布左側預留空間（用於時間軸）
    const leftMargin = 80
    // 畫布右側預留空間
    const rightMargin = 50
    // 可用寬度
    const availableWidth = canvasWidth - leftMargin - rightMargin

    // 計算每個輸入法的哈希值，用於確定其橫向偏移
    const getStableOffset = (schema: SchemaData, totalWidth: number): number => {
        // 使用輸入法名稱、作者和日期生成穩定的哈希值
        const str = schema.id + schema.name + schema.authors.join('') + schema.date
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            // 使用更複雜的哈希算法增加分散度
            hash = ((hash << 5) - hash) + str.charCodeAt(i)
            hash = hash & hash // 轉換為32位整數
        }
        // 使用二次哈希增加隨機性
        hash = Math.abs(hash * 2654435761) % totalWidth
        // 將哈希值映射到 [0, totalWidth] 範圍
        return hash
    }

    if (schemas.length === 1) {
        // 只有一個節點，添加基於名稱的偏移而不是完全居中
        const maxOffset = availableWidth - nodeWidth
        const offset = getStableOffset(schemas[0], Math.floor(maxOffset * 0.8)) + maxOffset * 0.1
        nodes.push({
            schema: schemas[0],
            x: leftMargin + offset,
            y: baseY + 50, // 預留頂部空間
            width: nodeWidth,
            height: nodeHeight
        })
    } else if (schemas.length === 2) {
        // 兩個節點，使用1/3和2/3位置並添加偏移
        const section = availableWidth / 3
        const maxOffset = section * 0.6

        const offset1 = getStableOffset(schemas[0], Math.floor(maxOffset))
        const offset2 = getStableOffset(schemas[1], Math.floor(maxOffset))

        nodes.push({
            schema: schemas[0],
            x: leftMargin + section * 0.5 + offset1,
            y: baseY + 50,
            width: nodeWidth,
            height: nodeHeight
        })
        nodes.push({
            schema: schemas[1],
            x: leftMargin + section * 1.8 + offset2,
            y: baseY + 50,
            width: nodeWidth,
            height: nodeHeight
        })
    } else if (schemas.length === 3) {
        // 三個節點，分別放在左、中、右並添加偏移
        const section = availableWidth / 4
        const maxOffset = section * 0.5

        schemas.forEach((schema, index) => {
            const offset = getStableOffset(schema, Math.floor(maxOffset))
            nodes.push({
                schema,
                x: leftMargin + section * (index + 0.5) + offset,
                y: baseY + 50,
                width: nodeWidth,
                height: nodeHeight
            })
        })
    } else {
        // 多個節點，均勻分佈但添加小幅偏移
        const totalNodeWidth = schemas.length * nodeWidth
        const totalSpacing = (schemas.length - 1) * nodeSpacing
        const totalWidth = totalNodeWidth + totalSpacing

        let startX: number
        if (totalWidth <= availableWidth) {
            // 可以在一行內放下，居中放置並添加偏移
            startX = leftMargin + (availableWidth - totalWidth) / 2
            const maxOffset = nodeSpacing * 0.3

            schemas.forEach((schema, index) => {
                const offset = getStableOffset(schema, Math.floor(maxOffset)) - maxOffset / 2
                nodes.push({
                    schema,
                    x: startX + index * (nodeWidth + nodeSpacing) + offset,
                    y: baseY + 50,
                    width: nodeWidth,
                    height: nodeHeight
                })
            })
        } else {
            // 需要分多行或壓縮間距
            // 這裡採用壓縮間距的方式
            const compressedSpacing = (availableWidth - totalNodeWidth) / (schemas.length - 1)
            startX = leftMargin

            schemas.forEach((schema, index) => {
                nodes.push({
                    schema,
                    x: startX + index * (nodeWidth + compressedSpacing),
                    y: baseY + 50,
                    width: nodeWidth,
                    height: nodeHeight
                })
            })
        }
    }

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
