/**
 * share.ts - 搜索和訓練組件共享工具函數
 * 
 * Modification History:
 * - 2024-03-27 by 朱複丹: 初始化倉庫，創建共享工具函數
 * - 2024-03-27 by 朱複丹: 添加 supplement 開關以啟用補碼功能
 * - 2025-08-13 by 朱複丹: 為日月增加拆分查詢，添加 ming 參數支持
 * - 2025-12-17 by 朱複丹: 增加靈明反查編碼邏輯，支持主根（兩碼字根）判斷和大碼大寫
 * - 2025-12-17 by 朱複丹: 重構參數系統，將 supplement, ming, wafel, ling 合併為單一 rule 參數
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
    pinyin?: string
}

export type ZigenMap = Map<string, Zigen>

export type ChaifenMap = Map<string, Chaifen>

/** 根據拆分表生成編碼 */
export function makeCodesFromDivision(division: string, zigenMap: ZigenMap, rule: string) {
    const divisionArray = [...division]

    // 根據 rule 確定編碼規則
    const supplement = rule === 'star' || rule === 'light'
    const ming = rule === 'ming'
    const wafel = rule === 'wafel'
    const ling = rule === 'ling'

    if (ling) {
        // 靈明編碼邏輯
        const lenRoots = divisionArray.length
        const rootA = divisionArray[0]
        const rootB = divisionArray[1] || ''
        const rootC = divisionArray[2] || ''
        const rootZ = divisionArray[lenRoots - 1]

        // 提取各個字根的編碼
        const getMa = (root: string) => zigenMap.get(root)?.ma || ''
        const maA = getMa(rootA)
        const maZ = getMa(rootZ)

        // 判斷是否為主根（兩碼字根）
        const isZhugen = (ma: string) => ma.length === 2

        // 提取大碼、聲碼、韻碼
        const getDama = (ma: string) => ma[0] || ''
        const getShengma = (ma: string) => ma.length === 3 ? ma[1] : ''
        const getYunma = (ma: string) => ma[ma.length - 1] || ''

        const aIsZhugen = isZhugen(maA)
        const zIsZhugen = isZhugen(maZ)

        const aD = getDama(maA)
        const aS = getShengma(maA)
        const aY = getYunma(maA)
        const bD = getDama(getMa(rootB))
        const cD = getDama(getMa(rootC))
        const zD = getDama(maZ)
        const zS = getShengma(maZ)
        const zY = getYunma(maZ)

        let code = ''

        if (aIsZhugen) {
            // 首根是主根
            if (lenRoots === 1) {
                // 1根: AdAy
                code = aD.toUpperCase() + aY
            } else if (lenRoots === 2) {
                // 2根: AdZd[Zs]Zy
                if (zIsZhugen) {
                    // 末根是主根: AdZdZy
                    code = aD.toUpperCase() + zD.toUpperCase() + zY
                } else {
                    // 末根不是主根: AdZdZsZy
                    code = aD.toUpperCase() + zD.toUpperCase() + zS + zY
                }
            } else if (lenRoots === 3) {
                // 3根: AdBdZd[Zs][Zy]
                if (zIsZhugen) {
                    // 末根是主根: AdBdZdZy
                    code = aD.toUpperCase() + bD.toUpperCase() + zD.toUpperCase() + zY
                } else {
                    // 末根不是主根: AdBdZdZs
                    code = aD.toUpperCase() + bD.toUpperCase() + zD.toUpperCase() + zS
                }
            } else {
                // 4+根: AdBdCdZd
                code = aD.toUpperCase() + bD.toUpperCase() + cD.toUpperCase() + zD.toUpperCase()
            }
        } else {
            // 首根不是主根
            if (lenRoots === 1) {
                // 1根: AdAsAy
                code = aD.toUpperCase() + aS + aY
            } else if (lenRoots === 2) {
                // 2根: AdAsZd[Zs][Zy]
                if (zIsZhugen) {
                    // 末根是主根: AdAsZdZy
                    code = aD.toUpperCase() + aS + zD.toUpperCase() + zY
                } else {
                    // 末根不是主根: AdAsZdZs
                    code = aD.toUpperCase() + aS + zD.toUpperCase() + zS
                }
            } else {
                // 3+根: AdAsBdZd
                code = aD.toUpperCase() + aS + bD.toUpperCase() + zD.toUpperCase()
            }
        }

        return code
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

    else {
        // 依次取一、二、三、末根大碼
        let result = divisionArray.map(zigen => zigenMap.get(zigen)?.ma?.[0] || '?')

        // 不足四碼時，補上末根小碼。
        if (result.length < 4) {
            const lastZigen = divisionArray[divisionArray.length - 1]
            result.push(zigenMap.get(lastZigen)?.ma?.[1] || '?')
        }

        // 仍然不足四碼時，補上首根小碼。
        if ((result.length < 4) && supplement) {
            const firstZigen = divisionArray[0]
            result.push(zigenMap.get(firstZigen)?.ma?.[1] || '?')
        }

        return result.join('')
    }
}

/**
 * 請求一個csv文件，並解析它，轉成map對象，
 * 類似python里的csv.DictReader，不過會按照第一列為鍵，轉成KV數據。
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
            // 填充缺失的列為空字符串
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

        // 將優化格式轉換為ChaifenMap格式
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