<!--
  LingCard.vue - 靈明反查卡片

  把字根編碼到單字編碼的對應關係直接畫出來：取用的字母拉一根箭頭到它佔的碼位，
  沒取用的字根和字母留在原地變灰。卡片上不寫規則，字母的大碼/聲碼/韻碼掛在 tooltip 裏。

  Modification History:
  - 2026-08-28: 初版。僅用於靈明，其餘方案仍走 Card.vue
-->

<script setup lang="ts">
//@ts-nocheck
import ZitongLogo from "./assets/zitong.svg";
import CtextLogo from "./assets/ctext.png";
import HandianLogo from "./assets/handian.png";
import CaptureLogo from "./assets/capture.svg";
import { computed, ref, shallowRef, nextTick, onMounted, onBeforeUnmount, watch } from "vue";
import { Chaifen, ZigenMap, MaPart, traceLingCode } from "./share";
import html2canvas from "html2canvas-pro";

const p = defineProps<{
    chaifen: Chaifen,
    zigenMap: ZigenMap,
}>()

const cardRef = ref<HTMLElement | null>(null)
const diagramRef = ref<HTMLElement | null>(null)
const showLogoArea = ref(true)
const isCapturing = ref(false)
const shrinkCard = ref(false) // 用於臨時收縮卡片

const uriText = computed(() => encodeURIComponent(p.chaifen.char))
const unicode = computed(() => p.chaifen.char.codePointAt(0).toString(16).toUpperCase())

const trace = computed(() => traceLingCode(p.chaifen.division, p.zigenMap))
const trace_tw = computed(() =>
    p.chaifen.division_tw ? traceLingCode(p.chaifen.division_tw, p.zigenMap) : null)

/** 字母在字根編碼裏的位置 → 它是大碼、聲碼還是韻碼 */
function letterPart(ma: string, j: number): MaPart {
    if (j === 0) return 'da'
    if (j === ma.length - 1) return 'yun'
    return 'sheng'
}

/** 反過來：某一部分在字根編碼裏排第幾個字母 */
function partIndex(ma: string, part: MaPart) {
    if (part === 'da') return 0
    if (part === 'yun') return Math.max(ma.length - 1, 0)
    return 1
}

const PART_NAME: Record<MaPart, string> = { da: '大碼', sheng: '聲碼', yun: '韻碼' }

/** 每個字根拆成一列，字母逐個成格，好讓箭頭有落點 */
const columns = computed(() => trace.value.roots.map((root, i) => ({
    char: root.char,
    used: trace.value.slots.some(s => s.rootIndex === i),
    letters: [...(root.ma || '?')].map((ch, j) => ({
        // 字根編碼首字母大寫，同舊卡片
        text: j === 0 ? ch.toUpperCase() : ch,
        part: letterPart(root.ma, j),
        used: trace.value.slots.some(
            s => s.rootIndex === i && partIndex(root.ma, s.part) === j),
    })),
})))

/** 碼位 k 的來源字母，鍵名同 letterKey */
const slotSources = computed(() => trace.value.slots.map(
    s => `${s.rootIndex}-${partIndex(trace.value.roots[s.rootIndex].ma, s.part)}`))

const letterKey = (i: number, j: number) => `${i}-${j}`

// ---- 箭頭 ----------------------------------------------------------------
// 端點靠實測，因為字根用的是襯線 CJK 字體，字母寬度要等字體加載完才定得下來。

const letterEls: Record<string, HTMLElement> = {}
const slotEls: Record<number, HTMLElement> = {}
const arrows = shallowRef<{ d: string, head: string }[]>([])
const boxSize = shallowRef({ w: 0, h: 0 })

function setLetterEl(i: number, j: number, el: HTMLElement | null) {
    if (el) letterEls[letterKey(i, j)] = el
}
function setSlotEl(k: number, el: HTMLElement | null) {
    if (el) slotEls[k] = el
}

function measure() {
    const diagram = diagramRef.value
    if (!diagram) return
    const box = diagram.getBoundingClientRect()
    if (!box.width) return
    boxSize.value = { w: box.width, h: box.height }

    arrows.value = trace.value.slots.map((_, k) => {
        const from = letterEls[slotSources.value[k]]
        const to = slotEls[k]
        if (!from || !to) return null
        const f = from.getBoundingClientRect()
        const t = to.getBoundingClientRect()
        const x1 = f.left + f.width / 2 - box.left
        const y1 = f.bottom - box.top + 5
        const x2 = t.left + t.width / 2 - box.left
        const y2 = t.top - box.top - 7
        const dy = y2 - y1
        return {
            d: `M ${x1} ${y1} C ${x1} ${y1 + dy * 0.55}, ${x2} ${y2 - dy * 0.55}, ${x2} ${y2}`,
            // 曲線末端是垂直的，箭頭直接朝下畫即可
            head: `M ${x2 - 3.6} ${y2 - 4.4} L ${x2} ${y2 + 1} L ${x2 + 3.6} ${y2 - 4.4}`,
        }
    }).filter(Boolean)
}

async function remeasure() {
    await nextTick()
    measure()
}

let observer: ResizeObserver | null = null

onMounted(async () => {
    await remeasure()
    // 襯線 CJK 字體一加載，字母就會挪位，得再量一次
    document.fonts?.ready.then(remeasure)
    if (typeof ResizeObserver !== 'undefined' && diagramRef.value) {
        observer = new ResizeObserver(() => measure())
        observer.observe(diagramRef.value)
    }
})

onBeforeUnmount(() => observer?.disconnect())

watch(trace, remeasure)

// ---- 懸停時把一個碼位和它的來源字母串起來 ----------------------------------

const activeSlot = ref<number | null>(null)

function activateLetter(i: number, j: number) {
    const k = slotSources.value.indexOf(letterKey(i, j))
    activeSlot.value = k === -1 ? null : k
}

const activeLetterKey = computed(() =>
    activeSlot.value === null ? null : slotSources.value[activeSlot.value])

// ---- 截圖 ---------------------------------------------------------------
// 同 Card.vue：拍照並複製到剪貼板，失敗時下載圖片

async function captureCard() {
    if (!cardRef.value || isCapturing.value) return

    isCapturing.value = true
    activeSlot.value = null

    // 隱藏logo區域並收縮卡片
    showLogoArea.value = false
    shrinkCard.value = true

    // 等待 Vue 的 DOM 更新完成
    await nextTick()

    // 額外等待瀏覽器重排
    await new Promise(resolve => setTimeout(resolve, 100))
    measure()

    try {
        const canvas = await html2canvas(cardRef.value, {
            backgroundColor: null,
            scale: 2, // 提高清晰度
            logging: false,
        })

        canvas.toBlob(async (blob) => {
            if (!blob) {
                alert('生成圖片失敗')
                return
            }

            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ])
                console.log('卡片已複製到剪貼板')
            } catch (err) {
                console.error('複製到剪貼板失敗，改為下載:', err)

                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${p.chaifen.char}_${unicode.value}.png`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)

                console.log('圖片已下載')
            }
        }, 'image/png')

    } catch (err) {
        console.error('截圖失敗:', err)
        alert('截圖失敗')
    } finally {
        showLogoArea.value = true
        shrinkCard.value = false
        isCapturing.value = false
        await remeasure()
    }
}
</script>

<template>
    <div ref="cardRef"
        class="ling-card group m-2 rounded-3xl border border-gray-200 dark:border-slate-700/70 bg-gray-50 dark:bg-slate-900 px-5 pt-4 pb-3 text-center shadow-sm transition-shadow hover:shadow-md"
        :class="{ 'self-start': shrinkCard }">

        <!-- 字頭 -->
        <div class="text-4xl leading-none text-indigo-800 dark:text-indigo-300" v-if="!trace_tw">
            <span class="zigen-font">{{ chaifen.char }}</span>
        </div>
        <div class="text-4xl leading-none text-indigo-800 dark:text-indigo-300" v-else>
            <span class="zigen-font tooltip" data-tip="首選字形標準">{{ chaifen.char }}</span>
            <span class="zigen-font-tc tooltip" data-tip="臺灣字形標準">·{{ chaifen.char }}</span>
        </div>
        <div class="font-mono text-xs opacity-60 mt-1.5">{{ unicode }}・{{ chaifen.region }}</div>

        <!-- 字根 → 箭頭 → 碼位 -->
        <div ref="diagramRef" class="diagram relative mt-4">
            <div class="flex justify-center items-start gap-1">
                <div v-for="(col, i) in columns" :key="i"
                    class="root-col flex flex-col items-center min-w-[3.35rem]"
                    :class="{ 'is-idle': !col.used }">
                    <span class="zigen-font text-2xl leading-none text-indigo-800 dark:text-indigo-300">{{ col.char
                        }}</span>
                    <span class="mt-1.5 flex font-mono text-sm leading-none">
                        <span v-for="(letter, j) in col.letters" :key="j"
                            :ref="el => setLetterEl(i, j, el)"
                            class="letter tooltip cursor-default px-[0.06rem]"
                            :class="{
                                'is-idle': !letter.used,
                                'is-active': activeLetterKey === `${i}-${j}`,
                            }"
                            :data-tip="PART_NAME[letter.part] + (letter.used ? '' : '・未取用')"
                            @mouseenter="activateLetter(i, j)" @mouseleave="activeSlot = null">{{ letter.text }}</span>
                    </span>
                </div>
            </div>

            <!-- 箭頭層。實測坐標，蓋在字根和碼位之間，不吃鼠標 -->
            <svg v-if="arrows.length" class="arrow-layer" :viewBox="`0 0 ${boxSize.w} ${boxSize.h}`"
                :width="boxSize.w" :height="boxSize.h" fill="none" aria-hidden="true">
                <g v-for="(arrow, k) in arrows" :key="k" :class="{ 'is-active': activeSlot === k }">
                    <path :d="arrow.d" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                    <path :d="arrow.head" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"
                        stroke-linejoin="round" />
                </g>
            </svg>

            <!-- 碼位 -->
            <div class="mt-14 flex justify-center gap-1.5">
                <span v-for="(slot, k) in trace.slots" :key="k" :ref="el => setSlotEl(k, el)"
                    class="slot grid h-9 w-9 place-items-center rounded-xl font-mono text-lg leading-none cursor-default"
                    :class="{ 'is-active': activeSlot === k }" @mouseenter="activeSlot = k"
                    @mouseleave="activeSlot = null">{{ slot.letter }}</span>
            </div>
        </div>

        <!-- 臺灣字形補一行，不再畫第二張圖 -->
        <div v-if="trace_tw" class="mt-3 flex items-center justify-center gap-2 text-xs opacity-70">
            <span>臺灣字形</span>
            <span class="zigen-font-tc text-base leading-none text-indigo-800 dark:text-indigo-300">{{
                chaifen.division_tw }}</span>
            <span class="font-mono tracking-wide">{{ trace_tw.code }}</span>
        </div>

        <div v-if="showLogoArea"
            class="mt-2 invisible group-hover:visible flex justify-center items-center dark:opacity-55 opacity-100">
            <a :href="'https://zi.tools/zi/' + uriText" class="" target="_blank" rel="noreferrer" title="字統網查詢">
                <img :src=ZitongLogo alt="字統網" width="22" />
            </a>
            <a :href="'https://www.zdic.net/hans/' + uriText" class="" target="_blank" rel="noreferrer" title="漢典查詢">
                <img :src="HandianLogo" alt="漢典網" width="22" />
            </a>
            <a :href="'https://ctext.org/dictionary.pl?if=gb&char=' + uriText" class="" target="_blank"
                rel="noreferrer" title="中國哲學書電子化計劃查詢">
                <img :src="CtextLogo" alt="中國哲學書電子化計劃" width="22" />
            </a>
            <button @click="captureCard" class="cursor-pointer ml-1" :disabled="isCapturing" title="複製卡片為圖片">
                <img :src="CaptureLogo" alt="複製" width="22" class="dark:invert" />
            </button>
        </div>
    </div>
</template>

<style scoped>
/* 沒取用的字根和字母留在原地變灰，位置不動，一眼看得出哪些被跳過了 */
.root-col.is-idle,
.letter.is-idle {
    opacity: 0.34;
}

.dark .root-col.is-idle,
.dark .letter.is-idle {
    opacity: 0.4;
}

.letter {
    transition: color 0.15s, opacity 0.15s;
}

.letter.is-active {
    opacity: 1;
    color: rgb(67 56 202);
    /* indigo-700 */
    font-weight: 600;
}

.dark .letter.is-active {
    color: rgb(165 180 252);
    /* indigo-300 */
}

.arrow-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    color: rgb(129 140 248);
    /* indigo-400 */
}

.dark .arrow-layer {
    color: rgb(99 102 241);
    /* indigo-500 */
}

.arrow-layer g {
    transition: opacity 0.15s;
}

.arrow-layer g.is-active {
    color: rgb(79 70 229);
    /* indigo-600 */
}

.dark .arrow-layer g.is-active {
    color: rgb(165 180 252);
    /* indigo-300 */
}

.slot {
    background: rgb(79 70 229);
    /* indigo-600 */
    color: #fff;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
    transition: transform 0.15s, box-shadow 0.15s;
}

.dark .slot {
    background: rgb(99 102 241);
    /* indigo-500 */
}

.slot.is-active {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgb(79 70 229 / 0.35);
}
</style>
