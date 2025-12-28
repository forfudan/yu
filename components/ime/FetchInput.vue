<!--
    FetchInput.vue - 輸入法數據加載組件

    Modification History:
    - 2025-08-15 by 朱複丹: 重構版本，提升數據加載性能和穩定性
      使用json文件代替原始txt
    - 2024-06-25 by yb6b: 初版
-->

<script setup lang="ts">
import * as utils from './share'
import { onMounted, shallowRef, ref } from "vue";
import InputMethod from './InputMethod.vue'

const p = defineProps<{
    /** 码表文件的URL */
    mabiaoUrl: string
    /** 方案的ID，用于保存localstorage */
    id?: string
    /** 方案的規則名稱：'ling'（靈明4碼）、'ming'（日月5碼）或其他（默認宇浩5碼） */
    ruleName?: string
}>()

const mabiaoList = shallowRef<utils.MabiaoItem[]>()

const progress = ref({ max: 0, current: 0 })

onMounted(async () => {
    try {
        mabiaoList.value = await utils.fetchMabiao(p.mabiaoUrl, progress)
        console.log('✅ Mabiao loaded successfully:', mabiaoList.value?.length, 'items')
    } catch (error) {
        console.error('❌ Failed to load mabiao:', error)
    }
})

</script>

<template>
    <div class="text-gray-600 text-center mt-10" v-if="!mabiaoList">
        <div class="text-center">下载码表……</div>
        <progress class="progress progress-info w-full max-w-screen-sm" :value="progress.current"
            :max="progress.max"></progress>
    </div>
    <InputMethod v-else :id="id || mabiaoUrl" :rule="utils.getRuleConfig(p.ruleName)" :data="mabiaoList">
        <slot></slot>
    </InputMethod>
</template>
