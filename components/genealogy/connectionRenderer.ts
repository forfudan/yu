/**
 * SVG 连接线绘制工具
 * 
 * 使用贝塞尔曲线绘制输入法之间的连接关系
 */

import type { Connection, LayoutNode } from './types'

/**
 * 生成贝塞尔曲线路径
 * @param x1 起点X坐标
 * @param y1 起点Y坐标
 * @param x2 终点X坐标
 * @param y2 终点Y坐标
 * @param curvature 曲率（0-1，默认0.5）
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
 * 计算节点连接点的坐标
 * @param node 节点
 * @param position 连接点位置：'top' | 'bottom' | 'left' | 'right' | 'center'
 * @returns {x, y} 坐标
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
 * 为连接生成 SVG 路径数据
 * @param connection 连接对象
 * @param nodes 所有节点的映射（id -> node）
 * @returns SVG path 字符串，如果节点不存在则返回 null
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

    // 从较新的输入法（下方）的顶部连接到较旧的输入法（上方）的底部
    const start = getNodeAnchor(fromNode, 'top')
    const end = getNodeAnchor(toNode, 'bottom')

    // 使用较小曲率的贝塞尔曲线，使连接线更自然
    return generateBezierPath(start.x, start.y, end.x, end.y, 0.3)
}

/**
 * 获取连接线的样式类名
 * @param connection 连接对象
 * @param focused 是否处于焦点状态
 * @param dimmed 是否应该变暗
 * @returns 类名字符串
 */
export function getConnectionClass(
    connection: Connection,
    focused: boolean = false,
    dimmed: boolean = false
): string {
    const classes = ['connection-line']

    // 类型相关的类
    classes.push(`connection-${connection.type}`)

    // 状态相关的类
    if (focused) {
        classes.push('connection-focused')
    }
    if (dimmed) {
        classes.push('connection-dimmed')
    }

    return classes.join(' ')
}

/**
 * 获取连接线的颜色
 * @param connection 连接对象
 * @param theme 主题：'light' | 'dark'
 * @returns 颜色字符串
 */
export function getConnectionColor(
    connection: Connection,
    theme: 'light' | 'dark' = 'light'
): string {
    if (connection.type === 'feature') {
        // 特性继承：蓝紫色系
        return theme === 'light'
            ? 'rgba(99, 102, 241, 0.5)'  // indigo-500
            : 'rgba(165, 180, 252, 0.5)' // indigo-300
    } else {
        // 作者继承：绿色系
        return theme === 'light'
            ? 'rgba(34, 197, 94, 0.5)'   // green-500
            : 'rgba(134, 239, 172, 0.5)' // green-300
    }
}

/**
 * 计算连接线的描边宽度
 * @param connection 连接对象
 * @param focused 是否处于焦点状态
 * @returns 宽度值
 */
export function getConnectionStrokeWidth(
    connection: Connection,
    focused: boolean = false
): number {
    return focused ? 3 : 2
}

/**
 * 生成带箭头的路径标记
 * @param id 标记ID
 * @param color 颜色
 * @returns SVG marker 元素的属性对象
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
 * 批量生成连接路径
 * @param connections 连接数组
 * @param nodes 节点映射
 * @returns 路径数组（包含连接信息）
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
 * 计算连接线的动画延迟
 * @param index 连接索引
 * @param total 总连接数
 * @returns 延迟时间（秒）
 */
export function getConnectionAnimationDelay(
    index: number,
    total: number
): number {
    // 渐进式延迟，让连接线依次出现
    return (index / total) * 0.5
}

/**
 * 判断连接是否应该显示
 * @param connection 连接对象
 * @param focusedSchemaId 当前焦点的输入法ID（null表示无焦点）
 * @param filterType 筛选类型（null表示显示所有）
 * @returns 是否显示
 */
export function shouldShowConnection(
    connection: Connection,
    focusedSchemaId: string | null,
    filterType: 'feature' | 'author' | null
): boolean {
    // 如果有类型筛选
    if (filterType && connection.type !== filterType) {
        return false
    }

    // 如果有焦点，只显示与焦点相关的连接
    if (focusedSchemaId) {
        return connection.from === focusedSchemaId || connection.to === focusedSchemaId
    }

    return true
}
