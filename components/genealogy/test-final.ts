/**
 * 最终测试 - 简化版
 */

import { calculateYearSpacingMap } from './dataLoader'
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

const baseSpacing = 30
const schemaSpacing = 90
const emptyYearThreshold = 3
const emptySegmentSpacing = 60

const minYear = 1976
const maxYear = 2024

// 计算新版（压缩）
const newMap = calculateYearSpacingMap(testSchemas, baseSpacing, schemaSpacing, emptyYearThreshold, emptySegmentSpacing)
const newHeight = newMap.get(maxYear)! + baseSpacing

// 计算旧版（无压缩）
const oldMap = calculateYearSpacingMap(testSchemas, baseSpacing, schemaSpacing, 999, 0)
const oldHeight = oldMap.get(maxYear)! + baseSpacing

// 固定间距
const fixedHeight = (maxYear - minYear) * 100

console.log('=== 空白段壓縮效果測試 ===\n')
console.log('配置：')
console.log(`  閾值: ${emptyYearThreshold}年`)
console.log(`  空白段高度: ${emptySegmentSpacing}px`)
console.log()

console.log('結果對比：')
console.log(`  固定間距（100px/年）: ${fixedHeight}px`)
console.log(`  舊版動態間距: ${oldHeight}px (節省 ${((1 - oldHeight / fixedHeight) * 100).toFixed(1)}%)`)
console.log(`  新版空白段壓縮: ${newHeight}px (節省 ${((1 - newHeight / fixedHeight) * 100).toFixed(1)}%)`)
console.log()
console.log(`✨ 從舊版到新版，額外節省: ${oldHeight - newHeight}px (${((1 - newHeight / oldHeight) * 100).toFixed(1)}%)`)
console.log()

// 显示关键年份的Y坐标
const yearCounts = new Map<number, number>()
testSchemas.forEach(schema => {
    const year = parseInt(schema.date.substring(0, 4))
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
})

console.log('輸入法年份Y坐標對比：')
testSchemas.forEach(schema => {
    const year = parseInt(schema.date.substring(0, 4))
    const oldY = oldMap.get(year)!
    const newY = newMap.get(year)!
    console.log(`  ${year} ${schema.name}:`)
    console.log(`    舊版: ${oldY}px`)
    console.log(`    新版: ${newY}px (節省 ${oldY - newY}px)`)
})

console.log('\n空白段壓縮詳情：')
console.log('  1987-1997 (11年): 11×30 = 330px → 60px (節省 270px)')
console.log('  1999-2013 (15年): 15×30 = 450px → 60px (節省 390px)')
console.log('  2015-2022 (8年): 8×30 = 240px → 60px (節省 180px)')
console.log('  總計節省: 840px')

export { }
