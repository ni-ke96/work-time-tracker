/**
 * エラーハンドリングクラス
 * アプリケーション全体のエラー処理を統一管理
 */
class ErrorHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.errorLog = [];
        this.maxLogSize = 100;
        
        // グローバルエラーハンドラーを設定
        this.setupGlobalErrorHandlers();
    }

    /**
     * グローバルエラーハンドラーを設定
     */
    setupGlobalErrorHandlers() {
        // JavaScript実行時エラー
        window.addEventListener('error', (event) => {
            this.handleError('RUNTIME_ERROR', event.error, {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Promise拒否エラー
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('PROMISE_REJECTION', event.reason, {
                promise: event.promise
            });
        });

        // ローカルストレージエラー
        this.setupStorageErrorHandling();
    }

    /**
     * ストレージエラーハンドリングを設定
     */
    setupStorageErrorHandling() {
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;
        const self = this;

        // localStorage.setItemをラップ
        localStorage.setItem = function(key, value) {
            try {
                return originalSetItem.call(this, key, value);
            } catch (error) {
                self.handleStorageError('STORAGE_SAVE_ERROR', error, { key, valueSize: value.length });
                throw error;
            }
        };

        // localStorage.getItemをラップ
        localStorage.getItem = function(key) {
            try {
                return originalGetItem.call(this, key);
            } catch (error) {
                self.handleStorageError('STORAGE_READ_ERROR', error, { key });
                throw error;
            }
        };
    }

    /**
     * エラーを処理
     * @param {string} type - エラータイプ
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - エラーコンテキスト
     */
    handleError(type, error, context = {}) {
        const errorInfo = {
            type,
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        // エラーログに記録
        this.logError(errorInfo);

        // ユーザーに表示するメッセージを決定
        const userMessage = this.getUserFriendlyMessage(type, error, context);
        
        // UIに表示
        if (this.uiManager) {
            this.uiManager.showNotification(userMessage, 'error');
        }

        // コンソールにも出力
        console.error(`[${type}]`, error, context);

        // 重要なエラーの場合は追加処理
        this.handleCriticalError(type, error, context);
    }

    /**
     * ストレージエラーを処理
     * @param {string} type - エラータイプ
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - エラーコンテキスト
     */
    handleStorageError(type, error, context = {}) {
        const errorInfo = {
            type,
            message: error?.message || 'Storage error',
            context,
            timestamp: new Date().toISOString()
        };

        this.logError(errorInfo);

        // ストレージ容量不足の場合
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
            this.handleStorageQuotaExceeded();
        } else {
            // その他のストレージエラー
            const userMessage = this.getUserFriendlyMessage(type, error, context);
            if (this.uiManager) {
                this.uiManager.showNotification(userMessage, 'error');
            }
        }
    }

    /**
     * ストレージ容量不足を処理
     */
    handleStorageQuotaExceeded() {
        const message = 'ストレージ容量が不足しています。古いデータを削除するか、ブラウザのストレージをクリアしてください。';
        
        if (this.uiManager) {
            this.uiManager.showNotification(message, 'error');
            
            // 容量不足解決のオプションを表示
            this.showStorageCleanupOptions();
        }
    }

    /**
     * ストレージクリーンアップオプションを表示
     */
    showStorageCleanupOptions() {
        const options = [
            {
                text: '古いセッションデータを削除',
                action: () => this.cleanupOldSessions()
            },
            {
                text: 'すべてのデータをバックアップしてクリア',
                action: () => this.backupAndClear()
            }
        ];

        if (this.uiManager && this.uiManager.showActionDialog) {
            this.uiManager.showActionDialog(
                'ストレージ容量不足',
                'データを整理して容量を確保しますか？',
                options
            );
        }
    }

    /**
     * 古いセッションデータを削除
     */
    cleanupOldSessions() {
        try {
            // 30日以前のセッションを削除
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            
            const storageManager = new StorageManager();
            const data = storageManager.load();
            
            const originalSessionCount = data.sessions.length;
            data.sessions = data.sessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= cutoffDate;
            });
            
            const deletedCount = originalSessionCount - data.sessions.length;
            
            if (storageManager.save(data)) {
                const message = `${deletedCount}件の古いセッションを削除しました。`;
                this.uiManager.showNotification(message, 'success');
            } else {
                throw new Error('データの保存に失敗しました');
            }
        } catch (error) {
            this.handleError('CLEANUP_ERROR', error);
        }
    }

    /**
     * データをバックアップしてクリア
     */
    backupAndClear() {
        try {
            const storageManager = new StorageManager();
            const backup = storageManager.createBackup();
            
            if (backup) {
                // バックアップをダウンロード
                const blob = new Blob([backup], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `work-time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // データをクリア
                if (storageManager.clear()) {
                    this.uiManager.showNotification('データをバックアップしてクリアしました。ページを再読み込みしてください。', 'success');
                    
                    // 3秒後にページを再読み込み
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                } else {
                    throw new Error('データのクリアに失敗しました');
                }
            } else {
                throw new Error('バックアップの作成に失敗しました');
            }
        } catch (error) {
            this.handleError('BACKUP_ERROR', error);
        }
    }

    /**
     * ユーザーフレンドリーなエラーメッセージを取得
     * @param {string} type - エラータイプ
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - エラーコンテキスト
     * @returns {string} ユーザー向けメッセージ
     */
    getUserFriendlyMessage(type, error, context) {
        const errorMessages = {
            'STORAGE_SAVE_ERROR': 'データの保存に失敗しました。ストレージ容量を確認してください。',
            'STORAGE_READ_ERROR': 'データの読み込みに失敗しました。ブラウザの設定を確認してください。',
            'DATA_CORRUPTION': 'データが破損している可能性があります。バックアップから復元するか、データをリセットしてください。',
            'VALIDATION_ERROR': '入力されたデータが無効です。正しい形式で入力してください。',
            'TIMER_ERROR': 'タイマー機能でエラーが発生しました。ページを再読み込みしてください。',
            'NETWORK_ERROR': 'ネットワークエラーが発生しました。接続を確認してください。',
            'RUNTIME_ERROR': '予期しないエラーが発生しました。ページを再読み込みしてください。',
            'PROMISE_REJECTION': '処理中にエラーが発生しました。もう一度お試しください。',
            'EXPORT_ERROR': 'データのエクスポートに失敗しました。',
            'IMPORT_ERROR': 'データのインポートに失敗しました。ファイル形式を確認してください。'
        };

        let message = errorMessages[type] || 'エラーが発生しました。';

        // 特定のエラーに対する詳細メッセージ
        if (error) {
            if (error.name === 'QuotaExceededError') {
                message = 'ストレージ容量が不足しています。データを整理するか、ブラウザのストレージをクリアしてください。';
            } else if (error.message && error.message.includes('JSON')) {
                message = 'データ形式が正しくありません。バックアップから復元するか、データをリセットしてください。';
            } else if (error.message && error.message.includes('network')) {
                message = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            }
        }

        return message;
    }

    /**
     * 重要なエラーの追加処理
     * @param {string} type - エラータイプ
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - エラーコンテキスト
     */
    handleCriticalError(type, error, context) {
        const criticalErrors = ['STORAGE_SAVE_ERROR', 'DATA_CORRUPTION', 'RUNTIME_ERROR'];
        
        if (criticalErrors.includes(type)) {
            // 重要なエラーの場合は自動復旧を試行
            this.attemptAutoRecovery(type, error, context);
        }
    }

    /**
     * 自動復旧を試行
     * @param {string} type - エラータイプ
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - エラーコンテキスト
     */
    attemptAutoRecovery(type, error, context) {
        try {
            switch (type) {
                case 'STORAGE_SAVE_ERROR':
                    // ストレージ保存エラーの場合、データを簡素化して再試行
                    this.attemptSimplifiedSave(context);
                    break;
                    
                case 'DATA_CORRUPTION':
                    // データ破損の場合、デフォルトデータで初期化
                    this.resetToDefaultData();
                    break;
                    
                case 'RUNTIME_ERROR':
                    // 実行時エラーの場合、状態をリセット
                    this.resetApplicationState();
                    break;
            }
        } catch (recoveryError) {
            console.error('自動復旧に失敗:', recoveryError);
        }
    }

    /**
     * 簡素化されたデータ保存を試行
     * @param {Object} context - エラーコンテキスト
     */
    attemptSimplifiedSave(context) {
        try {
            const storageManager = new StorageManager();
            const data = storageManager.load();
            
            // 不要なデータを削除して容量を削減
            if (data.sessions && data.sessions.length > 1000) {
                // セッション数を制限
                data.sessions = data.sessions.slice(-1000);
            }
            
            // 設定データを最小限に
            data.settings = {
                autoSave: true,
                theme: 'light'
            };
            
            if (storageManager.save(data)) {
                this.uiManager.showNotification('データを簡素化して保存しました。', 'info');
            }
        } catch (error) {
            console.error('簡素化保存に失敗:', error);
        }
    }

    /**
     * デフォルトデータにリセット
     */
    resetToDefaultData() {
        try {
            const storageManager = new StorageManager();
            const defaultData = storageManager.getDefaultData();
            
            if (storageManager.save(defaultData)) {
                this.uiManager.showNotification('データを初期状態にリセットしました。', 'warning');
                
                // アプリケーションを再初期化
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            console.error('デフォルトデータリセットに失敗:', error);
        }
    }

    /**
     * アプリケーション状態をリセット
     */
    resetApplicationState() {
        try {
            // タイマーを停止
            if (window.app && window.app.timerService) {
                window.app.timerService.destroy();
            }
            
            // 選択状態をクリア
            if (window.app) {
                window.app.selectedOrderId = null;
            }
            
            this.uiManager.showNotification('アプリケーション状態をリセットしました。', 'info');
        } catch (error) {
            console.error('状態リセットに失敗:', error);
        }
    }

    /**
     * エラーをログに記録
     * @param {Object} errorInfo - エラー情報
     */
    logError(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // ログサイズを制限
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }
        
        // 重要なエラーはローカルストレージにも保存
        if (this.isCriticalError(errorInfo.type)) {
            this.saveErrorToStorage(errorInfo);
        }
    }

    /**
     * 重要なエラーかどうか判定
     * @param {string} type - エラータイプ
     * @returns {boolean} 重要なエラーの場合true
     */
    isCriticalError(type) {
        const criticalTypes = [
            'STORAGE_SAVE_ERROR',
            'DATA_CORRUPTION',
            'RUNTIME_ERROR',
            'PROMISE_REJECTION'
        ];
        return criticalTypes.includes(type);
    }

    /**
     * エラーをストレージに保存
     * @param {Object} errorInfo - エラー情報
     */
    saveErrorToStorage(errorInfo) {
        try {
            const errorLogKey = 'workTimeTracker_errorLog';
            const existingLog = JSON.parse(localStorage.getItem(errorLogKey) || '[]');
            
            existingLog.push(errorInfo);
            
            // エラーログも制限
            if (existingLog.length > 50) {
                existingLog.splice(0, existingLog.length - 50);
            }
            
            localStorage.setItem(errorLogKey, JSON.stringify(existingLog));
        } catch (error) {
            // エラーログの保存に失敗した場合はコンソールのみ
            console.error('エラーログの保存に失敗:', error);
        }
    }

    /**
     * エラーログを取得
     * @returns {Array} エラーログ配列
     */
    getErrorLog() {
        return [...this.errorLog];
    }

    /**
     * エラーログをクリア
     */
    clearErrorLog() {
        this.errorLog = [];
        
        try {
            localStorage.removeItem('workTimeTracker_errorLog');
        } catch (error) {
            console.error('エラーログのクリアに失敗:', error);
        }
    }

    /**
     * エラー統計を取得
     * @returns {Object} エラー統計情報
     */
    getErrorStats() {
        const stats = {};
        
        this.errorLog.forEach(error => {
            stats[error.type] = (stats[error.type] || 0) + 1;
        });
        
        return {
            totalErrors: this.errorLog.length,
            errorTypes: stats,
            lastError: this.errorLog[this.errorLog.length - 1] || null
        };
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}