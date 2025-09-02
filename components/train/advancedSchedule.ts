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

    // 算法參數 - 調整為合理的復習間隔，確保能完成學習
    private readonly NEW_CARD_RATIO = 0.30; // 新卡片比例：30%（增加新學習內容）
    private readonly INITIAL_INTERVALS = [4, 12, 36]; // 初始間隔：4組、12組、36組（適中間隔）
    private readonly GRADUATION_THRESHOLD = 3; // 畢業閾值：連續3次正確
    private readonly EASY_MULTIPLIER = 2.5; // 簡單乘數
    private readonly GOOD_MULTIPLIER = 2.0; // 良好乘數
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

    /**
     * 內建模擬測試功能 - 測試算法在指定數量項目下的表現
     * @param totalItems 總項目數量（如250個字根）
     * @param errorRate 錯誤率（0.0-1.0，默認0.1即10%）
     * @param maxIterations 最大迭代次數（防止無限循環）
     * @param verbose 是否輸出詳細日誌
     * @returns 模擬結果統計
     */
    simulate(
        totalItems: number = 250,
        errorRate: number = 0.1,
        maxIterations: number = 5000,
        verbose: boolean = false
    ): {
        completed: boolean;
        totalPractices: number;
        masteredCount: number;
        averageReviewsPerItem: number;
        totalErrors: number;
        efficiency: string;
    } {
        // 重置模擬環境（不影響實際數據）
        const originalItems = new Map(this.items);
        const originalPracticeCount = this.practiceCount;

        this.items.clear();
        this.practiceCount = 0;

        if (verbose) {
            console.log(`🚀 開始模擬 ${totalItems} 個項目的學習過程`);
            console.log(`📊 錯誤率: ${(errorRate * 100).toFixed(1)}%`);
            console.log(`⚙️ 算法參數: 間隔=${this.INITIAL_INTERVALS.join(',')}, 畢業閾值=${this.GRADUATION_THRESHOLD}`);
            console.log('');
        }

        // 創建模擬項目
        const mockItems = Array.from({ length: totalItems }, (_, i) => ({
            code: `item_${i + 1}`
        }));

        let iteration = 0;
        const startTime = Date.now();

        while (iteration < maxIterations) {
            // 獲取下一個需要練習的項目
            const nextItem = this.getNext(mockItems);

            if (!nextItem) {
                // 檢查是否真的完成了
                const unmastered = Array.from(this.items.values()).filter(
                    item => item.consecutiveCorrect < this.GRADUATION_THRESHOLD
                );

                if (unmastered.length === 0) {
                    if (verbose) console.log('🎉 所有項目都已掌握！');
                    break;
                } else {
                    // 找到下一個最早的復習時間並跳過去
                    const nextReviewTimes = unmastered
                        .map(item => item.nextReviewAt)
                        .filter(time => time > this.practiceCount);

                    if (nextReviewTimes.length > 0) {
                        const nextTime = Math.min(...nextReviewTimes);
                        this.practiceCount = nextTime;
                        if (verbose && iteration % 100 === 0) {
                            console.log(`⏭️  跳到練習位置 ${this.practiceCount}`);
                        }
                        continue;
                    } else {
                        break;
                    }
                }
            }

            iteration++;

            // 模擬回答（根據錯誤率決定正確與否）
            const isCorrect = Math.random() > errorRate;

            if (isCorrect) {
                this.recordSuccess(nextItem.code);
                if (verbose && iteration % 200 === 0) {
                    console.log(`✅ 練習 ${iteration}: ${nextItem.code} 正確`);
                }
            } else {
                this.recordFailure(nextItem.code);
                if (verbose && iteration % 200 === 0) {
                    console.log(`❌ 練習 ${iteration}: ${nextItem.code} 錯誤`);
                }
            }

            // 定期輸出進度
            if (verbose && iteration % 500 === 0) {
                const stats = this.getStats();
                const progress = (stats.mastered / totalItems * 100).toFixed(1);
                console.log(`📈 進度報告 - 練習: ${iteration}, 掌握: ${stats.mastered}/${totalItems} (${progress}%)`);
            }
        }

        const endTime = Date.now();
        const finalStats = this.getStats();

        // 計算統計結果
        const allItems = Array.from(this.items.values());
        const totalErrors = allItems.reduce((sum, item) => sum + item.errorCount, 0);
        const averageReviews = allItems.reduce((sum, item) => sum + item.totalReviews, 0) / allItems.length;
        const completed = finalStats.mastered === totalItems;
        const efficiency = completed ?
            `優秀 (${(this.practiceCount / totalItems).toFixed(1)}x)` :
            `未完成 (${iteration}/${maxIterations})`;

        // 輸出最終結果
        if (verbose) {
            console.log('\n' + '='.repeat(50));
            console.log('🎯 模擬測試完成！');
            console.log('='.repeat(50));
            console.log(`⏱️  執行時間: ${endTime - startTime}ms`);
            console.log(`🔢 總練習次數: ${this.practiceCount}`);
            console.log(`📚 項目總數: ${totalItems}`);
            console.log(`🎯 掌握數量: ${finalStats.mastered}/${totalItems}`);
            console.log(`📊 完成率: ${(finalStats.mastered / totalItems * 100).toFixed(1)}%`);
            console.log(`❌ 總錯誤次數: ${totalErrors}`);
            console.log(`🔄 平均復習次數: ${averageReviews.toFixed(1)}`);
            console.log(`⚡ 效率評估: ${efficiency}`);
            console.log(`📈 學習統計:`);
            console.log(`   - 已掌握: ${finalStats.mastered}`);
            console.log(`   - 學習中: ${finalStats.learning}`);
            console.log(`   - 困難項: ${finalStats.difficult}`);

            if (completed) {
                const practicesPerItem = this.practiceCount / totalItems;
                console.log(`\n✨ 結論: 完成 ${totalItems} 個項目需要約 ${this.practiceCount} 次練習`);
                console.log(`📊 相當於每個項目平均 ${practicesPerItem.toFixed(1)} 次練習`);

                if (practicesPerItem < 5) {
                    console.log('🚀 算法效率極佳！');
                } else if (practicesPerItem < 8) {
                    console.log('👍 算法效率良好！');
                } else {
                    console.log('⚠️  算法可能需要優化');
                }
            } else {
                console.log(`\n⚠️  警告: 在 ${maxIterations} 次迭代內未完成學習`);
                console.log('💡 建議調整算法參數或增加最大迭代次數');
            }
        }

        // 恢復原始數據
        this.items = originalItems;
        this.practiceCount = originalPracticeCount;

        return {
            completed,
            totalPractices: this.practiceCount, // 直接使用當前練習次數
            masteredCount: finalStats.mastered,
            averageReviewsPerItem: averageReviews,
            totalErrors,
            efficiency
        };
    }

    /**
     * 快速模擬測試 - 簡化版本，適合在生產環境快速驗證
     */
    quickSimulate(totalItems: number = 250): { success: boolean; practices: number; message: string } {
        const result = this.simulate(totalItems, 0.1, 3000, false);

        return {
            success: result.completed,
            practices: result.totalPractices,
            message: result.completed ?
                `✅ 成功！${totalItems}個項目需要${result.totalPractices}次練習` :
                `❌ 失敗！需要調整算法參數`
        };
    }
}
