<!--
    TupaTrain.vue - 中古漢語拼音練習組件
    
    實現中古漢語拼音訓練，基於間隔重複算法。
    每次顯示一個漢字，要求用戶輸入其任意一個正確的拼音。

    參考資料:
    https://github.com/nk2028/rime-tupa
-->

<script setup lang="ts">
import { Ref, ref, shallowRef, onMounted, nextTick, computed, onBeforeUnmount, watch } from "vue";
import { AdvancedSchedule } from "./advancedSchedule";

interface TupaEntry {
    /** 漢字 */
    char: string;
    /** 拼音列表（按頻率排序） */
    pinyins: Array<{ pinyin: string; freq?: number }>;
}

const p = defineProps<{
    /** 訓練字數 */
    charCount: number,
}>()

const { charCount } = p;

console.log(`載入中古拼音練習會話，訓練字數: ${charCount}`);

// 使用基於索引的調度演算法
const schedule = new AdvancedSchedule(`tupa_train_${charCount}`);

const currentIndex = ref(0);
const inputElement = ref<HTMLInputElement>();
const inputValue = ref<string>('');
const showAnswer = ref(false);
const isCorrect = ref(true);
const wrongInputCount = ref(0);
const showResetConfirm = ref(false);
// 用於強制更新進度條的響應式狀態
const forceUpdate = ref(0);

// 中古拼音資料
const tupaEntries = shallowRef<TupaEntry[]>([]);

// 響應式字體大小計算
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

const handleResize = () => {
    windowWidth.value = window.innerWidth;
};

// 計算字符大小類名 - 與 TrainCardGroup 一致
const charSizeClass = computed(() => {
    const isSmallScreen = windowWidth.value < 768; // sm breakpoint
    const isMediumScreen = windowWidth.value < 1024; // lg breakpoint

    if (isSmallScreen) {
        // 小屏幕
        return 'text-6xl';
    } else if (isMediumScreen) {
        // 中等屏幕
        return 'text-8xl';
    } else {
        // 大屏幕
        return 'text-9xl';
    }
});

const currentEntry = computed(() => tupaEntries.value[currentIndex.value] || null);
const totalChars = computed(() => tupaEntries.value.length);

// 使用已練習的字符數來顯示進度，確保進度穩定且準確
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
});

const progress = computed(() => practiceProgress.value.percentage);

// 檢查是否已完成所有學習
const isCompleted = computed(() => {
    forceUpdate.value; // 依賴更新觸發器
    return schedule.isCompleted();
});

// 處理重置確認
const handleReset = () => {
    showResetConfirm.value = true;
}

const confirmReset = () => {
    schedule.reset();
    showResetConfirm.value = false;

    // 重新初始化調度系統
    if (tupaEntries.value.length > 0) {
        schedule.initializeWithGroupCount(tupaEntries.value.length);
    }

    // 觸發進度條更新
    forceUpdate.value++;

    // 重新開始第一個字符
    nextChar();
    console.log('訓練已重置');
}

const cancelReset = () => {
    showResetConfirm.value = false;
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

    if (event.key === 'Escape' && !showAnswer.value) {
        // 顯示答案
        handleWrongAnswer();
        event.preventDefault();
    }
};

// 監聽輸入，自動處理正確答案
watch(inputValue, (newValue) => {
    console.log('輸入值變化:', newValue);
    if (!currentEntry.value) {
        console.log('跳過處理：currentEntry 為空');
        return;
    }

    const input = newValue.trim().toLowerCase();
    if (!input) {
        console.log('跳過處理：輸入為空');
        return;
    }

    // 檢查是否匹配第一個（最高頻率的）拼音
    const isMatch = currentEntry.value.pinyins.length > 0 &&
        currentEntry.value.pinyins[0].pinyin.toLowerCase() === input;

    console.log('輸入匹配檢查:', input, '期望第一個拼音:', currentEntry.value.pinyins[0]?.pinyin, '匹配結果:', isMatch);
    if (isMatch) {
        // 正確答案，直接進入下一字（不論是否為第一次學習）
        console.log('輸入正確，調用 handleCorrectAnswer');
        handleCorrectAnswer();
    }
});

// 處理輸入事件
const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const input = target.value.trim().toLowerCase();

    if (!currentEntry.value || !input) return;

    // 檢查是否匹配第一個（最高頻率的）拼音
    const isMatch = currentEntry.value.pinyins.length > 0 &&
        currentEntry.value.pinyins[0].pinyin.toLowerCase() === input;

    if (isMatch) {
        // 正確答案，直接進入下一字（不論是否為第一次學習）
        handleCorrectAnswer();
    }
};

// 處理按鍵事件
const handleInputKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
        const input = inputValue.value.trim().toLowerCase();
        if (input && currentEntry.value) {
            const isMatch = currentEntry.value.pinyins.length > 0 &&
                currentEntry.value.pinyins[0].pinyin.toLowerCase() === input;

            if (isMatch) {
                handleCorrectAnswer();
            } else {
                handleWrongAnswer();
            }
        }
    }
};

const handleCorrectAnswer = () => {
    console.log('handleCorrectAnswer() 被調用');
    if (!currentEntry.value) {
        console.log('currentEntry 為空，返回');
        return;
    }

    isCorrect.value = true;

    // 使用基於索引的調度演算法記錄成功
    schedule.recordSuccess(currentIndex.value);
    console.log('記錄成功，索引:', currentIndex.value);
    // 觸發進度條更新
    forceUpdate.value++;

    // 立即進入下一字，無延遲
    console.log('準備進入下一字');
    nextChar();
};

const handleWrongAnswer = () => {
    if (!currentEntry.value) return;

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

const nextChar = () => {
    console.log('nextChar() 被調用');
    // 使用基於索引的調度系統獲取下一個需要練習的字符
    const nextCharIndex = schedule.getNextIndex();
    console.log('獲取到的下一個字符索引:', nextCharIndex);

    if (nextCharIndex !== null) {
        currentIndex.value = nextCharIndex;
        console.log('設置 currentIndex 為:', nextCharIndex);
    } else {
        // 調度系統返回null，說明所有字符都已完成，停止練習
        console.log('所有字符已完成，停止練習');
        return; // 不再選擇字符
    }

    // 重置狀態
    isCorrect.value = true;
    wrongInputCount.value = 0;
    inputValue.value = '';

    // 檢查是否為第一次見到此字符，如果是則直接顯示答案
    if (schedule.isFirstTime(currentIndex.value)) {
        showAnswer.value = true;
        console.log('第一次見到此字符，顯示答案');
    } else {
        showAnswer.value = false;
        console.log('不是第一次見到此字符，等待輸入');
    }

    nextTick(() => {
        inputElement.value?.focus();
        console.log('聚焦到輸入框');
    });
};

// 載入中古拼音資料
const loadTupaData = async () => {
    try {
        console.log('開始載入中古拼音資料...');
        const response = await fetch('/mabiao-tupa.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        console.log('成功獲取數據，文本長度:', text.length);
        const lines = text.trim().split('\n');
        console.log('分割後行數:', lines.length);

        const entriesMap = new Map<string, TupaEntry>();

        // 解析每一行
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length < 2) continue;

            const char = parts[0];
            const pinyin = parts[1];
            const freqStr = parts[2]; // 可能為 undefined

            // 解析頻率
            let freq: number | undefined;
            if (freqStr && freqStr.includes('%')) {
                freq = parseFloat(freqStr.replace('%', ''));
            } else {
                // 如果沒有頻率信息，設為 100%（表示唯一或默認拼音）
                freq = 100;
            }

            if (!entriesMap.has(char)) {
                entriesMap.set(char, {
                    char,
                    pinyins: []
                });
            }

            entriesMap.get(char)!.pinyins.push({ pinyin, freq });
        }

        console.log('解析得到的字符數:', entriesMap.size);

        // 轉換為陣列並按照檔案中的順序和頻率排序
        const entries: TupaEntry[] = [];
        const processedChars = new Set<string>();

        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length < 2) continue;

            const char = parts[0];
            if (processedChars.has(char)) continue;

            const entry = entriesMap.get(char);
            if (entry) {
                // 對拼音按頻率降序排序
                entry.pinyins.sort((a, b) => (b.freq || 0) - (a.freq || 0));
                entries.push(entry);
                processedChars.add(char);

                // 限制字數
                if (entries.length >= charCount) break;
            }
        }

        tupaEntries.value = entries;
        console.log('最終字符數組長度:', entries.length);

        // 初始化調度系統
        schedule.initializeWithGroupCount(entries.length);
        console.log('調度系統初始化完成');

        console.log(`載入了 ${entries.length} 個字符的中古拼音資料`);

        // 開始第一個字符
        nextChar();
        console.log('調用 nextChar() 完成');

        nextTick(() => {
            inputElement.value?.focus();
            console.log('輸入框聚焦完成');
        });

    } catch (error) {
        console.error('載入中古拼音資料失敗:', error);
    }
};

// 重新開始練習
const restartTraining = () => {
    // 重置狀態並開始新的訓練輪次
    schedule.reset();
    nextChar();
};

onMounted(() => {
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
    }
    document.addEventListener('keydown', handleKeydown);

    // 載入中古拼音資料並初始化第一個字符
    loadTupaData();
});

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
    }
    document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <!-- 完成狀態顯示 -->
    <div v-if="isCompleted" class="text-center py-16">
        <div class="mb-8">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-4xl font-bold mb-2">恭喜你完成練習！</h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
                你已經完成了 {{ practiceProgress.total }} 個字符的中古拼音練習。
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
    ]" v-else-if="currentEntry">
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
                    <span>已練習: {{ practiceProgress.current }} / {{ practiceProgress.total }} ({{
                        practiceProgress.percentage }}%) | 已掌握: {{ practiceProgress.mastered }}</span>
                    <span v-if="wrongInputCount > 0" class="text-red-600 dark:text-red-400">錯誤次數: {{ wrongInputCount
                    }}</span>
                </div>
                <div :class="[
                    'w-full bg-gray-200 dark:bg-gray-700 rounded-full',
                    windowWidth < 768 ? 'h-1.5' : 'h-2'
                ]">
                    <div :class="[
                        'bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300',
                        windowWidth < 768 ? 'h-1.5' : 'h-2'
                    ]" :style="`width: ${progress}%`">
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
                    <svg :class="windowWidth < 768 ? 'w-2 h-2' : 'w-3 h-3'" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <!-- 漢字顯示 -->
            <div :class="[
                'text-center',
                windowWidth < 768 ? 'py-4' : 'py-12'
            ]">
                <!-- 漢字 - 響應式大小設計 -->
                <div :class="[
                    'flex justify-center items-center mb-4',
                    windowWidth < 768 ? 'mb-4' : 'mb-12'
                ]">
                    <div :class="[
                        'zigen-font transform transition-all duration-300',
                        windowWidth < 768 ? 'mb-1' : 'mb-4',
                        charSizeClass,
                        {
                            'text-red-500 dark:text-red-400': !isCorrect,
                            'text-blue-700 dark:text-blue-300': isCorrect
                        }
                    ]">
                        {{ currentEntry.char }}
                    </div>
                </div>

                <!-- 顯示答案時的拼音 -->
                <div v-if="showAnswer" :class="[
                    'flex flex-wrap justify-center gap-2 mb-4',
                    windowWidth < 768 ? 'mb-2' : 'mb-4'
                ]">
                    <span v-for="(item, index) in currentEntry.pinyins" :key="index" :class="[
                        'rounded font-mono',
                        windowWidth < 768 ? 'text-xs px-1 py-0.5' : 'text-sm px-2 py-1',
                        index === 0
                            ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-bold border-2 border-blue-300 dark:border-blue-600'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    ]">
                        {{ item.pinyin }}
                        <span v-if="item.freq" class="opacity-75 ml-1">({{ item.freq }}%)</span>
                        <span v-if="index === 0" class="ml-1 text-xs">✓</span>
                    </span>
                </div>
            </div>

            <!-- 輸入區域 -->
            <div :class="[
                'flex justify-center',
                windowWidth < 768 ? 'pb-3' : 'pb-8'
            ]">
                <input ref="inputElement" v-model="inputValue" type="text" placeholder="拼音" @input="handleInput"
                    @keydown="handleInputKeydown" :class="[
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
                { 'opacity-0 transform translate-y-2': !showAnswer, 'opacity-100': showAnswer }
            ]">
                <div :class="[
                    'inline-block bg-gray-100 dark:bg-gray-800 rounded-lg',
                    windowWidth < 768 ? 'px-2 py-1' : 'px-4 py-2'
                ]">
                    <span :class="[
                        'text-blue-600 dark:text-blue-400 font-medium',
                        windowWidth < 768 ? 'text-sm' : ''
                    ]">輸入主要拼音（帶✓標記的）</span>
                </div>
            </div>
        </div>

        <!-- 操作提示 -->
        <div :class="[
            'text-center text-gray-500 dark:text-gray-400 space-y-1',
            windowWidth < 768 ? 'text-xs' : 'text-sm'
        ]">
            <div v-if="!showAnswer" :class="[
                'flex items-center justify-center',
                windowWidth < 768 ? 'gap-2 flex-col' : 'gap-4'
            ]">
                <span class="flex items-center gap-1">
                    <kbd :class="[
                        'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded',
                        windowWidth < 768 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
                    ]">輸入</kbd>
                    主要拼音
                </span>
                <span class="flex items-center gap-1">
                    <kbd :class="[
                        'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded',
                        windowWidth < 768 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
                    ]">Esc</kbd>
                    顯示答案
                </span>
            </div>
            <div v-if="!showAnswer" class="text-xs opacity-75">
                請輸入頻率最高的拼音（通常是第一個）
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
/* 確保字符顯示使用正確字體 */
.zigen-font {
    font-family: 'Noto Serif SC', 'Noto Serif TC', 'Yuji Hentaigana Akari', 'Noto Serif Tangut', "Noto Serif Khitan Small Script",
        "Yuniversus", 'TH-Tshyn-P2', 'TH-Tshyn-P0', 'TH-Tshyn-P1', 'TH-Tshyn-P16',
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
