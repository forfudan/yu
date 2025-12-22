<!--
  CharTrain.vue - 單字練習組件
  
  Modification History:
  - 2025-12-22 by 朱宇浩: 合併 TrainCard.vue，升級使用 advancedSchedule.ts，現代化UI設計
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
import { Card, cache, fetchChaifenOptimized, fetchZigen, makeCodesFromDivision, ChaifenMap } from "./share";
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
const zigenMap = shallowRef<Map<string, { font: string; ma: string; pinyin?: string }>>()

// 使用新版調度算法
let thisSchedule: AdvancedSchedule;
const card = shallowRef<Card>({
  name: '',
  key: '',
})
const currentIndex = ref(0)
const inputElement = ref<HTMLInputElement>()
const isFirstLearn = shallowRef(true)
const isCorrect = shallowRef(true)
const isCompleted = shallowRef(false)
const userKeys = shallowRef('')
const forceUpdate = ref(0)
const showResetConfirm = ref(false)
const wrongInputCount = ref(0)

// 響應式窗口大小
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

// 計算字符大小類名 - 與 TupaTrain 一致
const charSizeClass = computed(() => {
  const isSmallScreen = windowWidth.value < 768; // sm breakpoint
  const isMediumScreen = windowWidth.value < 1024; // lg breakpoint

  if (isSmallScreen) {
    return 'text-6xl';
  } else if (isMediumScreen) {
    return 'text-8xl';
  } else {
    return 'text-9xl';
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

// 檢測當前字符是否有字根拼音數據
const hasPinyinData = computed(() => {
  if (!card.value || !chaifenMap.value || !zigenMap.value) return false;
  const chaifen = chaifenMap.value.get(card.value.name);
  if (!chaifen || !chaifen.division) return false;

  // 檢查拆分中的字根是否有拼音信息
  const zigens = Array.from(chaifen.division);
  return zigens.some(zigen => {
    const zigenInfo = zigenMap.value?.get(zigen);
    return zigenInfo?.pinyin && zigenInfo.pinyin.trim() !== '' && zigenInfo.pinyin !== 'Ø';
  });
});

// 獲取當前字符的字根拼音列表
const pinyinList = computed(() => {
  if (!hasPinyinData.value || !card.value || !chaifenMap.value || !zigenMap.value) return [];

  const chaifen = chaifenMap.value.get(card.value.name);
  if (!chaifen || !chaifen.division) return [];

  const zigens = Array.from(chaifen.division);
  return zigens
    .map(zigen => {
      const zigenInfo = zigenMap.value?.get(zigen);
      return {
        font: zigen,
        pinyin: zigenInfo?.pinyin || ''
      };
    })
    .filter(item => item.pinyin && item.pinyin.trim() !== '' && item.pinyin !== 'Ø');
});

onMounted(async () => {
  if (cards.value && chaifenMap.value) {
    // 初始化調度系統
    thisSchedule = new AdvancedSchedule(cardsName)
    thisSchedule.initializeWithGroupCount(cards.value.length)
    const nextIdx = thisSchedule.getNextIndex()
    if (nextIdx !== null) {
      currentIndex.value = nextIdx
      card.value = cards.value[nextIdx]
      isFirstLearn.value = thisSchedule.isFirstTime(nextIdx)
    }
    nextTick(() => {
      inputElement.value?.focus()
    })
    return;
  }

  // 使用优化的JSON格式读取拆分数据
  chaifenMap.value = await fetchChaifenOptimized(p.chaifenUrl)
  const fetchedZigenMap = await fetchZigen(p.zigenUrl)
  zigenMap.value = fetchedZigenMap

  let chaifenValues = [...chaifenMap.value.values()]

  if (range) {
    chaifenValues = chaifenValues.slice(range[0], range[1])
  }

  cards.value = chaifenValues.map(cf => ({
    name: cf.char,
    key: makeCodesFromDivision(cf.division, fetchedZigenMap, p.rule)
  }))

  cache[cardsName] = cards.value

  /** 生成复习计划时，需要读取localStorage，所以要放到onMounted里执行 */
  thisSchedule = new AdvancedSchedule(cardsName)
  thisSchedule.initializeWithGroupCount(cards.value.length)
  const nextIdx = thisSchedule.getNextIndex()
  if (nextIdx !== null) {
    currentIndex.value = nextIdx
    card.value = cards.value[nextIdx]
    isFirstLearn.value = thisSchedule.isFirstTime(nextIdx)
  }

  nextTick(() => {
    inputElement.value?.focus()
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }
  document.addEventListener('keydown', handleKeydown);
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
  document.removeEventListener('keydown', handleKeydown);
});

// 監聽輸入，自動處理正確答案或錯誤提示（與 TrainCardGroup 邏輯一致）
watch(userKeys, (newKeys) => {
  if (!card.value) return;

  const input = newKeys.trim().toLowerCase()
  const expectedCode = card.value.key.toLowerCase()

  // Alternative solutions for ming mode
  const mingAlternatives: Record<string, string> = {
    '的': 'e',
    '是': 'i',
    '我': 'o',
    '不': 'u',
    '了': 'a'
  }

  // 檢查輸入長度是否達到預期編碼長度
  const hasAlternative = (p.rule === 'ming' || p.rule === 'ling') && mingAlternatives[card.value.name]
  const shouldCheck = input.length >= expectedCode.length || (hasAlternative && input === mingAlternatives[card.value.name])

  if (!shouldCheck) return

  // 檢查答案是否正確
  const isCorrectAnswer = input === expectedCode || (hasAlternative && input === mingAlternatives[card.value.name])

  if (isCorrectAnswer) {
    // 正確答案，直接進入下一個字符（不論是否第一次學習）
    handleCorrectAnswer()
  } else if (!isFirstLearn.value) {
    // 錯誤答案且非第一次學習，顯示答案並記錄錯誤
    handleWrongAnswer()
  }
})

const handleCorrectAnswer = () => {
  if (!card.value) return

  isCorrect.value = true

  // 使用基於索引的調度演算法記錄成功
  thisSchedule.recordSuccess(currentIndex.value)
  // 觸發進度條更新
  forceUpdate.value++

  // 立即進入下一個字符，無延遲
  nextChar()
}

const handleWrongAnswer = () => {
  if (!card.value) return

  isCorrect.value = false
  wrongInputCount.value++
  isFirstLearn.value = false  // 顯示答案後不再是第一次學習

  // 使用基於索引的調度演算法記錄失敗
  thisSchedule.recordFailure(currentIndex.value)
  // 觸發進度條更新
  forceUpdate.value++

  // 清空輸入，等待用戶重新輸入
  userKeys.value = ''
  nextTick(() => {
    inputElement.value?.focus()
  })
}

const nextChar = () => {
  // 使用基於索引的調度系統獲取下一個需要練習的字符
  const nextIdx = thisSchedule.getNextIndex()

  if (nextIdx !== null) {
    currentIndex.value = nextIdx
    card.value = cards.value[nextIdx]
  } else {
    // 調度系統返回 null，說明所有字符都已完成，停止練習
    isCompleted.value = true
    return
  }

  // 重置狀態
  isCorrect.value = true
  wrongInputCount.value = 0
  userKeys.value = ''

  // 檢查是否為第一次見到此字符，如果是則直接顯示答案
  if (thisSchedule.isFirstTime(currentIndex.value)) {
    isFirstLearn.value = true
  } else {
    isFirstLearn.value = false
  }

  nextTick(() => {
    inputElement.value?.focus()
  })
}

function restartTraining() {
  if (!cards.value) return;

  thisSchedule.reset()
  thisSchedule.initializeWithGroupCount(cards.value.length)

  isCompleted.value = false
  forceUpdate.value++

  // 開始第一個字符
  nextChar()
}

// 處理重置確認
const handleReset = () => {
  showResetConfirm.value = true
}

const confirmReset = () => {
  restartTraining()
  showResetConfirm.value = false
}

const cancelReset = () => {
  showResetConfirm.value = false
}

// 鍵盤事件處理
const handleKeydown = (event: KeyboardEvent) => {
  if (showResetConfirm.value) {
    if (event.key === 'Enter') {
      confirmReset();
    } else if (event.key === 'Escape') {
      cancelReset();
    }
    return;
  }

  if (event.key === 'Escape' && !isFirstLearn.value) {
    // 顯示答案
    isFirstLearn.value = true;
    event.preventDefault();
  }
};
</script>

<template>
  <!-- 數據加載中 -->
  <h2 class="text-gray-700 dark:text-gray-300 text-center" v-if="!cards || !chaifenMap">
    下載數據中……
  </h2>

  <!-- Training completed screen -->
  <div v-else-if="isCompleted" class="text-center py-16">
    <div class="mb-8">
      <div class="text-6xl mb-4">🎉</div>
      <h2 class="text-4xl font-bold mb-2">恭喜你完成練習！</h2>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
        你已經完成了 {{ cards.length }} 個單字的練習。
        感謝你的努力和堅持，為中華文明和漢字的傳承又增添了一份力量！
      </p>
    </div>

    <div class="space-y-4">
      <button @click="restartTraining"
        class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium">
        想要再訓練一輪嗎？
      </button>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        繼續練習以鞏固記憶
      </div>
    </div>
  </div>

  <!-- Training in progress screen -->
  <div v-else :class="[
    'mx-auto p-6 space-y-6',
    windowWidth < 768 ? 'max-w-sm p-3 space-y-3' : 'max-w-2xl'
  ]">
    <!-- 進度顯示 -->
    <div class="relative">
      <div :class="[
        'text-center text-gray-600 dark:text-gray-400',
        windowWidth < 768 ? 'text-xs' : 'text-sm'
      ]">
        <div :class="[
          'flex justify-between items-center',
          windowWidth < 768 ? 'mb-1' : 'mb-2'
        ]">
          <span>已練習: {{ practiceProgress.current }} / {{ practiceProgress.total }} ({{ practiceProgress.percentage
          }}%) | 已掌握: {{ practiceProgress.mastered }}</span>
          <span v-if="wrongInputCount > 0" class="text-red-600 dark:text-red-400">錯誤次數: {{ wrongInputCount }}</span>
        </div>
        <div :class="[
          'w-full bg-gray-200 dark:bg-gray-700 rounded-full',
          windowWidth < 768 ? 'h-1.5' : 'h-2'
        ]">
          <div :class="[
            'bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300',
            windowWidth < 768 ? 'h-1.5' : 'h-2'
          ]" :style="`width: ${practiceProgress.percentage}%`">
          </div>
        </div>
      </div>
    </div>

    <!-- 練習區域 -->
    <div :class="[
      'w-full shadow-lg rounded-2xl transition-all duration-300 transform relative',
      {
        'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800': !isCorrect,
        'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800': isCorrect
      },
      'border-2 hover:shadow-xl'
    ]">
      <!-- 卡片內控制按鈕 -->
      <div :class="[
        'absolute flex gap-2 z-10',
        windowWidth < 768 ? 'bottom-2 right-2' : 'bottom-4 right-4'
      ]">
        <!-- 重置按鈕 -->
        <button @click="handleReset" :class="[
          'rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-all duration-200 flex items-center justify-center shadow-md',
          windowWidth < 768 ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-xs'
        ]" title="重新開始訓練">
          <svg :class="windowWidth < 768 ? 'w-2 h-2' : 'w-3 h-3'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- 漢字和拆分圖顯示 -->
      <div :class="[
        'text-center flex items-center justify-center',
        windowWidth < 768 ? 'h-40 py-4' : 'h-56 py-8'
      ]">
        <div :class="[
          'flex items-center justify-center',
          windowWidth < 768 ? 'gap-4' : 'gap-8'
        ]">
          <!-- 漢字 -->
          <div :class="[
            'zigen-font transform transition-all duration-300',
            charSizeClass,
            {
              'text-red-500 dark:text-red-400': !isCorrect,
              'text-blue-700 dark:text-blue-300': isCorrect
            }
          ]">
            {{ card.name }}
          </div>

          <!-- 拆分圖 -->
          <div class="flex tracking-widest flex-col opacity-80">
            <MultiChaifen :chars="card.name" :size="windowWidth < 768 ? 80 : 120" :key="card.name" loc="" />
          </div>
        </div>
      </div>

      <!-- 輸入區域 -->
      <div :class="[
        'flex justify-center',
        windowWidth < 768 ? 'pt-2 pb-3' : 'pt-4 pb-8'
      ]">
        <input ref="inputElement" v-model="userKeys" type="text" placeholder="編碼" :class="[
          'text-center border-2 rounded-xl font-mono',
          'transition-all duration-300 focus:outline-none focus:ring-4',
          windowWidth < 768 ? 'px-3 py-2 text-lg w-32' : 'px-6 py-4 text-2xl w-48',
          {
            'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50 dark:border-red-700 dark:focus:border-red-500 dark:focus:ring-red-900/50 dark:bg-red-900/20 dark:text-white': !isCorrect,
            'border-blue-300 focus:border-blue-500 focus:ring-blue-200 bg-white dark:border-blue-700 dark:focus:border-blue-500 dark:focus:ring-blue-900/50 dark:bg-gray-800 dark:text-white': isCorrect
          }
        ]" />
      </div>

      <!-- 答案顯示區域 -->
      <div :class="[
        'text-center transition-all duration-300',
        windowWidth < 768 ? 'pb-3' : 'pb-8',
        { 'opacity-0 transform translate-y-2': !isFirstLearn, 'opacity-100': isFirstLearn }
      ]">
        <div :class="[
          'inline-block bg-gray-100 dark:bg-gray-800 rounded-lg',
          windowWidth < 768 ? 'px-2 py-1' : 'px-4 py-2'
        ]">
          <span :class="[
            'text-gray-800 dark:text-gray-200',
            windowWidth < 768 ? 'text-sm' : ''
          ]">答案是 </span>
          <span :class="[
            'font-mono font-bold text-blue-600 dark:text-blue-400',
            windowWidth < 768 ? 'text-lg' : 'text-xl'
          ]">{{ card.key }}</span>
          <span v-if="chaifenMap" :class="[
            'text-gray-600 dark:text-gray-400 ml-2',
            windowWidth < 768 ? 'text-xs' : 'text-sm'
          ]">（{{ chaifenMap.get(card.name)?.division }}）</span>
        </div>
        <div v-if="(p.rule === 'ming' || p.rule === 'ling') && ['的', '是', '我', '不', '了'].includes(card.name)" :class="[
          'text-gray-500 dark:text-gray-400 mt-2',
          windowWidth < 768 ? 'text-xs' : 'text-sm'
        ]">
          也可直接使用韻碼 <b class="font-mono text-blue-600 dark:text-blue-400">{{
            card.name === '的' ? 'E' :
              card.name === '是' ? 'I' :
                card.name === '我' ? 'O' :
                  card.name === '不' ? 'U' :
                    card.name === '了' ? 'A' : ''
          }}</b> 直接上屏
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div :class="[
      'text-center text-gray-500 dark:text-gray-400 space-y-1',
      windowWidth < 768 ? 'text-xs' : 'text-sm'
    ]">
      <div v-if="!isFirstLearn" :class="[
        'flex items-center justify-center',
        windowWidth < 768 ? 'gap-2 flex-col' : 'gap-4'
      ]">
        <span class="flex items-center gap-1">
          <kbd :class="[
            'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded',
            windowWidth < 768 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
          ]">輸入</kbd>
          自動檢查
        </span>
        <span class="flex items-center gap-1">
          <kbd :class="[
            'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded',
            windowWidth < 768 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
          ]">Esc</kbd>
          顯示答案
        </span>
      </div>
      <div v-else class="text-blue-600 dark:text-blue-400 font-medium">
        繼續輸入正確編碼
      </div>
    </div>

    <!-- 聲碼韵碼解析區域 - 獨立顯示 -->
    <div v-if="hasPinyinData" :class="[
      'mx-auto max-w-md mt-4',
      windowWidth < 768 ? 'max-w-xs mt-2' : 'max-w-md mt-4'
    ]">
      <div :class="[
        'border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 transition-all duration-300',
        windowWidth < 768 ? 'p-2' : 'p-3'
      ]">
        <!-- 標題 -->
        <div :class="[
          'text-center font-medium text-blue-800 dark:text-blue-300 mb-2',
          windowWidth < 768 ? 'text-xs mb-1' : 'text-sm mb-2'
        ]">
          拼音到音托之關係解析
        </div>
        <!-- 拼音列表 -->
        <div :class="[
          'text-center space-y-1',
          windowWidth < 768 ? 'text-xs space-y-0.5' : 'text-sm space-y-1'
        ]">
          <div v-for="(item, index) in pinyinList" :key="`${item.font}-${item.pinyin}-${index}`" :class="[
            'text-blue-700 dark:text-blue-300'
          ]">
            <span class="zigen-font">{{ item.font }}</span>
            <span class="font-mono"> ({{ item.pinyin }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 重置確認對話框 -->
  <div v-if="showResetConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="cancelReset">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl" @click.stop>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">確認重置</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">您確定要重新開始訓練嗎？</p>
        </div>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        這將清除當前的學習進度和統計數據，無法恢復。
      </p>
      <div class="flex gap-3 justify-end">
        <button @click="cancelReset"
          class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
          取消
        </button>
        <button @click="confirmReset"
          class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
          確認重置
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 確保字符顯示使用正確字體 */
.zigen-font {
  font-family: 'Noto Serif SC', 'Noto Serif TC', 'Yuji Hentaigana Akari', 'Noto Serif Tangut', "Noto Serif Khitan Small Script",
    "yuhao-font", 'TH-Tshyn-P2', 'TH-Tshyn-P0', 'TH-Tshyn-P1', 'TH-Tshyn-P16',
    Georgia, "Nimbus Roman No9 L", "Songti SC Regular", "Noto Serif CJK SC", "Source Han Serif SC", "Source Han Serif CN", STSong, "AR PL New Sung", "AR PL SungtiL GB", NSimSun, SimSun, "TW\-Sung", "WenQuanYi Bitmap Song", "AR PL UMing CN", "AR PL UMing HK", "AR PL UMing TW", "AR PL UMing TW MBE", PMingLiU, MingLiU, serif;
  font-weight: 400;
  line-height: 1;
}

/* 現代化動畫效果 */
.transition-all {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 輸入框特殊效果 */
input::placeholder {
  color: #9ca3af;
  opacity: 0.8;
}

/* 鍵盤提示樣式 */
kbd {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  font-weight: 600;
}

/* 響應式字體大小調整 */
@media (max-width: 640px) {
  .text-6xl {
    font-size: 4rem;
    line-height: 1;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .text-8xl {
    font-size: 6rem;
    line-height: 1;
  }
}

@media (min-width: 1025px) {
  .text-9xl {
    font-size: 8rem;
    line-height: 1;
  }
}

/* 卡片陰影動畫 */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
</style>
