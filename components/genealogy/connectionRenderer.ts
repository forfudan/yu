/**
 * SVG 連接線繪製工具
 * 
 * 使用貝塞爾曲線繪製輸入法之間的連接關係
 */

import type { Connection, LayoutNode } from './types'

/**
 * 生成貝塞爾曲線路徑
 * @param x1 起點X坐標
 * @param y1 起點Y坐標
 * @param x2 終點X坐標
 * @param y2 終點Y坐標
 * @param curvature 曲率（0-1，默認0.5）
 * @returns SVG path 字符串
 */
export function generateBezierPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    curvature: number = 0.5
): string {
    // 計算控制點
    const dx = x2 - x1
    const dy = y2 - y1

    // 使用垂直方向的貝塞爾曲線
    // 弧度在中間區域，避免過於誇張的彎曲
    const midY = (y1 + y2) / 2
    const cx1 = x1
    const cy1 = midY - (y2 - y1) * 0.0  // 數字越小線越彎曲
    const cx2 = x2
    const cy2 = midY + (y2 - y1) * 0.0  // 數字越小線越彎曲

    return `M ${x1},${y1} C ${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`
}

/**
 * 計算節點連接點的座標
 * @param node 節點
 * @param position 連接點位置：'top' | 'bottom' | 'left' | 'right' | 'center'
 * @returns {x, y} 座標
 */
export function getNodeAnchor(
    node: LayoutNode,
    position: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'center'
): { x: number; y: number } {
    switch (position) {
        case 'top':
            return {
                x: node.x + node.width / 2,
                y: node.y
            }
        case 'bottom':
            return {
                x: node.x + node.width / 2,
                y: node.y + node.height
            }
        case 'left':
            return {
                x: node.x,
                y: node.y + node.height / 2
            }
        case 'right':
            return {
                x: node.x + node.width,
                y: node.y + node.height / 2
            }
        case 'center':
        default:
            return {
                x: node.x + node.width / 2,
                y: node.y + node.height / 2
            }
    }
}

/**
 * 為連接生成 SVG 路徑數據
 * @param connection 連接對象
 * @param nodes 所有節點的映射（id -> node）
 * @returns SVG path 字符串，如果節點不存在則返回 null
 */
export function generateConnectionPath(
    connection: Connection,
    nodes: Map<string, LayoutNode>
): string | null {
    const fromNode = nodes.get(connection.from)
    const toNode = nodes.get(connection.to)

    if (!fromNode || !toNode) {
        return null
    }

    // 從較新的輸入法（下方）的頂部連接到較舊的輸入法（上方）的底部
    const start = getNodeAnchor(fromNode, 'top')
    const end = getNodeAnchor(toNode, 'bottom')

    // 使用較小曲率的貝塞爾曲線，使連接線更自然
    return generateBezierPath(start.x, start.y, end.x, end.y, 0.3)
}

/**
 * 獲取連接線的樣式類名
 * @param connection 連接對象
 * @param focused 是否處於焦點狀態
 * @param dimmed 是否應該變暗
 * @returns 類名字符串
 */
export function getConnectionClass(
    connection: Connection,
    focused: boolean = false,
    dimmed: boolean = false
): string {
    const classes = ['connection-line']

    // 類型相關的類
    classes.push(`connection-${connection.type}`)

    // 狀態相關的類
    if (focused) {
        classes.push('connection-focused')
    }
    if (dimmed) {
        classes.push('connection-dimmed')
    }

    return classes.join(' ')
}

/**
 * 獲取連接線的顏色
 * @param connection 連接對象
 * @param theme 主題：'light' | 'dark'
 * @returns 顏色字符串
 */
export function getConnectionColor(
    connection: Connection,
    theme: 'light' | 'dark' = 'light'
): string {
    if (connection.type === 'feature') {
        // 特性繼承：藍紫色系
        return theme === 'light'
            ? 'rgba(99, 102, 241, 0.5)'  // indigo-500
            : 'rgba(165, 180, 252, 0.5)' // indigo-300
    } else if (connection.type === 'author') {
        // 作者繼承：綠色系
        return theme === 'light'
            ? 'rgba(34, 197, 94, 0.5)'   // green-500
            : 'rgba(134, 239, 172, 0.5)' // green-300
    } else if (connection.type === 'similar') {
        // 相似關係：紫灰色系
        return theme === 'light'
            ? 'rgba(71, 85, 105, 0.5)'   // slate-600
            : 'rgba(226, 232, 240, 0.5)' // slate-200
    }
    return 'rgba(156, 163, 175, 0.5)' // 默認灰色
}

/**
 * 計算連接線的描邊寬度
 * @param connection 連接對象
 * @param focused 是否處於焦點狀態
 * @returns 寬度值
 */
export function getConnectionStrokeWidth(
    connection: Connection,
    focused: boolean = false
): number {
    return focused ? 3 : 2
}

/**
 * 生成帶箭頭的路徑標記
 * @param id 標記ID
 * @param color 顏色
 * @returns SVG marker 元素的屬性對象
 */
export function createArrowMarker(
    id: string,
    color: string
): {
    id: string
    viewBox: string
    refX: number
    refY: number
    markerWidth: number
    markerHeight: number
    orient: string
} {
    return {
        id,
        viewBox: '0 0 10 10',
        refX: 9,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: 'auto'
    }
}

/**
 * 批量生成連接路徑
 * @param connections 連接數組
 * @param nodes 節點映射
 * @returns 路徑數組（包含連接信息）
 */
export function generateConnectionPaths(
    connections: Connection[],
    nodes: Map<string, LayoutNode>
): Array<{
    connection: Connection
    path: string
}> {
    const paths: Array<{ connection: Connection; path: string }> = []

    for (const connection of connections) {
        const path = generateConnectionPath(connection, nodes)
        if (path) {
            paths.push({ connection, path })
        }
    }

    return paths
}

/**
 * 計算連接線的動畫延遲
 * @param index 連接索引
 * @param total 總連接數
 * @returns 延遲時間（秒）
 */
export function getConnectionAnimationDelay(
    index: number,
    total: number
): number {
    // 漸進式延遲，讓連接線依次出現
    return (index / total) * 0.5
}

/**
 * 判斷連接是否應該顯示
 * @param connection 連接對象
 * @param focusedSchemaId 當前焦點的輸入法ID（null表示無焦點）
 * @param filterType 篩選類型（null表示顯示所有）
 * @returns 是否顯示
 */
export function shouldShowConnection(
    connection: Connection,
    focusedSchemaId: string | null,
    filterType: 'feature' | 'author' | null
): boolean {
    // 如果有類型篩選
    if (filterType && connection.type !== filterType) {
        return false
    }

    // 如果有焦點，只顯示與焦點相關的連接
    if (focusedSchemaId) {
        return connection.from === focusedSchemaId || connection.to === focusedSchemaId
    }

    return true
}
