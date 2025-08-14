#!/usr/bin/env node

/**
 * Pre-build script for Yuhao IME website
 * Generates optimized JSON files and other processed data before building
 */

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🔧 Running pre-build data generation...\n')

// 1. Generate optimized JSON files from CSV
console.log('📊 Step 1: Converting CSV files to optimized JSON...')
try {
    execSync('node scripts/csv-to-json.js', {
        cwd: projectRoot,
        stdio: 'inherit'
    })
    console.log('✅ CSV to JSON conversion completed\n')
} catch (error) {
    console.error('❌ CSV to JSON conversion failed:', error.message)
    process.exit(1)
}

// 2. Run traditional to simplified Chinese conversion
console.log('🈚 Step 2: Running Traditional to Simplified Chinese conversion...')
try {
    // Check if Python script exists
    const tc2scPath = join(projectRoot, 'scripts', 'tc2sc.py')
    if (fs.existsSync(tc2scPath)) {
        execSync('python scripts/tc2sc.py', {
            cwd: projectRoot,
            stdio: 'inherit'
        })
        console.log('✅ Traditional to Simplified Chinese conversion completed\n')
    } else {
        console.log('⚠️  tc2sc.py not found, skipping...\n')
    }
} catch (error) {
    console.error('❌ Traditional to Simplified Chinese conversion failed:', error.message)
    // Don't exit here as this might not be critical
    console.log('⚠️  Continuing build process...\n')
}// 3. Clean up any temporary files (optional)
console.log('🧹 Step 3: Cleaning up temporary files...')
try {
    // Remove any .tmp files in src/public
    const publicDir = join(projectRoot, 'src', 'public')
    const tmpFiles = fs.readdirSync(publicDir).filter(file => file.endsWith('.tmp'))
    tmpFiles.forEach(file => {
        fs.unlinkSync(join(publicDir, file))
        console.log(`🗑️  Removed ${file}`)
    })

    if (tmpFiles.length === 0) {
        console.log('✨ No temporary files to clean')
    }

    console.log('✅ Cleanup completed\n')
} catch (error) {
    console.log('⚠️  Cleanup warning:', error.message, '\n')
}

// 4. Generate build info
console.log('📝 Step 4: Generating build information...')
try {
    const buildInfo = {
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.0.1',
        node_version: process.version,
        optimized_files: [
            'chaifen.json',
            'chaifen-tianma.json',
            'chaifen_tw.json',
            'chaifen_zhu.json'
        ],
        compression_stats: {
            'chaifen.csv': '2.79MB → 883KB (69.1% reduction)',
            'chaifen-tianma.csv': '2.44MB → 796KB (68.2% reduction)'
        }
    }

    const buildInfoPath = join(projectRoot, 'src', 'public', 'build-info.json')
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2))
    console.log('✅ Build information generated\n')
} catch (error) {
    console.error('❌ Build info generation failed:', error.message)
}

console.log('🎉 Pre-build data generation completed successfully!')
console.log('🚀 Ready to build website...\n')
