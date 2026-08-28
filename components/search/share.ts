/**
 * share.ts - 搜索和訓練組件共享工具函數
 * 
 * Modification History:
 * - 2024-03-27 by 朱複丹: 初始化倉庫，創建共享工具函數
 * - 2024-03-27 by 朱複丹: 添加 supplement 開關以啟用補碼功能
 * - 2025-08-13 by 朱複丹: 爲日月增加拆分查詢，添加 ming 參數支持
 * - 2025-12-17 by 朱複丹: 增加靈明反查編碼邏輯，支持主根（兩碼字根）判斷和大碼大寫
 * - 2025-12-17 by 朱複丹: 重構參數系統，將 supplement, ming, wafel, ling 合併爲單一 rule 參數
 * - 2026-08-28: 抽出 traceLingCode，讓靈明編碼帶上逐碼位的出處，供反查卡片畫對應關係
 * - 2026-08-28: 抽出 traceStarCode，星陳的回頭碼單獨標記，卡片上畫成虛線
 */

import { withBase } from "vitepress";
import ChaiDataLoader from "./ChaiDataLoader";
export let cache: Record<string, object> = {}

export type CsvMap = Map<string, Record<string, string>>

export interface Chaifen {
    char: string,
    division: string,
    division_tw: string,
    region: string
}

export interface Zigen {
    font: string,
    ma: string,
    pinyin?: string,
    examples?: string,  // 字根的例字列表（逗號分隔）
    julei?: string  // 字根的聚類（同形/同源分組），用於分組練習
}

export type ZigenMap = Map<string, Zigen>

export type ChaifenMap = Map<string, Chaifen>

/** 字根編碼的組成部分。靈明分大、聲、韻，星陳一系只有大、小 */
export type MaPart = 'da' | 'sheng' | 'yun' | 'xiao'

/** 單字編碼裏的一個碼位，記錄它是從哪個字根的哪一部分取來的 */
export interface CodeSlot {
    /** 已定好大小寫的字母 */
    letter: string
    /** 來源字根在拆分裏的位置，從 0 起算 */
    rootIndex: number
    /** 取的是該字根編碼的第幾個字母，從 0 起算 */
    letterIndex: number
    part: MaPart
    /** 回頭碼：首根小碼後置到編碼末尾。星陳的一根字、兩根字會出現 */
    isHuitou?: boolean
}

export interface RootTrace {
    char: string
    ma: string
    /** 每個字母各是哪一部分，長度同 ma */
    parts: MaPart[]
    /** 兩碼字根。靈明術語裏又叫小根。星陳無此概念，恆為 false */
    isZhugen: boolean
}

/** 帶溯源的編碼結果，供反查卡片畫字根到編碼的對應關係 */
export interface CodeTrace {
    code: string
    roots: RootTrace[]
    slots: CodeSlot[]
}

/**
 * 靈明取碼，逐碼位記下出處。
 * 規則同 makeCodesFromDivision 的 ling 分支，後者現已轉調本函數，兩者不會分叉。
 */
export function traceLingCode(division: string, zigenMap: ZigenMap): CodeTrace {
    const divisionArray = [...division]
    const lenRoots = divisionArray.length

    const roots: RootTrace[] = divisionArray.map(char => {
        const ma = zigenMap.get(char)?.ma || ''
        // 兩碼字根是大、韻；三碼字根是大、聲、韻
        const parts: MaPart[] = ma.length === 2
            ? ['da', 'yun']
            : [...ma].map((_, j) => j === 0 ? 'da' : j === ma.length - 1 ? 'yun' : 'sheng')
        // 判斷是否爲主根（兩碼字根）
        return { char, ma, parts, isZhugen: ma.length === 2 }
    })

    const slots: CodeSlot[] = []

    /** 取第 rootIndex 根的某一部分，推入碼位。大碼一律大寫 */
    const take = (rootIndex: number, part: MaPart) => {
        const ma = roots[rootIndex]?.ma || ''
        const letterIndex =
            part === 'da' ? 0 :
            part === 'sheng' ? (ma.length === 3 ? 1 : -1) :
            ma.length - 1
        const letter = letterIndex < 0 ? '' : (ma[letterIndex] || '')
        if (!letter) return
        slots.push({
            letter: part === 'da' ? letter.toUpperCase() : letter,
            rootIndex, letterIndex, part,
        })
    }

    const A = 0, B = 1, C = 2, Z = lenRoots - 1
    const aIsZhugen = roots[A]?.isZhugen ?? false
    const zIsZhugen = roots[Z]?.isZhugen ?? false

    if (aIsZhugen) {
        // 首根是主根
        if (lenRoots === 1) {
            // 1根: AdAy
            take(A, 'da'); take(A, 'yun')
        } else if (lenRoots === 2) {
            // 2根: AdZd[Zs]Zy
            take(A, 'da'); take(Z, 'da')
            // 末根是主根: AdZdZy；末根不是主根: AdZdZsZy
            if (!zIsZhugen) take(Z, 'sheng')
            take(Z, 'yun')
        } else if (lenRoots === 3) {
            // 3根: AdBdZd[Zs][Zy]
            take(A, 'da'); take(B, 'da'); take(Z, 'da')
            // 末根是主根: AdBdZdZy；末根不是主根: AdBdZdZs
            take(Z, zIsZhugen ? 'yun' : 'sheng')
        } else {
            // 4+根: AdBdCdZd
            take(A, 'da'); take(B, 'da'); take(C, 'da'); take(Z, 'da')
        }
    } else {
        // 首根不是主根
        if (lenRoots === 1) {
            // 1根: AdAsAy
            take(A, 'da'); take(A, 'sheng'); take(A, 'yun')
        } else if (lenRoots === 2) {
            // 2根: AdAsZd[Zs][Zy]
            take(A, 'da'); take(A, 'sheng'); take(Z, 'da')
            // 末根是主根: AdAsZdZy；末根不是主根: AdAsZdZs
            take(Z, zIsZhugen ? 'yun' : 'sheng')
        } else {
            // 3+根: AdAsBdZd
            take(A, 'da'); take(A, 'sheng'); take(B, 'da'); take(Z, 'da')
        }
    }

    return { code: slots.map(s => s.letter).join(''), roots, slots }
}

/**
 * 星陳一系的取碼，逐碼位記下出處。
 * 依次取各根大碼；不足四碼補末根小碼；仍不足且允許回頭時，補首根小碼（回頭碼）。
 * 規則同 makeCodesFromDivision 的默認分支，後者現已轉調本函數，兩者不會分叉。
 *
 * @param supplement 是否取回頭碼。星陳、光華為真，卿雲等為假
 */
export function traceStarCode(division: string, zigenMap: ZigenMap, supplement: boolean): CodeTrace {
    const divisionArray = [...division]

    const roots: RootTrace[] = divisionArray.map(char => {
        const ma = zigenMap.get(char)?.ma || ''
        // 星陳的字根編碼就是大碼加小碼，沒有聲韻之分
        const parts: MaPart[] = [...ma].map((_, j) => j === 0 ? 'da' : 'xiao')
        return { char, ma, parts, isZhugen: false }
    })

    const slots: CodeSlot[] = []

    /** 取第 rootIndex 根的第 letterIndex 個字母。取不到時同原邏輯，用 ? 佔位 */
    const take = (rootIndex: number, letterIndex: number, isHuitou?: boolean) => {
        const root = roots[rootIndex]
        slots.push({
            letter: root?.ma?.[letterIndex] || '?',
            rootIndex,
            letterIndex,
            part: root?.parts[letterIndex] || (letterIndex === 0 ? 'da' : 'xiao'),
            ...(isHuitou ? { isHuitou } : {}),
        })
    }

    // 依次取一、二、三、末根大碼
    divisionArray.forEach((_, i) => take(i, 0))

    // 不足四碼時，補上末根小碼
    if (slots.length < 4) take(divisionArray.length - 1, 1)

    // 仍然不足四碼時，補上首根小碼。這一碼要繞回首根，卡片上畫成虛線
    if (slots.length < 4 && supplement) take(0, 1, true)

    return { code: slots.map(s => s.letter).join(''), roots, slots }
}

/** 反查卡片能畫出對應關係的方案。其餘方案仍用舊卡片 */
export const TRACE_RULES = ['ling', 'star']

/** 按方案取帶溯源的編碼。不支持的方案返回 null */
export function traceCode(division: string, zigenMap: ZigenMap, rule: string): CodeTrace | null {
    if (rule === 'ling') return traceLingCode(division, zigenMap)
    if (rule === 'star') return traceStarCode(division, zigenMap, true)
    return null
}

/** 根據拆分表生成編碼 */
export function makeCodesFromDivision(division: string, zigenMap: ZigenMap, rule: string) {
    const divisionArray = [...division]

    // 根據 rule 確定編碼規則
    const supplement = rule === 'star' || rule === 'light'
    const ming = rule === 'ming'
    const wafel = rule === 'wafel'
    const ling = rule === 'ling'
    const moling = rule === 'moling'

    if (ling) {
        // 靈明編碼邏輯。逐碼位的出處見 traceLingCode，反查卡片靠它畫箭頭
        return traceLingCode(division, zigenMap).code
    }

    else if (ming) {
        let result: string[] = []
        const firstZigen = divisionArray[0]
        const lastZigen = divisionArray[divisionArray.length - 1]

        // 取首根大、聲
        if (divisionArray.length == 1) {
            result.push((zigenMap.get(firstZigen)?.ma?.[0] || '?').toUpperCase())
        }
        else {
            result.push((zigenMap.get(firstZigen)?.ma?.slice(0, -1) || '?').toUpperCase())
        }
        // 取剩餘所有根大碼
        result.push(...divisionArray.slice(1).map(zigen => (zigenMap.get(zigen)?.ma?.[0] || '?').toUpperCase()))
        // 取末根聲、韻
        const capitalizeFirstIfTwoLetters = (str: string) =>
            str.length === 2 ? str[0].toUpperCase() + str[1] : str
        result.push(capitalizeFirstIfTwoLetters(zigenMap.get(lastZigen)?.ma?.slice(1) || '?'))

        return result.join('').slice(0, 5)
    }

    else if (wafel) {
        // 依次取一、二、末根大碼
        let result: string[] = []

        if (divisionArray.length >= 1) {
            result.push(zigenMap.get(divisionArray[0])?.ma?.[0] || '?')
        }
        if (divisionArray.length >= 2) {
            result.push(zigenMap.get(divisionArray[1])?.ma?.[0] || '?')
        }
        if (divisionArray.length >= 3) {
            const lastZigen = divisionArray[divisionArray.length - 1]
            result.push(zigenMap.get(lastZigen)?.ma?.[0] || '?')
        }

        // 不足三碼時，補上末根小碼
        if (result.length < 3) {
            const lastZigen = divisionArray[divisionArray.length - 1]
            result.push(zigenMap.get(lastZigen)?.ma?.[1] || '?')
        }

        return result.join('')
    }

    else if (moling) {
        // 依次取一、二、三、末根大碼
        let result = divisionArray.map(zigen => zigenMap.get(zigen)?.ma?.[0].toUpperCase() || '?')

        // 不足四碼時，補上 SzYz or SzS1Y1
        if (result.length < 4) {
            let lastZigenMa = zigenMap.get(divisionArray[divisionArray.length - 1])?.ma

            if (divisionArray.length === 2) {
                if (lastZigenMa) {
                    if (lastZigenMa.length > 2) {
                        result.push(lastZigenMa[1])
                    }
                } else {
                    result.push('?')
                }

                lastZigenMa = zigenMap.get(divisionArray[0])?.ma
            }

            if (result.length < 4) {
                result.push(lastZigenMa ? lastZigenMa.slice(1, 1 + 4 - result.length) : '?')
            }
        }

        return result.join('')
    }


    else {
        // 星陳一系。逐碼位的出處見 traceStarCode，反查卡片靠它畫箭頭
        return traceStarCode(division, zigenMap, supplement).code
    }
}

/**
 * 請求一個csv文件，並解析它，轉成map對象，
 * 類似python里的csv.DictReader，不過會按照第一列爲鍵，轉成KV數據。
 */
export async function fetchCsvAsMap(url: string) {
    if (url in cache) {
        return cache[url] as CsvMap
    }
    try {
        const res = await fetch(withBase(url))
        const text = await res.text()
        const result = parseCsv(text)
        cache[url] = result
        return result
    } catch (error) {
        if (error instanceof Error)
            alert(`無法下載或解析《${url}》文件：${error.cause}`)
        throw error
    }
}

function parseCsv(content: string): CsvMap {
    const lines = content.split('\n')
    const titleLine = lines.shift()
    // 內容爲空時返回空表，避免 titleLine 爲 undefined
    if (titleLine === undefined) {
        return new Map()
    }
    const titleList = titleLine.split(',').map(v => v.trim())
    const titleListLength = titleList.length
    const result = new Map()

    for (let line of lines) {
        line = line.trim()
        // 跳过空行
        if (!line)
            continue

        const lineSplit = line.split(',').map(v => v.trim())

        // 允許列數不足的情況，用空字符串填充缺失的列
        if (lineSplit.length < titleListLength) {
            // 填充缺失的列爲空字符串
            while (lineSplit.length < titleListLength) {
                lineSplit.push('')
            }
        } else if (lineSplit.length > titleListLength) {
            // 如果列數過多，拋出錯誤
            throw new Error(`CSV文件中 ${line} 數據過多，期望 ${titleListLength} 列，实际 ${lineSplit.length} 列。`);
        }

        const tmp: Record<string, string> = {}
        for (let i = 0; i < titleListLength; i++) {
            tmp[titleList[i]] = lineSplit[i] || '' // 確保不會是undefined
        }
        result.set(lineSplit[0], tmp)
    }
    return result
}

export async function fetchChaifen(url: string) {
    return await fetchCsvAsMap(url) as unknown as ChaifenMap
}

export async function fetchZigen(url: string) {
    return await fetchCsvAsMap(url) as unknown as ZigenMap
}

/**
 * 優化的拆分數據讀取函數
 * 優先使用壓縮的JSON格式，失敗時回退到CSV格式
 */
export async function fetchChaifenOptimized(url: string): Promise<ChaifenMap> {
    // 检查缓存
    const cacheKey = `optimized_${url}`;
    if (cacheKey in cache) {
        return cache[cacheKey] as ChaifenMap;
    }

    try {
        // 首先嘗試使用壓縮的JSON格式
        const loader = ChaiDataLoader.getInstance(url);
        const optimizedData = await loader.loadData();

        // 將優化格式轉換爲ChaifenMap格式
        const chaifenMap = new Map<string, { char: string, division: string, division_tw: string, region: string }>();

        for (const [char, data] of Object.entries(optimizedData)) {
            chaifenMap.set(char, {
                char,
                division: data.d || '',
                division_tw: data.dt || '',
                region: data.r || ''
            });
        }

        console.log(`✅ 成功使用壓縮JSON格式加載拆分數據: ${chaifenMap.size} 个字符`);

        // 缓存结果
        cache[cacheKey] = chaifenMap;
        return chaifenMap as ChaifenMap;

    } catch (error) {
        console.warn('JSON格式加載失敗，回退到CSV格式:', error);

        // 回退到原有的CSV讀取方式
        try {
            const result = await fetchCsvAsMap(url) as unknown as ChaifenMap;
            console.log(`⚠️ 使用CSV格式加載拆分數據: ${result.size} 個字符`);

            // 緩存結果
            cache[cacheKey] = result;
            return result;
        } catch (csvError) {
            console.error('CSV格式也加載失敗:', csvError);
            throw csvError;
        }
    }
}