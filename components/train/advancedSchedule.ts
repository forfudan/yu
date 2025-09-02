/**
 * AdvancedSchedule.ts - 基于索引的字根学习调度算法
 * 
 * 解决273 vs 244问题的关键：
 * 1. 直接使用字根组的索引，而不是编码
 * 2. 避免编码查找导致的不连续组丢失问题
 * 3. 确保所有字根组都能被正确访问
 * 
 * 简单逻辑：
 * 1. 按顺序出字根组，第一次为「学习」
 * 2. 学习后安排两次「复习」，插入当前学习序列
 * 3. 错误时安排一次「强化」，插入序列
 * 4. 达到3次正确后不再出现
 */

interface ReviewItem {
    /** 字根组索引 */
    index: number;
    /** 连续正确次数 */
    consecutiveCorrect: number;
    /** 总练习次数 */
    totalReviews: number;
    /** 是否已完成学习（达到3次正确） */
    isCompleted: boolean;
}

export class AdvancedSchedule {
    private items: Map<number, ReviewItem> = new Map();
    private storageKey: string;
    private currentLearningIndex: number = 0; // 当前学习到第几个字根组
    private reviewQueue: number[] = []; // 复习队列（存索引）
    private reinforceQueue: number[] = []; // 强化队列（存索引）
    private totalGroups: number = 0; // 总字根组数量

    constructor(name: string) {
        this.storageKey = `advanced_schedule_${name}`;
        this.loadFromStorage();
    }

    /**
     * 初始化调度系统
     */
    initializeWithGroupCount(totalGroups: number): void {
        this.totalGroups = totalGroups;
        console.log(`=== 初始化基于索引的调度系统，总字根组数: ${totalGroups} ===`);
        
        // 确保所有索引都有对应的项目
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
        
        console.log(`调度系统初始化完成，项目数: ${this.items.size}`);
        this.saveToStorage();
    }

    /**
     * 记录成功回答
     */
    recordSuccess(groupIndex: number): void {
        const item = this.getOrCreateItem(groupIndex);
        item.consecutiveCorrect++;
        item.totalReviews++;

        // 如果达到3次正确，标记为完成
        if (item.consecutiveCorrect >= 3) {
            item.isCompleted = true;
            console.log(`字根组索引 ${groupIndex} 已完成学习（${item.consecutiveCorrect}次正确）`);
        } else {
            // 安排复习
            this.reviewQueue.push(groupIndex);
            console.log(`字根组索引 ${groupIndex} 第${item.consecutiveCorrect}次正确，安排复习`);
        }

        this.saveToStorage();
    }

    /**
     * 记录失败回答
     */
    recordFailure(groupIndex: number): void {
        const item = this.getOrCreateItem(groupIndex);
        
        // 重置连续正确次数
        item.consecutiveCorrect = 0;
        item.totalReviews++;

        // 安排强化练习
        this.reinforceQueue.push(groupIndex);
        console.log(`字根组索引 ${groupIndex} 回答错误，安排强化练习`);

        this.saveToStorage();
    }

    /**
     * 获取下一个需要练习的字根组索引
     */
    getNextIndex(): number | null {
        // 1. 优先处理强化队列
        if (this.reinforceQueue.length > 0) {
            const index = this.reinforceQueue.shift()!;
            console.log(`从强化队列选择索引: ${index}`);
            return index;
        }

        // 2. 处理复习队列
        if (this.reviewQueue.length > 0) {
            const index = this.reviewQueue.shift()!;
            console.log(`从复习队列选择索引: ${index}`);
            return index;
        }

        // 3. 按顺序学习新字根组
        while (this.currentLearningIndex < this.totalGroups) {
            const item = this.items.get(this.currentLearningIndex);

            console.log(`检查索引 ${this.currentLearningIndex}: isCompleted: ${item?.isCompleted ?? false}, consecutiveCorrect: ${item?.consecutiveCorrect ?? 0}`);

            if (!item || !item.isCompleted) {
                const selectedIndex = this.currentLearningIndex;
                this.currentLearningIndex++;
                console.log(`选择学习字根组索引: ${selectedIndex}`);
                return selectedIndex;
            }

            this.currentLearningIndex++;
        }

        // 4. 检查是否还有未完成的项目
        console.log(`学习索引已到末尾(${this.currentLearningIndex}/${this.totalGroups})，检查是否还有未完成项目...`);

        for (const [index, item] of this.items.entries()) {
            if (!item.isCompleted) {
                console.log(`发现未完成的字根组索引: ${index}`);
                return index;
            }
        }

        console.log('🎉 真正的所有字根组都已完成学习');
        return null;
    }

    /**
     * 检查是否为第一次见到此字根组
     */
    isFirstTime(groupIndex: number): boolean {
        const item = this.items.get(groupIndex);
        return !item || item.totalReviews === 0;
    }

    /**
     * 获取或创建项目
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
     * 获取进度统计
     */
    getProgressStats(): { practiced: number; mastered: number; total: number; percentage: number } {
        let practiced = 0;
        let mastered = 0;

        // 确保所有索引都有对应的项目
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

        // 统计已练习的和已掌握的字根组
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
     * 重置学习进度
     */
    reset(): void {
        this.items.clear();
        this.reviewQueue = [];
        this.reinforceQueue = [];
        this.currentLearningIndex = 0;
        
        // 重新初始化所有项目
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
        console.log('学习进度已重置（基于索引）');
    }

    /**
     * 获取调试信息
     */
    getScheduleDebugInfo(): string {
        const completed = Array.from(this.items.values()).filter(item => item.isCompleted).length;
        return `强化队列: ${this.reinforceQueue.length}, 复习队列: ${this.reviewQueue.length}, 当前学习索引: ${this.currentLearningIndex}/${this.totalGroups}, 已完成: ${completed}`;
    }

    /**
     * 保存到本地存储
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
     * 从本地存储加载
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
                    console.log(`从存储加载了 ${this.items.size} 个项目，当前学习索引: ${this.currentLearningIndex}`);
                } catch (error) {
                    console.warn('加载存储数据失败:', error);
                }
            }
        }
    }
}
