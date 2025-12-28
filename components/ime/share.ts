export * from '../train/share'
import { withBase } from 'vitepress'
import * as vue from 'vue'

// 动态导入pako用于gzip解压缩
declare global {
    interface Window {
        pako?: any;
    }
}

//#region 输入法的规则
export interface ImeRule {
    /** 顶屏时 取前几码的首选字 */
    pop: number
    /** 最大码长 */
    len: number
    /** 空码自动上屏码长 */
    autoCm: number
    /** 首选上屏键 */
    cm1: string
    /** 次选上屏键 */
    cm2: string
    /** 三选上屏键 */
    cm3: string
    /** 编码用的键位 */
    keys: 26 | 27
}

/**
 * 根據規則名稱獲取輸入法配置
 * @param ruleName 規則名稱：'ling'（靈明4碼）、'ming'（日月5碼）或其他（默認宇浩5碼）
 */
export function getRuleConfig(ruleName?: string): ImeRule {
    if (ruleName === 'ling') {
        return {
            pop: 0,
            len: 4,
            autoCm: 4,
            cm1: ' ',
            cm2: ';',
            cm3: "'",
            keys: 26,
        }
    }
    // 'ming' 和其他所有方案都使用 5 碼自動上屏
    return {
        pop: 0,
        len: 4,
        autoCm: 5,
        cm1: ' ',
        cm2: ';',
        cm3: "'",
        keys: 26,
    }
}
//#endregion

//#region gzip解压缩工具
let pakoLoaded = false

/**
 * 动态加载pako库
 */
async function loadPako(): Promise<any> {
    if (window.pako) {
        return window.pako
    }

    if (pakoLoaded) {
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

        pakoLoaded = true
        return window.pako
    } catch (error) {
        console.warn('Failed to load pako library:', error)
        return null
    }
}

/**
 * 解压gzip数据并转换为字符串
 */
async function decompressGzipToString(arrayBuffer: ArrayBuffer): Promise<string> {
    const decompressedBuffer = await decompressGzip(arrayBuffer)
    return new TextDecoder('utf-8').decode(decompressedBuffer)
}

/**
 * 解压gzip数据
 */
async function decompressGzip(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
        // 首先尝试使用pako库
        const pako = await loadPako()
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

        // 合并chunks到单个ArrayBuffer
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
//#endregion

//#region 读取码表
export interface MabiaoItem {
    name: string,
    key: string,
}


const mabiaoCache = {}


/** 下载进度条 */
interface IProgress {
    max: number;
    current: number;
}

export async function fetchMabiao(url: string, progressRef: vue.Ref<IProgress>): Promise<MabiaoItem[]> {
    console.log('开始获取码表:', url);

    const response = await fetch(withBase(url));
    if (!response.ok) {
        throw new Error(`Failed to fetch mabiao: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || '';
    console.log('响应类型:', contentType, '数据大小:', arrayBuffer.byteLength);

    // 检测是否为JSON格式（通过文件扩展名或内容类型）
    const isJson = url.endsWith('.json') || contentType.includes('application/json');

    let text: string;

    if (isJson) {
        // 尝试解压缩JSON数据
        console.log('检测到JSON格式，开始解压缩...');
        text = await decompressGzipToString(arrayBuffer);

        // 解析JSON
        const data = JSON.parse(text);
        const entries = Object.entries(data);
        console.log('JSON解析完成，条目数:', entries.length);

        // 设置进度
        if (progressRef) {
            progressRef.value.max = entries.length;
            progressRef.value.current = entries.length;
        }

        // 转换为MabiaoItem数组
        const result: MabiaoItem[] = [];

        for (const [code, value] of entries) {
            if (Array.isArray(value)) {
                // 如果值是数组，为每个字符创建独立的条目
                for (const char of value) {
                    result.push({
                        name: String(char),
                        key: code
                    });
                }
            } else {
                // 如果值是单个字符串
                result.push({
                    name: String(value),
                    key: code
                });
            }
        }

        // 按key字段排序（对二分查找很重要）
        result.sort((a, b) => a.key.localeCompare(b.key));

        console.log('转换完成，返回', result.length, '个条目');
        return result;
    } else {
        // 处理TSV格式（原有逻辑）
        text = new TextDecoder('utf-8').decode(arrayBuffer);
        console.log('TSV数据长度:', text.length);

        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (progressRef) {
            progressRef.value.max = lines.length;
        }

        return lines.map((line, index) => {
            if (progressRef) {
                progressRef.value.current = index + 1;
            }
            const [code, word] = line.split('\t');
            return { name: word, key: code };
        });
    }
}
//#endregion


//#region 查找候选词条
export function compareTwoStrings(a: string, b: string) {
    if (a === b) return 0
    if (a < b) return -1
    return 1
}

/** 根据编码的长度和编码内容排序 */
export function sortFunc(a: MabiaoItem, b: MabiaoItem) {
    return compareTwoStrings(a.key, b.key)
}

/** 
 * 二分查找法，锁定上下界.
 * 例如：找到ab词条, 会找到一个范围, 范围内所有词条的编码的前缀都是ab, 像是 ab abc abz
 * 
 * @param arr 排序好的拆分数据卡片
 * @param keyPrefix 搜索的编码的前缀
 * @returns 一对数, 表示上下边界的前闭后开区间. 空码返回null
 */
export function biSearchBetween(arr: MabiaoItem[], keyPrefix: string) {
    // console.log('biSearchBetween', keyPrefix);
    if (keyPrefix === '') return [0, arr.length]
    // 找上边界
    const topBoundary = biSearchPoint(arr, keyPrefix, 0, compareTopBoundary)
    if (topBoundary < 0)
        return null

    // 找下边界
    const botBoundary = biSearchPoint(arr, keyPrefix, topBoundary, compareBotBoundary)
    // 报错唯一的可能是出现空码
    if (botBoundary < 0)
        return null

    return [topBoundary, botBoundary] as const
}

export function searchTop(arr: MabiaoItem[], keyPrefix: string) {
    const topBoundary = biSearchPoint(arr, keyPrefix, 0, compareTopBoundary)
    if (topBoundary < 0) return null
    if (!arr[topBoundary].key.startsWith(keyPrefix)) return null
    return topBoundary
}

/** 返回 -1 说明 码表里不可能找得到 */
function biSearchPoint(arr: MabiaoItem[], keyPrefix: string, topIndex: number, compareFunc: typeof compareTopBoundary) {
    // 检查上边界
    let top = topIndex
    const topCompare = compareFunc(arr, keyPrefix, top)
    if (topCompare === 0) return top
    if (topCompare < 0) return -1

    // 检查下边界情况
    let bot = arr.length - 1
    const botCompare = compareFunc(arr, keyPrefix, bot)
    if (botCompare === 0) return bot + 1
    if (botCompare > 0) return -1

    // 中点
    let point = top + ((bot - top) / 2) | 0
    let compare = compareFunc(arr, keyPrefix, point)

    while (compare !== 0) {
        if (bot - top === 1) {
            return bot
        }

        if (compare > 0) {
            top = point
        } else {
            bot = point
        }
        point = top + ((bot - top) / 2) | 0
        compare = compareFunc(arr, keyPrefix, point)
        // console.log(top, bot, point, compare, arr[point].key);
    }
    return point
}

/** 对于上边界, 一定要找到相邻两行, 一行不是前缀, 一行是前缀 */
function compareTopBoundary(arr: MabiaoItem[], keyPrefix: string, index: number) {
    const indexIsPrefix = cardIsPrefix(arr[index], keyPrefix)
    const previousIndexIsPrefix = (index === 0) ? false : cardIsPrefix(arr[index - 1], keyPrefix)
    if (indexIsPrefix) {
        if (previousIndexIsPrefix) {
            //两行都是前缀, 要向上找
            return -1
        } else {
            // 上一行不是, 这一行是, 就是要锁定的
            return 0
        }
    } else {
        if (previousIndexIsPrefix) {
            // 这一行不是前缀, 但上一行是, 这是下边界, 要向上找
            return -1
        } else {
            // 都不是前缀, 不知前后, 只能通过字符串比较
            return compareTwoStrings(keyPrefix, arr[index].key)
        }
    }
}

/** 对于下边界, 一定要找到相邻两行, 上一行是前缀, 这一行不是前缀 */
function compareBotBoundary(arr: MabiaoItem[], keyPrefix: string, index: number) {
    const indexIsPrefix = cardIsPrefix(arr[index], keyPrefix)
    // 最后一行是前缀, 则必然锁定
    if (indexIsPrefix && index === arr.length - 1) { return 0 }

    const previousIndexIsPrefix = (index === 0) ? false : cardIsPrefix(arr[index - 1], keyPrefix)
    if (indexIsPrefix) {
        // 这一行是前缀, 那么无论如何, 都要向下寻找
        return 1
    } else {
        if (previousIndexIsPrefix) {
            // 上一行是前缀, 这一行不是, 就是锁定的
            return 0
        } else {
            // 都不是前缀, 不知前后, 只能通过字符串比较
            return compareTwoStrings(keyPrefix, arr[index].key)
        }
    }
}

function cardIsPrefix(card: MabiaoItem, prefix: string) {
    if (!card || !card.key) return false
    return card.key.startsWith(prefix, 0)
}
//#endregion