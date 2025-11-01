/**
 * パフォーマンス最適化クラス
 * 大量データでの動作最適化とメモリ使用量の最適化を行う
 */
class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.observedElements = new Set();
        
        // パフォーマンス監視
        this.performanceMetrics = {
            renderTimes: [],
            memoryUsage: [],
            cacheHits: 0,
            cacheMisses: 0
        };
        
        this.setupPerformanceMonitoring();
    }

    /**
     * パフォーマンス監視を設定
     */
    setupPerformanceMonitoring() {
        // メモリ使用量の定期監視
        if (performance.memory) {
            setInterval(() => {
                this.recordMemoryUsage();
            }, 30000); // 30秒間隔
        }

        // ページの可視性変更時の最適化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });
    }

    /**
     * メモリ使用量を記録
     */
    recordMemoryUsage() {
        if (performance.memory) {
            const memoryInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
            
            this.performanceMetrics.memoryUsage.push(memoryInfo);
            
            // 古いデータを削除（最新100件のみ保持）
            if (this.performanceMetrics.memoryUsage.length > 100) {
                this.performanceMetrics.memoryUsage.shift();
            }
            
            // メモリ使用量が高い場合は警告
            const usagePercentage = (memoryInfo.used / memoryInfo.limit) * 100;
            if (usagePercentage > 80) {
                console.warn('メモリ使用量が高くなっています:', usagePercentage.toFixed(1) + '%');
                this.performMemoryCleanup();
            }
        }
    }

    /**
     * ページが非表示になった時の処理
     */
    onPageHidden() {
        // タイマーを停止してCPU使用量を削減
        if (window.app && window.app.timerService) {
            this.pausedTimerState = window.app.timerService.isWorking();
            if (this.pausedTimerState) {
                // タイマーの更新間隔を長くする
                window.app.timerService.stopTimer();
            }
        }
        
        // キャッシュをクリア
        this.clearCache();
    }

    /**
     * ページが表示された時の処理
     */
    onPageVisible() {
        // タイマーを再開
        if (window.app && window.app.timerService && this.pausedTimerState) {
            window.app.timerService.startTimer();
        }
        this.pausedTimerState = false;
    }

    /**
     * メモリクリーンアップを実行
     */
    performMemoryCleanup() {
        // キャッシュをクリア
        this.clearCache();
        
        // 古いパフォーマンスメトリクスを削除
        this.performanceMetrics.renderTimes = this.performanceMetrics.renderTimes.slice(-50);
        this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-50);
        
        // 不要なDOM要素の監視を停止
        this.cleanupObservers();
        
        console.log('メモリクリーンアップを実行しました');
    }

    /**
     * デバウンス処理
     * @param {string} key - デバウンスキー
     * @param {Function} func - 実行する関数
     * @param {number} delay - 遅延時間（ミリ秒）
     */
    debounce(key, func, delay = 300) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    /**
     * スロットル処理
     * @param {string} key - スロットルキー
     * @param {Function} func - 実行する関数
     * @param {number} interval - 実行間隔（ミリ秒）
     */
    throttle(key, func, interval = 100) {
        if (this.throttleTimers.has(key)) {
            return; // 既に実行中の場合はスキップ
        }
        
        func();
        
        const timer = setTimeout(() => {
            this.throttleTimers.delete(key);
        }, interval);
        
        this.throttleTimers.set(key, timer);
    }

    /**
     * キャッシュから値を取得
     * @param {string} key - キャッシュキー
     * @returns {any} キャッシュされた値
     */
    getFromCache(key) {
        if (this.cache.has(key)) {
            this.performanceMetrics.cacheHits++;
            const cached = this.cache.get(key);
            
            // TTLチェック
            if (cached.expiry && Date.now() > cached.expiry) {
                this.cache.delete(key);
                this.performanceMetrics.cacheMisses++;
                return null;
            }
            
            return cached.value;
        }
        
        this.performanceMetrics.cacheMisses++;
        return null;
    }

    /**
     * キャッシュに値を設定
     * @param {string} key - キャッシュキー
     * @param {any} value - キャッシュする値
     * @param {number} ttl - 生存時間（ミリ秒）
     */
    setCache(key, value, ttl = 300000) { // デフォルト5分
        const expiry = ttl > 0 ? Date.now() + ttl : null;
        this.cache.set(key, { value, expiry });
        
        // キャッシュサイズ制限
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * キャッシュをクリア
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * 大量データの仮想化処理
     * @param {Array} items - 表示するアイテム配列
     * @param {number} containerHeight - コンテナの高さ
     * @param {number} itemHeight - アイテムの高さ
     * @param {number} scrollTop - スクロール位置
     * @returns {Object} 仮想化された表示情報
     */
    virtualizeList(items, containerHeight, itemHeight, scrollTop) {
        const totalItems = items.length;
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount + 1, totalItems);
        
        const visibleItems = items.slice(startIndex, endIndex);
        const offsetY = startIndex * itemHeight;
        const totalHeight = totalItems * itemHeight;
        
        return {
            visibleItems,
            startIndex,
            endIndex,
            offsetY,
            totalHeight,
            visibleCount
        };
    }

    /**
     * DOM要素の遅延読み込み
     * @param {HTMLElement} element - 監視する要素
     * @param {Function} callback - 表示時に実行するコールバック
     */
    lazyLoad(element, callback) {
        if (!('IntersectionObserver' in window)) {
            // IntersectionObserverがサポートされていない場合は即座に実行
            callback();
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback();
                    observer.unobserve(element);
                    this.observedElements.delete(element);
                }
            });
        }, {
            rootMargin: '50px' // 50px手前で読み込み開始
        });

        observer.observe(element);
        this.observedElements.add(element);
    }

    /**
     * 監視者をクリーンアップ
     */
    cleanupObservers() {
        this.observedElements.clear();
    }

    /**
     * レンダリング時間を測定
     * @param {string} label - 測定ラベル
     * @param {Function} renderFunc - レンダリング関数
     */
    measureRenderTime(label, renderFunc) {
        const startTime = performance.now();
        
        renderFunc();
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        this.performanceMetrics.renderTimes.push({
            label,
            time: renderTime,
            timestamp: Date.now()
        });
        
        // 古いデータを削除
        if (this.performanceMetrics.renderTimes.length > 100) {
            this.performanceMetrics.renderTimes.shift();
        }
        
        // 遅いレンダリングを警告
        if (renderTime > 16) { // 60FPSを下回る場合
            console.warn(`遅いレンダリングが検出されました: ${label} (${renderTime.toFixed(2)}ms)`);
        }
    }

    /**
     * 大量データの分割処理
     * @param {Array} items - 処理するアイテム配列
     * @param {Function} processor - 各アイテムを処理する関数
     * @param {number} batchSize - バッチサイズ
     * @param {Function} onProgress - 進捗コールバック
     * @returns {Promise} 処理完了のPromise
     */
    async processBatch(items, processor, batchSize = 100, onProgress = null) {
        const totalItems = items.length;
        let processedCount = 0;
        
        for (let i = 0; i < totalItems; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            // バッチを処理
            for (const item of batch) {
                await processor(item);
                processedCount++;
            }
            
            // 進捗を報告
            if (onProgress) {
                onProgress(processedCount, totalItems);
            }
            
            // UIをブロックしないように少し待機
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    /**
     * データの圧縮
     * @param {Object} data - 圧縮するデータ
     * @returns {Object} 圧縮されたデータ
     */
    compressData(data) {
        // 不要なプロパティを削除
        const compressed = JSON.parse(JSON.stringify(data));
        
        // セッションデータの圧縮
        if (compressed.sessions) {
            compressed.sessions = compressed.sessions.map(session => {
                // 計算可能なプロパティを削除
                const compressedSession = { ...session };
                if (compressedSession.startTime && compressedSession.endTime) {
                    // durationは計算可能なので削除
                    delete compressedSession.duration;
                }
                return compressedSession;
            });
        }
        
        return compressed;
    }

    /**
     * データの展開
     * @param {Object} compressedData - 圧縮されたデータ
     * @returns {Object} 展開されたデータ
     */
    decompressData(compressedData) {
        const decompressed = JSON.parse(JSON.stringify(compressedData));
        
        // セッションデータの展開
        if (decompressed.sessions) {
            decompressed.sessions = decompressed.sessions.map(session => {
                const decompressedSession = { ...session };
                
                // durationを再計算
                if (decompressedSession.startTime && decompressedSession.endTime) {
                    const start = new Date(decompressedSession.startTime);
                    const end = new Date(decompressedSession.endTime);
                    decompressedSession.duration = end.getTime() - start.getTime();
                }
                
                return decompressedSession;
            });
        }
        
        return decompressed;
    }

    /**
     * パフォーマンス統計を取得
     * @returns {Object} パフォーマンス統計
     */
    getPerformanceStats() {
        const renderTimes = this.performanceMetrics.renderTimes;
        const memoryUsage = this.performanceMetrics.memoryUsage;
        
        const avgRenderTime = renderTimes.length > 0 
            ? renderTimes.reduce((sum, item) => sum + item.time, 0) / renderTimes.length 
            : 0;
            
        const maxRenderTime = renderTimes.length > 0 
            ? Math.max(...renderTimes.map(item => item.time)) 
            : 0;
            
        const cacheHitRate = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses > 0
            ? (this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100
            : 0;
            
        const currentMemory = memoryUsage.length > 0 ? memoryUsage[memoryUsage.length - 1] : null;
        
        return {
            rendering: {
                averageTime: avgRenderTime.toFixed(2),
                maxTime: maxRenderTime.toFixed(2),
                totalMeasurements: renderTimes.length
            },
            cache: {
                hitRate: cacheHitRate.toFixed(1),
                hits: this.performanceMetrics.cacheHits,
                misses: this.performanceMetrics.cacheMisses,
                size: this.cache.size
            },
            memory: currentMemory ? {
                used: (currentMemory.used / 1024 / 1024).toFixed(2) + ' MB',
                total: (currentMemory.total / 1024 / 1024).toFixed(2) + ' MB',
                usagePercentage: ((currentMemory.used / currentMemory.limit) * 100).toFixed(1) + '%'
            } : null,
            observers: {
                active: this.observedElements.size
            }
        };
    }

    /**
     * パフォーマンス最適化を実行
     */
    optimize() {
        // メモリクリーンアップ
        this.performMemoryCleanup();
        
        // 不要なタイマーをクリア
        this.debounceTimers.clear();
        this.throttleTimers.clear();
        
        // ガベージコレクションを促進（可能な場合）
        if (window.gc) {
            window.gc();
        }
        
        console.log('パフォーマンス最適化を実行しました');
    }

    /**
     * リソースを破棄
     */
    destroy() {
        this.clearCache();
        this.debounceTimers.clear();
        this.throttleTimers.clear();
        this.cleanupObservers();
        this.performanceMetrics = {
            renderTimes: [],
            memoryUsage: [],
            cacheHits: 0,
            cacheMisses: 0
        };
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.PerformanceOptimizer = PerformanceOptimizer;
}