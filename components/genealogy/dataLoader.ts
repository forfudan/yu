/**
 * 輸入法源流圖數據加載和解析工具
 */

import type { SchemaData, YearLabel } from './types'

/**
 * 從 JSON 文件加載輸入法數據
 */
export async function loadSchemas(): Promise<SchemaData[]> {
    try {
        const response = await fetch('/genealogy/schemas.json')
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
 * 生成年份標籤
 * @param schemas 輸入法數據數組
 * @param yearSpacing 年份間距（像素）
 * @param reverse 是否反轉時間軸
 * @returns 年份標籤數組
 */
export function generateYearLabels(
    schemas: SchemaData[],
    yearSpacing: number = 60,
    reverse: boolean = false
): YearLabel[] {
    if (schemas.length === 0) return []

    // 獲取所有年份
    const years = schemas.map(s => parseYear(s.date))
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    // 生成年份標籤
    const labels: YearLabel[] = []
    for (let year = minYear; year <= maxYear; year++) {
        const offset = year - minYear
        const y = offset * yearSpacing
        labels.push({ year, y })
    }

    // 如果反轉，調整Y坐標
    if (reverse) {
        const totalHeight = (maxYear - minYear) * yearSpacing
        labels.forEach(label => {
            label.y = totalHeight - label.y
        })
    }

    return labels
}

/**
 * 計算輸入法在時間軸上的Y坐標
 * @param schema 輸入法數據
 * @param minYear 最小年份
 * @param yearSpacing 年份間距（像素）
 * @param reverse 是否反轉時間軸
 * @returns Y坐標
 */
export function calculateYPosition(
    schema: SchemaData,
    minYear: number,
    yearSpacing: number = 60,
    reverse: boolean = false
): number {
    const year = parseYear(schema.date)
    const date = parseDate(schema.date)

    // 計算年份偏移
    const yearOffset = year - minYear

    // 計算年內偏移（基於月和日）
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)
    const yearDuration = endOfYear.getTime() - startOfYear.getTime()
    const dateOffset = date.getTime() - startOfYear.getTime()
    const yearProgress = dateOffset / yearDuration

    // 計算Y坐標
    let y = (yearOffset + yearProgress) * yearSpacing

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
 * 獲取所有唯一作者
 * @param schemas 輸入法數據數組
 * @returns 作者數組
 */
export function getAllAuthors(schemas: SchemaData[]): string[] {
    const authors = new Set<string>()
    schemas.forEach(schema => {
        schema.authors.forEach(author => authors.add(author))
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
