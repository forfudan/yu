import { withBase } from "vitepress";
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

/** 根据拆分表生成编码 */
export function makeCodesFromDivision(division: string, zigenMap: ZigenMap, supplement: boolean, ming: boolean) {
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

    else {
        // 依次取一、二、三、末根大码
        let result = divisionArray.map(zigen => zigenMap.get(zigen)?.ma?.[0] || '?')

        // 不足四码时，补上末根小码。
        if (result.length < 4) {
            const lastZigen = divisionArray[divisionArray.length - 1]
            result.push(zigenMap.get(lastZigen)?.ma?.[1] || '?')
        }

        // 仍然不足四码时，补上首根小码。
        if ((result.length < 4) && supplement) {
            const firstZigen = divisionArray[0]
            result.push(zigenMap.get(firstZigen)?.ma?.[1] || '?')
        }

        return result.join('')
    }
}

/**
 * 请求一个csv文件，并解析它，转成map对象，
 * 类似python里的csv.DictReader，不过会按照第一列为键，转成KV数据。
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
            alert(`无法下载或解析《${url}》文件：${error.cause}`)
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
        if (lineSplit.length !== titleListLength)
            throw new Error(`CSV文件中 ${line} 数据不够 ${titleListLength} 条。`);

        const tmp: Record<string, string> = {}
        for (let i = 0; i < titleListLength; i++) {
            tmp[titleList[i]] = lineSplit[i]
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