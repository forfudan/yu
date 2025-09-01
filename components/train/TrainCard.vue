<!--
  TrainCard.vue - 訓練卡片組件
  
  Modification History:
  - 2025-08-14 by 朱宇浩: 增加參數 ming，允許日月字根訓練對五個一碼上屏字增加兼容輸入
  - 2025-08-14 by 朱宇浩: 編碼提示區分大小寫
  - 2025-08-14 by 朱宇浩: 允許用戶在訓練完之後選擇再來一輪
  - 2025-08-14 by 朱宇浩: 在練習單字時顯示字根圖解
  - 2024-03-27 by 朱宇浩: 增加參數 supplement，判斷是否需要回頭碼
  - 2024-03-27 by yb6b: 製作字根和單字練習的組件
-->

<script setup lang="ts">
import { shallowRef, watch, onMounted } from "vue";
import { Schedule } from "./schedule";
import { Card, ChaifenMap, find8relativeChars } from "./share";
import MultiChaifen from "../chaifen/MultiChaifen.vue";

const p = defineProps<{
    /** 复习卡片的数据 */
    cards: Card[]
    /** 复习卡片的名字 */
    name: string
    /** 拆分数据 */
    chaifenMap: ChaifenMap,
    /** 训练模式：字根、单字练习 */
    mode: 'g' | 'z'
    supplement: boolean
    ming: boolean
}>()

let thisSchedule: Schedule<Card>;
const card = shallowRef<Card>({
    name: '',
    key: '',
})
const progress = shallowRef(0)
const isFirstLearn = shallowRef(true)
const isCorrect = shallowRef(true)
const isCompleted = shallowRef(false)
const userKeys = shallowRef('')

onMounted(() => {
    /** 生成复习计划时，需要读取localStorage，所以要放到onMounted里执行 */
    thisSchedule = new Schedule(p.cards, p.name)
    const first = thisSchedule.first()
    card.value = first.item
    isFirstLearn.value = first.isFirst
    progress.value = thisSchedule.progress
    const element = document.getElementById('input_el')
    element?.focus()
})

watch(userKeys, (newKeys) => {
    // Alternative solutions for ming mode
    const mingAlternatives: Record<string, string> = {
        '的': 'e',
        '是': 'i',
        '我': 'o',
        '不': 'u',
        '了': 'a'
    }

    // Check if we should trigger checkNextItem
    const shouldCheck = newKeys.length >= card.value.key.length ||
        (p.ming && mingAlternatives[card.value.name] && newKeys.toLowerCase() === mingAlternatives[card.value.name])

    if (!shouldCheck) return

    // 检查回答
    checkNextItem(newKeys)
    userKeys.value = ''
})

function checkNextItem(answer: string) {
    const answerLowercase = answer.toLowerCase()
    const keyLowercase = card.value.key.toLowerCase()

    // Alternative solutions for ming mode
    const mingAlternatives: Record<string, string> = {
        '的': 'e',
        '是': 'i',
        '我': 'o',
        '不': 'u',
        '了': 'a'
    }

    let isCorrectAnswer = answerLowercase === keyLowercase

    // Check for alternative solutions when ming is true
    if (!isCorrectAnswer && p.ming && mingAlternatives[card.value.name]) {
        isCorrectAnswer = answerLowercase === mingAlternatives[card.value.name]
    }

    let next: { item: Card; isFirst: boolean };
    if (isCorrectAnswer) {
        next = thisSchedule.nextSuccess();
        isCorrect.value = true
    } else {
        next = thisSchedule.nextFail();
        isCorrect.value = false
    }

    // Check if training is completed
    if (progress.value >= p.cards.length) {
        isCompleted.value = true
        return
    }

    card.value = next.item
    isFirstLearn.value = next.isFirst
    progress.value = thisSchedule.progress
}

function restartTraining() {
    thisSchedule = new Schedule(p.cards, p.name)
    const first = thisSchedule.first()
    card.value = first.item
    isFirstLearn.value = first.isFirst
    progress.value = thisSchedule.progress
    isCompleted.value = false
    const element = document.getElementById('input_el')
    element?.focus()
}
</script>

<template>
    <!-- Training completed screen -->
    <div v-if="isCompleted" class="text-center py-16">
        <div class="mb-8">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-4xl font-bold mb-2">恭喜你完成練習！</h2>
            <p class="text-xl text-gray-600 mb-8">你已经完成了 {{ cards.length }} 個項目的練習。感謝你的努力和堅持，爲中華文明和漢字的傳承又增添了一份力量！</p>
        </div>

        <div class="space-y-4">
            <button @click="restartTraining" class="btn btn-primary btn-lg px-8">
                想要再訓練一輪嗎？
            </button>
            <div class="text-sm text-gray-500">
                繼續練習以巩固記憶
            </div>
        </div>
    </div>

    <!-- Training in progress screen -->
    <div v-else>
        <div
            :class="['md:w-2/3 w-full shadow-sm my-12 pb-24 bg-opacity-10  rounded-md', { 'bg-red-700': !isCorrect, 'bg-slate-500': isCorrect }]">
            <div class="flex justify-center mb-24">
                <progress class="progress w-full" :value="progress" :max="cards.length" />
            </div>
            <div class="flex justify-around mb-8">
                <div :class="['text-6xl ', { 'text-red-400': !isCorrect }]">{{ card.name }}</div>
                <div class="flex tracking-widest flex-col opacity-70" v-if="mode === 'z'">
                    <MultiChaifen :chars="card.name" :size="100" :key="card.name" loc="" />
                </div>
                <div class="flex tracking-widest flex-col opacity-70" v-if="mode === 'g' && chaifenMap">

                    <div class="text-gray-500 text-sm">
                        相关的字：
                    </div>

                    <div class="font-bold text-xl">
                        {{ find8relativeChars(card.name, chaifenMap) }}
                    </div>
                </div>

            </div>

            <div class="flex justify-center p-5">
                <input id="input_el" type="text" placeholder="輸入編碼" v-model="userKeys"
                    :class="['input w-half max-w-xs input-bordered text-center input-sm dark:bg-slate-800 bg-white', { 'input-error': !isCorrect }]" />
            </div>

            <div :class="['text-center', { 'opacity-0': !isFirstLearn }]">答案是 <b class="font-mono">{{ card.key }}</b>
                <span v-if="mode === 'z'">（{{ chaifenMap?.get(card.name)?.division }}）</span>
                <div v-if="p.ming && ['的', '是', '我', '不', '了'].includes(card.name)" class="text-sm text-gray-500 mt-1">
                    也可直接使用韻碼 <b class="font-mono text-blue-600">{{
                        card.name === '的' ? 'E' :
                            card.name === '是' ? 'I' :
                                card.name === '我' ? 'O' :
                                    card.name === '不' ? 'U' :
                                        card.name === '了' ? 'A' : ''
                    }}</b> 直接上屏
                </div>
            </div>

        </div>

        <div class="text-gray-500 pb-16">訓練進度：{{ progress }} / {{ cards.length }}</div>
    </div>
</template>