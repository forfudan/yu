/**
 * AdvancedSchedule.ts - 基於間隔重複的字根學習調度算法
 * 
 * 使用字根組進行訓練：
 * 1. 直接使用字根組的索引，而不是編碼
 * 2. 避免編碼查找導致的不連續組丟失問題
 * 3. 確保所有字根組都能被正確訪問
 * 
 * 間隔重複邏輯：
 * 1. 按順序出字根組，第一次為「學習」
 * 2. 學習後根據表現安排復習，間隔逐步增加
 * 3. 錯誤時安排強化練習，使用較短間隔
 * 4. 達到3次正確後標記為已掌握
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
    /** 下次復習的練習計數器位置 */
    nextReviewAt: number;
    /** 當前間隔長度 */
    currentInterval: number;
    /** 上次練習的練習計數器位置 */
    lastPracticedAt: number;
}

export class AdvancedSchedule {
    private items: Map<number, ReviewItem> = new Map();
    private storageKey: string;
    private currentLearningIndex: number = 0; // 當前學習到第幾個字根組
    private practiceCounter: number = 0; // 全局練習計數器
    private totalGroups: number = 0; // 總字根組數量

    // 間隔設定（以練習次數為單位）
    private readonly INITIAL_INTERVALS = [2, 5, 10]; // 初次學習後的復習間隔
    private readonly REINFORCE_INTERVAL = 1; // 錯誤後的強化間隔
    private readonly MAX_INTERVAL = 20; // 最大間隔
    private readonly GRADUATION_THRESHOLD = 3; // 畢業閾值

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
                    isCompleted: false,
                    nextReviewAt: 0,
                    currentInterval: 0,
                    lastPracticedAt: 0
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
        this.practiceCounter++;

        item.consecutiveCorrect++;
        item.totalReviews++;
        item.lastPracticedAt = this.practiceCounter;

        // 如果達到畢業閾值，標記為完成
        if (item.consecutiveCorrect >= this.GRADUATION_THRESHOLD) {
            item.isCompleted = true;
            item.nextReviewAt = Number.MAX_SAFE_INTEGER; // 不再復習
        } else {
            // 計算下次復習間隔
            this.scheduleNextReview(item);
        }

        this.saveToStorage();
    }

    /**
     * 記錄失敗回答
     */
    recordFailure(groupIndex: number): void {
        const item = this.getOrCreateItem(groupIndex);
        this.practiceCounter++;

        // 重置連續正確次數
        item.consecutiveCorrect = 0;
        item.totalReviews++;
        item.lastPracticedAt = this.practiceCounter;

        // 安排強化練習（較短間隔）
        item.currentInterval = this.REINFORCE_INTERVAL;
        item.nextReviewAt = this.practiceCounter + this.REINFORCE_INTERVAL;

        this.saveToStorage();
    }

    /**
     * 計算並安排下次復習
     */
    private scheduleNextReview(item: ReviewItem): void {
        const reviewCount = item.consecutiveCorrect;

        if (reviewCount <= this.INITIAL_INTERVALS.length) {
            // 使用預定義的初始間隔
            item.currentInterval = this.INITIAL_INTERVALS[reviewCount - 1];
        } else {
            // 使用漸進式增長
            item.currentInterval = Math.min(
                Math.floor(item.currentInterval * 1.5),
                this.MAX_INTERVAL
            );
        }

        item.nextReviewAt = this.practiceCounter + item.currentInterval;
    }

    /**
     * 獲取下一個需要練習的字根組索引
     */
    getNextIndex(): number | null {
        // 1. 首先檢查是否有到期的復習項目（按優先級排序）
        const dueItems = this.getDueItems();
        if (dueItems.length > 0) {
            // 返回最高優先級的到期項目
            return dueItems[0].index;
        }

        // 2. 如果沒有到期項目，繼續學習新字根組
        while (this.currentLearningIndex < this.totalGroups) {
            const item = this.items.get(this.currentLearningIndex);

            if (!item || !item.isCompleted) {
                const selectedIndex = this.currentLearningIndex;
                this.currentLearningIndex++;
                return selectedIndex;
            }

            this.currentLearningIndex++;
        }

        // 3. 檢查是否還有未完成的項目
        for (const [index, item] of this.items.entries()) {
            if (!item.isCompleted) {
                return index;
            }
        }

        return null;
    }

    /**
     * 獲取所有到期的復習項目，按優先級排序
     */
    private getDueItems(): ReviewItem[] {
        const dueItems: ReviewItem[] = [];

        for (const item of this.items.values()) {
            if (!item.isCompleted &&
                item.nextReviewAt > 0 &&
                this.practiceCounter >= item.nextReviewAt) {
                dueItems.push(item);
            }
        }

        // 按優先級排序：錯誤項目 > 短間隔項目 > 超期時間長的項目
        dueItems.sort((a, b) => {
            // 錯誤項目（連續正確次數為0）優先
            if (a.consecutiveCorrect === 0 && b.consecutiveCorrect > 0) return -1;
            if (b.consecutiveCorrect === 0 && a.consecutiveCorrect > 0) return 1;

            // 超期時間長的優先
            const aOverdue = this.practiceCounter - a.nextReviewAt;
            const bOverdue = this.practiceCounter - b.nextReviewAt;
            return bOverdue - aOverdue;
        });

        return dueItems;
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
                isCompleted: false,
                nextReviewAt: 0,
                currentInterval: 0,
                lastPracticedAt: 0
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
                    isCompleted: false,
                    nextReviewAt: 0,
                    currentInterval: 0,
                    lastPracticedAt: 0
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
        this.currentLearningIndex = 0;
        this.practiceCounter = 0;

        // 重新初始化所有項目
        for (let i = 0; i < this.totalGroups; i++) {
            this.items.set(i, {
                index: i,
                consecutiveCorrect: 0,
                totalReviews: 0,
                isCompleted: false,
                nextReviewAt: 0,
                currentInterval: 0,
                lastPracticedAt: 0
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
        const dueCount = this.getDueItems().length;
        return `練習計數: ${this.practiceCounter}, 到期項目: ${dueCount}, 當前學習索引: ${this.currentLearningIndex}/${this.totalGroups}, 已完成: ${completed}`;
    }

    /**
     * 保存到本地存儲
     */
    private saveToStorage(): void {
        if (typeof localStorage !== 'undefined') {
            const data = {
                items: Array.from(this.items.entries()),
                currentLearningIndex: this.currentLearningIndex,
                practiceCounter: this.practiceCounter,
                totalGroups: this.totalGroups
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
    }    /**
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
                    this.practiceCounter = data.practiceCounter || 0;
                    this.totalGroups = data.totalGroups || 0;
                } catch (error) {
                    console.warn('載入存儲數據失敗:', error);
                }
            }
        }
    }
}
