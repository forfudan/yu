/**
 * cascadeStyles.ts - 训练卡片 Cascade 展示的公用样式和工具函数
 * 
 * 用于字根练习和单字练习组件的卡片滚动展示效果
 */

import { computed, Ref } from 'vue';

/**
 * 计算卡带单元格宽度
 * @param containerRef 容器元素的引用
 * @param windowWidth 窗口宽度
 * @returns 单元格宽度（像素）
 */
export function useCellWidth(containerRef: Ref<HTMLElement | undefined>, windowWidth: Ref<number>) {
    return computed(() => {
        const containerWidth = containerRef.value?.offsetWidth || windowWidth.value;
        const isWideScreen = windowWidth.value >= 720;
        const cellCount = isWideScreen ? 7 : 5; // 宽屏7个单元格，窄屏5个
        return containerWidth / cellCount;
    });
}

/**
 * 计算可视区域的偏移量（用于裁剪显示范围）
 * @param windowWidth 窗口宽度
 * @returns 左右各显示的单元格数量
 */
export function useVisibleOffset(windowWidth: Ref<number>) {
    return computed(() => {
        const isWideScreen = windowWidth.value >= 720;
        return isWideScreen ? 3 : 2; // 左右各显示几个
    });
}

/**
 * 计算中间位置（格子索引）
 * @param windowWidth 窗口宽度
 * @returns 中间位置的索引
 */
export function useCenterPosition(windowWidth: Ref<number>) {
    return computed(() => {
        const isWideScreen = windowWidth.value >= 720;
        return isWideScreen ? 3 : 2; // 宽屏时在格子3，窄屏时在格子2
    });
}

/**
 * 判断元素是否在可视范围内（用于优化显示）
 * @param offset 相对于当前项的偏移
 * @param visibleOffset 可视偏移量
 * @returns 是否在可视范围内
 */
export function isInVisibleRange(offset: number, visibleOffset: number): boolean {
    return Math.abs(offset) <= visibleOffset;
}

/**
 * Cascade 项接口
 */
export interface CascadeItem<T> {
    /** 数据项 */
    item: T;
    /** 相对于当前项的偏移 */
    offset: number;
    /** 在数组中的索引 */
    index: number;
    /** 是否为当前项 */
    isCurrent: boolean;
}

/**
 * 生成可见的 cascade 项列表
 * @param items 所有项的数组
 * @param currentIndex 当前索引
 * @returns Cascade 项列表
 */
export function useVisibleItems<T>(items: Ref<T[]>, currentIndex: Ref<number>) {
    return computed<CascadeItem<T>[]>(() => {
        if (!items.value || items.value.length === 0) return [];

        const total = items.value.length;
        const current = currentIndex.value;

        // 直接渲染所有项，确保完全平滑的滑动效果
        const result: CascadeItem<T>[] = [];
        for (let i = 0; i < total; i++) {
            result.push({
                item: items.value[i],
                offset: i - current,
                index: i,
                isCurrent: i === current
            });
        }

        return result;
    });
}

/**
 * 计算当前元素在可见列表中的位置
 * @param visibleItems 可见项列表
 * @returns 当前项的索引
 */
export function useCurrentPositionInVisible<T>(visibleItems: Ref<CascadeItem<T>[]>) {
    return computed(() => {
        const idx = visibleItems.value.findIndex(item => item.isCurrent);
        return idx >= 0 ? idx : 0;
    });
}
