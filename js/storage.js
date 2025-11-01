/**
 * ローカルストレージ管理クラス
 * ブラウザのLocalStorageを使用してデータの永続化を行う
 */
class StorageManager {
    constructor() {
        this.storageKey = 'workTimeTracker';
        this.version = '1.0.0';
    }

    /**
     * データをローカルストレージに保存
     * @param {Object} data - 保存するデータ
     * @returns {boolean} 保存成功時true
     */
    save(data) {
        try {
            // データの妥当性チェック
            if (!this.validateSaveData(data)) {
                throw new Error('保存データが無効です');
            }

            const storageData = {
                version: this.version,
                timestamp: new Date().toISOString(),
                data: data
            };
            
            const jsonString = JSON.stringify(storageData);
            
            // ストレージ容量チェック
            this.checkStorageQuota(jsonString);
            
            localStorage.setItem(this.storageKey, jsonString);
            return true;
        } catch (error) {
            console.error('データ保存エラー:', error);
            
            // エラーハンドラーが利用可能な場合は通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleStorageError('STORAGE_SAVE_ERROR', error, {
                    dataSize: JSON.stringify(data).length,
                    storageKey: this.storageKey
                });
            }
            
            return false;
        }
    }

    /**
     * ローカルストレージからデータを読み込み
     * @returns {Object|null} 読み込んだデータ、エラー時はnull
     */
    load() {
        try {
            const jsonString = localStorage.getItem(this.storageKey);
            if (!jsonString) {
                return this.getDefaultData();
            }

            const storageData = JSON.parse(jsonString);
            
            // データの整合性チェック
            if (!this.validateData(storageData)) {
                console.warn('データの整合性チェックに失敗しました。デフォルトデータを使用します。');
                
                // エラーハンドラーに通知
                if (window.app && window.app.errorHandler) {
                    window.app.errorHandler.handleError('DATA_CORRUPTION', 
                        new Error('データの整合性チェックに失敗'), {
                        storageKey: this.storageKey,
                        dataSize: jsonString.length
                    });
                }
                
                return this.getDefaultData();
            }

            // バージョンチェック
            if (storageData.version !== this.version) {
                console.warn(`データバージョンが異なります。現在: ${this.version}, データ: ${storageData.version}`);
                // 必要に応じてマイグレーション処理を実行
                return this.migrateData(storageData);
            }

            return storageData.data;
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            
            // エラーハンドラーに通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleStorageError('STORAGE_READ_ERROR', error, {
                    storageKey: this.storageKey
                });
            }
            
            return this.getDefaultData();
        }
    }

    /**
     * データの整合性を検証
     * @param {Object} storageData - 検証するストレージデータ
     * @returns {boolean} 妥当な場合true
     */
    validateData(storageData) {
        if (!storageData || typeof storageData !== 'object') {
            return false;
        }

        if (!storageData.data || typeof storageData.data !== 'object') {
            return false;
        }

        const data = storageData.data;
        
        // 必要なプロパティの存在チェック
        if (!Array.isArray(data.orders) || 
            !Array.isArray(data.activities) || 
            !Array.isArray(data.sessions)) {
            return false;
        }

        return true;
    }

    /**
     * デフォルトデータ構造を取得
     * @returns {Object} デフォルトデータ
     */
    getDefaultData() {
        return {
            orders: [],
            activities: [],
            sessions: [],
            currentSession: null,
            settings: {
                autoSave: true,
                theme: 'light'
            }
        };
    }

    /**
     * ストレージをクリア
     * @returns {boolean} クリア成功時true
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('ストレージクリアエラー:', error);
            return false;
        }
    }

    /**
     * データのバックアップを作成
     * @returns {string|null} バックアップJSON文字列、エラー時はnull
     */
    createBackup() {
        try {
            const data = this.load();
            const backup = {
                version: this.version,
                timestamp: new Date().toISOString(),
                data: data
            };
            return JSON.stringify(backup, null, 2);
        } catch (error) {
            console.error('バックアップ作成エラー:', error);
            return null;
        }
    }

    /**
     * バックアップからデータを復元
     * @param {string} backupJson - バックアップJSON文字列
     * @returns {boolean} 復元成功時true
     */
    restoreFromBackup(backupJson) {
        try {
            const backup = JSON.parse(backupJson);
            
            if (!this.validateData(backup)) {
                console.error('バックアップデータが無効です');
                return false;
            }

            return this.save(backup.data);
        } catch (error) {
            console.error('バックアップ復元エラー:', error);
            return false;
        }
    }

    /**
     * ストレージの使用量を取得（概算）
     * @returns {Object} 使用量情報
     */
    getStorageInfo() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const sizeInBytes = data ? new Blob([data]).size : 0;
            const sizeInKB = Math.round(sizeInBytes / 1024 * 100) / 100;
            
            // ストレージ容量の推定（ブラウザによって異なる）
            const estimatedQuota = this.getEstimatedStorageQuota();
            const usagePercentage = estimatedQuota > 0 ? Math.round((sizeInBytes / estimatedQuota) * 100) : 0;
            
            return {
                sizeInBytes: sizeInBytes,
                sizeInKB: sizeInKB,
                estimatedQuota: estimatedQuota,
                usagePercentage: usagePercentage,
                available: true
            };
        } catch (error) {
            return {
                sizeInBytes: 0,
                sizeInKB: 0,
                estimatedQuota: 0,
                usagePercentage: 0,
                available: false,
                error: error.message
            };
        }
    }

    /**
     * 保存データの妥当性をチェック
     * @param {Object} data - チェックするデータ
     * @returns {boolean} 妥当な場合true
     */
    validateSaveData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // 必要なプロパティの存在チェック
        const requiredProperties = ['orders', 'activities', 'sessions'];
        for (const prop of requiredProperties) {
            if (!Array.isArray(data[prop])) {
                return false;
            }
        }

        // データサイズチェック（10MBを超える場合は警告）
        const dataSize = JSON.stringify(data).length;
        if (dataSize > 10 * 1024 * 1024) {
            console.warn('データサイズが大きすぎます:', dataSize, 'bytes');
        }

        return true;
    }

    /**
     * ストレージ容量をチェック
     * @param {string} jsonString - 保存予定のJSON文字列
     */
    checkStorageQuota(jsonString) {
        const dataSize = new Blob([jsonString]).size;
        const estimatedQuota = this.getEstimatedStorageQuota();
        
        if (estimatedQuota > 0 && dataSize > estimatedQuota * 0.9) {
            console.warn('ストレージ容量が不足する可能性があります');
            throw new Error('ストレージ容量が不足しています');
        }
    }

    /**
     * 推定ストレージ容量を取得
     * @returns {number} 推定容量（バイト）
     */
    getEstimatedStorageQuota() {
        // ブラウザごとの一般的な制限値（概算）
        // Chrome/Edge: 約10MB、Firefox: 約10MB、Safari: 約5MB
        return 5 * 1024 * 1024; // 5MBを安全な上限とする
    }

    /**
     * データマイグレーション
     * @param {Object} storageData - 古いバージョンのデータ
     * @returns {Object} マイグレーション後のデータ
     */
    migrateData(storageData) {
        try {
            // 現在は単純にデータ構造を確認して返す
            // 将来のバージョンアップ時にマイグレーション処理を追加
            
            if (storageData.data && this.validateSaveData(storageData.data)) {
                console.log('データマイグレーション完了');
                return storageData.data;
            } else {
                console.warn('マイグレーションに失敗、デフォルトデータを使用');
                return this.getDefaultData();
            }
        } catch (error) {
            console.error('データマイグレーションエラー:', error);
            return this.getDefaultData();
        }
    }

    /**
     * データの健全性チェック
     * @returns {Object} チェック結果
     */
    performHealthCheck() {
        try {
            const data = this.load();
            const issues = [];
            
            // オーダーとアクティビティの関連性チェック
            const orderIds = new Set(data.orders.map(order => order.id));
            const orphanedActivities = data.activities.filter(activity => !orderIds.has(activity.orderId));
            
            if (orphanedActivities.length > 0) {
                issues.push(`${orphanedActivities.length}個の孤立したアクティビティが見つかりました`);
            }
            
            // アクティビティとセッションの関連性チェック
            const activityIds = new Set(data.activities.map(activity => activity.id));
            const orphanedSessions = data.sessions.filter(session => !activityIds.has(session.activityId));
            
            if (orphanedSessions.length > 0) {
                issues.push(`${orphanedSessions.length}個の孤立したセッションが見つかりました`);
            }
            
            // 無効なセッションデータチェック
            const invalidSessions = data.sessions.filter(session => {
                return !session.startTime || 
                       (session.endTime && new Date(session.endTime) < new Date(session.startTime));
            });
            
            if (invalidSessions.length > 0) {
                issues.push(`${invalidSessions.length}個の無効なセッションが見つかりました`);
            }
            
            return {
                healthy: issues.length === 0,
                issues: issues,
                totalOrders: data.orders.length,
                totalActivities: data.activities.length,
                totalSessions: data.sessions.length,
                orphanedActivities: orphanedActivities.length,
                orphanedSessions: orphanedSessions.length,
                invalidSessions: invalidSessions.length
            };
        } catch (error) {
            return {
                healthy: false,
                issues: ['健全性チェック中にエラーが発生しました'],
                error: error.message
            };
        }
    }

    /**
     * データの自動修復
     * @returns {boolean} 修復成功時true
     */
    autoRepair() {
        try {
            const data = this.load();
            let repaired = false;
            
            // 孤立したアクティビティを削除
            const orderIds = new Set(data.orders.map(order => order.id));
            const originalActivityCount = data.activities.length;
            data.activities = data.activities.filter(activity => orderIds.has(activity.orderId));
            
            if (data.activities.length < originalActivityCount) {
                repaired = true;
                console.log(`${originalActivityCount - data.activities.length}個の孤立したアクティビティを削除しました`);
            }
            
            // 孤立したセッションを削除
            const activityIds = new Set(data.activities.map(activity => activity.id));
            const originalSessionCount = data.sessions.length;
            data.sessions = data.sessions.filter(session => activityIds.has(session.activityId));
            
            if (data.sessions.length < originalSessionCount) {
                repaired = true;
                console.log(`${originalSessionCount - data.sessions.length}個の孤立したセッションを削除しました`);
            }
            
            // 無効なセッションを修正または削除
            const validSessions = [];
            data.sessions.forEach(session => {
                if (session.startTime) {
                    if (session.endTime && new Date(session.endTime) < new Date(session.startTime)) {
                        // 終了時刻が開始時刻より前の場合は修正
                        session.endTime = null;
                        session.duration = 0;
                        repaired = true;
                    }
                    validSessions.push(session);
                }
            });
            
            if (validSessions.length < data.sessions.length) {
                data.sessions = validSessions;
                repaired = true;
                console.log('無効なセッションを修正しました');
            }
            
            // 修復が行われた場合は保存
            if (repaired) {
                return this.save(data);
            }
            
            return true;
        } catch (error) {
            console.error('自動修復エラー:', error);
            return false;
        }
    }
    /**
     * ストレージからデータを完全に削除
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('ストレージデータが削除されました');
            return true;
        } catch (error) {
            console.error('ストレージクリアエラー:', error);
            
            // エラーハンドラーに通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleError('STORAGE_ERROR', error, {
                    operation: 'clear',
                    storageKey: this.storageKey
                });
            }
            
            throw error;
        }
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}