/**
 * Optimized Chaifen Data Loader
 * Loads compressed JSON data with performance optimizations
 */

interface ChaiResult {
    char: string
    division?: string
    division_tw?: string
    region?: string
}

interface OptimizedChaiData {
    [char: string]: {
        d?: string    // division
        dt?: string   // division_tw  
        r?: string    // region
    }
}

class ChaiDataLoader {
    private static instances: Map<string, ChaiDataLoader> = new Map()
    private data: OptimizedChaiData | null = null
    private loading: Promise<OptimizedChaiData> | null = null
    private dataUrl: string

    constructor(dataUrl: string) {
        this.dataUrl = dataUrl
    }

    static getInstance(dataUrl: string = '/chaifen.json'): ChaiDataLoader {
        if (!ChaiDataLoader.instances.has(dataUrl)) {
            ChaiDataLoader.instances.set(dataUrl, new ChaiDataLoader(dataUrl))
        }
        return ChaiDataLoader.instances.get(dataUrl)!
    }

    /**
     * Load data with automatic format detection and caching
     */
    async loadData(): Promise<OptimizedChaiData> {
        if (this.data) {
            return this.data
        }

        if (this.loading) {
            return this.loading
        }

        this.loading = this.fetchOptimizedData()
        this.data = await this.loading
        this.loading = null

        return this.data
    }

    private async fetchOptimizedData(): Promise<OptimizedChaiData> {
        const startTime = performance.now()

        // Convert CSV URL to JSON URL
        const jsonUrl = this.dataUrl.replace('.csv', '.json')

        // Try different formats in order of preference  
        const formats = [
            { url: jsonUrl, compressed: true },  // Our optimized gzipped JSON
            { url: this.dataUrl, compressed: false, csv: true }  // Fallback to original CSV
        ]

        for (const format of formats) {
            try {
                const response = await fetch(format.url)
                if (!response.ok) continue

                let data: OptimizedChaiData

                if (format.csv) {
                    // Fallback to CSV parsing
                    const text = await response.text()
                    data = this.parseCsvToOptimized(text)
                } else if (format.compressed) {
                    // Handle compressed JSON (browser will decompress automatically)
                    data = await response.json()
                } else {
                    // Regular JSON
                    data = await response.json()
                }

                const loadTime = performance.now() - startTime
                console.log(`📊 Loaded ${format.url} in ${loadTime.toFixed(2)}ms`)
                console.log(`📦 Data contains ${Object.keys(data).length} characters`)

                return data
            } catch (error) {
                console.warn(`Failed to load ${format.url}:`, error)
                continue
            }
        }

        throw new Error('Failed to load chaifen data from any source')
    }

    private parseCsvToOptimized(csvText: string): OptimizedChaiData {
        const lines = csvText.split('\n')
        const data: OptimizedChaiData = {}

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const [char, division, division_tw, region] = line.split(',')
            if (char) {
                const charData: any = {}
                if (division) charData.d = division
                if (division_tw) charData.dt = division_tw
                if (region) charData.r = region
                data[char] = charData
            }
        }

        return data
    }

    /**
     * Search characters with optimized lookup
     */
    search(query: string): ChaiResult[] {
        if (!this.data) {
            console.warn('Data not loaded yet')
            return []
        }

        const results: ChaiResult[] = []
        const queryLower = query.toLowerCase()

        // Direct character lookup (fastest)
        if (query.length === 1 && this.data[query]) {
            const charData = this.data[query]
            results.push({
                char: query,
                division: charData.d,
                division_tw: charData.dt,
                region: charData.r
            })
        }

        // Fuzzy search through all characters
        for (const [char, charData] of Object.entries(this.data)) {
            if (char.includes(queryLower) ||
                charData.d?.toLowerCase().includes(queryLower) ||
                charData.dt?.toLowerCase().includes(queryLower)) {
                results.push({
                    char,
                    division: charData.d,
                    division_tw: charData.dt,
                    region: charData.r
                })
            }
        }

        return results
    }

    /**
     * Get character data directly
     */
    getChar(char: string): ChaiResult | null {
        if (!this.data || !this.data[char]) {
            return null
        }

        const charData = this.data[char]
        return {
            char,
            division: charData.d,
            division_tw: charData.dt,
            region: charData.r
        }
    }
}

export default ChaiDataLoader
export type { ChaiResult, OptimizedChaiData }
