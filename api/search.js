// Simple Node.js API for character search
// This could be deployed as a serverless function

import fs from 'fs'
import path from 'path'

let chaifenData = null
let zigenData = null

// Load data once when server starts
function loadData() {
    if (!chaifenData) {
        const chaifenCsv = fs.readFileSync(path.join(process.cwd(), 'public/chaifen.csv'), 'utf8')
        const lines = chaifenCsv.split('\n').slice(1) // Skip header
        chaifenData = new Map()

        lines.forEach(line => {
            const [char, division] = line.split(',')
            if (char && division) {
                chaifenData.set(char, { char, division })
            }
        })
    }

    if (!zigenData) {
        const zigenCsv = fs.readFileSync(path.join(process.cwd(), 'public/zigen-star.csv'), 'utf8')
        // Parse zigen data similarly...
    }
}

export default function handler(req, res) {
    loadData()

    const { query } = req.query
    if (!query || query.length === 0) {
        return res.json({ results: [] })
    }

    const results = []
    for (const char of query) {
        if (chaifenData.has(char)) {
            results.push(chaifenData.get(char))
        }
    }

    res.json({ results })
}
