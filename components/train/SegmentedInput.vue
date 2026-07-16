<!--
    SegmentedInput.vue - 分段編碼輸入框

    將編碼按字母拆成一格一格輸入，
    - 每格一個字母，輸入後自動前進，退格自動回退。
    - 支援貼上整串編碼。
    - 透過 status 控制配色（idle / correct / wrong）。
    - 暴露 focus() 供父組件協調跨輸入框的焦點。

    參考：
    https://zigen-trainer.hch12907.dev/ (https://github.com/hch12907/zigen-trainer)
-->
<script setup lang="ts">
import { ref, computed, watch } from "vue";

const p = withDefaults(defineProps<{
    /** 編碼長度（格子數） */
    length: number;
    /** 當前輸入值 */
    modelValue: string;
    /** 狀態：idle 預設、correct 正確、wrong 錯誤 */
    status?: 'idle' | 'correct' | 'wrong';
    /** 是否禁用 */
    disabled?: boolean;
    /** 格子尺寸：xs 緊湊 / sm 手機 / md 桌面 */
    size?: 'xs' | 'sm' | 'md';
}>(), {
    status: 'idle',
    disabled: false,
    size: 'md',
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
    /** 所有格子填滿時觸發 */
    (e: 'complete'): void;
    /** 在第一格按下退格且爲空時觸發（供父組件回退到上一個輸入框） */
    (e: 'prev'): void;
}>();

const cellRefs = ref<(HTMLInputElement | null)[]>([]);

// 將 modelValue 拆成字元陣列，補齊到 length
const chars = computed(() => {
    const arr = Array.from(p.modelValue);
    while (arr.length < p.length) arr.push('');
    return arr.slice(0, p.length);
});

function setChars(arr: string[]) {
    const value = arr.join('').slice(0, p.length);
    emit('update:modelValue', value);
    if (value.length === p.length && arr.every(c => c !== '')) {
        emit('complete');
    }
}

function focusCell(i: number) {
    const el = cellRefs.value[i];
    if (el) {
        el.focus();
        el.select?.();
    }
}

/** 聚焦第一個空格，否則最後一格 */
function focus() {
    const arr = chars.value;
    let target = arr.findIndex(c => c === '');
    if (target === -1) target = p.length - 1;
    focusCell(target);
}

defineExpose({ focus });

function onInput(e: Event, i: number) {
    const el = e.target as HTMLInputElement;
    const raw = el.value;
    // 取最後一個輸入字元，只接受英文字母並轉小寫
    const ch = raw.slice(-1).toLowerCase();
    const arr = chars.value.slice();

    if (!/[a-z]/.test(ch)) {
        // 非法字元，還原顯示
        el.value = arr[i];
        return;
    }

    arr[i] = ch;
    setChars(arr);

    // 前進到下一格
    if (i < p.length - 1) {
        focusCell(i + 1);
    }
}

function onKeydown(e: KeyboardEvent, i: number) {
    const arr = chars.value.slice();
    if (e.key === 'Backspace') {
        e.preventDefault();
        if (arr[i]) {
            arr[i] = '';
            setChars(arr);
        } else if (i > 0) {
            arr[i - 1] = '';
            setChars(arr);
            focusCell(i - 1);
        } else {
            emit('prev');
        }
    } else if (e.key === 'ArrowLeft' && i > 0) {
        e.preventDefault();
        focusCell(i - 1);
    } else if (e.key === 'ArrowRight' && i < p.length - 1) {
        e.preventDefault();
        focusCell(i + 1);
    }
}

function onPaste(e: ClipboardEvent, i: number) {
    e.preventDefault();
    const text = (e.clipboardData?.getData('text') || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!text) return;
    const arr = chars.value.slice();
    let pos = i;
    for (const ch of text) {
        if (pos >= p.length) break;
        arr[pos] = ch;
        pos++;
    }
    setChars(arr);
    focusCell(Math.min(pos, p.length - 1));
}

// 當外部清空 modelValue 時，焦點回到第一格
watch(() => p.modelValue, (val) => {
    if (val === '') {
        // 由父組件決定是否聚焦，這裡不主動搶焦點
    }
});

const cellClass = computed(() => {
    switch (p.size) {
        case 'xs': return 'w-5 h-7 text-sm';
        case 'sm': return 'w-7 h-9 text-lg';
        default: return 'w-10 h-12 text-2xl';
    }
});
</script>

<template>
    <div class="inline-flex gap-1">
        <input v-for="(ch, i) in chars" :key="i" ref="cellRefs" type="text" inputmode="text"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" :value="ch"
            :disabled="disabled" :class="[
                'text-center font-mono font-bold rounded-md border-2 outline-none transition-all duration-200 caret-transparent',
                cellClass,
                {
                    'border-red-400 bg-red-50 text-red-600 focus:ring-2 focus:ring-red-300 dark:border-red-600 dark:bg-red-900/20 dark:text-red-300': status === 'wrong',
                    'border-green-400 bg-green-50 text-green-700 focus:ring-2 focus:ring-green-300 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300': status === 'correct',
                    'border-gray-300 bg-white text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40': status === 'idle',
                }
            ]" @input="onInput($event, i)" @keydown="onKeydown($event, i)" @paste="onPaste($event, i)" />
    </div>
</template>
