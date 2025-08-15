#!/usr/bin/env node

/**
 * CSV to Optimized JSON Converter
 * Converts large CSV files to compressed, optimized JSON format
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function csvToOptimizedJson(csvPath, outputDir, outputName = 'chaifen.json') {
    console.log(`Converting ${csvPath}...`)

    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',')

    // Parse CSV to optimized JSON structure
    const data = {}
    const stats = { totalChars: 0, withDivision: 0 }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',')
        const char = values[0]
        const division = values[1]
        const division_tw = values[2]
        const region = values[3]

        if (char) {
            stats.totalChars++

            // Create optimized object (only include non-empty fields)
            const charData = {}
            if (division) {
                charData.d = division  // shortened key
                stats.withDivision++
            }
            if (division_tw) charData.dt = division_tw
            if (region) charData.r = region

            data[char] = charData
        }
    }

    // Generate only the best optimized format
    const bestFormat = {
        name: outputName,
        data: JSON.stringify(data, null, 0), // minified
        compress: 'gzip'
    }

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
    }

    // Original CSV size
    const originalSize = fs.statSync(csvPath).size

    // Generate the optimized file
    const jsonData = bestFormat.data
    const outputPath = path.join(outputDir, bestFormat.name)

    // 同时生成压缩和非压缩版本作为备选
    const uncompressedPath = outputPath.replace('.json.gz', '.json')
    fs.writeFileSync(uncompressedPath, jsonData) // 非压缩版本

    let finalData = jsonData
    if (bestFormat.compress === 'gzip') {
        finalData = zlib.gzipSync(jsonData)
    }

    fs.writeFileSync(outputPath, finalData) // 压缩版本
    const size = fs.statSync(outputPath).size
    const uncompressedSize = fs.statSync(uncompressedPath).size
    const reduction = ((originalSize - size) / originalSize * 100).toFixed(1)

    console.log('\n📊 Optimization Results:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Original CSV:        ${formatBytes(originalSize)}`)
    console.log(`Optimized JSON:      ${formatBytes(size)} (${reduction}% smaller)`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Processed ${stats.totalChars} characters`)
    console.log(`📁 Output: ${outputPath}`)

    return data
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Usage - convert multiple CSV files
const csvFiles = [
    'chaifen.csv',
    'chaifen_tw.csv',
    'chaifen_zhu.csv',
    'chaifen-tianma.csv'
]

const publicDir = path.join(__dirname, '../src/public')

for (const csvFile of csvFiles) {
    const csvPath = path.join(publicDir, csvFile)

    if (fs.existsSync(csvPath)) {
        const jsonName = csvFile.replace('.csv', '.json')
        console.log(`\n🔄 Converting ${csvFile} to ${jsonName}...`)
        csvToOptimizedJson(csvPath, publicDir, jsonName)
    } else {
        console.log(`⚠️  Skipping ${csvFile} (not found)`)
    }
}

export { csvToOptimizedJson }
