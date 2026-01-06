/**
 * 輸入法源流圖類型定義
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
}

/**
 * 連接數據
 */
export interface Connection {
    /** 源輸入法ID */
    from: string
    /** 目標輸入法ID */
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
    /** 時間軸年份間距（像素） */
    yearSpacing?: number
    /** 是否反轉時間軸（新的在上） */
    reverseTimeline?: boolean
    /** 是否顯示已停止維護的輸入法 */
    showDeprecated?: boolean
    /** 高亮特性 */
    highlightFeatures?: string[]
}
