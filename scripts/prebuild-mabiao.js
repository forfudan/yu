#!/usr/bin/env node

/**
 * Pre-build script for converting mabiao TSV files to optimized JSON
 * Converts tab-separated code-character mappings to compressed JSON format
 * 
 * Author: AI Assistant
 * Created: 2025-01-15
 * Purpose: Optimize IME data loading performance by pre-converting TSV to JSON
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import zlib from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = path.join(__dirname, '..')

// 文件路径配置 - 支持多个码表文件
const MABIAO_FILES = [
    {
        input: path.join(projectRoot, 'src', 'public', 'mabiao-ming.txt'),
        output: path.join(projectRoot, 'src', 'public', 'mabiao-ming.json'),
        name: '日月码表'
    },
    {
        input: path.join(projectRoot, 'src', 'public', 'mabiao-ling.txt'),
        output: path.join(projectRoot, 'src', 'public', 'mabiao-ling.json'),
        name: '灵明码表'
    }
]

/**
 * 解析 TSV 格式的碼表文件
 */
function parseMabiao(content) {
    const lines = content.trim().split('\n')
    const result = {}

    console.log(`正在處理 ${lines.length} 行數據...`)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const [code, char] = line.split('\t')
        if (!code || !char) {
            console.warn(`第 ${i + 1} 行格式錯誤: ${line}`)
            continue
        }

        // 使用緊湊格式：按編碼分組
        if (!result[code]) {
            result[code] = []
        }
        result[code].push(char)

        // 進度提示
        if (i % 10000 === 0) {
            console.log(`已處理 ${i} / ${lines.length} 行 (${(i / lines.length * 100).toFixed(1)}%)`)
        }
    }

    return result
}

/**
 * 優化數據結構
 */
function optimizeData(data) {
    const optimized = {}
    let totalChars = 0
    let totalCodes = 0

    for (const [code, chars] of Object.entries(data)) {
        totalCodes++
        totalChars += chars.length

        // 如果只有一個字符，直接存儲字符串
        // 如果有多個字符，存儲數組
        optimized[code] = chars.length === 1 ? chars[0] : chars
    }

    console.log(`數據統計:`)
    console.log(`  編碼數量: ${totalCodes}`)
    console.log(`  字符數量: ${totalChars}`)
    console.log(`  平均每碼字符數: ${(totalChars / totalCodes).toFixed(2)}`)

    return optimized
}

/**
 * 壓縮JSON數據
 */
function compressData(data) {
    const jsonString = JSON.stringify(data, null, 0) // 無空格的緊湊格式
    const compressed = zlib.gzipSync(jsonString, { level: 9 })

    console.log(`壓縮統計:`)
    console.log(`  原始JSON大小: ${(jsonString.length / 1024).toFixed(2)} KB`)
    console.log(`  壓縮後大小: ${(compressed.length / 1024).toFixed(2)} KB`)
    console.log(`  壓縮率: ${(100 - compressed.length / jsonString.length * 100).toFixed(1)}%`)

    return compressed
}

/**
 * 處理單個碼表文件
 */
function processFile(fileConfig) {
    const { input, output, name } = fileConfig

    console.log(`\n--- 處理 ${name} ---`)
    console.log(`輸入文件: ${input}`)
    console.log(`輸出文件: ${output}`)

    // 檢查輸入文件
    if (!fs.existsSync(input)) {
        throw new Error(`輸入文件不存在: ${input}`)
    }

    // 讀取和解析
    console.log('正在讀取輸入文件...')
    const content = fs.readFileSync(input, 'utf-8')

    console.log('正在解析碼表數據...')
    const rawData = parseMabiao(content)

    console.log('正在排序碼表...')
    const sortedRawData = Object.entries(rawData).sort((a, b) => {
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return 1;
        return 0;
    });

    console.log('正在優化數據結構...')
    const optimizedData = optimizeData(Object.fromEntries(sortedRawData))

    console.log('正在壓縮數據...')
    const compressed = compressData(optimizedData)

    // 確保輸出目錄存在
    const outputDir = path.dirname(output)
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
    }

    // 寫入文件
    console.log('正在寫入輸出文件...')
    fs.writeFileSync(output, compressed)

    console.log(`✅ ${name} 構建完成！`)
}

/**
 * 主處理函數
 */
async function main() {
    try {
        console.log('=== 碼表預構建工具 ===')
        console.log(`共需處理 ${MABIAO_FILES.length} 個碼表文件\n`)

        // 處理所有碼表文件
        for (const fileConfig of MABIAO_FILES) {
            try {
                processFile(fileConfig)
            } catch (error) {
                console.error(`❌ ${fileConfig.name} 處理失敗:`, error.message)
                throw error
            }
        }

        console.log('\n🎉 所有碼表構建完成！')

    } catch (error) {
        console.error('\n❌ 構建失敗:', error.message)
        process.exit(1)
    }
}

// 執行主函數
main()