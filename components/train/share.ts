export * from '../search/share'
import { ChaifenMap } from "../search/share";

export interface Card {
    /** 练习的题目 */
    name: string;
    /** 答案 */
    key: string;
}

export function find8relativeChars(zigen: string, chaifenMap: ChaifenMap) {
    const result: string[] = []
    for (const chaifen of chaifenMap.values()) {
        if (chaifen.division.includes(zigen)) {
            // 正確處理 Unicode 字符，確保每個字符完整
            const char = chaifen.char
            if (char && char.trim()) {
                // 使用 Array.from 正確處理 Unicode 字符
                const chars = Array.from(char.trim())
                for (const c of chars) {
                    if (c && c !== '�' && result.length < 8) {
                        result.push(c)
                    }
                }
                if (result.length >= 8) break;
            }
        }
    }
    return result.join('')
}