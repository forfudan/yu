<!--
  OptimizedFetchSearch.vue - 優化的搜索數據獲取組件（使用壓縮JSON）
  
  Modification History:
  - 2025-08-14 by 朱複丹: 初版，生成優化版本的拆分數據獲取組件，讀取壓縮JSON文件
-->

<script setup lang="ts">
import { shallowRef, watch, onMounted, computed } from "vue";
import Search from "./Search.vue";
import { ZigenMap, ChaifenMap, fetchZigen } from "./share";
import ChaiDataLoader from "./ChaiDataLoader";

const p = defineProps<{
    chaifenUrl: string,  // Required - specifies which chaifen file to use
    zigenUrl: string,
    supplement: boolean,
    ming?: boolean,
    wafel?: boolean,
    modelValue?: string, // 支持 v-model 传入用户输入
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const chaifenMap = shallowRef<ChaifenMap>()
const zigenMap = shallowRef<ZigenMap>()
const isLoading = shallowRef(false)
const isDataLoaded = shallowRef(false)
const userInput = shallowRef(p.modelValue || '')
const loadError = shallowRef<string | null>(null)

// 诗词数组和随机选择
const poets: string[] = [
    "小樓一夜聽春雨　深巷明朝賣杏花",
    "休對故人思故國　且將新火試新茶",
    "三十功名塵與土　八千里路雲和月",
    "落花人獨立　微雨燕雙飛",
    "玲瓏骰子安紅豆　入骨相思知不知",
    "兩情若是久長時　又豈在朝朝暮暮",
    "身無彩鳳雙飛翼　心有靈犀一點通",
    "自在飛花輕似夢　無邊絲雨細如愁",
    "醉後不知天在水　滿船清夢壓星河",
    "東風夜放花千樹　更吹落　星如雨",
    "鳳蕭聲動　玉壸光轉　一夜魚龍舞",
    "爲君持酒勸斜陽　且向花間留晚照",
    "綠楊煙外曉寒輕　紅杏枝頭春意鬧",
    '城中桃李愁風雨　春在溪頭薺菜花',
    '未是秋光奇绝　看十五十六',
    "無可奈何花落去　似曾相識燕歸來",
    "但願人長久　千里共嬋娟",
    "大江東去　浪淘盡千古風流人物",
    "明月幾時有　把酒問青天",
    "一蓑煙雨任平生　也無風雨也無晴",
    "縱豆蔻詞工　青樓夢好　難賦深情",
    "衣帶漸寬終不悔　為伊消得人憔悴",
];

const randomPoetry = computed(() => {
    const index = Math.floor(Math.random() * poets.length);
    return poets[index];
})

// 同步外部传入的值
watch(() => p.modelValue, (newValue) => {
    if (newValue !== undefined && newValue !== userInput.value) {
        userInput.value = newValue
        // 如果外部传入的值不为空且数据还没加载，立即加载数据
        if (newValue.trim().length > 0 && !isDataLoaded.value) {
            loadData()
        }
    }
}, { immediate: true })

// 当内部值改变时，通知父组件
watch(userInput, (newValue) => {
    emit('update:modelValue', newValue)
    // 当用户开始输入时加载数据
    if (newValue.trim().length > 0 && !isDataLoaded.value) {
        loadData()
    }
})

// 监听数据加载状态和用户输入，确保组件创建时能正确显示结果
watch([isDataLoaded, userInput], ([dataLoaded, input]) => {
    // 当数据加载完成且有用户输入时，触发搜索显示
    if (dataLoaded && input && input.trim().length > 0) {
        console.log(`🔍 Data loaded, ready to search for: "${input}"`)
    }
})

// Get instance of optimized data loader for the specific file
const dataLoader = ChaiDataLoader.getInstance(p.chaifenUrl)

// Function to load data with performance monitoring
async function loadData() {
    if (isDataLoaded.value || isLoading.value) return

    isLoading.value = true
    loadError.value = null
    const startTime = performance.now()

    try {
        // Load optimized data and zigen data in parallel
        const [optimizedData, zigen] = await Promise.all([
            dataLoader.loadData(),
            fetchZigen(p.zigenUrl)
        ])

        // Convert optimized data to legacy format for compatibility
        const chaifenData: ChaifenMap = new Map()
        for (const [char, data] of Object.entries(optimizedData)) {
            chaifenData.set(char, {
                char,
                division: data.d || '',
                division_tw: data.dt || '',
                region: data.r || ''
            })
        }

        chaifenMap.value = chaifenData
        zigenMap.value = zigen
        isDataLoaded.value = true

        const loadTime = performance.now() - startTime
        console.log(`🚀 Search data loaded in ${loadTime.toFixed(2)}ms`)
        console.log(`📦 Characters: ${chaifenData.size}`)
        console.log(`📁 Source: ${p.chaifenUrl}`)

    } catch (error) {
        console.error('Failed to load search data:', error)
        loadError.value = error instanceof Error ? error.message : 'Unknown error'
    } finally {
        isLoading.value = false
    }
}// Preload data if user hasn't interacted yet (optional optimization)
onMounted(() => {
    // 如果组件创建时已经有输入值，立即加载数据
    if (userInput.value.trim().length > 0) {
        loadData()
    }
    // Uncomment to preload data immediately
    // loadData()
})

// Fast search function using optimized loader
function quickSearch(query: string) {
    if (!isDataLoaded.value || !query.trim()) return []

    // Use the optimized search from the data loader
    return dataLoader.search(query)
}
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

        <!-- Performance info (only in development) -->

        <!-- Loading state -->
        <div v-if="isLoading" class="text-gray-600 text-center py-4">
            <div class="loading loading-spinner loading-sm mr-2"></div>
            正在加载拆分数据……
        </div>

        <!-- Error state -->
        <div v-else-if="loadError" class="alert alert-error mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>加载失败：{{ loadError }}</span>
        </div>

        <!-- Search component (only when data is loaded) -->
        <Search v-if="isDataLoaded && chaifenMap && zigenMap" :chaifenMap="chaifenMap" :zigenMap="zigenMap"
            :supplement="p.supplement" :ming="p.ming || false" :wafel="p.wafel || false"
            v-model:userInput="userInput" />

        <!-- Show poetry when no input and no data loaded yet -->
        <div v-else-if="!userInput.trim() && !isLoading && !loadError"
            class="opacity-40 text-center p-9 tracking-widest">
            {{ randomPoetry }}
        </div>

        <!-- Empty state -->
        <div v-else-if="userInput.trim().length > 0 && !isLoading" class="text-gray-500 text-center py-4">
            开始输入以查看拆分……
        </div>
    </div>
</template>
