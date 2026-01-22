<script setup lang="ts">
//@ts-nocheck
import ZitongLogo from "./assets/zitong.svg";
import YedianLogo from "./assets/yedian.png";
import CtextLogo from "./assets/ctext.png";
import HandianLogo from "./assets/handian.png";
import CaptureLogo from "./assets/capture.svg";
import { computed, ref, nextTick } from "vue";
import { Chaifen, ZigenMap, makeCodesFromDivision } from "./share";
import html2canvas from "html2canvas-pro";

const p = defineProps<{
    chaifen: Chaifen,
    zigenMap: ZigenMap,
    rule: string,
}>()

const cardRef = ref<HTMLElement | null>(null)
const showLogoArea = ref(true)
const isCapturing = ref(false)
const shrinkCard = ref(false) // 用於臨時收縮卡片

const uriText = computed(() => encodeURIComponent(p.chaifen.char))
const unicode = computed(() => p.chaifen.char.codePointAt(0).toString(16).toUpperCase())

const codes = computed(() => makeCodesFromDivision(p.chaifen.division, p.zigenMap, p.rule))
const codes_tw = computed(() => p.chaifen.division_tw == '' ? '' : makeCodesFromDivision(p.chaifen.division_tw, p.zigenMap, p.rule))

// 為每個字根生成編碼，首字母大寫
const capitalizeFirstLetter = (str: string) => {
    if (!str) return str
    return str[0].toUpperCase() + str.slice(1)
}

const rootCodes = computed(() => {
    const divisionArray = [...p.chaifen.division]
    return divisionArray.map(zigen => capitalizeFirstLetter(p.zigenMap.get(zigen)?.ma || '?'))
})

const rootCodes_tw = computed(() => {
    if (!p.chaifen.division_tw) return []
    const divisionArray = [...p.chaifen.division_tw]
    return divisionArray.map(zigen => capitalizeFirstLetter(p.zigenMap.get(zigen)?.ma || '?'))
})

// 拍照並複製到剪貼板，失敗時下載圖片
async function captureCard() {
    if (!cardRef.value || isCapturing.value) return
    
    isCapturing.value = true
    
    // 隱藏logo區域並收縮卡片
    showLogoArea.value = false
    shrinkCard.value = true
    
    // 等待 Vue 的 DOM 更新完成
    await nextTick()
    
    // 額外等待瀏覽器重排
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
        const canvas = await html2canvas(cardRef.value, {
            backgroundColor: null,
            scale: 2, // 提高清晰度
            logging: false,
        })
        
        // 將 canvas 轉換為 blob
        canvas.toBlob(async (blob) => {
            if (!blob) {
                alert('生成圖片失敗')
                return
            }
            
            try {
                // 嘗試複製到剪貼板
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ])
                
                console.log('卡片已複製到剪貼板')
            } catch (err) {
                console.error('複製到剪貼板失敗，改為下載:', err)
                
                // 複製失敗時，自動下載圖片
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${p.chaifen.char}_${unicode.value}.png`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                
                console.log('圖片已下載')
            }
        }, 'image/png')
        
    } catch (err) {
        console.error('截圖失敗:', err)
        alert('截圖失敗')
    } finally {
        // 恢復logo區域顯示和卡片狀態
        showLogoArea.value = true
        shrinkCard.value = false
        isCapturing.value = false
    }
}


</script>

<template>
    <div ref="cardRef" class="group border p-4 m-2 rounded-3xl shadow-md text-center bg-gray-50 dark:bg-slate-900"
         :class="{ 'self-start': shrinkCard }">
        <div class="text-4xl text-indigo-800 dark:text-indigo-300" v-if="codes_tw == ''">
            <span class="zigen-font">{{ chaifen.char }}</span>
        </div>

        <div class="text-4xl text-indigo-800 dark:text-indigo-300" v-else>
            <span class="zigen-font tooltip" data-tip="首選字形標準">{{ chaifen.char }}</span>
            <span class="zigen-font-tc tooltip" data-tip="臺灣字形標準">·{{ chaifen.char }}</span>
        </div>
        <div class="font-mono opacity-70 justify-center transition text-sm my-1">{{ unicode }}・{{ chaifen.region }}</div>

        <div class="flex flex-col" v-if="codes_tw == ''">
            <div class="flex justify-center gap-1 font-mono text-sm opacity-70 text-gray-600 dark:text-gray-400">
                <span v-for="(code, index) in rootCodes" :key="index">{{ code }}</span>
            </div>
            <div class="text-indigo-800 dark:text-indigo-300 text-xl">{{ chaifen.division }}</div>
            <div class="font-mono tracking-widest">{{ codes }}</div>
        </div>

        <div class="flex" v-else>
            <div class="flex flex-col ml-3 tooltip" data-tip="首選字形標準拆分">
                <div class="flex justify-center gap-1 font-mono text-sm opacity-70 text-gray-600 dark:text-gray-400">
                    <span v-for="(code, index) in rootCodes" :key="index">{{ code }}</span>
                </div>
                <div class="text-indigo-800 dark:text-indigo-300">{{ chaifen.division }}</div>
                <div class="font-mono tracking-widest">{{ codes }}</div>
            </div>
            <div class="flex flex-col ml-3 tooltip" data-tip="臺灣字形標準拆分">
                <div class="flex justify-center gap-1 font-mono text-sm opacity-70 text-gray-600 dark:text-gray-400">
                    <span v-for="(code, index) in rootCodes_tw" :key="index">{{ code }}</span>
                </div>
                <div class="text-indigo-800 dark:text-indigo-300">{{ chaifen.division_tw }}</div>
                <div class="font-mono tracking-widest">{{ codes_tw }}</div>
            </div>
        </div>

        <div v-if="showLogoArea" class="invisible group-hover:visible flex justify-center items-center dark:opacity-55 opacity-100">
            <a :href="'https://zi.tools/zi/' + uriText" class="" target="_blank" rel="noreferrer" title="字統網查詢">
                <img :src=ZitongLogo alt="字統網" width="22" />
            </a>
            <a :href="'https://www.zdic.net/hans/' + uriText" class="" target="_blank" rel="noreferrer"
                title="漢典查詢">
                <img :src="HandianLogo" alt="漢典網" width="22" />
            </a>
            <a :href="'https://ctext.org/dictionary.pl?if=gb&char=' + uriText" class="" target="_blank"
                rel="noreferrer" title="中國哲學書電子化計劃查詢">
                <img :src="CtextLogo" alt="中國哲學書電子化計劃" width="22" />
            </a>
            <button @click="captureCard" class="cursor-pointer ml-1" :disabled="isCapturing" title="複製卡片為圖片">
                <img :src="CaptureLogo" alt="複製" width="22" class="dark:invert" />
            </button>
        </div>
    </div>
</template>