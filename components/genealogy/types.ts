/**
 * 輸入法繫絡圖類型定義
 */

/**
 * 輸入法方案數據結構
 */
export interface SchemaData {
    /** 唯一標識符 */
    id: string
    /** 輸入法名稱 */
    name: string
    /** 作者列表 */
    authors: string[]
    /** 維護者列表 */
    maintainers?: string[]
    /** 發明/發布時間 (8位字符串格式: YYYYMMDD)
     * - 19000000: 精確到年
     * - 19001200: 精確到月
     * - 19001225: 精確到日
     */
    date: string
    /** 特性列表 */
    features: string[]
    /** 簡短描述 */
    description?: string
    /** 網址鏈接 */
    url?: string
    /** 是否已停止維護 */
    deprecated?: boolean
}

/**
 * 連接類型
 */
export enum ConnectionType {
    /** 特性繼承 */
    FEATURE = 'feature',
    /** 作者繼承 */
    AUTHOR = 'author',
    /** 高度相似 */
    SIMILAR = 'similar',
}

/**
 * 連接數據
 * 
 * 箭頭方向：from → to（从派生指向来源，即子 → 父）
 * - from: 派生的输入法（子系，绿色高亮）
 * - to: 来源的输入法（父系，蓝色高亮）
 */
export interface Connection {
    /** 源輸入法ID（箭头起点，派生方） */
    from: string
    /** 目標輸入法ID（箭头终点，来源方） */
    to: string
    /** 連接類型 */
    type: ConnectionType
    /** 相關特性或作者名（用於顯示提示） */
    label: string
}

/**
 * 佈局節點（用於渲染）
 */
export interface LayoutNode {
    /** 輸入法數據 */
    schema: SchemaData
    /** X坐標（時間線上的橫向位置） */
    x: number
    /** Y坐標（時間軸上的縱向位置） */
    y: number
    /** 節點寬度 */
    width: number
    /** 節點高度 */
    height: number
}

/**
 * 年份標籤
 */
export interface YearLabel {
    /** 年份 */
    year: number
    /** Y坐標 */
    y: number
}

/**
 * 組件配置項
 */
export interface GenealogyConfig {
    /** 畫布寬度 */
    width?: number
    /** 畫布高度 */
    height?: number
    /** 節點最小間距 */
    nodeSpacing?: number
    /** 基礎年份間距（沒有輸入法的年份） */
    baseSpacing?: number
    /** 每個輸入法佔用的額外間距 */
    schemaSpacing?: number
    /** 空白年份閾值：連續超過此數量的空白年份將被壓縮 */
    emptyYearThreshold?: number
    /** 空白段總間距：長空白段的總高度（無論多少年） */
    emptySegmentSpacing?: number
    /** 空白段標籤間隔：空白段內年份標籤的顯示間隔（0表示不顯示中間年份） */
    labelInterval?: number
    /** 是否反轉時間軸（新的在上） */
    reverseTimeline?: boolean
    /** 是否顯示已停止維護的輸入法 */
    showDeprecated?: boolean
    /** 高亮特性 */
    highlightFeatures?: string[]
}
