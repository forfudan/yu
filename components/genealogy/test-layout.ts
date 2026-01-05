/**
 * 佈局算法測試
 * 
 * 用於測試和驗證佈局算法的正確性
 */

import { calculateLayout, optimizeLayout, calculateLayoutQuality, isOverlapping } from './layoutEngine'
import type { SchemaData, GenealogyConfig } from './types'

// 測試數據
const testSchemas: SchemaData[] = [
    {
        id: 'test1',
        name: '測試輸入法1',
        authors: ['作者A'],
        date: '20200000',
        features: ['形碼']
    },
    {
        id: 'test2',
        name: '測試輸入法2',
        authors: ['作者B'],
        date: '20200100',
        features: ['形碼']
    },
    {
        id: 'test3',
        name: '測試輸入法3',
        authors: ['作者C'],
        date: '20200200',
        features: ['形碼']
    },
    {
        id: 'test4',
        name: '測試輸入法4',
        authors: ['作者D'],
        date: '20210000',
        features: ['形碼']
    },
    {
        id: 'test5',
        name: '測試輸入法5',
        authors: ['作者E'],
        date: '20210000',
        features: ['形碼']
    }
]

const testConfig: GenealogyConfig = {
    width: 1200,
    height: 800,
    nodeSpacing: 20,
    yearSpacing: 100,
    reverseTimeline: false,
    showDeprecated: true
}

console.log('=== 佈局算法測試 ===')

// 測試1：基礎佈局
console.log('\n測試1：基礎佈局計算')
const nodes = calculateLayout(testSchemas, testConfig, 2020)
console.log(`生成了 ${nodes.length} 個節點`)
nodes.forEach((node, i) => {
    console.log(`  節點${i + 1}: ${node.schema.name}`)
    console.log(`    位置: (${Math.round(node.x)}, ${Math.round(node.y)})`)
    console.log(`    尺寸: ${node.width} x ${node.height}`)
})

// 測試2：檢查重疊
console.log('\n測試2：檢查節點重疊')
let overlapCount = 0
for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
        if (isOverlapping(nodes[i], nodes[j])) {
            overlapCount++
            console.log(`  ⚠️ 節點${i + 1}和節點${j + 1}重疊`)
        }
    }
}
if (overlapCount === 0) {
    console.log('  ✅ 沒有節點重疊')
}

// 測試3：佈局質量評分
console.log('\n測試3：佈局質量評分')
const quality = calculateLayoutQuality(nodes)
console.log(`  質量分數: ${Math.round(quality)}/100`)
if (quality >= 90) {
    console.log('  ✅ 優秀')
} else if (quality >= 70) {
    console.log('  ⚠️ 良好')
} else {
    console.log('  ❌ 需要改進')
}

// 測試4：優化佈局
console.log('\n測試4：佈局優化')
const optimizedNodes = optimizeLayout(nodes, 30)
const optimizedQuality = calculateLayoutQuality(optimizedNodes)
console.log(`  優化前質量: ${Math.round(quality)}`)
console.log(`  優化後質量: ${Math.round(optimizedQuality)}`)
console.log(`  改進幅度: ${Math.round(optimizedQuality - quality)}分`)

// 測試5：時間軸反轉
console.log('\n測試5：時間軸反轉')
const reversedConfig = { ...testConfig, reverseTimeline: true }
const reversedNodes = calculateLayout(testSchemas, reversedConfig, 2020)
console.log(`  原始Y坐標: ${Math.round(nodes[0].y)}`)
console.log(`  反轉Y坐標: ${Math.round(reversedNodes[0].y)}`)
console.log(`  ${nodes[0].y !== reversedNodes[0].y ? '✅ 反轉成功' : '❌ 反轉失敗'}`)

console.log('\n=== 測試完成 ===')

export { }
