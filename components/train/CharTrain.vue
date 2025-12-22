<!--
  CharTrain.vue - 單字練習組件
  
  Modification History:
  - 2025-12-22 by 朱宇浩: 合併 TrainCard.vue，升級使用 advancedSchedule.ts
  - 2025-08-14 by 朱宇浩: 增加參數 ming，允許日月字根訓練對五個一碼上屏字增加兼容輸入
  - 2025-08-14 by 朱宇浩: 編碼提示區分大小寫
  - 2025-08-14 by 朱宇浩: 允許用戶在訓練完之後選擇再來一輪
  - 2025-08-14 by 朱宇浩: 在練習單字時顯示字根圖解
  - 2024-03-27 by 朱宇浩: 增加參數 supplement，判斷是否需要回頭碼
  - 2024-03-27 by yb6b: 製作字根和單字練習的組件
-->

<script setup lang="ts">
/** 单字练习 */
import { shallowRef, onMounted, ref, watch, nextTick, computed, onBeforeUnmount } from "vue";
import { Card, cache, fetchChaifenOptimized, fetchZigen, makeCodesFromDivision, ChaifenMap, find8relativeChars } from "./share";
import { AdvancedSchedule } from "./advancedSchedule";
import MultiChaifen from "../chaifen/MultiChaifen.vue";

const p = defineProps<{
  /** 方案的名字 */
  name: string,
  /** 拆分的csv文件URL */
  chaifenUrl: string
  /** 字根映射的csv文件URL */
  zigenUrl: string
  /** 练习的范围，从第几条到第几条，不填则是全部 */
  range?: [start: number, end: number]
  rule: string
}>()

let cardsName = p.name + '_char'
const range = p.range
if (range) {
  cardsName += `_${range[0]}_${range[1]}`
}

const cards = shallowRef<Card[]>(cache[cardsName] as Card[])
const chaifenMap = shallowRef<ChaifenMap>()

// 使用新版調度算法
let thisSchedule: AdvancedSchedule;
const card = shallowRef<Card>({
  name: '',
  key: '',
})
const progress = shallowRef(0)
const isFirstLearn = shallowRef(true)
const isCorrect = shallowRef(true)
const isCompleted = shallowRef(false)
const userKeys = shallowRef('')
const forceUpdate = ref(0)

// 響應式窗口大小
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(async () => {
  if (cards.value && chaifenMap.value) {
    // 初始化調度系統
    thisSchedule = new AdvancedSchedule(cardsName)
    thisSchedule.initializeWithGroupCount(cards.value.length)
    const nextIndex = thisSchedule.getNextIndex()
    if (nextIndex !== null) {
      card.value = cards.value[nextIndex]
      isFirstLearn.value = thisSchedule.isFirstTime(nextIndex)
      const stats = thisSchedule.getProgressStats()
      progress.value = stats.practiced
    }
    const element = document.getElementById('input_el')
    element?.focus()
    return;
  }

  // 使用优化的JSON格式读取拆分数据
  chaifenMap.value = await fetchChaifenOptimized(p.chaifenUrl)
  const zigenMap = await fetchZigen(p.zigenUrl)

  let chaifenValues = [...chaifenMap.value.values()]

  if (range) {
    chaifenValues = chaifenValues.slice(range[0], range[1])
  }

  cards.value = chaifenValues.map(cf => ({
    name: cf.char,
    key: makeCodesFromDivision(cf.division, zigenMap, p.rule)
  }))

  cache[cardsName] = cards.value

  /** 生成复习计划时，需要读取localStorage，所以要放到onMounted里执行 */
  thisSchedule = new AdvancedSchedule(cardsName)
  thisSchedule.initializeWithGroupCount(cards.value.length)
  const nextIndex = thisSchedule.getNextIndex()
  if (nextIndex !== null) {
    card.value = cards.value[nextIndex]
    isFirstLearn.value = thisSchedule.isFirstTime(nextIndex)
    const stats = thisSchedule.getProgressStats()
    progress.value = stats.practiced
  }
  const element = document.getElementById('input_el')
  element?.focus()

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});

// 計算進度
const practiceProgress = computed(() => {
  forceUpdate.value;
  const stats = thisSchedule?.getProgressStats() || { practiced: 0, total: cards.value?.length || 0, mastered: 0, percentage: 0 };
  return {
    current: stats.practiced,
    total: stats.total,
    mastered: stats.mastered,
    percentage: stats.percentage.toFixed(1)
  };
});

watch(userKeys, (newKeys) => {
  if (!card.value) return;

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
    ((p.rule === 'ming' || p.rule === 'ling') && mingAlternatives[card.value.name] && newKeys.toLowerCase() === mingAlternatives[card.value.name])

  if (!shouldCheck) return

  // 检查回答
  checkNextItem(newKeys)
  userKeys.value = ''
})

function checkNextItem(answer: string) {
  if (!card.value || !cards.value) return;

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

  // Check for alternative solutions when ming or ling is true
  if (!isCorrectAnswer && (p.rule === 'ming' || p.rule === 'ling') && mingAlternatives[card.value.name]) {
    isCorrectAnswer = answerLowercase === mingAlternatives[card.value.name]
  }

  // 找到當前卡片在數組中的索引
  const currentIndex = cards.value.findIndex(c => c.name === card.value.name && c.key === card.value.key)

  if (currentIndex === -1) {
    console.error('找不到當前卡片索引')
    return
  }

  if (isCorrectAnswer) {
    thisSchedule.recordSuccess(currentIndex);
    isCorrect.value = true
  } else {
    thisSchedule.recordFailure(currentIndex);
    isCorrect.value = false
  }

  // 觸發進度更新
  forceUpdate.value++
  const stats = thisSchedule.getProgressStats()
  progress.value = stats.practiced

  // Check if training is completed
  if (thisSchedule.isCompleted()) {
    isCompleted.value = true
    return
  }

  // 獲取下一個需要練習的卡片
  const nextIndex = thisSchedule.getNextIndex()
  if (nextIndex !== null) {
    card.value = cards.value[nextIndex]
    isFirstLearn.value = thisSchedule.isFirstTime(nextIndex)
  }
}

function restartTraining() {
  if (!cards.value) return;

  thisSchedule.reset()
  thisSchedule.initializeWithGroupCount(cards.value.length)
  const nextIndex = thisSchedule.getNextIndex()
  if (nextIndex !== null) {
    card.value = cards.value[nextIndex]
    isFirstLearn.value = thisSchedule.isFirstTime(nextIndex)
    const stats = thisSchedule.getProgressStats()
    progress.value = stats.practiced
  }
  isCompleted.value = false
  forceUpdate.value++
  const element = document.getElementById('input_el')
  element?.focus()
}
</script>

<template>
  <!-- 數據加載中 -->
  <h2 class="text-gray-700 dark:text-gray-300 text-center" v-if="!cards || !chaifenMap">
    下载数据中……
  </h2>

  <!-- Training completed screen -->
  <div v-else-if="isCompleted" class="text-center py-16">
    <div class="mb-8">
      <div class="text-6xl mb-4">🎉</div>
      <h2 class="text-4xl font-bold mb-2">恭喜你完成練習！</h2>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">你已经完成了 {{ cards.length }}
        個項目的練習。感謝你的努力和堅持，爲中華文明和漢字的傳承又增添了一份力量！</p>
    </div>

    <div class="space-y-4">
      <button @click="restartTraining" class="btn btn-primary btn-lg px-8">
        想要再訓練一輪嗎？
      </button>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        繼續練習以巩固記憶
      </div>
    </div>
  </div>

  <!-- Training in progress screen -->
  <div v-else>
    <div
      :class="['md:w-2/3 w-full shadow-sm my-12 pb-24 bg-opacity-10 rounded-md', { 'bg-red-700': !isCorrect, 'bg-slate-500': isCorrect }]">
      <div class="flex justify-center mb-24">
        <progress class="progress w-full" :value="practiceProgress.current" :max="practiceProgress.total" />
      </div>
      <div class="flex justify-around mb-8">
        <div :class="['text-6xl ', { 'text-red-400': !isCorrect }]">{{ card.name }}</div>
        <div class="flex tracking-widest flex-col opacity-70">
          <MultiChaifen :chars="card.name" :size="100" :key="card.name" loc="" />
        </div>
      </div>

      <div class="flex justify-center p-5">
        <input id="input_el" type="text" placeholder="輸入編碼" v-model="userKeys"
          :class="['input w-half max-w-xs input-bordered text-center input-sm dark:bg-slate-800 bg-white', { 'input-error': !isCorrect }]" />
      </div>

      <div :class="['text-center', { 'opacity-0': !isFirstLearn }]">答案是 <b class="font-mono">{{ card.key }}</b>
        <span v-if="chaifenMap">（{{ chaifenMap.get(card.name)?.division }}）</span>
        <div v-if="(p.rule === 'ming' || p.rule === 'ling') && ['的', '是', '我', '不', '了'].includes(card.name)"
          class="text-sm text-gray-500 dark:text-gray-400 mt-1">
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

    <div class="text-gray-500 dark:text-gray-400 pb-16">訓練進度：{{ practiceProgress.current }} / {{ practiceProgress.total
      }} ({{ practiceProgress.percentage }}%) | 已掌握：{{ practiceProgress.mastered }}</div>
  </div>
</template>