/**
 * ChaiDataLoader - 拆分数据加载器
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
                const response = await fetch(format.url, {
                    headers: {
                        'Accept': 'application/json, text/csv, */*',
                        'Accept-Charset': 'utf-8'
                    }
                })
                if (!response.ok) continue

                let data: OptimizedChaiData

                if (format.csv) {
                    // Fallback to CSV parsing with explicit UTF-8 handling
                    const arrayBuffer = await response.arrayBuffer()
                    const text = new TextDecoder('utf-8').decode(arrayBuffer)
                    data = this.parseCsvToOptimized(text)
                } else if (format.compressed) {
                    // Handle gzip compressed JSON
                    const arrayBuffer = await response.arrayBuffer()

                    // Decompress gzip data
                    const decompressedBuffer = await this.decompressGzip(arrayBuffer)
                    const text = new TextDecoder('utf-8').decode(decompressedBuffer)
                    data = JSON.parse(text)
                } else {
                    // Regular JSON with explicit UTF-8 handling
                    const arrayBuffer = await response.arrayBuffer()
                    const text = new TextDecoder('utf-8').decode(arrayBuffer)
                    data = JSON.parse(text)
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
    }    /**
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

    /**
     * Decompress gzip data using browser's built-in DecompressionStream
     */
    private async decompressGzip(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
        try {
            // Use the modern Compression Streams API
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(arrayBuffer))
                    controller.close()
                }
            })

            const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
            const chunks: Uint8Array[] = []
            const reader = decompressedStream.getReader()

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                chunks.push(value)
            }

            // Combine chunks into a single ArrayBuffer
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
            const result = new Uint8Array(totalLength)
            let offset = 0
            for (const chunk of chunks) {
                result.set(chunk, offset)
                offset += chunk.length
            }

            return result.buffer
        } catch (error) {
            console.error('Failed to decompress gzip data:', error)
            throw new Error(`Gzip decompression failed: ${error.message}`)
        }
    }
}

export default ChaiDataLoader
export type { ChaiResult, OptimizedChaiData }
