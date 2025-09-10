<!--
    TrainCardGroup.vue - 字根分組練習組件
    
    實現分組字根訓練與改進的間隔重複算法。
    將相同編碼的字根歸為一組同時顯示。
-->

<script setup lang="ts">
import { Ref, ref, shallowRef, onMounted, nextTick, computed, onBeforeUnmount, watch } from "vue";
import { makeCodesFromDivision, cache, find8relativeChars, ChaifenMap } from "./share";
import { AdvancedSchedule } from "./advancedSchedule";

interface ZigenGroup {
    /** 編碼 */
    code: string;
    /** 字根列表 */
    zigens: Array<{ font: string; ma: string }>;
}

const p = defineProps<{
    /** 資料庫名稱 */
    name: string,
    /** 字根分組 */
    cardGroups: ZigenGroup[],
    /** 字根映射表 */
    chaifenMap: ChaifenMap,
    /** 練習模式 */
    mode: 'c' | 'g' | 'b',
    /** 是否顯示補充，僅對單字練習有效 */
    supplement?: boolean,
    /** 是否顯示拆分名詞，僅對單字練習有效 */
    ming?: boolean,
    /** 是否為字頻序 */
    isFrequencyOrder?: boolean,
    /** 排序切換回調 */
    onToggleSort?: () => void,
    /** 重置訓練回調 */
    onReset?: () => void
}>()

const { name, cardGroups, mode, supplement, ming, isFrequencyOrder, onToggleSort, onReset } = p;

console.log(`載入分組練習會話: ${name}`);

// 使用基於索引的調度演算法
const schedule = new AdvancedSchedule(name);

const currentIndex = ref(0);
const inputElement = ref<HTMLInputElement>();
const inputValue = ref<string>('');
const showAnswer = ref(false);
const isCorrect = ref(true);
const wrongInputCount = ref(0);
const showResetConfirm = ref(false);
// 用於強制更新進度條的響應式狀態
const forceUpdate = ref(0);

// 自動化測試相關狀態
const isAutoTesting = ref(false);
const autoTestSpeed = ref(10); // 自動測試間隔（毫秒）
const autoTestResults = ref<string[]>([]);
const autoTestStartTime = ref(0);
const autoTestCount = ref(0);
const maxAutoTestCount = ref(2000); // 最大自動測試次數
let autoTestTimer: ReturnType<typeof setTimeout> | null = null;

// 處理重置確認
const handleReset = () => {
    showResetConfirm.value = true;
}

const confirmReset = () => {
    if (onReset) {
        onReset();
        showResetConfirm.value = false;
        // 強制刷新頁面以確保完全重置
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
}

const cancelReset = () => {
    showResetConfirm.value = false;
}

// 響應式字根大小計算
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

const handleResize = () => {
    windowWidth.value = window.innerWidth;
};

onMounted(() => {
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
    }
    nextTick(() => {
        inputElement.value?.focus();
    });
    document.addEventListener('keydown', handleKeydown);

    // 初始化第一個字根組
    nextGroup();
});

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
    }
    document.removeEventListener('keydown', handleKeydown);
});

// 計算字根大小類名
const zigenSizeClass = computed(() => {
    if (!currentGroup.value) return 'text-8xl';

    const zigenCount = currentGroup.value.zigens.length;
    const isSmallScreen = windowWidth.value < 768; // sm breakpoint
    const isMediumScreen = windowWidth.value < 1024; // lg breakpoint

    if (isSmallScreen) {
        // 小屏幕：按字根數量調整
        if (zigenCount <= 2) return 'text-6xl';
        if (zigenCount <= 4) return 'text-5xl';
        return 'text-4xl';
    } else if (isMediumScreen) {
        // 中等屏幕：稍大一些
        if (zigenCount <= 2) return 'text-8xl';
        if (zigenCount <= 4) return 'text-7xl';
        return 'text-6xl';
    } else {
        // 大屏幕：最大字體
        if (zigenCount <= 2) return 'text-9xl';
        if (zigenCount <= 4) return 'text-8xl';
        return 'text-7xl';
    }
});

// 計算間距類名
const zigenGapClass = computed(() => {
    if (!currentGroup.value) return 'gap-8 lg:gap-12';

    const zigenCount = currentGroup.value.zigens.length;
    const isSmallScreen = windowWidth.value < 768;

    if (isSmallScreen) {
        // 手機端進一步減少間距
        return zigenCount > 4 ? 'gap-1' : zigenCount > 2 ? 'gap-2' : 'gap-3';
    } else {
        return zigenCount > 4 ? 'gap-6' : 'gap-8 lg:gap-12';
    }
});

const currentGroup = computed(() => cardGroups[currentIndex.value] || null);
const totalGroups = computed(() => cardGroups.length);

// 使用已練習的字根組數來顯示進度，確保進度穩定且準確
const practiceProgress = computed(() => {
    // 依賴 forceUpdate 來觸發重新計算
    forceUpdate.value;

    // 使用基於索引的調度系統統計
    const stats = schedule.getProgressStats();

    return {
        current: stats.practiced,
        total: stats.total,
        mastered: stats.mastered,
        percentage: stats.percentage.toFixed(1)
    };
}); const progress = computed(() =>
    practiceProgress.value.percentage
);

// 檢查是否已完成所有學習
const isCompleted = computed(() => {
    forceUpdate.value; // 依賴更新觸發器
    return schedule.isCompleted();
});

// 監聽輸入，自動處理正確答案或錯誤提示
watch(inputValue, (newValue) => {
    if (!currentGroup.value) return;

    const input = newValue.trim().toLowerCase();
    const expectedCode = currentGroup.value.code.toLowerCase();

    // 檢查輸入長度是否達到預期編碼長度
    if (input.length >= expectedCode.length) {
        if (input === expectedCode) {
            // 正確答案，直接進入下一組
            handleCorrectAnswer();
        } else if (!showAnswer.value) {
            // 錯誤答案且未顯示答案，顯示答案並記錄錯誤
            handleWrongAnswer();
        }
    }
});

const handleCorrectAnswer = () => {
    if (!currentGroup.value) return;

    isCorrect.value = true;

    // 使用基於索引的調度演算法記錄成功
    schedule.recordSuccess(currentIndex.value);
    // 觸發進度條更新
    forceUpdate.value++;

    // 立即進入下一組，無延遲
    nextGroup();
};

const handleWrongAnswer = () => {
    if (!currentGroup.value) return;

    isCorrect.value = false;
    wrongInputCount.value++;
    showAnswer.value = true;

    // 使用基於索引的調度演算法記錄失敗
    schedule.recordFailure(currentIndex.value);
    // 觸發進度條更新
    forceUpdate.value++;

    // 清空輸入，等待用戶重新輸入
    inputValue.value = '';
    nextTick(() => {
        inputElement.value?.focus();
    });
};

const nextGroup = () => {
    // 使用基於索引的調度系統獲取下一個需要練習的字根組
    const nextGroupIndex = schedule.getNextIndex();

    if (nextGroupIndex !== null) {
        currentIndex.value = nextGroupIndex;
    } else {
        // 調度系統返回null，說明所有字根組都已完成，停止練習
        return; // 不再選擇字根組
    }

    // 重置狀態
    isCorrect.value = true;
    wrongInputCount.value = 0;
    inputValue.value = '';

    // 檢查是否為第一次見到此字根組，如果是則直接顯示答案
    if (schedule.isFirstTime(currentIndex.value)) {
        showAnswer.value = true;
    } else {
        showAnswer.value = false;
    }

    nextTick(() => {
        inputElement.value?.focus();
    });
};

// 自動化測試功能
const startAutoTest = () => {
    if (isAutoTesting.value) return;

    isAutoTesting.value = true;
    autoTestResults.value = [];
    autoTestStartTime.value = Date.now();
    autoTestCount.value = 0;

    autoTestResults.value.push(`[${new Date().toLocaleTimeString()}] 開始自動化測試，速度: ${autoTestSpeed.value}ms/次`);

    runAutoTestStep();
};

const stopAutoTest = () => {
    if (!isAutoTesting.value) return;

    isAutoTesting.value = false;
    if (autoTestTimer) {
        clearTimeout(autoTestTimer);
        autoTestTimer = null;
    }

    const duration = Date.now() - autoTestStartTime.value;
    const durationMinutes = (duration / 1000 / 60).toFixed(1);
    const stats = schedule.getProgressStats();

    autoTestResults.value.push(`[${new Date().toLocaleTimeString()}] 測試停止`);
    autoTestResults.value.push(`實際字根組數: ${cardGroups.length}`);
    autoTestResults.value.push(`測試時長: ${durationMinutes}分鐘，共${autoTestCount.value}次練習`);
    autoTestResults.value.push(`最終進度: ${stats.percentage.toFixed(1)}% (${stats.practiced}/${stats.total})`);
    autoTestResults.value.push(`已掌握: ${stats.mastered}個字根組`);
};

const runAutoTestStep = () => {
    if (!isAutoTesting.value || !currentGroup.value) return;

    autoTestCount.value++;

    // 記錄當前狀態
    const stats = schedule.getProgressStats();
    const currentCode = currentGroup.value.code;

    // 模擬90%的正確率
    const isCorrectAnswer = Math.random() > 0.1;

    if (isCorrectAnswer) {
        // 模擬正確輸入
        inputValue.value = currentCode;
        // handleCorrectAnswer 會在 watch 中被自動調用
    } else {
        // 模擬錯誤
        schedule.recordFailure(currentIndex.value);
        forceUpdate.value++;
        nextGroup();
    }

    // 每50次記錄一次進度
    if (autoTestCount.value % 50 === 0) {
        const newStats = schedule.getProgressStats();
        const debugInfo = schedule.getScheduleDebugInfo();
        autoTestResults.value.push(`[${autoTestCount.value}次] 進度: ${newStats.percentage.toFixed(1)}% | 當前字根: ${currentCode}`);
        autoTestResults.value.push(`  ${debugInfo}`);

        // 檢查是否陷入死循環（進度不再變化）
        if (autoTestCount.value > 200 && newStats.percentage === stats.percentage) {
            autoTestResults.value.push(`⚠️ 警告：進度停滯在 ${stats.percentage.toFixed(1)}%，可能陷入死循環`);
        }
    }

    // 检查停止条件
    if (autoTestCount.value >= maxAutoTestCount.value) {
        autoTestResults.value.push(`达到最大测试次数 ${maxAutoTestCount.value}，停止测试`);
        stopAutoTest();
        return;
    }

    // 检查是否所有字根组都已完成（掌握数等于总数）
    if (stats.mastered >= cardGroups.length) {
        autoTestResults.value.push(`✅ 所有字根组都已掌握 (${stats.mastered}/${cardGroups.length})，测试成功完成`);
        stopAutoTest();
        return;
    }

    // 继续下一步测试
    autoTestTimer = setTimeout(runAutoTestStep, autoTestSpeed.value);
};

/** 重置學習進度 */
const resetProgress = () => {
    if (isAutoTesting.value) return;

    // 清除本地存儲
    schedule.reset();

    // 重置組件狀態
    currentIndex.value = 0;
    inputValue.value = '';
    showAnswer.value = false;
    isCorrect.value = true;
    wrongInputCount.value = 0;
    autoTestResults.value = [];
    autoTestCount.value = 0;

    // 重新初始化
    schedule.initializeWithGroupCount(cardGroups.length);
    nextGroup();

    // 強制更新進度顯示
    forceUpdate.value++;

    autoTestResults.value.push(`[${new Date().toLocaleTimeString()}] 學習進度已重置`);
};

const restartTraining = () => {
    resetProgress();
};

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !showAnswer.value) {
        // 顯示答案
        handleWrongAnswer();
        e.preventDefault();
    }
};

/** 獲取相關字符 - 響應式顯示 */
const getRelatedChars = (zigen: string): string => {
    const related = find8relativeChars(zigen, p.chaifenMap)
    const isSmallScreen = windowWidth.value < 768;
    const isMediumScreen = windowWidth.value < 1024;

    let maxChars = 4; // 預設4個字符
    if (isSmallScreen) {
        maxChars = 2; // 小屏幕只顯示2個
    } else if (isMediumScreen) {
        maxChars = 3; // 中屏幕顯示3個
    }

    return related.slice(0, maxChars).split('').join('')
}

/** 檢查字根是否正確 */
const checkZigen = (groupIndex: number, zigenIndex: number, userInput: string) => {
    const targetZigen = currentGroup.value?.zigens[zigenIndex]
    if (!targetZigen) return

    const isCorrect = userInput === targetZigen.ma

    if (isCorrect) {
        schedule.recordSuccess(groupIndex)
        // 觸發進度條更新
        forceUpdate.value++;
        if (zigenIndex < currentGroup.value.zigens.length - 1) {
            // 移動到下一個字根
        } else {
            nextGroup()
        }
    } else {
        schedule.recordFailure(groupIndex)
        // 觸發進度條更新
        forceUpdate.value++;
        wrongInputCount.value++
    }

    inputValue.value = ''
}

onMounted(() => {
    // 初始化基於索引的調度系統
    schedule.initializeWithGroupCount(cardGroups.length);

    nextTick(() => {
        inputElement.value?.focus();
    });
    document.addEventListener('keydown', handleKeydown);

    // 初始化第一個字根組
    nextGroup();
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown);

    // 清理自動測試定時器
    if (autoTestTimer) {
        clearTimeout(autoTestTimer);
        autoTestTimer = null;
    }
});
</script>

<template>
    <!-- 完成狀態顯示 -->
    <div v-if="isCompleted" class="text-center py-16">
        <div class="mb-8">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-4xl font-bold mb-2">恭喜你完成練習！</h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
                你已經完成了 {{ cardGroups.length }} 個字根組的練習。
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

    <!-- 練習進行中 -->
    <div :class="[
        'mx-auto p-6 space-y-6',
        windowWidth < 768 ? 'max-w-sm p-3 space-y-3' : 'max-w-2xl'  // 手機端縮小容器和間距
    ]" v-else-if="currentGroup">
        <!-- 進度顯示 -->
        <div class="relative">
            <!-- 進度顯示 -->
            <div :class="[
                'text-center text-gray-600 dark:text-gray-400',
                windowWidth < 768 ? 'text-xs' : 'text-sm'  // 手機端縮小進度文字
            ]">
                <div :class="[
                    'flex justify-between items-center',
                    windowWidth < 768 ? 'mb-1' : 'mb-2'  // 手機端減少底部間距
                ]">
                    <span>已練習: {{ practiceProgress.current }} / {{ practiceProgress.total }} ({{
                        practiceProgress.percentage }}%) | 已掌握: {{ practiceProgress.mastered }}</span>
                    <span v-if="wrongInputCount > 0" class="text-red-600 dark:text-red-400">錯誤次數: {{ wrongInputCount
                    }}</span>
                </div>
                <div :class="[
                    'w-full bg-gray-200 dark:bg-gray-700 rounded-full',
                    windowWidth < 768 ? 'h-1.5' : 'h-2'  // 手機端縮小進度條高度
                ]">
                    <div :class="[
                        'bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300',
                        windowWidth < 768 ? 'h-1.5' : 'h-2'  // 手機端縮小進度條高度
                    ]" :style="`width: ${progress}%`">
                    </div>
                </div>
            </div>
        </div>

        <!-- 自動化測試控制面板 -->
        <!-- 
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div class="flex flex-wrap items-center gap-3 mb-3">
                <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">自動化測試</h3>
                <button v-if="!isAutoTesting" @click="startAutoTest"
                    class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors">
                    開始測試
                </button>
                <button v-if="isAutoTesting" @click="stopAutoTest"
                    class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors">
                    停止測試
                </button>
                <button @click="resetProgress" :disabled="isAutoTesting"
                    class="px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white text-xs rounded-md transition-colors">
                    重置進度
                </button>
                <div class="flex items-center gap-2 text-xs">
                    <label class="text-yellow-700 dark:text-yellow-300">速度:</label>
                    <select v-model="autoTestSpeed" :disabled="isAutoTesting" class="px-2 py-1 border rounded text-xs">
                        <option value="10">極快 (10ms)</option>
                        <option value="300">快速 (300ms)</option>
                        <option value="500">正常 (500ms)</option>
                        <option value="1000">慢速 (1s)</option>
                    </select>
                </div>
                <div class="flex items-center gap-2 text-xs">
                    <label class="text-yellow-700 dark:text-yellow-300">最大次數:</label>
                    <input v-model.number="maxAutoTestCount" :disabled="isAutoTesting" type="number" min="100"
                        max="5000" step="100" class="w-16 px-2 py-1 border rounded text-xs" />
                </div>
            </div>
            <div v-if="isAutoTesting" class="mb-2">
                <div class="text-xs text-yellow-700 dark:text-yellow-300">
                    測試中... 已進行 {{ autoTestCount }} 次 ({{ practiceProgress.percentage }}%)
                </div>
                <div class="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-1 mt-1">
                    <div class="bg-yellow-500 h-1 rounded-full transition-all duration-300"
                        :style="`width: ${Math.min(100, (autoTestCount / maxAutoTestCount) * 100)}%`"></div>
                </div>
            </div>
            <div v-if="autoTestResults.length > 0"
                class="max-h-32 overflow-y-auto bg-white dark:bg-gray-800 rounded border p-2">
                <div v-for="(result, index) in autoTestResults.slice(-10)" :key="index"
                    class="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {{ result }}
                </div>
            </div>
        </div>
         -->

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
                windowWidth < 768 ? 'bottom-2 right-2' : 'bottom-4 right-4'  // 手機端移到右下角
            ]">
                <!-- 排序切換按鈕 -->
                <button v-if="onToggleSort" @click="onToggleSort" :class="[
                    'rounded-full font-medium transition-all duration-200 flex items-center justify-center shadow-md',
                    windowWidth < 768 ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-xs',  // 手機端縮小按鈕
                    isFrequencyOrder
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                ]" :title="isFrequencyOrder ? '字頻序 (點擊切換到字典序)' : '字典序 (點擊切換到字頻序)'">
                    <svg :class="windowWidth < 768 ? 'w-2 h-2' : 'w-3 h-3'" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                </button>

                <!-- 重置按鈕 -->
                <button v-if="onReset" @click="handleReset" :class="[
                    'rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-all duration-200 flex items-center justify-center shadow-md',
                    windowWidth < 768 ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-xs'  // 手機端縮小按鈕
                ]" title="重新開始訓練">
                    <svg :class="windowWidth < 768 ? 'w-2 h-2' : 'w-3 h-3'" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <!-- 字根組顯示 -->
            <div :class="[
                'text-center',
                windowWidth < 768 ? 'py-4' : 'py-12'  // 手機端大幅減少垂直間距
            ]">
                <!-- 字根組 - 響應式大小設計 -->
                <div :class="[
                    'flex justify-center items-center flex-wrap',
                    windowWidth < 768 ? 'mb-4' : 'mb-12',  // 手機端減少底部間距
                    zigenGapClass
                ]">
                    <div v-for="(zigen, index) in currentGroup.zigens" :key="index"
                        class="flex flex-col items-center group">
                        <div :class="[
                            'zigen-font transform transition-all duration-300 group-hover:scale-110',
                            windowWidth < 768 ? 'mb-1' : 'mb-4',  // 手機端減少字根下方間距
                            zigenSizeClass,
                            {
                                'text-red-500 dark:text-red-400': !isCorrect,
                                'text-blue-700 dark:text-blue-300': isCorrect
                            }
                        ]">
                            {{ zigen.font }}
                        </div>
                        <!-- 顯示相關漢字 - 響應式大小和間距，使用 zigen-font -->
                        <div :class="[
                            'text-gray-600 dark:text-gray-300 font-medium tracking-tight zigen-font',
                            windowWidth < 768 ? 'mt-0.5' : 'mt-2',  // 手機端減少頂部間距
                            {
                                'text-xs': windowWidth < 768,  // 手機端更小的相關字
                                'text-base': windowWidth >= 768 && windowWidth < 1024,
                                'text-lg': windowWidth >= 1024
                            }
                        ]" v-if="getRelatedChars(zigen.font)">
                            {{ getRelatedChars(zigen.font) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 輸入區域 -->
            <div :class="[
                'flex justify-center',
                windowWidth < 768 ? 'pb-3' : 'pb-8'  // 手機端減少底部間距
            ]">
                <input ref="inputElement" v-model="inputValue" type="text" placeholder="編碼" :class="[
                    'text-center border-2 rounded-xl font-mono',
                    'transition-all duration-300 focus:outline-none focus:ring-4',
                    // 手機端縮小輸入框
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
                windowWidth < 768 ? 'pb-3' : 'pb-8',  // 手機端減少底部間距
                { 'opacity-0 transform translate-y-2': !showAnswer, 'opacity-100': showAnswer }
            ]">
                <div :class="[
                    'inline-block bg-gray-100 dark:bg-gray-800 rounded-lg',
                    windowWidth < 768 ? 'px-2 py-1' : 'px-4 py-2'  // 手機端縮小答案框
                ]">
                    <span :class="[
                        'text-gray-800 dark:text-gray-200',
                        windowWidth < 768 ? 'text-sm' : ''  // 手機端縮小文字
                    ]">答案是 </span>
                    <span :class="[
                        'font-mono font-bold text-blue-600 dark:text-blue-400',
                        windowWidth < 768 ? 'text-lg' : 'text-xl'  // 手機端縮小答案文字
                    ]">{{ currentGroup.code }}</span>
                </div>
            </div>
        </div>

        <!-- 操作提示 -->
        <div :class="[
            'text-center text-gray-500 dark:text-gray-400 space-y-1',
            windowWidth < 768 ? 'text-xs' : 'text-sm'  // 手機端縮小提示文字
        ]">
            <div v-if="!showAnswer" :class="[
                'flex items-center justify-center',
                windowWidth < 768 ? 'gap-2 flex-col' : 'gap-4'  // 手機端垂直排列提示
            ]">
                <span class="flex items-center gap-1">
                    <kbd :class="[
                        'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded',
                        windowWidth < 768 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'  // 手機端縮小按鍵提示
                    ]">輸入</kbd>
                    自動檢查
                </span>
                <span class="flex items-center gap-1">
                    <kbd :class="[
                        'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded',
                        windowWidth < 768 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'  // 手機端縮小按鍵提示
                    ]">Esc</kbd>
                    顯示答案
                </span>
            </div>
            <div v-else class="text-blue-600 dark:text-blue-400 font-medium">
                繼續輸入正確編碼
            </div>
        </div>
    </div>

    <!-- 重置確認對話框 -->
    <div v-if="showResetConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click="cancelReset">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl" @click.stop>
            <div class="flex items-center gap-3 mb-4">
                <div
                    class="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
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
/* 確保字根顯示使用正確字體 */
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

/* 懸停效果 */
.group:hover .zigen-font {
    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
    .text-7xl {
        font-size: 4rem;
        line-height: 1;
    }

    /* 手機端額外的緊湊樣式 */
    .space-y-3>*+* {
        margin-top: 0.75rem;
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

/* 手機端視窗高度優化 */
@media (max-width: 767px) and (max-height: 600px) {

    /* 在小屏幕且低高度的設備上進一步壓縮 */
    .zigen-font {
        line-height: 0.9;
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
