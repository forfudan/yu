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
}>()

let thisSchedule: Schedule<Card>;
const card = shallowRef<Card>({
    name: '',
    key: '',
})
const progress = shallowRef(0)
const isFirstLearn = shallowRef(true)
const isCorrect = shallowRef(true)
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
    // 多个编码没有打完就不提示错误
    if (newKeys.length < card.value.key.length)
        return
    // 检查回答
    checkNextItem(newKeys)
    userKeys.value = ''
})

function checkNextItem(answer: string) {
    const answerLowercase = answer.toLowerCase()
    let next: { item: Card; isFirst: boolean };
    if (answerLowercase === card.value.key) {
        next = thisSchedule.nextSuccess();
        isCorrect.value = true
    } else {
        next = thisSchedule.nextFail();
        isCorrect.value = false
    }
    card.value = next.item
    isFirstLearn.value = next.isFirst
    progress.value = thisSchedule.progress
}
</script>

<template>
    <div
        :class="['md:w-2/3 w-full shadow-sm my-12 pb-24 bg-opacity-10  rounded-md', { 'bg-red-700': !isCorrect, 'bg-slate-500': isCorrect }]">
        <div class="flex justify-center mb-24">
            <progress class="progress w-full" :value="progress" :max="cards.length" />
        </div>
        <div class="flex justify-around mb-8">
            <div :class="['text-6xl ', { 'text-red-400': !isCorrect }]">{{ card.name }}</div>
            <div class="flex tracking-widest flex-col opacity-70" v-if="mode === 'z'">
                <MultiChaifen :chars="card.name" :size="100" :key="card.name" />
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
            <input id="input_el" type="text" placeholder="输入编码" v-model="userKeys"
                :class="['input w-half max-w-xs input-bordered text-center input-sm dark:bg-slate-800 bg-white', { 'input-error': !isCorrect }]" />
        </div>

        <div :class="['text-center', { 'opacity-0': !isFirstLearn }]">答案是 <b class="font-mono">{{ card.key }}</b>
            <span v-if="mode === 'z'">（{{ chaifenMap?.get(card.name)?.division }}）</span>
        </div>

    </div>

    <div class="text-gray-500 pb-16">训练进度：{{ progress }} / {{ cards.length }}</div>
</template>