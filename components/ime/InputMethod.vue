<!--
    InputMethod.vue - 在線輸入法核心組件

    Modification History:
    - 2025-08-15 by 朱複丹: 重構版本，優化輸入法引擎和用戶體驗
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

//#region 候选条
const candidateCodes = ref('')

const candidateHanzi = computed(() => {
    const cd = candidateCodes.value
    // 没有输入编码
    if (!cd) return [];

    const range = biSearchBetween(mabiaoList, cd)

    // 空码
    if (!range) return [];

    return mabiaoList.slice(range[0], range[1])
})

const candidatePageIndex = ref(0)

const disablePreviousPageBtn = computed(() => candidatePageIndex.value < 1)
const disableNextPageBtn = computed(() => {
    const pageSize = candidateExpanded.value ? 36 : maxVisibleCandidates.value
    return candidatePageIndex.value >= Math.ceil(candidateHanzi.value.length / pageSize) - 1
})

// 候选字展开状态
const candidateExpanded = ref(false)
const candidateContainer = ref<HTMLElement>()
const maxVisibleCandidates = ref(5) // 动态调整的候选字数量

// 虚拟滚动相关
const dropdownPageSize = 24 // 下拉面板每页显示的候选字数量
const dropdownPageIndex = ref(0)

// 动态调整候选字显示数量
const candidatePage = computed(() => {
    if (candidateHanzi.value.length === 0) return [];
    const cpi = candidatePageIndex.value
    const maxCount = maxVisibleCandidates.value
    return candidateHanzi.value.slice(cpi * maxCount, (cpi + 1) * maxCount)
})

// 下拉面板渲染的候选字（分页显示）
const dropdownCandidates = computed(() => {
    if (candidateHanzi.value.length <= maxVisibleCandidates.value) return [];
    const startIndex = dropdownPageIndex.value * dropdownPageSize
    const endIndex = Math.min(startIndex + dropdownPageSize, candidateHanzi.value.length)
    return candidateHanzi.value.slice(startIndex, endIndex)
})

// 计算总页数
const totalDropdownPages = computed(() => {
    if (candidateHanzi.value.length <= maxVisibleCandidates.value) return 0
    return Math.ceil(candidateHanzi.value.length / dropdownPageSize)
})

const hasMoreCandidates = computed(() => candidateHanzi.value.length > maxVisibleCandidates.value)

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
    nextTick(() => {
        if (!candidateContainer.value) return

        const containerWidth = candidateContainer.value.offsetWidth - 100 // 预留按钮空间
        const averageCandidateWidth = 80 // 估算每个候选字按钮的平均宽度
        const maxCount = Math.max(3, Math.min(9, Math.floor(containerWidth / averageCandidateWidth)))

        maxVisibleCandidates.value = maxCount
    })
}
//#endregion


//#region 网页中 软键盘和文本框的交互
const text = ref('')
const textarea = ref<HTMLInputElement>()

function onClick(key: string) {
    if (key === 'bs') {
        if (candidateCodes.value)
            candidateCodes.value = candidateCodes.value.slice(0, -1)
        else
            text.value = text.value.slice(0, -1)
        return
    }
    candidateCodes.value += key
    candidatePageIndex.value = 0
}

function commit(words: string) {
    const textareaNode = textarea.value!
    const { selectionStart, selectionEnd } = textareaNode
    if (selectionStart === 0 && selectionEnd === 0) {
        text.value += words
        nextTick(() => {
            textareaNode.selectionEnd = text.value.length
        })
        return
    }
    const startPart = text.value.slice(0, selectionStart || undefined)
    const endPart = selectionEnd !== null ? text.value.slice(selectionEnd) : ''
    text.value = startPart + words + endPart
    nextTick(() => {
        textareaNode.selectionEnd = selectionStart! + words.length
    })
}

function onClickCandidate(card: MabiaoItem) {
    commit(card.name)
    // textarea.value?.focus()
    candidatePageIndex.value = 0
    candidateCodes.value = ''
}
//#endregion

// 监听候选字变化，动态调整显示数量
watch(candidateHanzi, () => {
    candidatePageIndex.value = 0 // 候选字变化时重置页面索引
    dropdownPageIndex.value = 0 // 重置下拉页面索引
    adjustCandidateCount()
}, { immediate: true })

// 监听候选编码变化，重置展开状态
watch(candidateCodes, () => {
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
    // 顶屏
    const popLen = props.rule.pop
    const codeLen = props.rule.len

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
        // 定长
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

//#region 电脑键盘事件
const keysListened = new Set(`abcdefghijklmnopqrstuvwxyz${props.rule.keys === 27 ? ';' : ''}`)

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

    const cd = candidateCodes.value
    // 输入按键
    if (keysListened.has(key)) {
        e.preventDefault()
        candidateCodes.value += key
        candidatePageIndex.value = 0
        return
    }

    // 上屏键
    if (commitKeys.value.has(key)) {
        const candidateIndex = commitKeys.value.get(key)!
        if (candidateIndex < candidatePage.value.length) {
            e.preventDefault()
            commit(candidatePage.value[candidateIndex].name)
            candidateCodes.value = ''
            candidatePageIndex.value = 0
        }
        return
    }

    // 删除键
    if (key === 'Backspace' && cd) {
        e.preventDefault()
        candidateCodes.value = cd.slice(0, -1)
        return
    }

    // 清除键
    if (key === 'Escape' && cd) {
        e.preventDefault()
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
        if (cpi > 0)
            candidatePageIndex.value--
        return
    }
    if (key === '=' && cd) {
        e.preventDefault()
        const pageSize = candidateExpanded.value ? 36 : maxVisibleCandidates.value
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
            class="textarea textarea-bordered textarea-md w-full max-w-screen-sm bg-neutral-50 dark:bg-neutral-700"
            style="border-style: solid" placeholder="点击这里开始输入" @keydown="onKeydown"></textarea>
    </div>

    <div class="relative">
        <Keyboard :layout="26" @click="onClick">
            <template #codes>
                <div class="h-4" v-if="candidateCodes === ''"></div>
                <div v-else class="text-xs bg-neutral-200 dark:bg-neutral-900 w-max px-2 h-4 select-none">
                    {{ candidateCodes }}
                </div>
            </template>
            <template #cadidate>
                <template v-if="candidateHanzi.length === 0">
                    <div class="text-sm text-slate-500 ml-6 mt-1" v-if="candidateCodes.length === 0">
                        <slot>
                            <!-- 没有输入时默认显示的内容 -->
                            点击上方文本框开始打字
                        </slot>
                    </div>
                    <div class="text-sm text-slate-400 dark:text-slate-500 ml-6 mt-1" v-else>空码</div>
                </template>
                <template v-else>
                    <!-- 正常候选字显示 -->
                    <div class="relative flex items-center" ref="candidateContainer">
                        <div class="flex-auto overflow-hidden flex">
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