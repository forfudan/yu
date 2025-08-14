#!/usr/bin/env node

/**
 * Verification script to check generated files
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, '..', 'src', 'public')

console.log('🔍 Verifying generated files...\n')

const expectedFiles = [
    'chaifen.json',
    'chaifen-tianma.json',
    'chaifen_tw.json',
    'chaifen_zhu.json',
    'build-info.json'
]

let allFilesExist = true

expectedFiles.forEach(file => {
    const filePath = path.join(publicDir, file)
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        const sizeKB = (stats.size / 1024).toFixed(2)
        console.log(`✅ ${file} - ${sizeKB} KB`)

        // Basic JSON validation (handle gzipped files)
        try {
            let content = fs.readFileSync(filePath)

            // Check if file is gzipped by trying to decompress
            try {
                content = zlib.gunzipSync(content)
                console.log(`   🗜️  Gzipped file`)
            } catch {
                // Not gzipped, use as-is
                console.log(`   📄 Regular file`)
            }

            JSON.parse(content.toString('utf-8'))
            console.log(`   📋 Valid JSON format`)
        } catch (error) {
            console.log(`   ❌ Invalid JSON: ${error.message}`)
            allFilesExist = false
        }
    } else {
        console.log(`❌ Missing: ${file}`)
        allFilesExist = false
    }
})

if (allFilesExist) {
    console.log('\n🎉 All generated files are present and valid!')

    // Check build info
    const buildInfoPath = path.join(publicDir, 'build-info.json')
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'))
    console.log('\n📊 Build Information:')
    console.log(`   🕐 Built at: ${new Date(buildInfo.timestamp).toLocaleString()}`)
    console.log(`   📦 Version: ${buildInfo.version}`)
    console.log(`   🔧 Node: ${buildInfo.node_version}`)
    console.log(`   📁 Optimized files: ${buildInfo.optimized_files.length}`)

    process.exit(0)
} else {
    console.log('\n❌ Some files are missing or invalid!')
    console.log('💡 Try running: npm run prebuild')
    process.exit(1)
}
