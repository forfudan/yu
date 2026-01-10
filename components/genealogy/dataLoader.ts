/**
 * 輸入法繫絡圖數據加載和解析工具
 */

import type { SchemaData, YearLabel } from './types'

/**
 * 從 JSON 文件加載輸入法數據
 */
export async function loadSchemas(source: string = '/genealogy/schemas.json'): Promise<SchemaData[]> {
    try {
        const response = await fetch(source)
        if (!response.ok) {
            throw new Error('Failed to load schemas data')
        }
        const data = await response.json()
        return data as SchemaData[]
    } catch (error) {
        console.error('Error loading schemas:', error)
        return []
    }
}

/**
 * 解析8位日期字符串為年份
 * @param dateStr 8位日期字符串 (YYYYMMDD)
 * @returns 年份數字
 */
export function parseYear(dateStr: string): number {
    return parseInt(dateStr.substring(0, 4), 10)
}

/**
 * 解析8位日期字符串為完整日期對象
 * @param dateStr 8位日期字符串 (YYYYMMDD)
 * @returns Date 對象（月日為00時會設為01）
 */
export function parseDate(dateStr: string): Date {
    const year = parseInt(dateStr.substring(0, 4), 10)
    const month = parseInt(dateStr.substring(4, 6), 10) || 1
    const day = parseInt(dateStr.substring(6, 8), 10) || 1
    return new Date(year, month - 1, day)
}

/**
 * 格式化日期顯示
 * @param dateStr 8位日期字符串 (YYYYMMDD)
 * @returns 格式化的日期字符串
 */
export function formatDate(dateStr: string): string {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)

    if (month === '00') {
        return `${year}年`
    } else if (day === '00') {
        return `${year}年${parseInt(month)}月`
    } else {
        return `${year}年${parseInt(month)}月${parseInt(day)}日`
    }
}

/**
 * 格式化日期（僅顯示到月份，用於卡片顯示）
 * @param dateStr 8位日期字符串
 * @returns 格式化後的日期字符串
 */
export function formatDateToMonth(dateStr: string): string {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)

    if (month === '00') {
        return `${year}年`
    } else {
        return `${year}年${parseInt(month)}月`
    }
}

/**
 * 獲取日期精度
 * @param dateStr 8位日期字符串
 * @returns 'year' | 'month' | 'day'
 */
export function getDatePrecision(dateStr: string): 'year' | 'month' | 'day' {
    const day = dateStr.substring(6, 8)
    const month = dateStr.substring(4, 6)

    if (month === '00') return 'year'
    if (day === '00') return 'month'
    return 'day'
}

/**
 * 按時間排序輸入法
 * @param schemas 輸入法數據數組
 * @param reverse 是否反轉（新的在前）
 * @returns 排序後的數組
 */
export function sortSchemasByDate(schemas: SchemaData[], reverse = false): SchemaData[] {
    const sorted = [...schemas].sort((a, b) => {
        const dateA = parseInt(a.date)
        const dateB = parseInt(b.date)
        return dateA - dateB
    })
    return reverse ? sorted.reverse() : sorted
}

/**
 * 計算年份間距映射表（動態間距，支持空白年份段壓縮）
 * @param schemas 輸入法數據數組
 * @param baseSpacing 基礎間距（沒有輸入法的年份）
 * @param schemaSpacing 每個輸入法佔用的額外間距
 * @param emptyYearThreshold 空白年份閾值，超過此數量的連續空白年份將被壓縮
 * @param emptySegmentSpacing 空白段的總間距（無論多少年）
 * @returns 年份到累積Y坐標的映射表
 */
export function calculateYearSpacingMap(
    schemas: SchemaData[],
    baseSpacing: number = 30,
    schemaSpacing: number = 90,
    emptyYearThreshold: number = 3,
    emptySegmentSpacing: number = 60
): Map<number, number> {
    if (schemas.length === 0) return new Map()

    // 獲取所有年份
    const years = schemas.map(s => parseYear(s.date))
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    // 統計每年的輸入法數量
    const yearCounts = new Map<number, number>()
    schemas.forEach(schema => {
        const year = parseYear(schema.date)
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
    })

    // 識別連續空白年份段
    interface EmptySegment {
        startYear: number
        endYear: number
        length: number
    }

    const emptySegments: EmptySegment[] = []
    let segmentStart: number | null = null

    for (let year = minYear; year <= maxYear; year++) {
        const count = yearCounts.get(year) || 0

        if (count === 0) {
            // 空白年份
            if (segmentStart === null) {
                segmentStart = year
            }
        } else {
            // 有輸入法的年份，結束當前空白段
            if (segmentStart !== null) {
                const length = year - segmentStart
                if (length >= emptyYearThreshold) {
                    emptySegments.push({ startYear: segmentStart, endYear: year - 1, length })
                }
                segmentStart = null
            }
        }
    }

    // 處理末尾的空白段
    if (segmentStart !== null) {
        const length = maxYear - segmentStart + 1
        if (length >= emptyYearThreshold) {
            emptySegments.push({ startYear: segmentStart, endYear: maxYear, length })
        }
    }

    // 計算累積高度
    const yearMap = new Map<number, number>()
    let cumulativeY = 0

    for (let year = minYear; year <= maxYear; year++) {
        yearMap.set(year, cumulativeY)
        const count = yearCounts.get(year) || 0

        // 檢查是否在空白段內
        const inEmptySegment = emptySegments.find(
            seg => year >= seg.startYear && year <= seg.endYear
        )

        if (count > 0) {
            // 有輸入法的年份
            cumulativeY += baseSpacing + count * schemaSpacing
        } else if (inEmptySegment && year === inEmptySegment.startYear) {
            // 空白段起始年份：為整個段分配固定空間
            cumulativeY += emptySegmentSpacing
        } else if (inEmptySegment) {
            // 空白段內的其他年份：不增加高度（與起始年份保持同一水平）
            // 不增加 cumulativeY，下一年會與本年份在同一 Y 坐標
        } else {
            // 短空白期（未達到壓縮閾值）
            cumulativeY += baseSpacing
        }
    }

    return yearMap
}

/**
 * 生成年份標籤（使用動態間距，智能跳過空白段）
 * @param schemas 輸入法數據數組
 * @param yearSpacingMap 年份間距映射表
 * @param emptyYearThreshold 空白年份閾值
 * @param labelInterval 空白段內年份標籤的顯示間隔（0表示不顯示中間年份）
 * @returns 年份標籤數組
 */
export function generateYearLabels(
    schemas: SchemaData[],
    yearSpacingMap: Map<number, number>,
    emptyYearThreshold: number = 3,
    labelInterval: number = 5
): YearLabel[] {
    if (schemas.length === 0) return []

    // 獲取所有年份
    const years = schemas.map(s => parseYear(s.date))
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    // 統計每年的輸入法數量
    const yearCounts = new Map<number, number>()
    schemas.forEach(schema => {
        const year = parseYear(schema.date)
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
    })

    // 識別空白段（與 calculateYearSpacingMap 相同的邏輯）
    interface EmptySegment {
        startYear: number
        endYear: number
        length: number
    }

    const emptySegments: EmptySegment[] = []
    let segmentStart: number | null = null

    for (let year = minYear; year <= maxYear; year++) {
        const count = yearCounts.get(year) || 0

        if (count === 0) {
            if (segmentStart === null) {
                segmentStart = year
            }
        } else {
            if (segmentStart !== null) {
                const length = year - segmentStart
                if (length >= emptyYearThreshold) {
                    emptySegments.push({ startYear: segmentStart, endYear: year - 1, length })
                }
                segmentStart = null
            }
        }
    }

    if (segmentStart !== null) {
        const length = maxYear - segmentStart + 1
        if (length >= emptyYearThreshold) {
            emptySegments.push({ startYear: segmentStart, endYear: maxYear, length })
        }
    }

    // 生成年份標籤
    const labels: YearLabel[] = []

    // 使用固定間隔策略：每隔一定年份顯示一次標籤
    const displayInterval = 5  // 每5年顯示一次
    const nearbyRange = 2      // 檢查附近 N 年內是否有輸入法，如果有則顯示年份標籤

    for (let year = minYear; year <= maxYear; year++) {
        const y = yearSpacingMap.get(year) || 0
        const count = yearCounts.get(year) || 0

        // 檢查是否應該顯示這個年份標籤
        const isIntervalYear = (year % displayInterval === 0)
        const isEdgeYear = (year === minYear) || (year === maxYear)

        if (isIntervalYear || isEdgeYear) {
            // 檢查附近是否有輸入法
            let hasNearbySchemas = false
            for (let nearYear = year - nearbyRange; nearYear <= year + nearbyRange; nearYear++) {
                if ((yearCounts.get(nearYear) || 0) > 0) {
                    hasNearbySchemas = true
                    break
                }
            }

            // 只有當附近有輸入法時才顯示標籤
            if (hasNearbySchemas) {
                labels.push({ year, y })
            }
        }
    }

    return labels
}

/**
 * 計算輸入法在時間軸上的Y坐標（使用動態間距）
 * @param schema 輸入法數據
 * @param minYear 最小年份
 * @param yearSpacingMap 年份間距映射表
 * @param baseSpacing 基礎間距
 * @param schemaSpacing 每個輸入法的間距
 * @param schemas 所有輸入法數據（用於計算該年的輸入法數量）
 * @returns Y坐標
 */
export function calculateYPosition(
    schema: SchemaData,
    minYear: number,
    yearSpacingMap: Map<number, number>,
    baseSpacing: number = 30,
    schemaSpacing: number = 90,
    schemas?: SchemaData[]
): number {
    const year = parseYear(schema.date)
    const date = parseDate(schema.date)

    // 獲取該年份的起始Y坐標
    const yearY = yearSpacingMap.get(year) || 0

    // 計算年內偏移（基於月和日）
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)
    const yearDuration = endOfYear.getTime() - startOfYear.getTime()
    const dateOffset = date.getTime() - startOfYear.getTime()
    const yearProgress = dateOffset / yearDuration

    // 計算該年的實際高度分配
    let yearHeight = baseSpacing + schemaSpacing
    if (schemas) {
        // 統計該年有多少個輸入法
        const countInYear = schemas.filter(s => parseYear(s.date) === year).length
        if (countInYear > 0) {
            yearHeight = baseSpacing + countInYear * schemaSpacing
        }
    }

    // 年內的Y坐標 = 年起始Y + (年內進度 * 年高度)
    const y = yearY + yearProgress * yearHeight

    return y
}

/**
 * 獲取所有唯一特性
 * @param schemas 輸入法數據數組
 * @returns 特性數組
 */
export function getAllFeatures(schemas: SchemaData[]): string[] {
    const features = new Set<string>()
    schemas.forEach(schema => {
        schema.features.forEach(feature => features.add(feature))
    })
    return Array.from(features).sort()
}

/**
 * 獲取所有作者（包括維護者）
 * @param schemas 輸入法數據數組
 * @returns 作者名稱數組
 */
export function getAllAuthors(schemas: SchemaData[]): string[] {
    const authors = new Set<string>()
    schemas.forEach(schema => {
        schema.authors.forEach(author => authors.add(author))
        // 維護者也算作作者
        if (schema.maintainers) {
            schema.maintainers.forEach(maintainer => authors.add(maintainer))
        }
    })
    return Array.from(authors).sort()
}

/**
 * 獲取時間範圍
 * @param schemas 輸入法數據數組
 * @returns {minYear, maxYear}
 */
export function getYearRange(schemas: SchemaData[]): { minYear: number; maxYear: number } {
    if (schemas.length === 0) return { minYear: 0, maxYear: 0 }

    const years = schemas.map(s => parseYear(s.date))
    return {
        minYear: Math.min(...years),
        maxYear: Math.max(...years)
    }
}
