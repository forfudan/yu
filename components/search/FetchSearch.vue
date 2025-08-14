<!--
  FetchSearch.vue - 搜索數據獲取和輸入管理組件
  
  Modification History:
  - 2025-08-14 by 朱複丹: 實現懶惰加载和輸入框管理，优化拆分文件加载性能
  - 2024-04-24 by 朱複丹: 增加對天碼的支持
  - 2024-03-27 by 朱複丹: 增加參數 supplement，判斷是否需要回頭碼
  - 2024-03-27 by yb6b: 製作拆分查詢的組件
-->

<script setup lang="ts">
import { shallowRef, watch } from "vue";
import Search from "./Search.vue";
import { ZigenMap, ChaifenMap, fetchChaifen, fetchZigen } from "./share";

const p = defineProps<{
    chaifenUrl: string,
    zigenUrl: string,
    supplement: boolean,
    ming?: boolean,
}>()

const chaifenMap = shallowRef<ChaifenMap>()
const zigenMap = shallowRef<ZigenMap>()
const isLoading = shallowRef(false)
const isDataLoaded = shallowRef(false)
const userInput = shallowRef('')

// Function to load data
async function loadData() {
    if (isDataLoaded.value || isLoading.value) return

    isLoading.value = true
    try {
        const [chaifen, zigen] = await Promise.all([
            fetchChaifen(p.chaifenUrl),
            fetchZigen(p.zigenUrl)
        ])
        chaifenMap.value = chaifen
        zigenMap.value = zigen
        isDataLoaded.value = true
    } catch (error) {
        console.error('Failed to load search data:', error)
    } finally {
        isLoading.value = false
    }
}

// Watch for user input and load data when user starts typing
watch(userInput, (newValue) => {
    if (newValue.trim().length > 0 && !isDataLoaded.value) {
        loadData()
    }
}, { immediate: false })
</script>

<template>
    <div>
        <!-- Always show the input field -->
        <label class="input input-bordered bg-gray-100 dark:bg-slate-800 flex items-center gap-2 mt-2">
            <input v-model="userInput" type="text" class="grow" placeholder="輸入漢字查詢拆分和編碼" />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-4 w-4 opacity-70">
                <path fill-rule="evenodd"
                    d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                    clip-rule="evenodd" />
            </svg>
        </label>

        <!-- Loading state -->
        <div v-if="isLoading" class="text-gray-600 text-center py-4">
            正在加载拆分数据……
        </div>

        <!-- Search component (only when data is loaded) -->
        <Search v-else-if="isDataLoaded && chaifenMap && zigenMap" :chaifenMap="chaifenMap" :zigenMap="zigenMap"
            :supplement="p.supplement" :ming="p.ming || false" v-model:userInput="userInput" />

        <!-- Empty state -->
        <div v-else-if="userInput.trim().length > 0" class="text-gray-500 text-center py-4">
            开始输入以查看拆分……
        </div>
    </div>
</template>