/**
 * データリポジトリクラス
 * オーダー、アクティビティ、セッションのCRUD操作を管理
 */
class DataRepository {
    constructor() {
        this.storageManager = new StorageManager();
        this.data = this.storageManager.load();
    }

    /**
     * データを保存
     * @returns {boolean} 保存成功時true
     */
    save() {
        return this.storageManager.save(this.data);
    }

    /**
     * データを再読み込み
     */
    reload() {
        this.data = this.storageManager.load();
    }

    // === オーダー関連メソッド ===

    /**
     * 全オーダーを取得
     * @returns {Order[]} オーダー配列
     */
    getAllOrders() {
        return this.data.orders.map(orderData => Order.fromJSON(orderData));
    }

    /**
     * IDでオーダーを取得
     * @param {string} id - オーダーID
     * @returns {Order|null} オーダー、見つからない場合null
     */
    getOrderById(id) {
        const orderData = this.data.orders.find(order => order.id === id);
        return orderData ? Order.fromJSON(orderData) : null;
    }

    /**
     * オーダーを作成
     * @param {string} name - オーダー名
     * @returns {Order} 作成されたオーダー
     */
    createOrder(name) {
        try {
            // 入力値検証
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                throw new Error('オーダー名が無効です');
            }
            
            if (name.length > 100) {
                throw new Error('オーダー名が長すぎます（100文字以内）');
            }
            
            // 重複チェック
            const existingOrder = this.data.orders.find(order => order.name === name.trim());
            if (existingOrder) {
                throw new Error('同じ名前のオーダーが既に存在します');
            }

            const order = new Order(generateId('order_'), name.trim());
            
            if (!order.isValid()) {
                throw new Error('無効なオーダーデータです');
            }

            this.data.orders.push(order.toJSON());
            
            if (!this.save()) {
                throw new Error('オーダーの保存に失敗しました');
            }
            
            return order;
        } catch (error) {
            // エラーハンドラーに通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleError('VALIDATION_ERROR', error, {
                    operation: 'createOrder',
                    orderName: name
                });
            }
            throw error;
        }
    }

    /**
     * オーダーを更新
     * @param {string} id - オーダーID
     * @param {Object} updates - 更新データ
     * @returns {Order|null} 更新されたオーダー、見つからない場合null
     */
    updateOrder(id, updates) {
        const index = this.data.orders.findIndex(order => order.id === id);
        if (index === -1) return null;

        this.data.orders[index] = { ...this.data.orders[index], ...updates };
        this.save();
        return Order.fromJSON(this.data.orders[index]);
    }

    /**
     * オーダーを削除
     * @param {string} id - オーダーID
     * @returns {boolean} 削除成功時true
     */
    deleteOrder(id) {
        const initialLength = this.data.orders.length;
        this.data.orders = this.data.orders.filter(order => order.id !== id);
        
        // 関連するアクティビティとセッションも削除
        const activityIds = this.data.activities
            .filter(activity => activity.orderId === id)
            .map(activity => activity.id);
        
        this.data.activities = this.data.activities.filter(activity => activity.orderId !== id);
        this.data.sessions = this.data.sessions.filter(session => 
            !activityIds.includes(session.activityId)
        );

        if (this.data.orders.length < initialLength) {
            this.save();
            return true;
        }
        return false;
    }

    // === アクティビティ関連メソッド ===

    /**
     * 全アクティビティを取得
     * @returns {Activity[]} アクティビティ配列
     */
    getAllActivities() {
        return this.data.activities.map(activityData => Activity.fromJSON(activityData));
    }

    /**
     * オーダーIDでアクティビティを取得
     * @param {string} orderId - オーダーID
     * @returns {Activity[]} アクティビティ配列
     */
    getActivitiesByOrderId(orderId) {
        return this.data.activities
            .filter(activity => activity.orderId === orderId)
            .map(activityData => Activity.fromJSON(activityData));
    }

    /**
     * IDでアクティビティを取得
     * @param {string} id - アクティビティID
     * @returns {Activity|null} アクティビティ、見つからない場合null
     */
    getActivityById(id) {
        const activityData = this.data.activities.find(activity => activity.id === id);
        return activityData ? Activity.fromJSON(activityData) : null;
    }

    /**
     * アクティビティを作成
     * @param {string} name - アクティビティ名
     * @param {string} orderId - 所属するオーダーID
     * @returns {Activity} 作成されたアクティビティ
     */
    createActivity(name, orderId) {
        try {
            // 入力値検証
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                throw new Error('アクティビティ名が無効です');
            }
            
            if (name.length > 100) {
                throw new Error('アクティビティ名が長すぎます（100文字以内）');
            }
            
            if (!orderId || typeof orderId !== 'string') {
                throw new Error('オーダーIDが無効です');
            }

            // オーダーの存在確認
            if (!this.getOrderById(orderId)) {
                throw new Error('指定されたオーダーが存在しません');
            }
            
            // 同一オーダー内での重複チェック
            const existingActivity = this.data.activities.find(activity => 
                activity.orderId === orderId && activity.name === name.trim()
            );
            if (existingActivity) {
                throw new Error('同じ名前のアクティビティが既に存在します');
            }

            const activity = new Activity(generateId('activity_'), name.trim(), orderId);
            
            if (!activity.isValid()) {
                throw new Error('無効なアクティビティデータです');
            }

            this.data.activities.push(activity.toJSON());
            
            if (!this.save()) {
                throw new Error('アクティビティの保存に失敗しました');
            }
            
            return activity;
        } catch (error) {
            // エラーハンドラーに通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleError('VALIDATION_ERROR', error, {
                    operation: 'createActivity',
                    activityName: name,
                    orderId: orderId
                });
            }
            throw error;
        }
    }

    /**
     * アクティビティを更新
     * @param {string} id - アクティビティID
     * @param {Object} updates - 更新データ
     * @returns {Activity|null} 更新されたアクティビティ、見つからない場合null
     */
    updateActivity(id, updates) {
        const index = this.data.activities.findIndex(activity => activity.id === id);
        if (index === -1) return null;

        this.data.activities[index] = { ...this.data.activities[index], ...updates };
        this.save();
        return Activity.fromJSON(this.data.activities[index]);
    }

    /**
     * アクティビティを削除
     * @param {string} id - アクティビティID
     * @returns {boolean} 削除成功時true
     */
    deleteActivity(id) {
        const initialLength = this.data.activities.length;
        this.data.activities = this.data.activities.filter(activity => activity.id !== id);
        
        // 関連するセッションも削除
        this.data.sessions = this.data.sessions.filter(session => session.activityId !== id);

        if (this.data.activities.length < initialLength) {
            this.save();
            return true;
        }
        return false;
    }

    // === セッション関連メソッド ===

    /**
     * 全セッションを取得
     * @returns {Session[]} セッション配列
     */
    getAllSessions() {
        return this.data.sessions.map(sessionData => Session.fromJSON(sessionData));
    }

    /**
     * アクティビティIDでセッションを取得
     * @param {string} activityId - アクティビティID
     * @returns {Session[]} セッション配列
     */
    getSessionsByActivityId(activityId) {
        return this.data.sessions
            .filter(session => session.activityId === activityId)
            .map(sessionData => Session.fromJSON(sessionData));
    }

    /**
     * セッションを作成
     * @param {string} activityId - アクティビティID
     * @param {string} startTime - 開始時刻（ISO文字列）
     * @returns {Session} 作成されたセッション
     */
    createSession(activityId, startTime = new Date().toISOString()) {
        try {
            // 入力値検証
            if (!activityId || typeof activityId !== 'string') {
                throw new Error('アクティビティIDが無効です');
            }
            
            // 開始時刻の妥当性チェック
            const startDate = new Date(startTime);
            if (isNaN(startDate.getTime())) {
                throw new Error('開始時刻が無効です');
            }
            
            // 未来の時刻チェック
            const now = new Date();
            if (startDate > now) {
                throw new Error('開始時刻が未来の時刻です');
            }
            
            // 過去すぎる時刻チェック（1年以上前）
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (startDate < oneYearAgo) {
                throw new Error('開始時刻が古すぎます');
            }

            // アクティビティの存在確認
            if (!this.getActivityById(activityId)) {
                throw new Error('指定されたアクティビティが存在しません');
            }
            
            // 既存のアクティブセッションチェック
            const existingActiveSession = this.data.sessions.find(session => 
                session.activityId === activityId && session.endTime === null
            );
            if (existingActiveSession) {
                throw new Error('このアクティビティには既にアクティブなセッションが存在します');
            }

            const session = new Session(generateId('session_'), activityId, startTime);
            
            if (!session.isValid()) {
                throw new Error('無効なセッションデータです');
            }

            this.data.sessions.push(session.toJSON());
            
            if (!this.save()) {
                throw new Error('セッションの保存に失敗しました');
            }
            
            return session;
        } catch (error) {
            // エラーハンドラーに通知
            if (window.app && window.app.errorHandler) {
                window.app.errorHandler.handleError('VALIDATION_ERROR', error, {
                    operation: 'createSession',
                    activityId: activityId,
                    startTime: startTime
                });
            }
            throw error;
        }
    }

    /**
     * セッションを終了
     * @param {string} id - セッションID
     * @param {string} endTime - 終了時刻（ISO文字列）
     * @returns {Session|null} 更新されたセッション、見つからない場合null
     */
    endSession(id, endTime = new Date().toISOString()) {
        const index = this.data.sessions.findIndex(session => session.id === id);
        if (index === -1) return null;

        const session = Session.fromJSON(this.data.sessions[index]);
        session.end(endTime);
        
        this.data.sessions[index] = session.toJSON();
        this.save();
        return session;
    }

    /**
     * セッションを更新
     * @param {string} id - セッションID
     * @param {Object} updates - 更新データ
     * @returns {Session|null} 更新されたセッション、見つからない場合null
     */
    updateSession(id, updates) {
        const index = this.data.sessions.findIndex(session => session.id === id);
        if (index === -1) return null;

        this.data.sessions[index] = { ...this.data.sessions[index], ...updates };
        this.save();
        return Session.fromJSON(this.data.sessions[index]);
    }

    /**
     * 現在のアクティブセッションを取得
     * @returns {Session|null} アクティブセッション、ない場合null
     */
    getCurrentSession() {
        if (!this.data.currentSession) return null;
        
        const sessionData = this.data.sessions.find(session => 
            session.activityId === this.data.currentSession.activityId && 
            session.endTime === null
        );
        
        return sessionData ? Session.fromJSON(sessionData) : null;
    }

    /**
     * 現在のセッション情報を設定
     * @param {string|null} activityId - アクティビティID、nullで解除
     * @param {string} startTime - 開始時刻
     */
    setCurrentSession(activityId, startTime = new Date().toISOString()) {
        if (activityId === null) {
            this.data.currentSession = null;
        } else {
            this.data.currentSession = {
                activityId: activityId,
                startTime: startTime
            };
        }
        this.save();
    }
    /**
     * 作業履歴のみをリセット（オーダーとアクティビティは保持）
     */
    resetSessionsOnly() {
        try {
            // 作業セッションのみを初期化
            this.data.sessions = [];
            this.data.currentSession = null;

            // データを保存
            this.save();

            console.log('作業履歴がリセットされました');
            return true;
        } catch (error) {
            console.error('作業履歴リセットエラー:', error);
            throw error;
        }
    }

    /**
     * 全てのデータをリセット
     */
    resetAllData() {
        try {
            // 全てのデータを初期化
            this.orders = [];
            this.activities = [];
            this.sessions = [];
            this.currentSession = null;
            this.settings = { ...this.defaultSettings };

            // ストレージからデータを削除
            this.storageManager.clear();

            console.log('全てのデータがリセットされました');
            return true;
        } catch (error) {
            console.error('データリセットエラー:', error);
            throw error;
        }
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.DataRepository = DataRepository;
}