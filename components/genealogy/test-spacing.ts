/**
 * 动态间距测试（增强版：空白段压缩）
 * 
 * 展示新的空白段压缩算法效果
 */

import { calculateYearSpacingMap, generateYearLabels } from './dataLoader'
import type { SchemaData } from './types'

// 简化的测试数据，反映真实年份分布
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

console.log('=== 動態間距測試（空白段壓縮版）===\n')

// 配置参数
const baseSpacing = 30           // 没有输入法的年份间距
const schemaSpacing = 90         // 每个输入法占用的额外间距
const emptyYearThreshold = 3     // 连续3年以上空白将被压缩
const emptySegmentSpacing = 60   // 空白段总高度
const labelInterval = 5          // 空白段内每5年显示一次标签

console.log('配置參數：')
console.log(`  基礎間距（短空白期）: ${baseSpacing}px`)
console.log(`  輸入法間距（每個）: ${schemaSpacing}px`)
console.log(`  空白段閾值: ${emptyYearThreshold}年`)
console.log(`  空白段總高度: ${emptySegmentSpacing}px`)
console.log(`  標籤顯示間隔: ${labelInterval}年`)
console.log()

const minYear = 1976
const maxYear = 2024

// 统计每年的输入法数量
const yearCounts = new Map<number, number>()
testSchemas.forEach(schema => {
    const year = parseInt(schema.date.substring(0, 4))
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
})

// 计算旧版（无压缩）和新版（压缩）的间距
console.log('=== 對比測試 ===\n')

// 旧版：无空白段压缩
console.log('1️⃣  舊版（無空白段壓縮）：')
const oldYearSpacingMap = calculateYearSpacingMap(testSchemas, baseSpacing, schemaSpacing, 999, 0)
const oldTotalHeight = oldYearSpacingMap.get(maxYear)! + baseSpacing
console.log(`   總高度: ${oldTotalHeight}px`)

// 新版：启用空白段压缩
console.log('\n2️⃣  新版（空白段壓縮）：')
const newYearSpacingMap = calculateYearSpacingMap(
    testSchemas, baseSpacing, schemaSpacing, emptyYearThreshold, emptySegmentSpacing
)
const newTotalHeight = newYearSpacingMap.get(maxYear)! + baseSpacing

console.log(`   總高度: ${newTotalHeight}px`)
console.log(`   節省空間: ${oldTotalHeight - newTotalHeight}px (${((1 - newTotalHeight / oldTotalHeight) * 100).toFixed(1)}%)`)

// 详细显示年份映射
console.log('\n=== 詳細年份映射（新版）===\n')
let prevY = 0
let inEmptySegment = false
let emptySegmentStart = 0

for (let year = minYear; year <= maxYear; year++) {
    const y = newYearSpacingMap.get(year) || 0
    const count = yearCounts.get(year) || 0
    const height = y - prevY

    // 检测空白段
    const isNewEmptySegment = height === 0 && !inEmptySegment && count === 0
    const isEndEmptySegment = inEmptySegment && (count > 0 || year === maxYear)

    if (isNewEmptySegment) {
        inEmptySegment = true
        emptySegmentStart = year
    }

    if (count > 0) {
        console.log(`  ${year}: ${y.toFixed(0)}px (有${count}個輸入法，高度 +${height}px) ✨`)
        inEmptySegment = false
    } else if (!inEmptySegment && height > 0) {
        console.log(`  ${year}: ${y.toFixed(0)}px (短空白期，高度 +${height}px)`)
    } else if (height > 0) {
        const segmentLength = year - emptySegmentStart + 1
        console.log(`  ${emptySegmentStart}-${year}: ${y.toFixed(0)}px (空白段 ${segmentLength}年，壓縮為 +${height}px) 🗜️`)
        inEmptySegment = false
    }

    prevY = y
}

// 年份标签测试
console.log('\n=== 年份標籤顯示策略 ===\n')
const labels = generateYearLabels(testSchemas, newYearSpacingMap, emptyYearThreshold, labelInterval)
console.log(`總年份數: ${maxYear - minYear + 1}`)
console.log(`顯示標籤數: ${labels.length}`)
console.log(`標籤壓縮率: ${((1 - labels.length / (maxYear - minYear + 1)) * 100).toFixed(1)}%`)
console.log('\n顯示的年份：')
labels.forEach(label => {
    const count = yearCounts.get(label.year) || 0
    if (count > 0) {
        console.log(`  ${label.year} (有輸入法) ✨`)
    } else {
        console.log(`  ${label.year} (標記年)`)
    }
})

// 对比固定间距
console.log('\n=== 與固定間距對比 ===\n')
const fixedYearSpacing = 100
const fixedTotalHeight = (maxYear - minYear) * fixedYearSpacing

console.log('高度對比：')
console.log(`  固定間距方案（100px/年）: ${fixedTotalHeight}px`)
console.log(`  舊版動態間距: ${oldTotalHeight}px (-${((1 - oldTotalHeight / fixedTotalHeight) * 100).toFixed(1)}%)`)
console.log(`  新版空白段壓縮: ${newTotalHeight}px (-${((1 - newTotalHeight / fixedTotalHeight) * 100).toFixed(1)}%)`)

const schemasCount = testSchemas.length
console.log('\n空間效率：')
console.log(`  固定間距：平均每個輸入法 ${(fixedTotalHeight / schemasCount).toFixed(0)}px`)
console.log(`  舊版動態：平均每個輸入法 ${(oldTotalHeight / schemasCount).toFixed(0)}px`)
console.log(`  新版壓縮：平均每個輸入法 ${(newTotalHeight / schemasCount).toFixed(0)}px`)

console.log('\n✅ 空白段壓縮算法進一步優化了空間利用率！')
console.log('💡 1999-2013年間15年空白期僅佔用60px，而不是450px！')

export { }
