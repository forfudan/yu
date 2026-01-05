/**
 * 輸入法源流圖佈局算法
 * 
 * 負責計算節點位置，防止重疊，優化視覺效果
 */

import type { SchemaData, LayoutNode, GenealogyConfig } from './types'
import { calculateYPosition, parseYear } from './dataLoader'

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

    // 節點尺寸（緊湊單行版本）
    const nodeWidth = 200
    const nodeHeight = 40  // 從 80 減少到 40

    // 計算每個輸入法的Y坐標
    const schemasWithY = schemas.map(schema => ({
        schema,
        y: calculateYPosition(schema, minYear, yearSpacingMap, baseSpacing, schemaSpacing)
    }))

    // 按Y坐標排序
    schemasWithY.sort((a, b) => a.y - b.y)

    // 分組：將Y坐標相近的輸入法分到同一組
    const groups = groupByProximity(schemasWithY, nodeHeight + nodeSpacing)

    // 為每組計算橫向佈局
    const layoutNodes: LayoutNode[] = []

    groups.forEach(group => {
        const nodesInGroup = layoutHorizontally(
            group.schemas,
            group.y,
            nodeWidth,
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
    schemasWithY: Array<{ schema: SchemaData; y: number }>,
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
 * 橫向佈局：為同一時間段的輸入法分配X坐標
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

    if (schemas.length === 1) {
        // 只有一個節點，居中放置
        nodes.push({
            schema: schemas[0],
            x: leftMargin + (availableWidth - nodeWidth) / 2,
            y: baseY + 50, // 預留頂部空間
            width: nodeWidth,
            height: nodeHeight
        })
    } else if (schemas.length === 2) {
        // 兩個節點，左右分佈
        const spacing = (availableWidth - 2 * nodeWidth) / 3
        nodes.push({
            schema: schemas[0],
            x: leftMargin + spacing,
            y: baseY + 50,
            width: nodeWidth,
            height: nodeHeight
        })
        nodes.push({
            schema: schemas[1],
            x: leftMargin + spacing * 2 + nodeWidth,
            y: baseY + 50,
            width: nodeWidth,
            height: nodeHeight
        })
    } else {
        // 多個節點，均勻分佈
        const totalNodeWidth = schemas.length * nodeWidth
        const totalSpacing = (schemas.length - 1) * nodeSpacing
        const totalWidth = totalNodeWidth + totalSpacing

        let startX: number
        if (totalWidth <= availableWidth) {
            // 可以在一行內放下，居中放置
            startX = leftMargin + (availableWidth - totalWidth) / 2

            schemas.forEach((schema, index) => {
                nodes.push({
                    schema,
                    x: startX + index * (nodeWidth + nodeSpacing),
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
