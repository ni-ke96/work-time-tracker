/**
 * タイマーサービスクラス
 * 作業時間の計測とセッション管理を行う
 */
class TimerService {
    constructor(repository) {
        this.repository = repository;
        this.currentSession = null;
        this.timerInterval = null;
        this.callbacks = {
            tick: null,
            start: null,
            stop: null,
            switch: null
        };
    }

    /**
     * コールバック関数を設定
     * @param {string} event - イベント名（tick, start, stop, switch）
     * @param {Function} callback - コールバック関数
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }

    /**
     * 作業を開始
     * @param {string} activityId - アクティビティID
     * @returns {boolean} 開始成功時true
     */
    startWork(activityId) {
        try {
            // 入力値検証
            if (!activityId || typeof activityId !== 'string') {
                throw new Error('アクティビティIDが無効です');
            }
            
            // アクティビティの存在確認
            const activity = this.repository.getActivityById(activityId);
            if (!activity) {
                throw new Error('指定されたアクティビティが見つかりません');
            }

            // 既存のセッションがある場合は終了
            if (this.currentSession) {
                const stopResult = this.stopWork();
                if (!stopResult) {
                    throw new Error('既存セッションの停止に失敗しました');
                }
            }

            // 新しいセッションを作成
            const session = this.repository.createSession(activityId);
            this.currentSession = session;
            this.repository.setCurrentSession(activityId);

            // タイマー開始
            this.startTimer();

            // コールバック実行
            if (this.callbacks.start) {
                try {
                    this.callbacks.start(session);
                } catch (callbackError) {
                    console.error('開始コールバックエラー:', callbackError);
                }
            }

            return true;
        } catch (error) {
            console.error('作業開始エラー:', error);
            
            // エラーハンドラーに通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleError('TIMER_ERROR', error, {
                    operation: 'startWork',
                    activityId: activityId
                });
            }
            
            return false;
        }
    }

    /**
     * 作業を停止
     * @returns {boolean} 停止成功時true
     */
    stopWork() {
        try {
            if (!this.currentSession) {
                console.warn('停止するセッションがありません');
                return false;
            }

            const sessionId = this.currentSession.id;

            // タイマー停止
            this.stopTimer();

            // セッション終了
            const endedSession = this.repository.endSession(sessionId);
            if (!endedSession) {
                throw new Error('セッションの終了に失敗しました');
            }
            
            this.repository.setCurrentSession(null);

            // コールバック実行
            if (this.callbacks.stop) {
                try {
                    this.callbacks.stop(endedSession);
                } catch (callbackError) {
                    console.error('停止コールバックエラー:', callbackError);
                }
            }

            this.currentSession = null;
            return true;
        } catch (error) {
            console.error('作業停止エラー:', error);
            
            // エラーハンドラーに通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleError('TIMER_ERROR', error, {
                    operation: 'stopWork',
                    sessionId: this.currentSession?.id
                });
            }
            
            // エラーが発生してもタイマーは停止し、状態をクリア
            this.stopTimer();
            this.currentSession = null;
            
            return false;
        }
    }

    /**
     * 作業を切り替え
     * @param {string} activityId - 新しいアクティビティID
     * @returns {boolean} 切り替え成功時true
     */
    switchWork(activityId) {
        try {
            const previousSession = this.currentSession;
            
            // 現在の作業を停止
            if (this.currentSession) {
                this.stopWork();
            }

            // 新しい作業を開始
            const success = this.startWork(activityId);

            // コールバック実行
            if (success && this.callbacks.switch) {
                this.callbacks.switch(previousSession, this.currentSession);
            }

            return success;
        } catch (error) {
            console.error('作業切り替えエラー:', error);
            return false;
        }
    }

    /**
     * タイマーを開始
     */
    startTimer() {
        try {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            this.timerInterval = setInterval(() => {
                try {
                    if (this.currentSession) {
                        // 現在の経過時間を計算
                        const now = new Date();
                        const start = new Date(this.currentSession.startTime);
                        
                        // 時刻の妥当性チェック
                        if (isNaN(start.getTime())) {
                            throw new Error('セッション開始時刻が無効です');
                        }
                        
                        const elapsed = now.getTime() - start.getTime();
                        
                        // 異常な経過時間チェック（24時間以上）
                        if (elapsed > 24 * 60 * 60 * 1000) {
                            console.warn('異常に長い作業時間が検出されました:', elapsed);
                        }

                        // コールバック実行
                        if (this.callbacks.tick) {
                            try {
                                this.callbacks.tick(elapsed, this.currentSession);
                            } catch (callbackError) {
                                console.error('Tickコールバックエラー:', callbackError);
                            }
                        }
                    }
                } catch (error) {
                    console.error('タイマー更新エラー:', error);
                    
                    // エラーハンドラーに通知
                    if (window.app && window.app.errorHandler) {
                        window.app.errorHandler.handleError('TIMER_ERROR', error, {
                            operation: 'timerTick',
                            sessionId: this.currentSession?.id
                        });
                    }
                }
            }, 1000); // 1秒間隔で更新
        } catch (error) {
            console.error('タイマー開始エラー:', error);
            
            // エラーハンドラーに通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleError('TIMER_ERROR', error, {
                    operation: 'startTimer'
                });
            }
        }
    }

    /**
     * タイマーを停止
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * 現在のセッション情報を取得
     * @returns {Session|null} 現在のセッション
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * 現在の経過時間を取得
     * @returns {number} 経過時間（ミリ秒）
     */
    getCurrentElapsed() {
        if (!this.currentSession) {
            return 0;
        }

        const now = new Date();
        const start = new Date(this.currentSession.startTime);
        return now.getTime() - start.getTime();
    }

    /**
     * 作業中かどうか
     * @returns {boolean} 作業中の場合true
     */
    isWorking() {
        return this.currentSession !== null;
    }

    /**
     * 指定したアクティビティが作業中かどうか
     * @param {string} activityId - アクティビティID
     * @returns {boolean} 作業中の場合true
     */
    isActivityActive(activityId) {
        return this.currentSession && this.currentSession.activityId === activityId;
    }

    /**
     * タイマーサービスを初期化（既存のセッションがある場合は復元）
     */
    initialize() {
        try {
            // 保存されている現在のセッション情報を確認
            const savedCurrentSession = this.repository.getCurrentSession();
            
            if (savedCurrentSession && savedCurrentSession.isActive()) {
                // 既存のアクティブセッションを復元
                this.currentSession = savedCurrentSession;
                this.startTimer();
                
                console.log('既存のセッションを復元しました:', savedCurrentSession.id);
            }
        } catch (error) {
            console.error('タイマーサービス初期化エラー:', error);
        }
    }

    /**
     * タイマーサービスを破棄
     */
    destroy() {
        this.stopTimer();
        this.currentSession = null;
        this.callbacks = {
            onTick: null,
            onStart: null,
            onStop: null,
            onSwitch: null
        };
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.TimerService = TimerService;
}