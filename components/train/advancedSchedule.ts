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

    // 算法參數
    private readonly NEW_CARD_RATIO = 0.25; // 新卡片比例：25%
    private readonly INITIAL_INTERVALS = [4, 8, 16]; // 初始間隔：1組、3組、7組
    private readonly GRADUATION_THRESHOLD = 3; // 畢業閾值：連續3次正確
    private readonly EASY_MULTIPLIER = 2.5; // 簡單乘數
    private readonly GOOD_MULTIPLIER = 2.0; // 良好乘數
    private readonly HARD_MULTIPLIER = 1.2; // 困難乘數

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

        // 基於Anki算法的間隔計算
        if (item.consecutiveCorrect <= this.INITIAL_INTERVALS.length) {
            // 學習階段：使用預設間隔
            const intervalIndex = item.consecutiveCorrect - 1;
            item.currentInterval = this.INITIAL_INTERVALS[intervalIndex] || this.INITIAL_INTERVALS[this.INITIAL_INTERVALS.length - 1];
        } else {
            // 復習階段：根據表現調整間隔
            if (item.consecutiveCorrect >= this.GRADUATION_THRESHOLD) {
                // 已掌握：間隔延長
                item.currentInterval = Math.floor(item.currentInterval * this.GOOD_MULTIPLIER);
                // 限制最大間隔為50組（避免在短期訓練中間隔過長）
                item.currentInterval = Math.min(item.currentInterval, 50);
            } else {
                // 仍在學習：適度延長
                item.currentInterval = Math.floor(item.currentInterval * this.HARD_MULTIPLIER);
            }
        }

        item.nextReviewAt = this.practiceCount + item.currentInterval;
        this.items.set(id, item);
        this.saveToStorage();

        console.log(`成功記錄 ${id}: 連續正確=${item.consecutiveCorrect}, 當前間隔=${item.currentInterval}, 下次復習位置=${item.nextReviewAt}`);
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

        // 錯誤處理：重置學習進度
        if (item.errorCount === 1) {
            // 第一次錯誤：短間隔復習
            item.currentInterval = 1;
        } else if (item.errorCount <= 3) {
            // 多次錯誤：立即復習
            item.currentInterval = 0;
        } else {
            // 困難字根：頻繁復習
            item.currentInterval = 0;
        }

        item.nextReviewAt = this.practiceCount + item.currentInterval;
        this.items.set(id, item);
        this.saveToStorage();

        console.log(`錯誤記錄 ${id}: 錯誤次數=${item.errorCount}, 當前間隔=${item.currentInterval}, 下次復習位置=${item.nextReviewAt}`);
    }

    /**
     * 獲取下一個需要練習的項目 - 智慧調度算法
     */
    getNext<T extends { code: string }>(allItems: T[]): T | null {
        // 分類所有項目
        const newItems: T[] = [];
        const dueReviews: Array<{ item: T; priority: number; reviewItem: ReviewItem }> = [];
        const learningItems: T[] = [];

        for (const cardItem of allItems) {
            const reviewItem = this.items.get(cardItem.code);

            if (!reviewItem) {
                // 完全新的項目
                newItems.push(cardItem);
            } else if (this.practiceCount >= reviewItem.nextReviewAt) {
                // 到期需要復習的項目
                let priority = this.calculatePriority(reviewItem);
                dueReviews.push({ item: cardItem, priority, reviewItem });
            } else if (reviewItem.consecutiveCorrect < this.GRADUATION_THRESHOLD) {
                // 正在學習但還未到期的項目
                learningItems.push(cardItem);
            }
        }

        // 優先處理到期復習（高優先級）
        if (dueReviews.length > 0) {
            dueReviews.sort((a, b) => b.priority - a.priority);
            console.log(`選擇復習項目: ${dueReviews[0].item.code} (優先級: ${dueReviews[0].priority})`);
            return dueReviews[0].item;
        }

        // 如果沒有到期復習，根據新卡片比例決定學習新內容還是提前復習
        const totalPracticed = this.items.size;
        const shouldLearnNew = newItems.length > 0 &&
            (totalPracticed === 0 || (newItems.length / (newItems.length + totalPracticed)) >= this.NEW_CARD_RATIO);

        if (shouldLearnNew) {
            console.log(`選擇新項目: ${newItems[0].code}`);
            return newItems[0];
        }

        // 如果不學新內容，選擇學習中的困難項目提前復習
        if (learningItems.length > 0) {
            const difficultLearning = learningItems
                .map(item => ({ item, reviewItem: this.items.get(item.code)! }))
                .filter(({ reviewItem }) => reviewItem.errorCount > 0)
                .sort((a, b) => b.reviewItem.errorCount - a.reviewItem.errorCount);

            if (difficultLearning.length > 0) {
                console.log(`選擇困難學習項目: ${difficultLearning[0].item.code}`);
                return difficultLearning[0].item;
            }

            // 否則隨機選擇一個學習中的項目
            const randomLearning = learningItems[Math.floor(Math.random() * learningItems.length)];
            console.log(`選擇隨機學習項目: ${randomLearning.code}`);
            return randomLearning;
        }

        // 最後選擇新項目（如果還有的話）
        if (newItems.length > 0) {
            console.log(`選擇剩餘新項目: ${newItems[0].code}`);
            return newItems[0];
        }

        console.log('沒有更多項目需要練習');
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
            if (item.consecutiveCorrect >= 3 && item.errorCount <= 1) {
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

    /**
     * 獲取當前學習進度統計
     */
    getProgress(): { practiceCount: number; estimatedTotal: number } {
        const totalItems = this.items.size;
        const avgReviewsPerItem = 4; // 估計每個項目平均需要4次練習才能掌握
        const estimatedTotal = Math.max(totalItems * avgReviewsPerItem, this.practiceCount + 50);

        return {
            practiceCount: this.practiceCount,
            estimatedTotal
        };
    }
}
