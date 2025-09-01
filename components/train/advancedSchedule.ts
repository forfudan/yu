/**
 * AdvancedSchedule.ts - 短期集中訓練調度演算法
 * 
 * 專為字根練習設計的短期記憶強化系統
 * 針對幾小時內完成的集中訓練，確保錯誤字根能及時復習
 * 預期：250組字根 → 750-1000組總練習量（每個字根平均3-4次）
 * 注意：日月大概是275組，星陳、卿雲和光華大概是250組。
 */

interface ReviewItem {
    /** 項目標識符 */
    id: string;
    /** 下次復習間隔（組數） */
    nextReviewAfter: number;
    /** 連續正確次數 */
    consecutiveCorrect: number;
    /** 總練習次數 */
    totalReviews: number;
    /** 錯誤次數 */
    errorCount: number;
    /** 最後練習時間 */
    lastPracticed: number;
}

export class AdvancedSchedule {
    private items: Map<string, ReviewItem> = new Map();
    private storageKey: string;
    private practiceCount: number = 0; // 當前練習組數計數器

    constructor(name: string) {
        this.storageKey = `short_term_schedule_${name}`;
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

        // 短期訓練的復習間隔策略：
        if (item.consecutiveCorrect === 1) {
            // 第一次答對：5組後復習
            item.nextReviewAfter = 5;
        } else if (item.consecutiveCorrect === 2) {
            // 第二次答對：15組後復習
            item.nextReviewAfter = 15;
        } else if (item.consecutiveCorrect >= 3) {
            // 第三次及以上答對：30組後復習或不再復習（如果錯誤很少）
            item.nextReviewAfter = item.errorCount > 1 ? 30 : 999;
        }

        this.items.set(id, item);
        this.saveToStorage();

        console.log(`成功記錄 ${id}: 連續正確=${item.consecutiveCorrect}, 錯誤次數=${item.errorCount}, 下次復習間隔=${item.nextReviewAfter}組`);
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

        // 錯誤處理策略：根據錯誤次數決定復習間隔
        if (item.errorCount === 1) {
            // 第一次錯誤：2組後立即復習
            item.nextReviewAfter = 2;
        } else if (item.errorCount === 2) {
            // 第二次錯誤：1組後立即復習
            item.nextReviewAfter = 1;
        } else {
            // 多次錯誤：立即復習
            item.nextReviewAfter = 0;
        }

        this.items.set(id, item);
        this.saveToStorage();

        console.log(`錯誤記錄 ${id}: 錯誤次數=${item.errorCount}, 下次復習間隔=${item.nextReviewAfter}組`);
    }

    /**
     * 獲取下一個需要練習的項目
     */
    getNext<T extends { code: string }>(allItems: T[]): T | null {
        const dueItems: Array<{ item: T; priority: number }> = [];

        for (const cardItem of allItems) {
            const reviewItem = this.items.get(cardItem.code);

            if (!reviewItem) {
                // 新項目，最高優先級
                dueItems.push({ item: cardItem, priority: 1000000 });
            } else {
                const groupsSinceLastPractice = this.practiceCount - reviewItem.lastPracticed;

                if (groupsSinceLastPractice >= reviewItem.nextReviewAfter) {
                    // 到期復習項目，按緊急程度排序
                    let priority = 10000;

                    // 錯誤多的項目優先級更高
                    priority += reviewItem.errorCount * 5000;

                    // 超期越久優先級越高
                    priority += (groupsSinceLastPractice - reviewItem.nextReviewAfter) * 100;

                    dueItems.push({ item: cardItem, priority });
                }
            }
        }

        if (dueItems.length === 0) {
            // 如果沒有到期項目，選擇錯誤次數多但還沒完全掌握的項目
            const needMorePractice = allItems.filter(item => {
                const reviewItem = this.items.get(item.code);
                return reviewItem &&
                    reviewItem.errorCount > 0 &&
                    reviewItem.consecutiveCorrect < 3;
            });

            if (needMorePractice.length > 0) {
                // 按錯誤次數排序，錯誤多的優先
                needMorePractice.sort((a, b) => {
                    const aReview = this.items.get(a.code)!;
                    const bReview = this.items.get(b.code)!;
                    return bReview.errorCount - aReview.errorCount;
                });
                return needMorePractice[0];
            }

            return null;
        }

        // 按優先級排序，返回最高優先級的項目
        dueItems.sort((a, b) => b.priority - a.priority);
        return dueItems[0].item;
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
     * 獲取當前練習進度
     */
    getCurrentProgress(): { practiceCount: number; estimatedTotal: number } {
        const stats = this.getStats();
        // 估算總練習數：新項目3次 + 錯誤項目額外2-5次
        const estimatedTotal = stats.total * 3 + stats.difficult * 2;
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
            nextReviewAfter: 0,
            consecutiveCorrect: 0,
            totalReviews: 0,
            errorCount: 0,
            lastPracticed: 0
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
}
