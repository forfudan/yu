/**
 * AdvancedSchedule.ts - 基於索引的字根學習調度算法
 * 
 * 解決273 vs 244問題的關鍵：
 * 1. 直接使用字根組的索引，而不是編碼
 * 2. 避免編碼查找導致的不連續組丟失問題
 * 3. 確保所有字根組都能被正確訪問
 * 
 * 簡單邏輯：
 * 1. 按順序出字根組，第一次為「學習」
 * 2. 學習後安排兩次「復習」，插入當前學習序列
 * 3. 錯誤時安排一次「強化」，插入序列
 * 4. 達到3次正確後不再出現
 */

interface ReviewItem {
    /** 字根組索引 */
    index: number;
    /** 連續正確次數 */
    consecutiveCorrect: number;
    /** 總練習次數 */
    totalReviews: number;
    /** 是否已完成學習（達到3次正確） */
    isCompleted: boolean;
}

export class AdvancedSchedule {
    private items: Map<number, ReviewItem> = new Map();
    private storageKey: string;
    private currentLearningIndex: number = 0; // 當前學習到第幾個字根組
    private reviewQueue: number[] = []; // 復習隊列（存索引）
    private reinforceQueue: number[] = []; // 強化隊列（存索引）
    private totalGroups: number = 0; // 總字根組數量

    constructor(name: string) {
        this.storageKey = `advanced_schedule_${name}`;
        this.loadFromStorage();
    }

    /**
     * 初始化調度系統
     */
    initializeWithGroupCount(totalGroups: number): void {
        this.totalGroups = totalGroups;

        // 確保所有索引都有對應的項目
        for (let i = 0; i < totalGroups; i++) {
            if (!this.items.has(i)) {
                this.items.set(i, {
                    index: i,
                    consecutiveCorrect: 0,
                    totalReviews: 0,
                    isCompleted: false
                });
            }
        }

        this.saveToStorage();
    }

    /**
     * 記錄成功回答
     */
    recordSuccess(groupIndex: number): void {
        const item = this.getOrCreateItem(groupIndex);
        item.consecutiveCorrect++;
        item.totalReviews++;

        // 如果達到3次正確，標記為完成
        if (item.consecutiveCorrect >= 3) {
            item.isCompleted = true;
        } else {
            // 安排復習
            this.reviewQueue.push(groupIndex);
        }

        this.saveToStorage();
    }

    /**
     * 記錄失敗回答
     */
    recordFailure(groupIndex: number): void {
        const item = this.getOrCreateItem(groupIndex);

        // 重置連續正確次數
        item.consecutiveCorrect = 0;
        item.totalReviews++;

        // 安排強化練習
        this.reinforceQueue.push(groupIndex);

        this.saveToStorage();
    }

    /**
     * 獲取下一個需要練習的字根組索引
     */
    getNextIndex(): number | null {
        // 1. 優先處理強化隊列
        if (this.reinforceQueue.length > 0) {
            const index = this.reinforceQueue.shift()!;
            return index;
        }

        // 2. 處理復習隊列
        if (this.reviewQueue.length > 0) {
            const index = this.reviewQueue.shift()!;
            return index;
        }

        // 3. 按順序學習新字根組
        while (this.currentLearningIndex < this.totalGroups) {
            const item = this.items.get(this.currentLearningIndex);

            if (!item || !item.isCompleted) {
                const selectedIndex = this.currentLearningIndex;
                this.currentLearningIndex++;
                return selectedIndex;
            }

            this.currentLearningIndex++;
        }

        // 4. 檢查是否還有未完成的項目
        for (const [index, item] of this.items.entries()) {
            if (!item.isCompleted) {
                return index;
            }
        }

        return null;
    }

    /**
     * 檢查是否為第一次見到此字根組
     */
    isFirstTime(groupIndex: number): boolean {
        const item = this.items.get(groupIndex);
        return !item || item.totalReviews === 0;
    }

    /**
     * 檢查是否已完成所有學習
     */
    isCompleted(): boolean {
        if (this.totalGroups === 0) return false;

        for (let i = 0; i < this.totalGroups; i++) {
            const item = this.items.get(i);
            if (!item || !item.isCompleted) {
                return false;
            }
        }

        return true;
    }

    /**
     * 獲取或創建項目
     */
    private getOrCreateItem(groupIndex: number): ReviewItem {
        let item = this.items.get(groupIndex);
        if (!item) {
            item = {
                index: groupIndex,
                consecutiveCorrect: 0,
                totalReviews: 0,
                isCompleted: false
            };
            this.items.set(groupIndex, item);
        }
        return item;
    }

    /**
     * 獲取進度統計
     */
    getProgressStats(): { practiced: number; mastered: number; total: number; percentage: number } {
        let practiced = 0;
        let mastered = 0;

        // 確保所有索引都有對應的項目
        for (let i = 0; i < this.totalGroups; i++) {
            if (!this.items.has(i)) {
                this.items.set(i, {
                    index: i,
                    consecutiveCorrect: 0,
                    totalReviews: 0,
                    isCompleted: false
                });
            }
        }

        // 統計已練習的和已掌握的字根組
        for (const item of this.items.values()) {
            if (item.totalReviews > 0) {
                practiced++;
            }
            if (item.isCompleted) {
                mastered++;
            }
        }

        return {
            practiced,
            mastered,
            total: this.totalGroups,
            percentage: this.totalGroups > 0 ? (practiced / this.totalGroups * 100) : 0
        };
    }

    /**
     * 重置學習進度
     */
    reset(): void {
        this.items.clear();
        this.reviewQueue = [];
        this.reinforceQueue = [];
        this.currentLearningIndex = 0;

        // 重新初始化所有項目
        for (let i = 0; i < this.totalGroups; i++) {
            this.items.set(i, {
                index: i,
                consecutiveCorrect: 0,
                totalReviews: 0,
                isCompleted: false
            });
        }

        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(this.storageKey);
        }
    }

    /**
     * 獲取調試信息
     */
    getScheduleDebugInfo(): string {
        const completed = Array.from(this.items.values()).filter(item => item.isCompleted).length;
        return `強化隊列: ${this.reinforceQueue.length}, 復習隊列: ${this.reviewQueue.length}, 當前學習索引: ${this.currentLearningIndex}/${this.totalGroups}, 已完成: ${completed}`;
    }

    /**
     * 保存到本地存儲
     */
    private saveToStorage(): void {
        if (typeof localStorage !== 'undefined') {
            const data = {
                items: Array.from(this.items.entries()),
                currentLearningIndex: this.currentLearningIndex,
                reviewQueue: this.reviewQueue,
                reinforceQueue: this.reinforceQueue,
                totalGroups: this.totalGroups
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
    }

    /**
     * 從本地存儲加載
     */
    private loadFromStorage(): void {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.items = new Map(data.items || []);
                    this.currentLearningIndex = data.currentLearningIndex || 0;
                    this.reviewQueue = data.reviewQueue || [];
                    this.reinforceQueue = data.reinforceQueue || [];
                    this.totalGroups = data.totalGroups || 0;
                } catch (error) {
                    console.warn('載入存儲數據失敗:', error);
                }
            }
        }
    }
}
