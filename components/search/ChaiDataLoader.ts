/**
 * ChaiDataLoader - 拆分数据加载器
 */

// 动态导入pako用于gzip解压缩
declare global {
    interface Window {
        pako?: any;
    }
}

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
    private pakoLoaded: boolean = false

    constructor(dataUrl: string) {
        this.dataUrl = dataUrl
    }

    /**
     * 动态加载pako库
     */
    private async loadPako(): Promise<any> {
        if (window.pako) {
            return window.pako
        }

        if (this.pakoLoaded) {
            return window.pako
        }

        try {
            // 从CDN加载pako
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js'
            script.crossOrigin = 'anonymous'

            await new Promise((resolve, reject) => {
                script.onload = resolve
                script.onerror = reject
                document.head.appendChild(script)
            })

            this.pakoLoaded = true
            return window.pako
        } catch (error) {
            console.warn('Failed to load pako library:', error)
            return null
        }
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
     * Decompress gzip data using pako library with fallback to DecompressionStream
     */
    private async decompressGzip(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
        try {
            // 首先尝试使用pako库
            const pako = await this.loadPako()
            if (pako) {
                console.log('📦 Using pako for gzip decompression')
                const compressed = new Uint8Array(arrayBuffer)
                const decompressed = pako.inflate(compressed)
                return decompressed.buffer
            }

            // 回退到浏览器原生DecompressionStream
            console.log('🌐 Using browser DecompressionStream for gzip decompression')
            if (typeof DecompressionStream === 'undefined') {
                throw new Error('DecompressionStream not supported and pako not available')
            }

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
