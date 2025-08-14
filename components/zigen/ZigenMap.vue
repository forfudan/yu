<!--
  ZigenMap.vue - 字根图组件
  
  Features:
  - QWERTY键盘布局显示字根分布
  - 支持多种输入方案切换（卿雲、光華、星陳、日月）
  - 悬停显示例字卡片
  - 响应式布局，自适应窗口宽度
  - 紧凑的卡片式设计
  
  Modification History:
  - 2025-08-14 by 朱複丹: 初版，实现基础功能和样式优化
-->

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { fetchZigen } from "../search/share";
import ChaiDataLoader from "../search/ChaiDataLoader";
import type { ZigenMap as ZigenMapType } from "../search/share";

interface ZigenScheme {
    id: string
    name: string
    zigenUrl: string
    chaifenUrl: string
}

// 键盘布局 - QWERTY垂直排列
const keyboardLayout = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];

// 需要显示但暂时留空的键
const emptyKeys = [',', '.', '/', ';', "'"];

// 支持的方案
const schemes: ZigenScheme[] = [
    {
        id: 'joy',
        name: '卿雲',
        zigenUrl: '/zigen-joy.csv',
        chaifenUrl: '/chaifen.json'
    },
    {
        id: 'light',
        name: '光華',
        zigenUrl: '/zigen-light.csv',
        chaifenUrl: '/chaifen.json'
    },
    {
        id: 'star',
        name: '星陳',
        zigenUrl: '/zigen-star.csv',
        chaifenUrl: '/chaifen.json'
    },
    {
        id: 'ming',
        name: '日月',
        zigenUrl: '/zigen-ming.csv',
        chaifenUrl: '/chaifen.json'
    }
];

// 响应式状态
const activeScheme = ref('star');
const zigenMap = ref<ZigenMapType>();
const chaifenLoader = ref<ChaiDataLoader>();
const isLoading = ref(false);
const hoveredZigen = ref<string | null>(null);
const hoverPosition = ref({ x: 0, y: 0 });
const exampleChars = ref<string[]>([]);

// 当前方案
const currentScheme = computed(() => {
    return schemes.find(s => s.id === activeScheme.value) || schemes[0];
});

// 按键分组的字根
const zigenByKey = computed(() => {
    if (!zigenMap.value) return {};

    const result: Record<string, Array<{ font: string, code: string }>> = {};

    for (const [font, data] of zigenMap.value) {
        const firstLetter = data.ma[0].toLowerCase();
        if (!result[firstLetter]) {
            result[firstLetter] = [];
        }
        result[firstLetter].push({
            font,
            code: data.ma.slice(1) // 剩余字母
        });
    }

    return result;
});

// 获取包含指定字根的例字
const getExampleChars = async (zigen: string): Promise<string[]> => {
    if (!chaifenLoader.value) return [];

    try {
        const allChars = await chaifenLoader.value.loadData();
        const examples: string[] = [];

        for (const [char, data] of Object.entries(allChars)) {
            // 类型安全的检查
            const charData = data as { d?: string, dt?: string, r?: string };
            if (charData.d?.includes(zigen)) {
                examples.push(char);
                if (examples.length >= 20) break;
            }
        }
        return examples;
    } catch (error) {
        console.error('获取例字失败:', error);
        return [];
    }
};

// 加载数据
async function loadData() {
    isLoading.value = true;
    try {
        // 加载字根数据
        const zigenData = await fetchZigen(currentScheme.value.zigenUrl);
        zigenMap.value = zigenData;

        // 初始化拆分数据加载器
        chaifenLoader.value = ChaiDataLoader.getInstance(currentScheme.value.chaifenUrl);

    } catch (error) {
        console.error('加载数据失败:', error);
    } finally {
        isLoading.value = false;
    }
}

// 处理字根悬停
async function handleZigenHover(event: MouseEvent, zigen: string) {
    hoveredZigen.value = zigen;
    hoverPosition.value = { x: event.clientX, y: event.clientY };

    // 异步加载例字
    exampleChars.value = await getExampleChars(zigen);
}

function handleZigenLeave() {
    hoveredZigen.value = null;
    exampleChars.value = [];
}

// 切换方案
function switchScheme(schemeId: string) {
    activeScheme.value = schemeId;
}

// 监听方案变化
watch(() => activeScheme.value, loadData);

// 初始化
onMounted(loadData);
</script>

<template>
    <div class="zigen-map-container">
        <!-- 方案切换标签 -->
        <div class="tabs tabs-boxed mb-4 bg-base-200">
            <button v-for="scheme in schemes" :key="scheme.id" @click="switchScheme(scheme.id)"
                :class="['tab tab-lg', { 'tab-active': activeScheme === scheme.id }]">
                {{ scheme.name }}
            </button>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="flex justify-center items-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="ml-2">正在加载字根数据...</span>
        </div>

        <!-- 键盘字根图 -->
        <div v-else-if="zigenMap" class="keyboard-layout">
            <div v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex" class="keyboard-row">
                <div v-for="key in row" :key="key" class="keyboard-key"
                    :class="{ 'empty-key': emptyKeys.includes(key) }">
                    <!-- 键位标签 -->
                    <div class="key-label">{{ key.toUpperCase() }}</div>

                    <!-- 字根显示 -->
                    <div v-if="!emptyKeys.includes(key) && zigenByKey[key]" class="zigen-list">
                        <span v-for="(zigen, index) in zigenByKey[key]" :key="index" class="zigen-item"
                            @mouseenter="handleZigenHover($event, zigen.font)" @mouseleave="handleZigenLeave">
                            <span class="zigen-font">{{ zigen.font }}</span>
                            <span class="zigen-code">{{ zigen.code }}</span>
                        </span>
                    </div>

                    <!-- 无字根提示 -->
                    <div v-else-if="!emptyKeys.includes(key)" class="text-xs text-gray-400">
                        无字根
                    </div>
                </div>
            </div>
        </div>

        <!-- 悬停卡片 -->
        <div v-if="hoveredZigen" class="hover-card" :style="{
            left: hoverPosition.x + 10 + 'px',
            top: hoverPosition.y + 10 + 'px'
        }">
            <div class="card bg-base-100 shadow-xl border">
                <div class="card-body p-4">
                    <h3 class="card-title text-lg">
                        <span class="zigen-font">{{ hoveredZigen }}</span>
                    </h3>
                    <div v-if="exampleChars.length > 0" class="example-chars">
                        <h4 class="text-sm font-medium mb-2">例字：</h4>
                        <div class="chars-grid">
                            <span v-for="char in exampleChars" :key="char" class="example-char zigen-font">
                                {{ char }}
                            </span>
                        </div>
                    </div>
                    <div v-else class="text-sm text-gray-500">
                        正在加载例字...
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.zigen-map-container {
    width: 100%;
    min-width: 100%;
    margin: 0;
    position: relative;
    box-sizing: border-box;
}

.keyboard-layout {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    align-items: center;
    padding: 0.75rem;
    background-color: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    border-radius: 0.75rem;
    width: 100%;
    min-width: 100%;
    box-sizing: border-box;
}

.keyboard-row {
    display: flex;
    gap: 0.25rem;
    justify-content: center;
    width: 100%;
    flex-wrap: nowrap;
}

.keyboard-key {
    position: relative;
    flex: 1;
    min-width: 3rem;
    max-width: 8rem;
    min-height: 4.5rem;
    padding: 0.5rem 0.375rem;
    background: rgb(249 250 251);
    border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
    border-radius: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
}

.dark .keyboard-key {
    background: rgb(15 23 42);
}

.keyboard-key:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    border-color: var(--fallback-p, oklch(var(--p)/0.3));
}

.empty-key {
    opacity: 0.3;
    cursor: not-allowed;
    box-shadow: none;
}

.key-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--fallback-nc, oklch(var(--nc)/0.8));
    border-bottom: 1px solid var(--fallback-bc, oklch(var(--bc)/0.15));
    padding-bottom: 0.15rem;
    margin-bottom: 0.15rem;
    width: 100%;
    text-align: center;
}

.zigen-list {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 0.1rem;
    width: 100%;
    margin-top: 0.15rem;
    line-height: 1.0;
}

.zigen-item {
    font-size: 0.8rem;
    padding: 0.01rem 0.01rem;
    background: var(--fallback-n, oklch(var(--n)/0.05));
    border-radius: 0.2rem;
    color: var(--fallback-nc, oklch(var(--nc)/0.7));
    transition: all 0.15s ease;
    white-space: nowrap;
    cursor: pointer;
    border: 1px solid transparent;
    line-height: 1.0;
    margin: 0.01rem;
}

.zigen-item:hover {
    background: var(--fallback-p, oklch(var(--p)/0.1));
    color: var(--fallback-p, oklch(var(--p)/1));
    border-color: var(--fallback-p, oklch(var(--p)/0.3));
    transform: scale(1.05);
}

.zigen-font {
    font-family: 'Yuniversus', sans-serif;
    color: var(--fallback-p, oklch(var(--p)/var(--tw-text-opacity)));
    font-weight: 500;
    font-size: inherit;
}

.zigen-item:hover .zigen-font {
    color: var(--fallback-pc, oklch(var(--pc)/var(--tw-text-opacity)));
}

.zigen-code {
    font-family: monospace;
    font-size: inherit;
    color: var(--fallback-bc, oklch(var(--bc)/0.6));
    font-weight: 400;
}

.zigen-item:hover .zigen-code {
    color: var(--fallback-pc, oklch(var(--pc)/0.8));
}

.hover-card {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    max-width: 20rem;
}

.example-chars {
    margin-top: 0.5rem;
}

.chars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(1.5rem, 1fr));
    gap: 0.25rem;
    max-height: 8rem;
    overflow-y: auto;
}

.example-char {
    text-align: center;
    padding: 0.125rem;
    border-radius: 0.25rem;
    background-color: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    font-size: 0.875rem;
}

.hover-card {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    max-width: 20rem;
}

.example-chars {
    margin-top: 0.5rem;
}

.chars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(1.5rem, 1fr));
    gap: 0.25rem;
    max-height: 8rem;
    overflow-y: auto;
}

.example-char {
    text-align: center;
    padding: 0.125rem;
    border-radius: 0.25rem;
    background-color: var(--fallback-b2, oklch(var(--b2)/var(--tw-bg-opacity)));
    font-size: 0.875rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .keyboard-key {
        min-width: 2.5rem;
        min-height: 3rem;
    }

    .zigen-item {
        font-size: 0.75rem;
    }

    .key-label {
        font-size: 0.625rem;
    }
}

/* Tab样式 */
.tab {
    transition: all 0.2s ease;
}

.tab:hover {
    background-color: var(--fallback-b3, oklch(var(--b3)/var(--tw-bg-opacity)));
}

.tab-active {
    background-color: var(--fallback-p, oklch(var(--p)/var(--tw-bg-opacity)));
    color: var(--fallback-pc, oklch(var(--pc)/var(--tw-text-opacity)));
}
</style>
