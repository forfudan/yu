/**
 * 輸入法繫絡圖佈局算法
 * 
 * 負責計算節點位置，防止重疊，優化視覺效果
 */

import type { SchemaData, LayoutNode, GenealogyConfig } from './types'
import { calculateYPosition, parseYear, formatDateToMonth } from './dataLoader'

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
                width += 15  // 中文字符寬度
            }
            else {
                width += 12  // 中文字符寬度
            }
        } else {
            if (is_schema_name) {
                width += 10  // 英文字符寬度
            }
            else {
                width += 7 // 英文字符寬度
            }
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
    const maintainerWidth = schema.maintainers ? getTextWidth(schema.maintainers.join(' '), false) : 0
    const dateWidth = getTextWidth(formatDateToMonth(schema.date), false)  // "2024年3月" 或 "2024年" 等格式

    // 取所有行中最宽的一行
    const maxTextWidth = Math.max(nameWidth, authorWidth, maintainerWidth, dateWidth)
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
    // 高度：有維護者時為 4 行，無維護者時為 3 行
    const nodeHeight = 54
    const nodeHeightWithMaintainer = 69

    // 計算每個輸入法的Y坐標、寬度和高度
    const schemasWithY = schemas.map(schema => ({
        schema,
        y: calculateYPosition(schema, minYear, yearSpacingMap, baseSpacing, schemaSpacing, schemas),
        width: calculateCardWidth(schema),  // 根據內容計算寬度
        height: schema.maintainers ? nodeHeightWithMaintainer : nodeHeight
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
 * @param schemasWithY 帶Y坐標、寬度和高度的輸入法數組（已按時間排序）
 * @param nodeHeight 預設節點高度（3行卡片）
 * @param nodeSpacing 節點間距
 * @param canvasWidth 畫布寬度
 * @returns 佈局節點數組
 */
function layoutInColumnsSequentially(
    schemasWithY: Array<{ schema: SchemaData; y: number; width: number; height: number }>,
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
            height: item.height  // 使用動態計算的高度
        })
    })

    return nodes
}
