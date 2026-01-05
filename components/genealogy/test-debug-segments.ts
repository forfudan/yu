/**
 * 空白段识别调试
 */

import type { SchemaData } from './types'

const testSchemas: SchemaData[] = [
    { id: 'cangjie', name: '倉頡', authors: ['朱邦復'], date: '19760000', features: ['形碼'] },
    { id: 'zhengma', name: '鄭碼', authors: ['鄭易里'], date: '19800000', features: ['形碼'] },
    { id: 'cangjie3', name: '倉頡三代', authors: ['朱邦復'], date: '19840000', features: ['形碼'] },
    { id: 'wubi86', name: '五筆86', authors: ['王永民'], date: '19860000', features: ['形碼'] },
    { id: 'wubi98', name: '五筆98', authors: ['王永民'], date: '19980000', features: ['形碼'] },
    { id: 'xuma', name: '徐碼', authors: ['徐國銀'], date: '20140000', features: ['形碼'] },
    { id: 'yulight', name: '光華', authors: ['朱宇浩'], date: '20230000', features: ['形碼'] },
    { id: 'yustar', name: '星陳', authors: ['朱宇浩'], date: '20240000', features: ['形碼'] }
]

const minYear = 1976
const maxYear = 2024
const emptyYearThreshold = 3

// 统计每年的输入法数量
const yearCounts = new Map<number, number>()
testSchemas.forEach(schema => {
    const year = parseInt(schema.date.substring(0, 4))
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
})

console.log('=== 年份分布 ===')
for (let year = minYear; year <= maxYear; year++) {
    const count = yearCounts.get(year) || 0
    if (count > 0) {
        console.log(`${year}: ${count}個輸入法`)
    }
}

console.log('\n=== 空白段識別（閾值 >= 3年）===')

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
            console.log(`  檢查 ${segmentStart}-${year - 1}: 長度 ${length}年 ${length >= emptyYearThreshold ? '✅ 壓縮' : '❌ 不壓縮'}`)
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
    console.log(`  檢查 ${segmentStart}-${maxYear}: 長度 ${length}年 ${length >= emptyYearThreshold ? '✅ 壓縮' : '❌ 不壓縮'}`)
    if (length >= emptyYearThreshold) {
        emptySegments.push({ startYear: segmentStart, endYear: maxYear, length })
    }
}

console.log(`\n找到 ${emptySegments.length} 個空白段：`)
emptySegments.forEach(seg => {
    console.log(`  ${seg.startYear}-${seg.endYear} (${seg.length}年)`)
})

export { }
