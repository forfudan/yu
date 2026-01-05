/**
 * 输入法源流图连接关系计算引擎
 * 
 * 负责计算输入法之间的继承关系：
 * 1. 特性继承：某个特性首次出现的输入法是"起源"，后续使用该特性的输入法链接到它
 * 2. 作者继承：同一作者的不同输入法按时间顺序链接
 */

import type { SchemaData, Connection, ConnectionType } from './types'
import { parseYear, parseDate } from './dataLoader'

/**
 * 计算所有输入法之间的连接关系
 * @param schemas 按时间排序的输入法数组
 * @returns 连接关系数组
 */
export function calculateConnections(schemas: SchemaData[]): Connection[] {
    const connections: Connection[] = []

    // 1. 计算特性继承关系
    const featureConnections = calculateFeatureConnections(schemas)
    connections.push(...featureConnections)

    // 2. 计算作者继承关系
    const authorConnections = calculateAuthorConnections(schemas)
    connections.push(...authorConnections)

    return connections
}

/**
 * 计算特性继承关系
 * 对于每个特性，找到第一个拥有该特性的输入法作为"起源"
 * 后续拥有该特性的输入法都链接到起源
 */
function calculateFeatureConnections(schemas: SchemaData[]): Connection[] {
    const connections: Connection[] = []

    // 特性首次出现的映射：feature -> schemaId
    const featureOrigins = new Map<string, string>()

    // 按时间顺序遍历
    for (const schema of schemas) {
        for (const feature of schema.features) {
            const origin = featureOrigins.get(feature)

            if (!origin) {
                // 这是该特性第一次出现，记录为起源
                featureOrigins.set(feature, schema.id)
            } else if (origin !== schema.id) {
                // 该特性已存在，创建继承连接
                connections.push({
                    from: schema.id,
                    to: origin,
                    type: 'feature' as ConnectionType,
                    label: feature
                })
            }
        }
    }

    return connections
}

/**
 * 计算作者继承关系
 * 如果一个作者创作了多个输入法，将它们按时间顺序链接
 */
function calculateAuthorConnections(schemas: SchemaData[]): Connection[] {
    const connections: Connection[] = []

    // 作者最近作品的映射：author -> schemaId
    const authorLatest = new Map<string, string>()

    // 按时间顺序遍历
    for (const schema of schemas) {
        for (const author of schema.authors) {
            const previous = authorLatest.get(author)

            if (previous && previous !== schema.id) {
                // 该作者之前有作品，创建继承连接
                connections.push({
                    from: schema.id,
                    to: previous,
                    type: 'author' as ConnectionType,
                    label: author
                })
            }

            // 更新该作者的最新作品
            authorLatest.set(author, schema.id)
        }
    }

    return connections
}

/**
 * 获取某个输入法的所有连接（包括作为源和目标的）
 * @param schemaId 输入法ID
 * @param connections 所有连接
 * @returns 相关的连接数组
 */
export function getSchemaConnections(
    schemaId: string,
    connections: Connection[]
): Connection[] {
    return connections.filter(
        conn => conn.from === schemaId || conn.to === schemaId
    )
}

/**
 * 按类型筛选连接
 * @param connections 连接数组
 * @param type 连接类型
 * @returns 筛选后的连接数组
 */
export function filterConnectionsByType(
    connections: Connection[],
    type: ConnectionType
): Connection[] {
    return connections.filter(conn => conn.type === type)
}

/**
 * 获取某个特性的所有继承链
 * @param feature 特性名称
 * @param schemas 输入法数组
 * @param connections 连接数组
 * @returns 包含该特性的输入法ID数组（按时间排序）
 */
export function getFeatureInheritanceChain(
    feature: string,
    schemas: SchemaData[],
    connections: Connection[]
): string[] {
    return schemas
        .filter(schema => schema.features.includes(feature))
        .map(schema => schema.id)
}

/**
 * 获取某个作者的所有作品链
 * @param author 作者名称
 * @param schemas 输入法数组
 * @returns 该作者的输入法ID数组（按时间排序）
 */
export function getAuthorWorksChain(
    author: string,
    schemas: SchemaData[]
): string[] {
    return schemas
        .filter(schema => schema.authors.includes(author))
        .map(schema => schema.id)
}

/**
 * 计算连接的统计信息
 * @param connections 连接数组
 * @returns 统计对象
 */
export function getConnectionStats(connections: Connection[]): {
    total: number
    featureConnections: number
    authorConnections: number
    byFeature: Map<string, number>
    byAuthor: Map<string, number>
} {
    const featureConnections = connections.filter(c => c.type === 'feature')
    const authorConnections = connections.filter(c => c.type === 'author')

    const byFeature = new Map<string, number>()
    const byAuthor = new Map<string, number>()

    for (const conn of featureConnections) {
        byFeature.set(conn.label, (byFeature.get(conn.label) || 0) + 1)
    }

    for (const conn of authorConnections) {
        byAuthor.set(conn.label, (byAuthor.get(conn.label) || 0) + 1)
    }

    return {
        total: connections.length,
        featureConnections: featureConnections.length,
        authorConnections: authorConnections.length,
        byFeature,
        byAuthor
    }
}

/**
 * 检测是否存在循环依赖（理论上不应该存在，因为按时间排序）
 * @param connections 连接数组
 * @returns 是否存在循环
 */
export function detectCycles(connections: Connection[]): boolean {
    const graph = new Map<string, string[]>()

    // 构建图
    for (const conn of connections) {
        if (!graph.has(conn.from)) {
            graph.set(conn.from, [])
        }
        graph.get(conn.from)!.push(conn.to)
    }

    // DFS 检测循环
    const visited = new Set<string>()
    const recStack = new Set<string>()

    function hasCycle(node: string): boolean {
        visited.add(node)
        recStack.add(node)

        const neighbors = graph.get(node) || []
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (hasCycle(neighbor)) {
                    return true
                }
            } else if (recStack.has(neighbor)) {
                return true
            }
        }

        recStack.delete(node)
        return false
    }

    for (const node of graph.keys()) {
        if (!visited.has(node)) {
            if (hasCycle(node)) {
                return true
            }
        }
    }

    return false
}
