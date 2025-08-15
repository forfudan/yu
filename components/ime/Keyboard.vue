<!--
    Keyboard.vue - 虛擬鍵盤顯示組件
    
    Modification History:
    - 2025-08-15 by 朱複丹: 重構版本，改善鍵盤交互體驗和視覺效果
    - 2024-06-25 by yb6b: 初版
-->

<script setup lang="ts">
defineEmits<{
    click: [keyName: string]
}>()
</script>

<template>
    <!-- 候选编码 -->
    <slot name="codes"></slot>

    <div class="text-xl bg-neutral-50 dark:bg-neutral-900 w-full text-slate-900 dark:text-slate-400 select-none">
        <!-- 候选栏 -->
        <div class="flex min-h-9 h-9 text-base bg-neutral-100 dark:bg-neutral-800 pt-1 break-keep text-nowrap w-full">
            <slot name="cadidate"></slot>
        </div>

        <!-- 键盘主体：使用垂直网格布局 -->
        <div class="grid grid-cols-10 gap-0.5 p-1">
            <!-- 第一行：qwertyuiop -->
            <button v-for="k in 'qwertyuiop'" :key="k"
                class="aspect-square hover:bg-slate-300 hover:dark:bg-slate-800 flex items-center justify-center"
                @click="$emit('click', k)">
                {{ k }}
            </button>

            <!-- 第二行：asdfghjkl; -->
            <button v-for="k in 'asdfghjkl;'" :key="k"
                class="aspect-square hover:bg-slate-300 hover:dark:bg-slate-800 flex items-center justify-center"
                @click="$emit('click', k)">
                {{ k }}
            </button>

            <!-- 第三行：zxcvbnm,./ -->
            <button v-for="k in 'zxcvbnm,./'" :key="k"
                class="aspect-square hover:bg-slate-300 hover:dark:bg-slate-800 flex items-center justify-center"
                @click="$emit('click', k)">
                {{ k }}
            </button>
        </div>

        <!-- 空格键行：中/英切换、空格、删除 -->
        <div class="flex gap-0.5 p-1">
            <button
                class="w-12 hover:bg-slate-300 hover:dark:bg-slate-800 py-3 text-sm text-neutral-500 border rounded flex items-center justify-center"
                @click="$emit('click', 'toggle-lang')">
                中/英
            </button>
            <button
                class="flex-1 hover:bg-slate-300 hover:dark:bg-slate-800 py-3 text-sm text-neutral-500 rounded flex items-center justify-center"
                @click="$emit('click', ' ')">
                空格
            </button>
            <button
                class="w-12 text-neutral-400 hover:bg-slate-300 hover:dark:bg-slate-800 flex justify-center items-center rounded"
                @click="$emit('click', 'bs')">
                <!-- 退格按钮 -->
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor"
                        d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-3 12.59L17.59 17L14 13.41L10.41 17L9 15.59L12.59 12L9 8.41L10.41 7L14 10.59L17.59 7L19 8.41L15.41 12" />
                </svg>
            </button>
        </div>
    </div>
</template>
