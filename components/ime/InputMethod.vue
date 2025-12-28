<!--
    InputMethod.vue - 在線輸入法核心組件

    Modification History:
    - 2024-06-25 by yb6b: 初版
    - 2025-08-15 by 朱複丹: 完全重構代碼，優化輸入法引擎和用戶體驗
        支持日月方案
        支持額外的候選框
        支持自動上屏
        支持標點符號頂屏
        支持韻碼提示
        支持中英文模式切換
    - 2025-08-16 by 朱複丹: 優化中文標點的輸入
    - 2025-12-16 by 朱複丹: 拓展上屏邏輯,支持最大碼長不是5的情況.
-->

<script setup lang="ts">

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { biSearchBetween, ImeRule, searchTop, MabiaoItem } from './share'
import Keyboard from "./Keyboard.vue";
const props = defineProps<{
    id: string
    /** 每個元素，必須要填寫key name, 也必须按字典顺序排序 */
    data: MabiaoItem[]
    /** 輸入法的配置 */
    rule: ImeRule
}>()


const mabiaoList = props.data
console.log('🎯 InputMethod loaded with', mabiaoList.length, 'items')

//#region 中英文狀態管理
const isChineseMode = ref(true) // true為中文模式，false為英文模式
const quoteState = ref(false) // 追蹤雙引號狀態，false為開引號，true為閉引號
//#endregion

//#region 候選條管理
const candidateCodes = ref('')

// 標點符號字符集（提取為常量避免重復定義）
const PUNCTUATION_CHARS = [',', '.', '!', '?', '[', ']', '{', '}', '(', ')', '\\']

const candidateHanzi = computed(() => {
    // 如果是英文模式，不顯示候選字
    if (!isChineseMode.value) return []

    const cd = candidateCodes.value
    // 沒有輸入編碼
    if (!cd) return [];

    const range = biSearchBetween(mabiaoList, cd)

    // 空碼
    if (!range) return [];

    let allCandidates = mabiaoList.slice(range[0], range[1])

    // 分離精確匹配和預測項
    const exactMatches = allCandidates.filter(candidate => candidate.key! === cd)
    let predictMatches = allCandidates.filter(candidate => {
        const candidateCode = candidate.key!
        if (candidateCode === cd) return false // 已在精確匹配
        if (!candidateCode.startsWith(cd)) return false
        const rest = candidateCode.slice(cd.length)
        return rest.length === 1 && 'aeiou'.includes(rest)
    })

    // CJK過濾只作用於預測項
    predictMatches = predictMatches.filter(c => {
        const ch = c.name.charCodeAt(0)
        // CJK基本集、CJK拓展A、中文標點、注音符號
        return (
            // CJK基本集
            (ch >= 0x4E00 && ch <= 0x9FFF) ||
            // CJK拓展A
            (ch >= 0x3400 && ch <= 0x4DBF) ||
            // 中文標點
            (ch >= 0x3000 && ch <= 0x303F) ||
            // 注音符號
            (ch >= 0x3100 && ch <= 0x312F) ||
            (ch >= 0x31A0 && ch <= 0x31BF)
        )
    })
    // 合併精確匹配和過濾後的預測項
    return [...exactMatches, ...predictMatches]
})


// 候選欄顯示和翻頁
const candidateCount = 9
const candidatePageIndex = ref(0)
const showKeyboard = ref(false)
const showDropdownPanel = ref(false)

const candidatePage = computed(() => {
    if (candidateHanzi.value.length === 0) return [];
    const startIndex = candidatePageIndex.value * candidateCount
    return candidateHanzi.value.slice(startIndex, startIndex + candidateCount)
})

const disablePreviousPageBtn = computed(() => candidatePageIndex.value < 1)
const disableNextPageBtn = computed(() => {
    return candidatePageIndex.value >= Math.ceil(candidateHanzi.value.length / candidateCount) - 1
})

// 下拉麵板相關
const dropdownPageSize = 24
const dropdownPageIndex = ref(0)

// 下拉展開的候選字（虛擬滾動分頁，始終顯示所有預測項）
const dropdownCandidates = computed(() => {
    if (!candidateCodes.value) return [];
    const cd = candidateCodes.value;
    // 直接在全表篩選所有 key 以當前編碼開頭的項
    const allPredict = mabiaoList.filter(candidate => candidate.key && candidate.key.startsWith(cd));
    // 分頁
    const startIndex = dropdownPageIndex.value * dropdownPageSize;
    const endIndex = Math.min(startIndex + dropdownPageSize, allPredict.length);
    return allPredict.slice(startIndex, endIndex);
})

// 計算下拉麵板總頁數
const totalDropdownPages = computed(() => {
    if (!candidateCodes.value) return 0;
    const cd = candidateCodes.value;
    // 直接在全表篩選所有 key 以當前編碼開頭的項
    const allPredict = mabiaoList.filter(candidate => candidate.key && candidate.key.startsWith(cd));
    if (allPredict.length === 0) return 0;
    return Math.ceil(allPredict.length / dropdownPageSize);
})

const hasMoreCandidates = computed(() => candidateHanzi.value.length > candidateCount)

// 下拉麵板翻頁函數
function nextDropdownPage() {
    if (dropdownPageIndex.value < totalDropdownPages.value - 1) {
        dropdownPageIndex.value++
    }
}

function prevDropdownPage() {
    if (dropdownPageIndex.value > 0) {
        dropdownPageIndex.value--
    }
}
//#endregion


//#region 文本輸入和交互
const text = ref('')
const textarea = ref<HTMLInputElement>()

// 共用的候選項選擇和編碼清空邏輯
function selectCandidateAndClear(candidate: string) {
    commit(candidate)
    candidateCodes.value = ''
    candidatePageIndex.value = 0
}

// 共用的標點符號處理邏輯
function handlePunctuation(key: string) {
    // 如果有編碼，先上屏第一個候選項
    if (candidateCodes.value && candidatePage.value.length > 0) {
        selectCandidateAndClear(candidatePage.value[0].name)
    }
    // 然後輸入標點符號
    commit(key)
}

function onClick(key: string) {
    console.log('[onClick] key:', key);

    // 中英文切換
    if (key === 'toggle-lang') {
        isChineseMode.value = !isChineseMode.value
        // 切換到英文模式時清空編碼
        if (!isChineseMode.value) {
            candidateCodes.value = ''
        }
        console.log('语言模式切换:', isChineseMode.value ? '中文' : '英文')
        return
    }

    // 如果是英文模式，直接輸入字符（除了刪除鍵和空格鍵）
    if (!isChineseMode.value && key !== 'bs' && key !== ' ') {
        console.log('英文模式輸入字符:', key)
        commit(key)
        return
    }

    if (key === 'bs') {
        if (candidateCodes.value) {
            candidateCodes.value = candidateCodes.value.slice(0, -1)
        } else {
            // 虛擬鍵盤的簡單刪除邏輯
            if (text.value.length > 0) {
                text.value = text.value.slice(0, -1)
            }
        }
        return
    }

    if (key === ' ') {
        // 英文模式下直接輸入空格
        if (!isChineseMode.value) {
            commit(' ')
            return
        }

        // 中文模式下使用輸入法邏輯
        const cd = candidateCodes.value
        if (cd) {
            // 有編碼時，空格上屏第一個候選項（如果有的話）
            if (candidatePage.value.length > 0) {
                selectCandidateAndClear(candidatePage.value[0].name)
            } else {
                // 無候選項時只清空編碼
                candidateCodes.value = ''
                candidatePageIndex.value = 0
            }
        } else {
            // 沒有編碼時，空格作為普通字符輸入
            commit(' ')
        }
        return
    }

    // 特殊處理分號和單引號：有候選時選擇候選項，無候選時輸入標點
    if (key === ';') {
        if (candidateCodes.value && candidatePage.value.length >= 2) {
            selectCandidateAndClear(candidatePage.value[1].name)
        } else {
            commit(key)
        }
        return
    }

    if (key === "'") {
        if (candidateCodes.value && candidatePage.value.length >= 3) {
            selectCandidateAndClear(candidatePage.value[2].name)
        } else {
            commit(key)
        }
        return
    }

    // 雙引號永遠輸入中文標點
    if (key === '"') {
        handlePunctuation(key)
        return
    }

    // 檢查是否為標點符號，標點符號直接輸入
    if (PUNCTUATION_CHARS.includes(key)) {
        handlePunctuation(key)
        return
    }

    // 中文模式下才進行編碼處理
    if (isChineseMode.value) {
        let inputKey = key
        // 如果是大寫字母，自動轉為小寫
        if (/^[A-Z]$/.test(key)) {
            inputKey = key.toLowerCase()
        }
        // 檢查是否需要先上屏再添加新編碼
        checkAutoCommit(inputKey)

        candidateCodes.value += inputKey
        candidatePageIndex.value = 0
    } else {
        // 英文模式下直接輸入字符
        commit(key)
    }
}

// 中文標點符號轉換函數
function convertToChinese(words: string): string {
    console.log('[convertToChinese] called:', { words, isChineseMode: isChineseMode.value });
    if (!isChineseMode.value) {
        return words
    }

    // 逐個字符處理
    let result = ''

    for (let i = 0; i < words.length; i++) {
        const char = words[i]

        switch (char) {
            case ',':
                result += '，'
                break
            case '.':
                result += '。'
                break
            case ';':
                result += '；'
                break
            case '!':
                result += '！'
                break
            case '?':
                result += '？'
                break
            case '\\':
                result += '、'
                break
            case '[':
                result += '「'
                break
            case ']':
                result += '」'
                break
            case '{':
                result += '『'
                break
            case '}':
                result += '』'
                break
            case '"':
                // 處理雙引號的開合
                if (quoteState.value) {
                    result += '"' // 閉引號
                } else {
                    result += '"' // 開引號
                }
                quoteState.value = !quoteState.value
                break
            case "'":
                result += "'"
                break
            default:
                result += char
                break
        }
    }

    return result
}

function commit(words: string) {
    // 在中文模式下轉換標點符號
    const convertedWords = convertToChinese(words)

    const textareaNode = textarea.value!

    // 確保獲取最新的光標位置
    textareaNode.focus()
    const { selectionStart, selectionEnd } = textareaNode
    const currentValue = textareaNode.value

    console.log('commit 調用:', {
        words: convertedWords,
        selectionStart,
        selectionEnd,
        currentValue: currentValue.slice(0, 20) + (currentValue.length > 20 ? '...' : ''),
        textLength: currentValue.length
    })

    // 處理在文本末尾追加的情況
    if (selectionStart === currentValue.length && selectionEnd === currentValue.length) {
        const newValue = currentValue + convertedWords
        text.value = newValue
        textareaNode.value = newValue

        // 同步設置光標位置
        const newCursorPosition = newValue.length
        textareaNode.selectionStart = newCursorPosition
        textareaNode.selectionEnd = newCursorPosition
        return
    }

    // 處理在文本中間插入或替換選中文本的情況
    const startPart = currentValue.slice(0, selectionStart || 0)
    const endPart = currentValue.slice(selectionEnd || selectionStart || 0)
    const newValue = startPart + convertedWords + endPart

    text.value = newValue
    textareaNode.value = newValue

    // 同步設置光標位置
    const newCursorPosition = (selectionStart || 0) + convertedWords.length
    textareaNode.selectionStart = newCursorPosition
    textareaNode.selectionEnd = newCursorPosition

    console.log('commit 完成:', {
        newValue: newValue.slice(0, 20) + (newValue.length > 20 ? '...' : ''),
        newCursorPosition
    })
} function onClickCandidate(card: MabiaoItem) {
    selectCandidateAndClear(card.name)
}

// 處理文本框聚焦和失焦事件
function onTextareaFocus() {
    // 聚焦時可以在這裡添加額外邏輯
}

function onTextareaBlur() {
    // 失焦時可以在這裡添加額外邏輯
}
//#endregion

// 監聽候選字變化，動態調整顯示數量
watch(candidateHanzi, (newCandidates) => {
    candidatePageIndex.value = 0 // 候選字變化時重置頁面索引
    dropdownPageIndex.value = 0 // 重置下拉頁面索引

    // 檢查是否需要自動上屏唯一候選項
    if (newCandidates.length === 1 && candidateCodes.value) {
        const cd = candidateCodes.value
        const autoCmLen = props.rule.autoCm
        // 只有編碼長度>=autoCm或最後一位為aeiou時才自動上屏
        if (cd.length >= autoCmLen || 'aeiou'.includes(cd.at(-1)!)) {
            console.log('檢測到唯一候選項，自動上屏:', newCandidates[0].name)
            selectCandidateAndClear(newCandidates[0].name)
        }
    }
}, { immediate: true })

// 監聽候選編碼變化，重置展開狀態並重新計算寬度
watch(candidateCodes, () => {
    // 編碼變化時立即重新計算主候選欄顯示數量
    candidatePageIndex.value = 0
    dropdownPageIndex.value = 0
})

// 生命週期鈎子
onMounted(() => {
    if (typeof window !== 'undefined') {
    }

    // 自動聚焦到文本框
    nextTick(() => {
        if (textarea.value) {
            textarea.value.focus()
        }
    })
})

onUnmounted(() => {
    if (typeof window !== 'undefined') {
    }
})

//#region 監聽 上屏 頂功

// 空碼自動上屏
watch(candidateHanzi, (hz) => {
    if (hz.length > 0) return;

    // 遇見空碼, 考慮頂屏
    const autoCmLen = props.rule.autoCm
    let cd = candidateCodes.value

    if (cd.length < autoCmLen + 1) return;

    let topIndex: number | null = null
    do {
        cd = cd.slice(0, -1)
        if (cd.length === 0) return;
        topIndex = searchTop(mabiaoList, cd)
    } while (topIndex === null);

    const popCard = mabiaoList[topIndex]
    commit(popCard.name)
    candidateCodes.value = candidateCodes.value.at(-1) || ''
})

watch(candidateCodes, (cd) => {
    // 頂屏邏輯已移到 checkAutoCommit 函數中處理
    // 這裡保留原有的延時頂功邏輯（如果配置了 popLen）
    const popLen = props.rule.pop
    const codeLen = props.rule.autoCm // 使用規則配置的自動上屏碼長

    if (cd.length > codeLen) {
        // 延時頂功
        if (popLen) {
            const topIndex = searchTop(props.data, cd.slice(0, popLen))
            if (topIndex === null) {
                return
            }
            const popCard = props.data[topIndex]
            commit(popCard.name)
            candidateCodes.value = candidateCodes.value.slice(popLen)
        }
        // 定長自動上屏
        else {
            const topIndex = searchTop(props.data, cd.slice(0, codeLen))
            if (topIndex !== null) {
                const popCard = props.data[topIndex]
                commit(popCard.name)
            }
            candidateCodes.value = candidateCodes.value.slice(codeLen)
        }
    }
})
//#endregion

// 檢查是否需要自動上屏
function checkAutoCommit(nextKey: string) {
    const cd = candidateCodes.value
    if (!cd) return

    const currentCandidates = candidateHanzi.value
    if (currentCandidates.length === 0) return

    console.log('checkAutoCommit 调用:', {
        当前编码: cd,
        即将添加: nextKey,
        新编码: cd + nextKey,
        当前候选数量: currentCandidates.length,
        当前候选项: currentCandidates.map(c => c.name).slice(0, 5)
    })

    const autoCmLen = props.rule.autoCm

    // 1. 如果當前候選項唯一，只有編碼長度>=autoCm或末碼為aeiou時才自動上屏
    if (currentCandidates.length === 1) {
        const cd = candidateCodes.value
        if (cd.length >= autoCmLen || 'aeiou'.includes(cd.at(-1)!)) {
            console.log('当前候选项唯一，上屏:', currentCandidates[0].name)
            selectCandidateAndClear(currentCandidates[0].name)
            return
        }
    }

    // 2. 如果候選項不唯一，分情況處理
    if (currentCandidates.length > 1) {
        // 2a. 如果當前編碼已經達到autoCm碼，下一個編碼頂出前序首選字
        if (cd.length >= autoCmLen) {
            console.log(`當前編碼達到${autoCmLen}碼，即將輸入第${autoCmLen + 1}碼，上屏首選:`, currentCandidates[0].name)
            selectCandidateAndClear(currentCandidates[0].name)
            return
        }

        // 2b. 如果當前編碼結尾是aeiou中的一個，輸入下一個編碼也頂出前序候選項
        const lastChar = cd[cd.length - 1]
        if ('aeiou'.includes(lastChar)) {
            console.log('當前編碼元音結尾，上屏首選:', { 編碼: cd, 結尾字符: lastChar, 首選: currentCandidates[0].name })
            selectCandidateAndClear(currentCandidates[0].name)
            return
        }
    }

    console.log('無需上屏')
}

//#region 電腦鍵盤事件
const keysListened = new Set(`abcdefghijklmnopqrstuvwxyz/;'",.[]{}!?\\${props.rule.keys === 27 ? ';' : ''}`)

const commitKeys = computed(() => {
    const { cm1, cm2, cm3 } = props.rule
    const result = new Map<string, number>()
    result.set(cm1, 0)
    result.set(cm2, 1)
    result.set(cm3, 2)
    for (let i = 0; i < 9; i++) {
        result.set(String(i + 1), i)
    }
    return result
})

function onKeydown(e: KeyboardEvent) {
    const { key } = e
    // 主候選欄上下鍵翻頁
    if (key === 'ArrowUp' && candidateHanzi.value.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        if (candidatePageIndex.value > 0) candidatePageIndex.value--;
        return;
    }
    if (key === 'ArrowDown' && candidateHanzi.value.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const pageSize = candidateCount;
        if ((candidatePageIndex.value + 1) * pageSize < candidateHanzi.value.length) candidatePageIndex.value++;
        return;
    }

    // 允許系統快捷鍵通過（不阻止）
    if (e.ctrlKey || e.metaKey || e.altKey) {
        // 對於系統快捷鍵，不阻止默認行為
        return
    }

    const cd = candidateCodes.value
    // 輸入按鍵
    if (keysListened.has(key)) {
        e.preventDefault()
        e.stopPropagation()

        // 特殊處理分號和單引號：有候選時選擇候選項，無候選時輸入標點
        if (key === ';') {
            if (candidateCodes.value && candidatePage.value.length >= 2) {
                selectCandidateAndClear(candidatePage.value[1].name)
            } else {
                commit(key)
            }
            return
        }

        if (key === "'") {
            if (candidateCodes.value && candidatePage.value.length >= 3) {
                selectCandidateAndClear(candidatePage.value[2].name)
            } else {
                commit(key)
            }
            return
        }

        // 雙引號永遠輸入中文標點
        if (key === '"') {
            handlePunctuation(key)
            return
        }

        // 檢查是否為標點符號，標點符號直接輸入
        if (PUNCTUATION_CHARS.includes(key)) {
            handlePunctuation(key)
            return
        }

        // 英文模式下直接輸入字符
        if (!isChineseMode.value) {
            console.log('物理鍵盤英文模式輸入:', key)
            commit(key)
            return
        }

        // 中文模式下處理編碼
        let inputKey = key
        if (/^[A-Z]$/.test(key)) {
            inputKey = key.toLowerCase()
        }
        // 檢查是否需要先上屏再添加新編碼
        checkAutoCommit(inputKey)

        candidateCodes.value += inputKey
        candidatePageIndex.value = 0
        return
    }

    // 空格鍵 - 按照輸入法規則處理
    if (key === ' ') {
        // 英文模式下讓系統自然處理空格
        if (!isChineseMode.value) {
            return
        }

        // 中文模式處理
        if (cd) {
            // 有編碼時，阻止默認行為並處理上屏
            e.preventDefault()
            e.stopPropagation()
            // 空格上屏第一個候選項（如果有的話）
            if (candidatePage.value.length > 0) {
                selectCandidateAndClear(candidatePage.value[0].name)
            } else {
                // 無候選項時只清空編碼
                candidateCodes.value = ''
                candidatePageIndex.value = 0
            }
        }
        // 沒有編碼時，讓系統自然處理空格輸入
        return
    }

    // 上屏鍵（排除空格鍵，因為空格鍵已經特殊處理了）
    if (commitKeys.value.has(key) && key !== ' ') {
        const candidateIndex = commitKeys.value.get(key)!
        if (candidateIndex < candidatePage.value.length) {
            e.preventDefault()
            e.stopPropagation()
            selectCandidateAndClear(candidatePage.value[candidateIndex].name)
        }
        return
    }

    // 刪除鍵
    if (key === 'Backspace') {
        if (cd) {
            // 有候选编码时，删除编码
            e.preventDefault()
            e.stopPropagation()
            candidateCodes.value = cd.slice(0, -1)
        }
        // 沒有候選編碼時，讓系統自然處理刪除
        return
    }

    // 清除鍵
    if (key === 'Escape' && cd) {
        e.preventDefault()
        e.stopPropagation()
        candidateCodes.value = ''
        return
    }

    // 翻頁鍵
    const cpi = candidatePageIndex.value
    if (key === '-' && cd) {
        e.preventDefault()
        e.stopPropagation()
        if (cpi > 0)
            candidatePageIndex.value--
        return
    }
    if (key === '=' && cd) {
        e.preventDefault()
        e.stopPropagation()
        const pageSize = candidateCount
        if (cpi + 1 < candidateHanzi.value.length / pageSize)
            candidatePageIndex.value++
        return
    }
    //console.log(`key:${key},code:${code}`);
}

//#endregion

</script>

<template>
    <!-- 文本輸入框 -->
    <div class="pt-3">
        <textarea v-model="text" ref="textarea"
            class="textarea textarea-bordered textarea-md w-full bg-neutral-50 dark:bg-neutral-700"
            placeholder="輸入數據在本地分析加載，不會上傳雲端。" @keydown="onKeydown" @focus="onTextareaFocus"
            @blur="onTextareaBlur"></textarea>
    </div>

    <div class="relative w-full">
        <!-- CJK過濾按鈕 -->
        <div class="flex justify-end mb-2 space-x-2">
            <button @click="showDropdownPanel = !showDropdownPanel"
                class="px-3 py-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs">
                {{ showDropdownPanel ? '隱藏更多候選框' : '顯示更多候選項' }}
            </button>
            <button @click="showKeyboard = !showKeyboard"
                class="px-3 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                {{ showKeyboard ? '收起鍵盤' : '顯示鍵盤' }}
            </button>
        </div>
        <!-- 候選欄始終顯示 -->
        <div>
            <div class="flex items-center space-x-2">
                <!-- 語言模式狀態 -->
                <div class="text-xs px-2 h-4 rounded select-none"
                    :class="isChineseMode ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'">
                    {{ isChineseMode ? '中' : '英' }}
                </div>
                <div class="h-4" v-if="candidateCodes === ''"></div>
                <div v-else class="text-xs bg-neutral-200 dark:bg-neutral-900 w-max px-2 h-4 select-none">
                    {{ candidateCodes }}
                </div>
            </div>
            <template v-if="candidateHanzi.length === 0">
                <div class="flex items-center min-h-[3.5rem] h-[3.5rem]">
                    <div class="text-sm text-slate-500 ml-6 mt-1" v-if="candidateCodes.length === 0">
                        <slot>
                            <!-- 根據模式顯示不同提示 -->
                            <span v-if="isChineseMode">中文輸入模式，記得關閉系統輸入法</span>
                            <span v-else>英文輸入模式，記得關閉系統輸法</span>
                        </slot>
                    </div>
                    <div class="text-sm text-slate-400 dark:text-slate-500 ml-6 mt-1" v-else>空码</div>
                </div>
            </template>
            <template v-else>
                <!-- 正常候選字顯示 -->
                <div class="relative flex items-center min-h-[3.5rem] border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm"
                    ref="candidateContainer">
                    <div class="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide"
                        style="scrollbar-width: none; -ms-overflow-style: none;">
                        <div class="flex">
                            <button
                                class="px-3 py-2 text-base hover:bg-slate-200 dark:hover:bg-slate-900 whitespace-nowrap flex-shrink-0 rounded flex flex-col items-center"
                                v-for="n, i of candidatePage" @click="onClickCandidate(n)">
                                <!-- 序號 -->
                                <span class="text-xs text-slate-400 dark:text-slate-500">{{ i + 1 }}</span>
                                <!-- 詞條 -->
                                <span class="text-xl select-text px-2 text-slate-900 dark:text-slate-200">{{ n.name
                                    }}</span>
                                <!-- 後序編碼 -->
                                <span class="text-base text-blue-400 dark:text-blue-500 mt-0">{{
                                    n.key!.slice(candidateCodes.length) }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- 翻頁按鈕 -->
                    <div class="flex items-center mx-2 space-x-1">
                        <button :class="{ 'text-transparent': disablePreviousPageBtn }"
                            :disabled="disablePreviousPageBtn"
                            class="hover:bg-slate-200 dark:hover:bg-slate-700 rounded px-1"
                            @click="candidatePageIndex--">◂</button>
                        <button :class="{ 'text-transparent': disableNextPageBtn }" :disabled="disableNextPageBtn"
                            class="hover:bg-slate-200 dark:hover:bg-slate-700 rounded px-1"
                            @click="candidatePageIndex++">▸</button>
                    </div>
                </div>

                <!-- 展開的候選字面板（獨立開關控制） -->
                <div v-if="showDropdownPanel"
                    class="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-[9999] p-4 mt-2">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-sm text-slate-500">
                            候選字 {{ dropdownPageIndex * dropdownPageSize + 1 }}-{{ Math.min((dropdownPageIndex + 1) *
                                dropdownPageSize, candidateHanzi.length) }} / {{ candidateHanzi.length }}
                        </div>
                        <div class="flex space-x-2">
                            <button :disabled="dropdownPageIndex === 0"
                                :class="{ 'text-slate-300': dropdownPageIndex === 0 }" @click="prevDropdownPage"
                                class="px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                ← 上一頁
                            </button>
                            <span class="text-sm text-slate-500 px-2 py-1">
                                {{ dropdownPageIndex + 1 }} / {{ totalDropdownPages }}
                            </span>
                            <button :disabled="dropdownPageIndex >= totalDropdownPages - 1"
                                :class="{ 'text-slate-300': dropdownPageIndex >= totalDropdownPages - 1 }"
                                @click="nextDropdownPage"
                                class="px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                下一頁 →
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                        <button v-for="n, i of dropdownCandidates" :key="i" @click="onClickCandidate(n)"
                            class="inline-flex flex-col items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 min-w-0">
                            <!-- 詞條 -->
                            <div class="text-slate-900 dark:text-slate-200 font-medium text-lg leading-tight">{{
                                n.name }}</div>
                            <!-- 顯示同字的其他編碼提示 -->
                            <div v-if="n.name && mabiaoList.filter(m => m.name === n.name).length > 1"
                                class="text-xs text-slate-400 mt-1">
                                <span>
                                    {{mabiaoList.filter(m => m.name === n.name).map(m => m.key).sort().join(' ')}}
                                </span>
                            </div>
                            <!-- 編碼 -->
                            <div class="text-xs text-blue-400 dark:text-blue-500 mt-1 truncate max-w-full">{{ n.key
                            }}</div>
                        </button>
                    </div>
                </div>
            </template>
        </div>
        <Keyboard v-if="showKeyboard" @click="onClick" @hide-keyboard="showKeyboard = false" />
    </div>
</template>

<style scoped>
.scrollbar-hide {
    scrollbar-width: none;
    /* Firefox */
    -ms-overflow-style: none;
    /* Internet Explorer 10+ */
}

.scrollbar-hide::-webkit-scrollbar {
    display: none;
    /* Safari and Chrome */
}
</style>