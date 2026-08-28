<!--
  Search.vue - 搜索結果展示組件
  
  Modification History:
  - 2025-08-14 by 朱複丹: 优化组件间通信，使用v-model进行数据绑定
  - 2025-08-13 by 朱複丹: 增加參數 ming，允許對日月方案進行編碼
  - 2024-12-16 by yb6b: feat: Search component searchParm Prop
  - 2024-04-24 by 朱複丹: 增加對天碼的支持
  - 2024-03-27 by 朱複丹: 增加參數 supplement，判斷是否需要回頭碼
  - 2024-03-27 by yb6b: 製作拆分查詢的組件
  - 2025-12-16 by 朱複丹: 增加靈明方案.
-->

<script setup lang="ts">
import { shallowRef, ref, computed, watch, nextTick } from "vue";
import { watchThrottled, useUrlSearchParams } from "@vueuse/core";
import Card from "./Card.vue";
import LingCard from "./LingCard.vue";
import { captureElement } from "./capture";
import { ChaifenMap, ZigenMap } from "./share";
const p = defineProps<{
    chaifenMap: ChaifenMap,
    zigenMap: ZigenMap,
    rule: string,
    /** 是否启用URL里的搜索Params */
    searchParam?: boolean,
    /** 用户输入 */
    userInput?: string,
}>()

const emit = defineEmits<{
    'update:userInput': [value: string]
}>()

const urlSearchParams = useUrlSearchParams()
const localUserInput = shallowRef(p.userInput || urlSearchParams?.q || '')
const searchZigens = shallowRef<string[]>()

// Watch for changes in userInput prop
watch(() => p.userInput, (newInput) => {
    if (newInput !== undefined && newInput !== localUserInput.value) {
        localUserInput.value = newInput
    }
}, { immediate: true })

// Watch local input changes and emit to parent
watch(localUserInput, (newValue) => {
    emit('update:userInput', newValue as string)
}, { immediate: false })

watchThrottled(localUserInput, () => {
    const user = localUserInput.value as string
    if (p.searchParam) {
        urlSearchParams.q = user
    }
    searchZigens.value = [...user].filter(zi => p.chaifenMap.has(zi))
}, { throttle: 300, immediate: true })

const cardsRef = ref<HTMLElement | null>(null)
const isCapturingAll = shallowRef(false)

/** 一次截下結果區裏的所有卡片，所見即所得 */
async function captureAll() {
    const el = cardsRef.value
    if (!el || isCapturingAll.value) return
    const cards = [...el.children] as HTMLElement[]
    if (!cards.length) return

    isCapturingAll.value = true
    try {
        // 卡片上的圖標欄本來就要懸停才顯示，截圖時鼠標在按鈕上，不必額外隱藏
        await nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))

        // 卡片是居中排的，容器兩側常留大片空白，按卡片的實際範圍裁掉
        const base = el.getBoundingClientRect()
        const pad = 8
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
        for (const card of cards) {
            const r = card.getBoundingClientRect()
            left = Math.min(left, r.left); top = Math.min(top, r.top)
            right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom)
        }

        await captureElement(el, {
            filename: `宇浩反查_${(localUserInput as unknown as string) || ''}`.slice(0, 60),
            backgroundColor: getComputedStyle(document.body).backgroundColor,
            crop: {
                x: left - base.left - pad,
                y: top - base.top - pad,
                width: right - left + pad * 2,
                height: bottom - top + pad * 2,
            },
        })
    } catch (err) {
        console.error('截圖失敗:', err)
        alert('截圖失敗')
    } finally {
        isCapturingAll.value = false
    }
}

/** 卡片張數，搜索欄靠它決定顯不顯示截圖圖標 */
const cardCount = computed(() => searchZigens.value?.length ?? 0)

defineExpose({ captureAll, cardCount, isCapturingAll })

let poets: string[] =
    ["小樓一夜聽春雨　深巷明朝賣杏花",
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
    ];
const ind: number =
    Math.floor(Math.random() * poets.length);
const poet: string = poets[ind];

</script>

<template>
    <div v-if="!localUserInput" class="opacity-40 text-center p-9 tracking-widest">{{ poet }}</div>
    <div v-else>
        <div ref="cardsRef" class="flex justify-center flex-wrap my-8">
            <!-- 靈明用畫對應關係的新卡片，其餘方案照舊 -->
            <template v-if="p.rule === 'ling'">
                <LingCard v-for="zigen in searchZigens" :key="zigen" :chaifen="chaifenMap.get(zigen)" :zigenMap />
            </template>
            <template v-else>
                <Card v-for="zigen in searchZigens" :key="zigen" :chaifen="chaifenMap.get(zigen)" :zigenMap
                    :rule="p.rule" />
            </template>
        </div>
    </div>

</template>