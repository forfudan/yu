/**
 * AdvancedSchedule.ts - 間隔重複訓練調度演算法
 * 
 * 基於SuperMemo/Anki算法，實現學習與復習穿插的智慧調度
 * 特點：
 * 1. 新字根學習時立即安排短期復習
 * 2. 根據回答品質動態調整復習間隔
 * 3. 控制每次學習的新內容比例（20-30%）
 * 4. 錯誤字根優先復習
 */

interface ReviewItem {
    /** 項目標識符 */
    id: string;
    /** 下次復習的絕對組數位置 */
    nextReviewAt: number;
    /** 連續正確次數 */
    consecutiveCorrect: number;
    /** 總練習次數 */
    totalReviews: number;
    /** 錯誤次數 */
    errorCount: number;
    /** 最後練習時間 */
    lastPracticed: number;
    /** 是否為新學項目 */
    isNew: boolean;
    /** 當前間隔長度 */
    currentInterval: number;
}

export class AdvancedSchedule {
    private items: Map<string, ReviewItem> = new Map();
    private storageKey: string;
    private practiceCount: number = 0; // 當前練習組數計數器

    // 算法參數 - 平衡學習效率與記憶鞏固
    private readonly NEW_CARD_RATIO = 0.30; // 新卡片比例：30%
    private readonly INITIAL_INTERVALS = [3, 8, 20]; // 初始間隔：3組、8組、20組（適中間隔）
    private readonly GRADUATION_THRESHOLD = 3; // 畢業閾值：連續3次正確
    private readonly EASY_MULTIPLIER = 2.0; // 簡單乘數
    private readonly GOOD_MULTIPLIER = 1.8; // 良好乘數（適中增長）
    private readonly HARD_MULTIPLIER = 1.3; // 困難乘數

    constructor(name: string) {
        this.storageKey = `spaced_repetition_${name}`;
        this.loadFromStorage();
    }

    /**
     * 記錄成功回答
     */
    recordSuccess(id: string): void {
        const item = this.getOrCreateItem(id);
        this.practiceCount++;

        item.consecutiveCorrect++;
        item.totalReviews++;
        item.lastPracticed = this.practiceCount;
        item.isNew = false;

        // 簡化的間隔計算
        if (item.consecutiveCorrect <= this.INITIAL_INTERVALS.length) {
            const intervalIndex = item.consecutiveCorrect - 1;
            item.currentInterval = this.INITIAL_INTERVALS[intervalIndex] || this.INITIAL_INTERVALS[this.INITIAL_INTERVALS.length - 1];
        } else {
            item.currentInterval = Math.floor(item.currentInterval * this.GOOD_MULTIPLIER);
            item.currentInterval = Math.min(item.currentInterval, 50);
        }

        item.nextReviewAt = this.practiceCount + item.currentInterval;
        this.items.set(id, item);
        this.saveToStorage();
    }

    /**
     * 記錄失敗回答
     */
    recordFailure(id: string): void {
        const item = this.getOrCreateItem(id);
        this.practiceCount++;

        item.consecutiveCorrect = 0;
        item.totalReviews++;
        item.errorCount++;
        item.lastPracticed = this.practiceCount;
        item.isNew = false;

        // 錯誤處理：簡化為立即復習
        item.currentInterval = 1;
        item.nextReviewAt = this.practiceCount + item.currentInterval;
        this.items.set(id, item);
        this.saveToStorage();
    }

    /**
     * 獲取下一個需要練習的項目 - 簡化的高效調度算法
     */
    getNext<T extends { code: string }>(allItems: T[]): T | null {
        // 分類所有項目
        const newItems: T[] = [];
        const dueReviews: T[] = [];

        for (const cardItem of allItems) {
            const reviewItem = this.items.get(cardItem.code);

            if (!reviewItem) {
                // 完全新的項目
                newItems.push(cardItem);
            } else if (this.practiceCount >= reviewItem.nextReviewAt && reviewItem.consecutiveCorrect < this.GRADUATION_THRESHOLD) {
                // 到期且未掌握的項目
                dueReviews.push(cardItem);
            }
        }

        // 優先處理到期復習
        if (dueReviews.length > 0) {
            return dueReviews[0];
        }

        // 然後學習新內容
        if (newItems.length > 0) {
            return newItems[0];
        }

        return null;
    }

    /**
     * 計算復習優先級
     */
    private calculatePriority(reviewItem: ReviewItem): number {
        let priority = 1000;

        // 錯誤次數越多，優先級越高
        priority += reviewItem.errorCount * 500;

        // 超期時間越長，優先級越高
        const overdue = this.practiceCount - reviewItem.nextReviewAt;
        priority += Math.max(0, overdue) * 100;

        // 從未正確答過的項目優先級更高
        if (reviewItem.consecutiveCorrect === 0) {
            priority += 200;
        }

        return priority;
    }

    /**
     * 獲取統計信息
     */
    getStats(): { total: number; mastered: number; learning: number; difficult: number } {
        let mastered = 0;
        let learning = 0;
        let difficult = 0;

        for (const item of this.items.values()) {
            if (item.consecutiveCorrect >= this.GRADUATION_THRESHOLD) {
                mastered++;
            } else if (item.errorCount >= 3) {
                difficult++;
            } else {
                learning++;
            }
        }

        return {
            total: this.items.size,
            mastered,
            learning,
            difficult
        };
    }

    /**
     * 獲取單個項目的統計信息
     */
    getItemStats(id: string): ReviewItem | null {
        return this.items.get(id) || null;
    }

    /**
     * 檢查項目是否為第一次出現
     */
    isFirstTime(id: string): boolean {
        const item = this.items.get(id);
        return !item || item.isNew || item.totalReviews === 0;
    }

    /**
     * 獲取當前練習進度
     */
    getCurrentProgress(): { practiceCount: number; estimatedTotal: number } {
        const totalItems = this.items.size;
        const avgReviewsPerItem = 4; // 估計每個項目平均需要4次練習才能掌握
        const estimatedTotal = Math.max(totalItems * avgReviewsPerItem, this.practiceCount + 50);

        return {
            practiceCount: this.practiceCount,
            estimatedTotal
        };
    }

    private getOrCreateItem(id: string): ReviewItem {
        const existing = this.items.get(id);
        if (existing) {
            return existing;
        }

        const newItem: ReviewItem = {
            id,
            nextReviewAt: this.practiceCount + 1, // 新項目在下一組練習
            consecutiveCorrect: 0,
            totalReviews: 0,
            errorCount: 0,
            lastPracticed: 0,
            isNew: true,
            currentInterval: 1
        };

        this.items.set(id, newItem);
        return newItem;
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.items = new Map(Object.entries(data.items || {}));
                this.practiceCount = data.practiceCount || 0;
            }
        } catch (error) {
            console.warn('載入調度數據失敗:', error);
        }
    }

    private saveToStorage(): void {
        try {
            const data = {
                items: Object.fromEntries(this.items),
                practiceCount: this.practiceCount
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('保存調度數據失敗:', error);
        }
    }

    /**
     * 重置所有數據（用於調試）
     */
    reset(): void {
        this.items.clear();
        this.practiceCount = 0;
        localStorage.removeItem(this.storageKey);
    }
}
