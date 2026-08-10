<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Stage } from './types';

const props = defineProps<{
    stages: Stage[],
}>();

const currentIndex = ref(0);
const userInput = ref('');
const practiceSubmitted = ref(false);
const practiceCorrect = ref<boolean | null>(null);
const practiceShowAnswer = ref(false);
const isCompleted = ref(false);

const currentStage = computed(() => props.stages[currentIndex.value]);
const isLastStage = computed(() => currentIndex.value === props.stages.length - 1);

// 计算练习阶段的正确答案
const expectedCode = computed(() => {
    const stage = currentStage.value;
    if (stage.type === 'practice' && stage.bianMa) {
        return stage.bianMa.join('');
    }
    return '';
});

// 当进入新的练习阶段时，重置练习状态
watch(currentIndex, () => {
    userInput.value = '';
    practiceSubmitted.value = false;
    practiceCorrect.value = null;
    practiceShowAnswer.value = false;
});

function prevStage() {
    if (currentIndex.value > 0) {
        currentIndex.value--;
    }
}

function nextStage() {
    if (isLastStage.value) {
        isCompleted.value = true;
        return;
    }
    currentIndex.value++;
}

function restartTutorial() {
    currentIndex.value = 0;
    isCompleted.value = false;
    userInput.value = '';
    practiceSubmitted.value = false;
    practiceCorrect.value = null;
    practiceShowAnswer.value = false;
}

function submitPractice() {
    if (!userInput.value.trim()) return;
    practiceSubmitted.value = true;
    const input = userInput.value.trim().toLowerCase();
    if (input === expectedCode.value.toLowerCase()) {
        practiceCorrect.value = true;
        // 正确后自动前进
        setTimeout(() => {
            if (!isCompleted.value) {
                nextStage();
            }
        }, 800);
    } else {
        practiceCorrect.value = false;
        practiceShowAnswer.value = true;
    }
}

function showAnswer() {
    practiceShowAnswer.value = true;
    practiceSubmitted.value = true;
}

// 练习阶段的“下一步”按钮是否可用：要么已提交，要么已显示答案
const isNextDisabled = computed(() => {
    const stage = currentStage.value;
    if (stage.type === 'practice') {
        return !practiceSubmitted.value && !practiceShowAnswer.value;
    }
    return false;
});

// 分割换行文本为段落
function splitParagraphs(text: string) {
    return text.split('\n').filter(p => p.trim());
}
</script>

<template>
    <div class="method-learner max-w-2xl mx-auto px-4 py-8 space-y-6 font-sans">
        <!-- 完成屏幕 -->
        <div v-if="isCompleted" class="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">恭喜完成入門教程！</h2>
            <p class="text-lg text-gray-600 dark:text-gray-300 mb-8">
                你已經學會了靈明輸入法的核心編碼規則！
            </p>
            <button @click="restartTutorial"
                class="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
                重新学习
            </button>
        </div>

        <!-- 教程阶段 -->
        <div v-else>
            <!-- 内容卡片 -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
                <!-- 上方描述 -->
                <div v-if="currentStage.descriptionTop" class="text-gray-700 dark:text-gray-300 leading-relaxed">
                    <p v-for="(para, idx) in splitParagraphs(currentStage.descriptionTop)" :key="'top-'+idx" class="mb-2">{{ para }}</p>
                </div>

                <!-- 汉字展示区域 -->
                <div class="flex justify-center py-4">
                    <span class="zigen-font text-7xl sm:text-8xl md:text-9xl text-blue-700 dark:text-blue-300 select-none">
                        {{ currentStage.plotZi }}
                    </span>
                </div>

                <!-- 拆分以及练习阶段：显示字根编码 -->
                <div v-if="(currentStage.type === 'chaiFen' || currentStage.type === 'practice') && currentStage.chaiFen" class="flex justify-center gap-2 flex-wrap">
                    <span v-for="(part, idx) in currentStage.chaiFen" :key="idx"
                        class="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-md font-mono text-lg">
                        {{ part }}
                    </span>
                </div>

                <!-- 编码阶段：显示字根到编码的映射 -->
                <div v-if="currentStage.type === 'bianMa' && currentStage.chaiFen && currentStage.bianMa"
                    class="flex justify-center gap-3 sm:gap-6 flex-wrap items-end">
                    <div v-for="(part, idx) in currentStage.chaiFen" :key="idx" class="flex flex-col items-center min-w-[60px]">
                        <span class="text-xs text-gray-500 dark:text-gray-400 mb-1">字根</span>
                        <span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm">{{ part }}</span>
                        <span class="text-xl my-1 text-gray-400">↓</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 mb-1">取碼</span>
                        <span class="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded-md font-mono text-sm">
                            {{ ((idx >= currentStage.bianMa.length - 1 && idx < currentStage.chaiFen.length - 1)) ? "-" : currentStage.bianMa[Math.min(idx, currentStage.bianMa.length - 1)] }}
                        </span>
                    </div>
                </div>

                <!-- 练习阶段 -->
                <div v-if="currentStage.type === 'practice'" class="space-y-4">
                    <div class="flex justify-center items-center gap-3 flex-wrap">
                        <input
                            v-model="userInput"
                            type="text"
                            placeholder="輸入編碼"
                            :disabled="practiceSubmitted && practiceCorrect === true"
                            class="text-center border-2 rounded-xl px-4 py-3 font-mono text-xl w-36 sm:w-44 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-gray-900 dark:text-white"
                            :class="{
                                'border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-900/20': practiceSubmitted && practiceCorrect === true,
                                'border-red-400 bg-red-50 dark:border-red-400 dark:bg-red-900/20': practiceSubmitted && practiceCorrect === false,
                                'border-gray-300 dark:border-gray-600': !practiceSubmitted
                            }"
                            @keyup.enter="submitPractice"
                        />
                        <button
                            @click="submitPractice"
                            :disabled="!userInput.trim() || (practiceSubmitted && practiceCorrect === true)"
                            class="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            提交
                        </button>
                        <button
                            v-if="!practiceShowAnswer"
                            @click="showAnswer"
                            class="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            顯示答案
                        </button>
                    </div>

                    <!-- 反馈消息 -->
                    <div v-if="practiceSubmitted && practiceCorrect === true" class="text-center text-green-600 dark:text-green-400 font-medium">
                        ✅ 完全正确！
                    </div>
                    <div v-else-if="practiceSubmitted && practiceCorrect === false" class="text-center text-red-600 dark:text-red-400 font-medium">
                        ❌ 不正确，正确答案如下：
                    </div>

                    <!-- 显示正确答案 -->
                    <div v-if="practiceShowAnswer" class="text-center">
                        <span class="inline-block px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono text-xl rounded-lg">
                            {{ expectedCode }}
                        </span>
                    </div>
                </div>

                <!-- 下方描述 -->
                <div v-if="currentStage.descriptionBottom" class="text-gray-700 dark:text-gray-300 leading-relaxed">
                    <p v-for="(para, idx) in splitParagraphs(currentStage.descriptionBottom)" :key="'bottom-'+idx" class="mb-2">{{ para }}</p>
                </div>
            </div>

            <!-- 导航按钮 -->
            <div class="flex justify-between mt-6">
                <button
                    @click="prevStage"
                    :disabled="currentIndex === 0"
                    class="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    ← 上一步
                </button>
                <button
                    @click="nextStage"
                    :disabled="isNextDisabled"
                    class="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {{ isLastStage ? '完成' : '下一步 →' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 确保汉字使用正确的 serif 字体，与 CharTrain 一致 */
.zigen-font {
    font-family: 'Noto Serif SC', 'Noto Serif TC', 'Yuji Hentaigana Akari', 'Noto Serif Tangut',
        "Noto Serif Khitan Small Script", "Yuniversus", 'TH-Tshyn-P2', 'TH-Tshyn-P0', 'TH-Tshyn-P1', 'TH-Tshyn-P16',
        Georgia, "Nimbus Roman No9 L", "Songti SC Regular", "Noto Serif CJK SC", "Source Han Serif SC",
        "Source Han Serif CN", STSong, "AR PL New Sung", "AR PL SungtiL GB", NSimSun, SimSun,
        "TW-Sung", "WenQuanYi Bitmap Song", "AR PL UMing CN", "AR PL UMing HK", "AR PL UMing TW",
        "AR PL UMing TW MBE", PMingLiU, MingLiU, serif;
    font-weight: 400;
    line-height: 1;
}

/* 暗色模式适配（如果宿主页面未提供 dark 类，这些样式会降级） */
@media (prefers-color-scheme: dark) {
    .method-learner {
        color-scheme: dark;
    }
}
</style>