/**
 * 共享的方案配置
 */

export interface BaseScheme {
    id: string
    name: string
    description: string
}

export interface SearchScheme extends BaseScheme {
    chaifenUrl: string
    zigenUrl: string
    supplement: boolean
    ming: boolean
    wafel?: boolean
    ling?: boolean
}

export interface ZigenScheme extends BaseScheme {
    zigenUrl: string
    chaifenUrl: string
}

// 統一的方案配置
export const SCHEMES: SearchScheme[] = [
    {
        id: 'light',
        name: '光華',
        description: '日月光華旦復旦兮',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-light.csv',
        supplement: true,
        ming: false
    },
    {
        id: 'star',
        name: '星陳',
        description: '明明上天爛然星陳',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-star.csv',
        supplement: true,
        ming: false
    },
    {
        id: 'wafel',
        name: '吉旦餅',
        description: 'Wafel·華夫·三碼方案',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-wafel.csv',
        supplement: false,
        ming: false,
        wafel: true
    },
    {
        id: 'joy',
        name: '卿雲',
        description: '卿雲爛兮糾縵縵兮',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-joy.csv',
        supplement: false,
        ming: false
    },
    {
        id: 'ming',
        name: '日月',
        description: '日月有常星辰有行',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-ming.csv',
        supplement: false,
        ming: true
    },
    {
        id: 'ling',
        name: '靈明',
        description: '明明上天配天之靈',
        chaifenUrl: '/chaifen.csv',
        zigenUrl: '/zigen-ling.csv',
        supplement: false,
        ming: false,
        ling: true
    },
]

// 轉換為 ZigenScheme 格式（用於字根圖）
export const ZIGEN_SCHEMES: ZigenScheme[] = SCHEMES.map(scheme => ({
    id: scheme.id,
    name: scheme.name,
    description: scheme.description,
    zigenUrl: scheme.zigenUrl,
    chaifenUrl: '/chaifen.json' // 字根圖統一使用壓縮JSON格式
}))

// 默認方案
export const DEFAULT_SCHEME = 'ling'
