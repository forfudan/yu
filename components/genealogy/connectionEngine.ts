/**
 * 輸入法繫絡圖連接關係計算引擎
 * 
 * 負責計算輸入法之間的繼承關係：
 * 1. 特性繼承：某個特性首次出現的輸入法是"起源"，後續使用該特性的輸入法連接到它
 * 2. 作者繼承：同一作者的不同輸入法按時間順序連接
 */

import type { SchemaData, Connection, ConnectionType } from './types'
import { parseYear, parseDate } from './dataLoader'

/**
 * 計算所有輸入法之間的連接關係
 * @param schemas 按時間排序的輸入法數組
 * @returns 連接關係數組
 */
export function calculateConnections(schemas: SchemaData[]): Connection[] {
    const connections: Connection[] = []

    // 1. 計算特性繼承關係
    const featureConnections = calculateFeatureConnections(schemas)
    connections.push(...featureConnections)

    // 2. 計算作者繼承關係
    const authorConnections = calculateAuthorConnections(schemas)
    connections.push(...authorConnections)

    // 3. 計算高度相似關係
    const similarConnections = calculateSimilarConnections(schemas, connections)
    connections.push(...similarConnections)

    return connections
}

/**
 * 計算特性繼承關係
 * 對於每個特性，找到第一個擁有該特性的輸入法作為"起源"
 * 後續擁有該特性的輸入法都連接到起源
 */
function calculateFeatureConnections(schemas: SchemaData[]): Connection[] {
    const connections: Connection[] = []

    // 特性首次出現的映射：feature -> schemaId
    const featureOrigins = new Map<string, string>()

    // 按時間順序遍歷
    for (const schema of schemas) {
        for (const feature of schema.features) {
            const origin = featureOrigins.get(feature)

            if (!origin) {
                // 這是該特性第一次出現，記錄為起源
                featureOrigins.set(feature, schema.id)
            } else if (origin !== schema.id) {
                // 該特性已存在，創建繼承連接
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
 * 計算作者繼承關係
 * 如果一個作者創作了多個輸入法，將每個作品連接到該作者之前的所有作品
 */
function calculateAuthorConnections(schemas: SchemaData[]): Connection[] {
    const connections: Connection[] = []

    // 作者（包括維護者）所有作品的映射：author -> schemaId[]
    const authorWorks = new Map<string, string[]>()

    // 按時間順序遍歷
    for (const schema of schemas) {
        // 合併作者和維護者列表
        const allAuthors = [...schema.authors]
        if (schema.maintainers) {
            allAuthors.push(...schema.maintainers)
        }

        for (const author of allAuthors) {
            const previousWorks = authorWorks.get(author) || []

            // 連接到該作者之前的所有作品
            for (const previousWork of previousWorks) {
                connections.push({
                    from: schema.id,
                    to: previousWork,
                    type: 'author' as ConnectionType,
                    label: author
                })
            }

            // 將當前作品加入該作者的作品列表
            if (!authorWorks.has(author)) {
                authorWorks.set(author, [])
            }
            authorWorks.get(author)!.push(schema.id)
        }
    }

    return connections
}

/**
 * 計算高度相似關係
 * 條件：特徵只相差一個或完全一樣，且不是父子關係，且不是同一作者
 */
function calculateSimilarConnections(schemas: SchemaData[], existingConnections: Connection[]): Connection[] {
    const connections: Connection[] = []

    // 構建已存在連接的快速查找集合
    const existingPairs = new Set<string>()
    existingConnections.forEach(conn => {
        existingPairs.add(`${conn.from}-${conn.to}`)
        existingPairs.add(`${conn.to}-${conn.from}`)
    })

    // 檢查每對輸入法
    for (let i = 0; i < schemas.length; i++) {
        for (let j = i + 1; j < schemas.length; j++) {
            const schema1 = schemas[i]
            const schema2 = schemas[j]

            // 檢查是否已經有連接（父子關係或作者關係）
            if (existingPairs.has(`${schema1.id}-${schema2.id}`) ||
                existingPairs.has(`${schema2.id}-${schema1.id}`)) {
                continue
            }

            // 檢查是否有共同作者或維護者
            const authors1 = new Set([...schema1.authors, ...(schema1.maintainers || [])])
            const authors2 = new Set([...schema2.authors, ...(schema2.maintainers || [])])
            const hasCommonAuthor = [...authors1].some(a => authors2.has(a))

            if (hasCommonAuthor) {
                continue
            }

            // 計算特徵差異
            const features1 = new Set(schema1.features)
            const features2 = new Set(schema2.features)

            // 找出不同的特徵
            const onlyIn1 = [...features1].filter(f => !features2.has(f))
            const onlyIn2 = [...features2].filter(f => !features1.has(f))
            const totalDifference = onlyIn1.length + onlyIn2.length

            // 如果特徵完全一樣或只相差一個
            if (totalDifference <= 1) {
                // 構建標籤：顯示不同的特徵
                let label = '相似'
                if (totalDifference === 1) {
                    const differentFeature = onlyIn1.length > 0 ? onlyIn1[0] : onlyIn2[0]
                    label = `相似。不同點：${differentFeature}`
                } else if (totalDifference === 0) {
                    label = '高度相似'
                }

                // 從較新的指向較舊的
                const [from, to] = parseYear(schema1.date) > parseYear(schema2.date) ?
                    [schema1.id, schema2.id] :
                    [schema2.id, schema1.id]

                connections.push({
                    from,
                    to,
                    type: 'similar' as ConnectionType,
                    label
                })
            }
        }
    }

    return connections
}

/**
 * 獲取某個輸入法的所有連接（包括作為源和目標的）
 * @param schemaId 輸入法ID
 * @param connections 所有連接
 * @returns 相關的連接數組
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
 * 按類型篩選連接
 * @param connections 連接數組
 * @param type 連接類型
 * @returns 篩選後的連接數組
 */
export function filterConnectionsByType(
    connections: Connection[],
    type: ConnectionType
): Connection[] {
    return connections.filter(conn => conn.type === type)
}

/**
 * 獲取某個特性的所有繼承鏈
 * @param feature 特性名稱
 * @param schemas 輸入法數組
 * @param connections 連接數組
 * @returns 包含該特性的輸入法ID數組（按時間排序）
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
 * 獲取某個作者的所有作品鏈
 * @param author 作者名稱
 * @param schemas 輸入法數組
 * @returns 該作者的輸入法ID數組（按時間排序）
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
 * 計算連接的統計信息
 * @param connections 連接數組
 * @returns 統計對象
 */
export function getConnectionStats(connections: Connection[]): {
    total: number
    featureConnections: number
    authorConnections: number
    similarConnections: number
    byFeature: Map<string, number>
    byAuthor: Map<string, number>
} {
    const featureConnections = connections.filter(c => c.type === 'feature')
    const authorConnections = connections.filter(c => c.type === 'author')
    const similarConnections = connections.filter(c => c.type === 'similar')

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
        similarConnections: similarConnections.length,
        byFeature,
        byAuthor
    }
}

/**
 * 檢測是否存在循環依賴（理論上不應該存在，因為按時間排序）
 * @param connections 連接數組
 * @returns 是否存在循環
 */
export function detectCycles(connections: Connection[]): boolean {
    const graph = new Map<string, string[]>()

    // 構建圖
    for (const conn of connections) {
        if (!graph.has(conn.from)) {
            graph.set(conn.from, [])
        }
        graph.get(conn.from)!.push(conn.to)
    }

    // DFS 檢測循環
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
