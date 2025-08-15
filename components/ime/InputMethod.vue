<!--
    InputMethod.vue - 在線輸入法核心組件

    Modification History:
    - 2025-08-15 by 朱複丹: 完全重構代碼，優化輸入法引擎和用戶體驗
      支持日月方案
      支持額外的候選框
      支持自動上屏
      支持標點符號頂屏
      支持韻碼提示
      支持中英文模式切換
    - 2024-06-25 by yb6b: 初版
-->

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { biSearchBetween, ImeRule, searchTop, MabiaoItem } from './share'
import Keyboard from "./Keyboard.vue";
const props = defineProps<{
    id: string
    /** 每个元素，必须要填写key name, 也必须按字典顺序排序 */
    data: MabiaoItem[]
    /** 输入法的配置 */
    rule: ImeRule
}>()


const mabiaoList = props.data
console.log('🎯 InputMethod loaded with', mabiaoList.length, 'items')

//#region 中英文状态管理
const isChineseMode = ref(true) // true为中文模式，false为英文模式
const quoteState = ref(false) // 追踪双引号状态，false为开引号，true为闭引号
//#endregion

//#region 候选条
const candidateCodes = ref('')

const candidateHanzi = computed(() => {
    // 如果是英文模式，不显示候选字
    if (!isChineseMode.value) return []

    const cd = candidateCodes.value
    // 没有输入编码
    if (!cd) return [];

    const range = biSearchBetween(mabiaoList, cd)

    // 空码
    if (!range) return [];

    const allCandidates = mabiaoList.slice(range[0], range[1])

    // 主候选栏：精确匹配和预测项
    const filteredCandidates = allCandidates.filter(candidate => {
        const candidateCode = candidate.key!
        if (candidateCode === cd) return true // 精确匹配
        if (!candidateCode.startsWith(cd)) return false
        const rest = candidateCode.slice(cd.length)
        return rest.length === 1 && 'aeiou'.includes(rest)
    })
    return filteredCandidates
})

const candidatePageIndex = ref(0)

const disablePreviousPageBtn = computed(() => candidatePageIndex.value < 1)
const disableNextPageBtn = computed(() => {
    const pageSize = dynamicCandidateCount.value
    return candidatePageIndex.value >= Math.ceil(candidateHanzi.value.length / pageSize) - 1
})

// 候选字展开状态
const candidateExpanded = ref(false)
const candidateContainer = ref<HTMLElement>()
const dynamicCandidateCount = ref(5) // 动态调整的候选字数量，默认5个

// 虚拟滚动相关
const dropdownPageSize = 24 // 下拉面板每页显示的候选字数量
const dropdownPageIndex = ref(0)

// 主要候选栏显示的候选字（动态调整数量）
const candidatePage = computed(() => {
    if (candidateHanzi.value.length === 0) return [];
    const cpi = candidatePageIndex.value
    return candidateHanzi.value.slice(cpi * dynamicCandidateCount.value, (cpi + 1) * dynamicCandidateCount.value)
})

// 下拉展开的候选字（虚拟滚动分页）
const dropdownRawCandidates = computed(() => {
    // 显示所有以当前编码开头的候选项
    if (!candidateCodes.value) return [];
    const cd = candidateCodes.value
    const range = biSearchBetween(mabiaoList, cd)
    if (!range) return [];
    const allCandidates = mabiaoList.slice(range[0], range[1])
    return allCandidates.filter(candidate => candidate.key!.startsWith(cd))
})

const dropdownCandidates = computed(() => {
    if (dropdownRawCandidates.value.length <= dynamicCandidateCount.value) return [];
    const startIndex = dropdownPageIndex.value * dropdownPageSize
    const endIndex = Math.min(startIndex + dropdownPageSize, dropdownRawCandidates.value.length)
    return dropdownRawCandidates.value.slice(startIndex, endIndex)
})

// 计算下拉面板总页数
const totalDropdownPages = computed(() => {
    if (candidateHanzi.value.length <= dynamicCandidateCount.value) return 0

    return Math.ceil(candidateHanzi.value.length / dropdownPageSize)
})

const hasMoreCandidates = computed(() => candidateHanzi.value.length > dynamicCandidateCount.value)

// 下拉面板翻页函数
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

// 检测候选字容器宽度并调整显示数量
function adjustCandidateCount() {
    // 只有在有候选字的情况下才进行计算
    if (candidateHanzi.value.length === 0) {
        return
    }

    nextTick(() => {
        const container = candidateContainer.value
        if (!container) return

        // 获取容器可用宽度（减去翻页按钮和边距）
        const containerWidth = Math.min(window.innerWidth - 50, 320)

        // 计算最适合的候选项数量
        let bestCount = 3 // 最少3个
        const maxCount = Math.min(9, candidateHanzi.value.length) // 最多9个或实际候选数量

        // 预先计算前几个候选项的汉字总数，用于调整策略
        let totalHanziCount = 0
        for (let i = 0; i < Math.min(9, candidateHanzi.value.length); i++) {
            totalHanziCount += candidateHanzi.value[i].name.length
        }

        // 详细计算每个数量的宽度
        const widthCalculations = []
        for (let count = 3; count <= maxCount; count++) {
            const totalWidth = calculateCandidatesWidth(count)
            widthCalculations.push({ count, totalWidth, fits: totalWidth <= containerWidth })
            if (totalWidth <= containerWidth) {
                bestCount = count
            } else {
                break // 超出宽度就停止
            }
        }

        const oldCount = dynamicCandidateCount.value
        dynamicCandidateCount.value = bestCount
        console.log('候选字容器调整:', {
            候选数量: candidateHanzi.value.length,
            前9个候选汉字总数: totalHanziCount,
            当前编码: candidateCodes.value,
            容器宽度: containerWidth,
            旧显示数量: oldCount,
            新显示数量: bestCount,
            宽度计算详情: widthCalculations,
            候选项示例: candidateHanzi.value.slice(0, bestCount).map(c => `${c.name}(${c.key})`).join(', ')
        })
    })
}

// 计算指定数量候选项的总宽度
function calculateCandidatesWidth(count: number): number {
    if (candidateHanzi.value.length === 0) return 0

    let totalWidth = 0
    const details = []

    // 基于实际会显示的候选项来计算
    for (let i = 0; i < count && i < candidateHanzi.value.length; i++) {
        const candidate = candidateHanzi.value[i]

        // 候选编号宽度 (如 "1.", "2." 等，约12px)
        const numberWidth = 12

        // 汉字宽度 (每个汉字约15px，稍微保守一些)
        const hanziWidth = candidate.name.length * 15

        // 编码宽度 (每个字符约6px，编码字体较小)
        const codeLength = candidate.key!.slice(candidateCodes.value.length).length
        const codeWidth = codeLength * 6

        // 按钮内边距和间距 (约12px)
        const paddingWidth = 12

        const itemWidth = numberWidth + hanziWidth + codeWidth + paddingWidth
        totalWidth += itemWidth

        details.push({
            name: candidate.name,
            key: candidate.key,
            numberWidth,
            hanziWidth,
            codeWidth,
            paddingWidth,
            itemWidth
        })
    }

    // 在调试模式下输出详细信息
    if (count <= 5) {
        console.log(`计算${count}个候选项宽度:`, {
            总宽度: totalWidth,
            详情: details
        })
    }

    return totalWidth
}
//#endregion


//#region 网页中 软键盘和文本框的交互
const text = ref('')
const textarea = ref<HTMLInputElement>()

function onClick(key: string) {
    // 中英文切换
    if (key === 'toggle-lang') {
        isChineseMode.value = !isChineseMode.value
        // 切换到英文模式时清空编码
        if (!isChineseMode.value) {
            candidateCodes.value = ''
        }
        console.log('语言模式切换:', isChineseMode.value ? '中文' : '英文')
        return
    }

    // 如果是英文模式，直接输入字符（除了删除键和空格键）
    if (!isChineseMode.value && key !== 'bs' && key !== ' ') {
        console.log('英文模式输入字符:', key)
        commit(key)
        return
    }

    if (key === 'bs') {
        if (candidateCodes.value) {
            candidateCodes.value = candidateCodes.value.slice(0, -1)
        } else {
            // 虚拟键盘的简单删除逻辑
            if (text.value.length > 0) {
                text.value = text.value.slice(0, -1)
            }
        }
        return
    }

    if (key === ' ') {
        // 英文模式下直接输入空格
        if (!isChineseMode.value) {
            commit(' ')
            return
        }

        // 中文模式下使用输入法逻辑
        const cd = candidateCodes.value
        if (cd) {
            // 有编码时，空格上屏第一个候选项（如果有的话）
            if (candidatePage.value.length > 0) {
                commit(candidatePage.value[0].name)
            }
            // 无论是否有候选项，都清空编码
            candidateCodes.value = ''
            candidatePageIndex.value = 0
        } else {
            // 没有编码时，空格作为普通字符输入
            commit(' ')
        }
        return
    }

    // 检查是否为标点符号，标点符号直接输入
    const punctuationChars = [',', '.', ';', '!', '?', '[', ']', '{', '}', '"', "'", '(', ')']
    if (punctuationChars.includes(key)) {
        // 如果有编码，先上屏第一个候选项
        if (candidateCodes.value && candidatePage.value.length > 0) {
            commit(candidatePage.value[0].name)
            candidateCodes.value = ''
            candidatePageIndex.value = 0
        }
        // 然后输入标点符号
        commit(key)
        return
    }

    // 中文模式下才进行编码处理
    if (isChineseMode.value) {
        let inputKey = key
        // 如果是大写字母，自动转为小写
        if (/^[A-Z]$/.test(key)) {
            inputKey = key.toLowerCase()
        }
        // 检查是否需要先上屏再添加新编码
        checkAutoCommit(inputKey)

        candidateCodes.value += inputKey
        candidatePageIndex.value = 0
    } else {
        // 英文模式下直接输入字符
        commit(key)
    }
}

// 中文标点符号转换函数
function convertToChinese(words: string): string {
    if (!isChineseMode.value) {
        return words
    }

    // 逐个字符处理
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
                // 处理双引号的开合
                if (quoteState.value) {
                    result += '"' // 闭引号
                } else {
                    result += '"' // 开引号
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
    // 在中文模式下转换标点符号
    const convertedWords = convertToChinese(words)

    const textareaNode = textarea.value!

    // 确保获取最新的光标位置
    textareaNode.focus()
    const { selectionStart, selectionEnd } = textareaNode
    const currentValue = textareaNode.value

    console.log('commit 调用:', {
        words: convertedWords,
        selectionStart,
        selectionEnd,
        currentValue: currentValue.slice(0, 20) + (currentValue.length > 20 ? '...' : ''),
        textLength: currentValue.length
    })

    // 处理在文本末尾追加的情况
    if (selectionStart === currentValue.length && selectionEnd === currentValue.length) {
        const newValue = currentValue + convertedWords
        text.value = newValue
        textareaNode.value = newValue

        // 同步设置光标位置
        const newCursorPosition = newValue.length
        textareaNode.selectionStart = newCursorPosition
        textareaNode.selectionEnd = newCursorPosition
        return
    }

    // 处理在文本中间插入或替换选中文本的情况
    const startPart = currentValue.slice(0, selectionStart || 0)
    const endPart = currentValue.slice(selectionEnd || selectionStart || 0)
    const newValue = startPart + convertedWords + endPart

    text.value = newValue
    textareaNode.value = newValue

    // 同步设置光标位置
    const newCursorPosition = (selectionStart || 0) + convertedWords.length
    textareaNode.selectionStart = newCursorPosition
    textareaNode.selectionEnd = newCursorPosition

    console.log('commit 完成:', {
        newValue: newValue.slice(0, 20) + (newValue.length > 20 ? '...' : ''),
        newCursorPosition
    })
} function onClickCandidate(card: MabiaoItem) {
    commit(card.name)
    // textarea.value?.focus()
    candidatePageIndex.value = 0
    candidateCodes.value = ''
}

// 处理文本框聚焦和失焦事件
function onTextareaFocus() {
    // 聚焦时可以在这里添加额外逻辑
}

function onTextareaBlur() {
    // 失焦时可以在这里添加额外逻辑
}
//#endregion

// 监听候选字变化，动态调整显示数量
watch(candidateHanzi, (newCandidates) => {
    candidatePageIndex.value = 0 // 候选字变化时重置页面索引
    dropdownPageIndex.value = 0 // 重置下拉页面索引
    adjustCandidateCount()

    // 检查是否需要自动上屏唯一候选项
    if (newCandidates.length === 1 && candidateCodes.value) {
        const cd = candidateCodes.value
        // 只有编码长度>=5或最后一位为aeiou时才自动上屏
        if (cd.length >= 5 || 'aeiou'.includes(cd.at(-1)!)) {
            console.log('检测到唯一候选项，自动上屏:', newCandidates[0].name)
            commit(newCandidates[0].name)
            candidateCodes.value = ''
            candidatePageIndex.value = 0
        }
    }
}, { immediate: true })

// 监听候选编码变化，重置展开状态并重新计算宽度
watch(candidateCodes, () => {
    // 编码变化时立即重新计算主候选栏显示数量
    adjustCandidateCount()
    candidateExpanded.value = false
    candidatePageIndex.value = 0
    dropdownPageIndex.value = 0
})

// 生命周期钩子
onMounted(() => {
    adjustCandidateCount()
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', adjustCandidateCount)
    }

    // 自动聚焦到文本框
    nextTick(() => {
        if (textarea.value) {
            textarea.value.focus()
        }
    })
})

onUnmounted(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', adjustCandidateCount)
    }
})

//#region 监听 上屏 顶功

// 空码自动上屏
watch(candidateHanzi, (hz) => {
    if (hz.length > 0) return;

    // 遇见空码, 考虑顶屏
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
    // 顶屏逻辑已移到 checkAutoCommit 函数中处理
    // 这里保留原有的延时顶功逻辑（如果配置了 popLen）
    const popLen = props.rule.pop
    const codeLen = 5 // 修改为5码上屏

    if (cd.length > codeLen) {
        // 延时顶功
        if (popLen) {
            const topIndex = searchTop(props.data, cd.slice(0, popLen))
            if (topIndex === null) {
                return
            }
            const popCard = props.data[topIndex]
            commit(popCard.name)
            candidateCodes.value = candidateCodes.value.slice(popLen)
        }
        // 定长（5码）
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

// 检查是否需要自动上屏
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

    // 1. 如果当前候选项唯一，只有编码长度>=5或末码为aeiou时才自动上屏
    if (currentCandidates.length === 1) {
        const cd = candidateCodes.value
        if (cd.length >= 5 || 'aeiou'.includes(cd.at(-1)!)) {
            console.log('当前候选项唯一，上屏:', currentCandidates[0].name)
            commit(currentCandidates[0].name)
            candidateCodes.value = ''
            candidatePageIndex.value = 0
            return
        }
    }

    // 2. 如果候选项不唯一，分情况处理
    if (currentCandidates.length > 1) {
        // 2a. 如果当前编码已经达到5码，下一个编码（第6码）顶出前序首选字
        if (cd.length >= 5) {
            console.log('当前编码达到5码，即将输入第6码，上屏首选:', currentCandidates[0].name)
            commit(currentCandidates[0].name)
            candidateCodes.value = ''
            candidatePageIndex.value = 0
            return
        }

        // 2b. 如果当前编码结尾是aeiou中的一个，输入下一个编码也顶出前序候选项
        const lastChar = cd[cd.length - 1]
        if ('aeiou'.includes(lastChar)) {
            console.log('当前编码元音结尾，上屏首选:', { 编码: cd, 结尾字符: lastChar, 首选: currentCandidates[0].name })
            commit(currentCandidates[0].name)
            candidateCodes.value = ''
            candidatePageIndex.value = 0
            return
        }
    }

    console.log('无需上屏')
}

//#region 电脑键盘事件
const keysListened = new Set(`abcdefghijklmnopqrstuvwxyz/,.${props.rule.keys === 27 ? ';' : ''}`)

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

    // 允许系统快捷键通过（不阻止）
    if (e.ctrlKey || e.metaKey || e.altKey) {
        // 对于系统快捷键，不阻止默认行为
        return
    }

    const cd = candidateCodes.value

    // 输入按键
    if (keysListened.has(key)) {
        e.preventDefault()
        e.stopPropagation()

        // 检查是否为标点符号，标点符号直接输入
        const punctuationChars = [',', '.', ';', '!', '?', '[', ']', '{', '}', '"', "'", '(', ')']
        if (punctuationChars.includes(key)) {
            // 如果有编码，先上屏第一个候选项
            if (candidateCodes.value && candidatePage.value.length > 0) {
                commit(candidatePage.value[0].name)
                candidateCodes.value = ''
                candidatePageIndex.value = 0
            }
            // 然后输入标点符号
            commit(key)
            return
        }

        // 英文模式下直接输入字符
        if (!isChineseMode.value) {
            console.log('物理键盘英文模式输入:', key)
            commit(key)
            return
        }

        // 中文模式下处理编码
        let inputKey = key
        if (/^[A-Z]$/.test(key)) {
            inputKey = key.toLowerCase()
        }
        // 检查是否需要先上屏再添加新编码
        checkAutoCommit(inputKey)

        candidateCodes.value += inputKey
        candidatePageIndex.value = 0
        return
    }

    // 空格键 - 按照输入法规则处理
    if (key === ' ') {
        // 英文模式下让系统自然处理空格
        if (!isChineseMode.value) {
            return
        }

        // 中文模式处理
        if (cd) {
            // 有编码时，阻止默认行为并处理上屏
            e.preventDefault()
            e.stopPropagation()
            // 空格上屏第一个候选项（如果有的话）
            if (candidatePage.value.length > 0) {
                commit(candidatePage.value[0].name)
            }
            // 无论是否有候选项，都清空编码
            candidateCodes.value = ''
            candidatePageIndex.value = 0
        }
        // 没有编码时，让系统自然处理空格输入
        return
    }

    // 上屏键（排除空格键，因为空格键已经特殊处理了）
    if (commitKeys.value.has(key) && key !== ' ') {
        const candidateIndex = commitKeys.value.get(key)!
        if (candidateIndex < candidatePage.value.length) {
            e.preventDefault()
            e.stopPropagation()
            commit(candidatePage.value[candidateIndex].name)
            candidateCodes.value = ''
            candidatePageIndex.value = 0
        }
        return
    }

    // 删除键
    if (key === 'Backspace') {
        if (cd) {
            // 有候选编码时，删除编码
            e.preventDefault()
            e.stopPropagation()
            candidateCodes.value = cd.slice(0, -1)
        }
        // 没有候选编码时，让系统自然处理删除
        return
    }

    // 清除键
    if (key === 'Escape' && cd) {
        e.preventDefault()
        e.stopPropagation()
        if (candidateExpanded.value) {
            candidateExpanded.value = false
        } else {
            candidateCodes.value = ''
        }
        return
    }

    // 翻页键
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
        const pageSize = dynamicCandidateCount.value
        if (cpi + 1 < candidateHanzi.value.length / pageSize)
            candidatePageIndex.value++
        return
    }
    //console.log(`key:${key},code:${code}`);
}

//#endregion

</script>

<template>
    <!-- 文本输入框 -->
    <div class="pt-3">
        <textarea v-model="text" ref="textarea"
            class="textarea textarea-bordered textarea-md w-full bg-neutral-50 dark:bg-neutral-700"
            placeholder="輸入數據在本地分析加載，不會上傳雲端。" @keydown="onKeydown" @focus="onTextareaFocus"
            @blur="onTextareaBlur"></textarea>
    </div>

    <div class="relative w-full">
        <Keyboard @click="onClick">
            <template #codes>
                <div class="flex items-center space-x-2">
                    <div class="h-4" v-if="candidateCodes === ''"></div>
                    <div v-else class="text-xs bg-neutral-200 dark:bg-neutral-900 w-max px-2 h-4 select-none">
                        {{ candidateCodes }}
                    </div>
                    <!-- 语言模式状态 -->
                    <div class="text-xs px-2 h-4 rounded select-none"
                        :class="isChineseMode ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'">
                        {{ isChineseMode ? '中' : '英' }}
                    </div>
                </div>
            </template>
            <template #cadidate>
                <template v-if="candidateHanzi.length === 0">
                    <div class="text-sm text-slate-500 ml-6 mt-1" v-if="candidateCodes.length === 0">
                        <slot>
                            <!-- 根据模式显示不同提示 -->
                            <span v-if="isChineseMode">中文輸入模式，記得關閉系統輸入法</span>
                            <span v-else>英文輸入模式，記得關閉系統輸入法</span>
                        </slot>
                    </div>
                    <div class="text-sm text-slate-400 dark:text-slate-500 ml-6 mt-1" v-else>空码</div>
                </template>
                <template v-else>
                    <!-- 正常候选字显示 -->
                    <div class="relative flex items-center" ref="candidateContainer">
                        <div class="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide"
                            style="scrollbar-width: none; -ms-overflow-style: none;">
                            <div class="flex">
                                <button
                                    class="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-900 whitespace-nowrap flex-shrink-0"
                                    v-for="n, i of candidatePage" @click="onClickCandidate(n)">
                                    <!-- 序号 -->
                                    <span class="text-sm text-slate-400 dark:text-slate-500">{{ i + 1 }}.</span>
                                    <!-- 词条 -->
                                    <span class="select-text px-1 text-slate-900 dark:text-slate-200">
                                        {{ n.name }}</span>
                                    <!-- 后序编码 -->
                                    <span class="text-sm text-blue-400 dark:text-blue-500 dark:opacity-70">{{
                                        n.key!.slice(candidateCodes.length)
                                    }}</span>
                                </button>
                            </div>
                        </div>

                        <!-- 翻页按钮 -->
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

                    <!-- 展开的候选字面板 -->
                    <div v-if="hasMoreCandidates"
                        class="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-[9999] p-4 mt-2">
                        <div class="flex justify-between items-center mb-2">
                            <div class="text-sm text-slate-500">
                                候选字 {{ dropdownPageIndex * dropdownPageSize + 1 }}-{{ Math.min((dropdownPageIndex + 1) *
                                    dropdownPageSize, candidateHanzi.length) }} / {{ candidateHanzi.length }}
                            </div>
                            <div class="flex space-x-2">
                                <button :disabled="dropdownPageIndex === 0"
                                    :class="{ 'text-slate-300': dropdownPageIndex === 0 }" @click="prevDropdownPage"
                                    class="px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                    ← 上一页
                                </button>
                                <span class="text-sm text-slate-500 px-2 py-1">
                                    {{ dropdownPageIndex + 1 }} / {{ totalDropdownPages }}
                                </span>
                                <button :disabled="dropdownPageIndex >= totalDropdownPages - 1"
                                    :class="{ 'text-slate-300': dropdownPageIndex >= totalDropdownPages - 1 }"
                                    @click="nextDropdownPage"
                                    class="px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                    下一页 →
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                            <button v-for="n, i of dropdownCandidates" :key="i" @click="onClickCandidate(n)"
                                class="inline-flex flex-col items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 min-w-0">
                                <!-- 词条 -->
                                <div class="text-slate-900 dark:text-slate-200 font-medium text-lg leading-tight">{{
                                    n.name }}</div>
                                <!-- 编码 -->
                                <div class="text-xs text-blue-400 dark:text-blue-500 mt-1 truncate max-w-full">{{ n.key
                                    }}</div>
                            </button>
                        </div>
                    </div>
                </template>
            </template>
        </Keyboard>
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