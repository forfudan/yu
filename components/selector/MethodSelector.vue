<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Question, Result } from './types';

const props = defineProps<{
    question: Question;  // 改為單個根問題
    results: Record<string, Result>;
    selectorTitle?: string;  // 選擇器標題
    resultTitle?: string;  // 結果標題
    resultMethodTemplate?: string;  // 結果方案文本模板（用 {name} 作為佔位符）
    resetButtonText?: string;  // 重新測試按鈕文本
    learnMoreText?: string;  // 詳細瞭解按鈕文本
}>();

const currentQuestion = ref<Question>(props.question);
const answers = ref<boolean[]>([]);
const isCompleted = ref(false);

const resultKey = computed(() => {
    return answers.value.map(a => a ? 'Y' : 'N').join('');
});

const finalResult = computed(() => {
    if (!isCompleted.value) return null;
    return props.results[resultKey.value];
});

const handleAnswer = (answer: boolean) => {
    answers.value.push(answer);

    const nextQuestion = answer ? currentQuestion.value.yesNext : currentQuestion.value.noNext;

    if (nextQuestion) {
        // 還有下一個問題
        currentQuestion.value = nextQuestion;
    } else {
        // 沒有下一個問題了，顯示結果
        isCompleted.value = true;
    }
};

const reset = () => {
    currentQuestion.value = props.question;
    answers.value = [];
    isCompleted.value = false;
};
</script>

<template>
    <div class="method-selector">
        <h2 v-if="!isCompleted && selectorTitle" class="selector-title">{{ selectorTitle }}</h2>
        <div v-if="!isCompleted" class="question-card">
            <div class="question-content">
                <h3 class="question-title">{{ currentQuestion.title }}</h3>
                <div v-if="currentQuestion.description" class="question-description">
                    <p v-for="(para, index) in currentQuestion.description.split('\n').filter(p => p.trim())"
                        :key="index">
                        {{ para }}
                    </p>
                </div>
            </div>

            <div class="button-group">
                <button class="choice-button yes-button" @click="handleAnswer(true)">
                    <div v-if="currentQuestion.yesText" class="button-hint">
                        <p v-for="(para, index) in currentQuestion.yesText.split('\n').filter(p => p.trim())"
                            :key="index">
                            {{ para }}
                        </p>
                    </div>
                </button>

                <button class="choice-button no-button" @click="handleAnswer(false)">
                    <div v-if="currentQuestion.noText" class="button-hint">
                        <p v-for="(para, index) in currentQuestion.noText.split('\n').filter(p => p.trim())"
                            :key="index">
                            {{ para }}
                        </p>
                    </div>
                </button>
            </div>
        </div>

        <div v-else class="result-card">
            <div class="result-icon">✨</div>
            <h2 v-if="resultTitle" class="result-title">{{ resultTitle }}</h2>
            <div class="result-content">
                <h3 v-if="resultMethodTemplate" class="result-method">{{ resultMethodTemplate.replace('{name}',
                    finalResult?.name || '') }}</h3>
                <div v-if="finalResult?.description" class="result-description">
                    <p v-for="(para, index) in finalResult.description.split('\n').filter(p => p.trim())" :key="index">
                        {{ para }}
                    </p>
                </div>
                <div v-if="finalResult?.features" class="result-features">
                    <ul>
                        <li v-for="(feature, index) in finalResult.features" :key="index">
                            {{ feature }}
                        </li>
                    </ul>
                </div>
            </div>
            <div class="button-row">
                <button v-if="resetButtonText" class="reset-button" @click="reset">
                    {{ resetButtonText }}
                </button>
                <a v-if="learnMoreText && finalResult?.url" :href="finalResult.url" class="learn-more-button">
                    {{ learnMoreText }}
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.method-selector {
    max-width: 600px;
    margin: 2rem auto;
    font-family: system-ui, -apple-system, sans-serif;
}

.selector-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    text-align: center;
    margin: 0 0 1.5rem 0;
}

.question-card,
.result-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.question-header {
    margin-bottom: 2rem;
}

.step-indicator {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: #f3f4f6;
    border-radius: 12px;
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
}

.question-content {
    margin-bottom: 2.5rem;
}

.question-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 1rem 0;
    line-height: 1.4;
}

.question-description {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
}

.question-description p {
    margin: 0 0 0.75rem 0;
    line-height: 1.6;
}

.question-description p:last-child {
    margin-bottom: 0;
}

.button-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.choice-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    min-height: 120px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
}

.choice-button:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.choice-button:active {
    transform: translateY(0);
}

.button-hint {
    font-size: 1rem;
    color: #111827;
    font-weight: 500;
    text-align: center;
}

.button-hint p {
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
}

.button-hint p:last-child {
    margin-bottom: 0;
}

.result-card {
    text-align: center;
}

.result-icon {
    font-size: 3rem;
    margin-bottom: 1.5rem;
}

.result-title {
    font-size: 1.25rem;
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 2rem 0;
}

.result-content {
    margin-bottom: 2.5rem;
}

.result-method {
    font-size: 1.75rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 1.25rem 0;
}

.result-description {
    font-size: 1rem;
    color: #6b7280;
    margin: 0 0 2rem 0;
}

.result-description p {
    margin: 0 0 0.75rem 0;
    line-height: 1.6;
}

.result-description p:last-child {
    margin-bottom: 0;
}

.result-features {
    text-align: left;
    background: #f9fafb;
    border-radius: 8px;
    padding: 1rem 1.5rem;
}

.result-features h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.result-features ul {
    margin: 0;
    padding-left: 1.25rem;
}

.result-features li {
    color: #4b5563;
    margin-bottom: 0.5rem;
    line-height: 1.5;
}

.button-row {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

.reset-button,
.learn-more-button {
    padding: 0.75rem 2rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
    font-family: inherit;
    text-decoration: none;
    display: inline-block;
}

.reset-button:hover,
.learn-more-button:hover {
    background: #2563eb;
}

.reset-button:active,
.learn-more-button:active {
    background: #1d4ed8;
}

@media (max-width: 640px) {
    .method-selector {
        margin: 1rem;
    }

    .question-card,
    .result-card {
        padding: 1.5rem;
    }

    .button-group {
        grid-template-columns: 1fr;
    }

    .question-title {
        font-size: 1.25rem;
    }
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {

    .question-card,
    .result-card {
        background: #1f2937;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .step-indicator {
        background: #374151;
        color: #9ca3af;
    }

    .selector-title,
    .question-title,
    .result-method {
        color: #f9fafb;
    }

    .question-description,
    .result-title,
    .result-description {
        color: #d1d5db;
    }

    .choice-button {
        background: #111827;
        border-color: #374151;
    }

    .choice-button:hover {
        border-color: #3b82f6;
    }

    .button-hint {
        color: #f9fafb;
    }

    .result-features {
        background: #111827;
    }

    .result-features h4 {
        color: #e5e7eb;
    }

    .result-features li {
        color: #d1d5db;
    }

    .reset-button,
    .learn-more-button {
        background: #3b82f6;
    }

    .reset-button:hover,
    .learn-more-button:hover {
        background: #2563eb;
    }

    .reset-button:active,
    .learn-more-button:active {
        background: #1d4ed8;
    }
}
</style>
