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
    ma: string
}

export type ZigenMap = Map<string, Zigen>

export type ChaifenMap = Map<string, Chaifen>

/** 根據拆分表生成編碼 */
export function makeCodesFromDivision(division: string, zigenMap: ZigenMap, supplement: boolean, ming: boolean, wafel?: boolean) {
    const divisionArray = [...division]

    if (ming) {
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