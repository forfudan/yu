export * from '../search/share'
import { ChaifenMap, fetchChaifenOptimized } from "../search/share";
import ChaiDataLoader from "../search/ChaiDataLoader";

export interface Card {
    /** 练习的题目 */
    name: string;
    /** 答案 */
    key: string;
}

// 重新导出优化的读取函数
export { fetchChaifenOptimized };

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
                    const codePoint = c.codePointAt(0)
                    // 只保留 CJK 基本集字符（U+4E00-U+9FFF），避免顯示問題
                    if (c &&
                        codePoint !== undefined &&
                        codePoint >= 0x4E00 && codePoint <= 0x9FFF && // CJK 統一漢字基本集
                        result.length < 8) {
                        result.push(c)
                    }
                }
                if (result.length >= 8) break;
            }
        }
    }
    // 使用 Array.from 確保正確處理 Unicode 字符
    const resultString = result.join('')
    return Array.from(resultString).slice(0, 8).join('')
}