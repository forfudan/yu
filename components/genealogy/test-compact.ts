/**
 * 緊湊單行布局測試
 * 
 * 對比不同布局方案的空間效率
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

const minYear = 1976
const maxYear = 2024

console.log('=== 緊湊單行布局測試 ===\n')

// 方案1：固定間距
const fixedHeight = (maxYear - minYear) * 100
const fixedNodeHeight = 80

// 方案2：動態間距（無壓縮）
const oldMap = calculateYearSpacingMap(testSchemas, 30, 90, 999, 0)
const oldHeight = oldMap.get(maxYear)! + 30
const oldNodeHeight = 80

// 方案3：空白段壓縮
const compressedMap = calculateYearSpacingMap(testSchemas, 30, 90, 3, 60)
const compressedHeight = compressedMap.get(maxYear)! + 30
const compressedNodeHeight = 80

// 方案4：緊湊單行布局（當前）
const compactMap = calculateYearSpacingMap(testSchemas, 20, 50, 3, 40)
const compactHeight = compactMap.get(maxYear)! + 20
const compactNodeHeight = 40

console.log('布局方案對比：\n')

console.log('1️⃣  固定間距（100px/年，卡片 80px）')
console.log(`   時間軸高度: ${fixedHeight}px`)
console.log(`   卡片高度: ${fixedNodeHeight}px`)
console.log(`   總視覺高度: ~${fixedHeight}px`)
console.log()

console.log('2️⃣  動態間距（無壓縮，卡片 80px）')
console.log(`   時間軸高度: ${oldHeight}px`)
console.log(`   卡片高度: ${oldNodeHeight}px`)
console.log(`   總視覺高度: ~${oldHeight}px`)
console.log(`   節省: ${((1 - oldHeight / fixedHeight) * 100).toFixed(1)}%`)
console.log()

console.log('3️⃣  空白段壓縮（卡片 80px）')
console.log(`   時間軸高度: ${compressedHeight}px`)
console.log(`   卡片高度: ${compressedNodeHeight}px`)
console.log(`   總視覺高度: ~${compressedHeight}px`)
console.log(`   節省: ${((1 - compressedHeight / fixedHeight) * 100).toFixed(1)}%`)
console.log()

console.log('4️⃣  緊湊單行布局（當前，卡片 40px）✨')
console.log(`   時間軸高度: ${compactHeight}px`)
console.log(`   卡片高度: ${compactNodeHeight}px`)
console.log(`   總視覺高度: ~${compactHeight}px`)
console.log(`   節省: ${((1 - compactHeight / fixedHeight) * 100).toFixed(1)}%`)
console.log()

// 詳細對比
console.log('=== 詳細對比 ===\n')

const avgFixed = fixedHeight / testSchemas.length
const avgOld = oldHeight / testSchemas.length
const avgCompressed = compressedHeight / testSchemas.length
const avgCompact = compactHeight / testSchemas.length

console.log('平均每個輸入法占用空間：')
console.log(`  固定間距: ${avgFixed.toFixed(0)}px`)
console.log(`  動態間距: ${avgOld.toFixed(0)}px (↓${((1 - avgOld / avgFixed) * 100).toFixed(1)}%)`)
console.log(`  空白段壓縮: ${avgCompressed.toFixed(0)}px (↓${((1 - avgCompressed / avgFixed) * 100).toFixed(1)}%)`)
console.log(`  緊湊單行: ${avgCompact.toFixed(0)}px (↓${((1 - avgCompact / avgFixed) * 100).toFixed(1)}%) ⭐`)
console.log()

console.log('卡片尺寸優化：')
console.log(`  傳統三行卡片: 200×80px (面積 16000px²)`)
console.log(`  緊湊單行卡片: 200×40px (面積 8000px²)`)
console.log(`  面積節省: 50%`)
console.log()

console.log('空間優化總結：')
console.log(`  時間軸壓縮: ${oldHeight}px → ${compactHeight}px (↓${((1 - compactHeight / oldHeight) * 100).toFixed(1)}%)`)
console.log(`  卡片高度減半: 80px → 40px (↓50%)`)
console.log(`  總體效果: 相比固定間距節省 ${((1 - compactHeight / fixedHeight) * 100).toFixed(1)}%`)
console.log()

console.log('✅ 緊湊單行布局實現了極致的空間優化！')
console.log('💡 在保持可讀性的同時，將總高度壓縮到原來的 1/7 左右')
console.log('🎨 單行格式：輸入法名 作者名 | 年份')

export { }
