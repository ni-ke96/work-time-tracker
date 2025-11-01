/**
 * データモデルクラス定義
 * 作業時間記録ツールで使用するOrder、Activity、Sessionクラス
 */

/**
 * オーダークラス
 * 複数のアクティビティで構成される作業単位を表現
 */
class Order {
    /**
     * オーダーを作成
     * @param {string} id - 一意識別子
     * @param {string} name - オーダー名
     * @param {string} createdAt - 作成日時（ISO文字列）
     */
    constructor(id, name, createdAt = new Date().toISOString()) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt;
        this.activities = [];
    }

    /**
     * オーダーの妥当性を検証
     * @returns {boolean} 妥当な場合true
     */
    isValid() {
        return this.id && 
               typeof this.id === 'string' && 
               this.name && 
               typeof this.name === 'string' && 
               this.name.trim().length > 0 &&
               this.createdAt &&
               !isNaN(new Date(this.createdAt).getTime());
    }

    /**
     * オーダーをJSON形式に変換
     * @returns {Object} JSON表現
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt
        };
    }

    /**
     * JSONからオーダーインスタンスを作成
     * @param {Object} json - JSON表現
     * @returns {Order} オーダーインスタンス
     */
    static fromJSON(json) {
        const order = new Order(json.id, json.name, json.createdAt);
        return order;
    }
}

/**
 * アクティビティクラス
 * オーダー内の個別の作業項目を表現
 */
class Activity {
    /**
     * アクティビティを作成
     * @param {string} id - 一意識別子
     * @param {string} name - アクティビティ名
     * @param {string} orderId - 所属するオーダーのID
     * @param {string} createdAt - 作成日時（ISO文字列）
     */
    constructor(id, name, orderId, createdAt = new Date().toISOString()) {
        this.id = id;
        this.name = name;
        this.orderId = orderId;
        this.createdAt = createdAt;
        this.sessions = [];
    }

    /**
     * アクティビティの妥当性を検証
     * @returns {boolean} 妥当な場合true
     */
    isValid() {
        return this.id && 
               typeof this.id === 'string' && 
               this.name && 
               typeof this.name === 'string' && 
               this.name.trim().length > 0 &&
               this.orderId &&
               typeof this.orderId === 'string' &&
               this.createdAt &&
               !isNaN(new Date(this.createdAt).getTime());
    }

    /**
     * アクティビティの総作業時間を計算（ミリ秒）
     * @returns {number} 総作業時間（ミリ秒）
     */
    getTotalDuration() {
        return this.sessions.reduce((total, session) => {
            return total + (session.duration || 0);
        }, 0);
    }

    /**
     * アクティビティをJSON形式に変換
     * @returns {Object} JSON表現
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            orderId: this.orderId,
            createdAt: this.createdAt
        };
    }

    /**
     * JSONからアクティビティインスタンスを作成
     * @param {Object} json - JSON表現
     * @returns {Activity} アクティビティインスタンス
     */
    static fromJSON(json) {
        const activity = new Activity(json.id, json.name, json.orderId, json.createdAt);
        return activity;
    }
}

/**
 * セッションクラス
 * 開始から終了までの連続した作業時間を表現
 */
class Session {
    /**
     * セッションを作成
     * @param {string} id - 一意識別子
     * @param {string} activityId - 所属するアクティビティのID
     * @param {string} startTime - 開始時刻（ISO文字列）
     * @param {string|null} endTime - 終了時刻（ISO文字列、進行中の場合null）
     */
    constructor(id, activityId, startTime, endTime = null) {
        this.id = id;
        this.activityId = activityId;
        this.startTime = startTime;
        this.endTime = endTime;
        this.duration = this.calculateDuration();
    }

    /**
     * セッションの妥当性を検証
     * @returns {boolean} 妥当な場合true
     */
    isValid() {
        const startTimeValid = this.startTime && !isNaN(new Date(this.startTime).getTime());
        const endTimeValid = this.endTime === null || !isNaN(new Date(this.endTime).getTime());
        
        return this.id && 
               typeof this.id === 'string' && 
               this.activityId &&
               typeof this.activityId === 'string' &&
               startTimeValid &&
               endTimeValid;
    }

    /**
     * セッションの継続時間を計算
     * @returns {number} 継続時間（ミリ秒）
     */
    calculateDuration() {
        if (!this.startTime) return 0;
        
        const start = new Date(this.startTime);
        const end = this.endTime ? new Date(this.endTime) : new Date();
        
        return Math.max(0, end.getTime() - start.getTime());
    }

    /**
     * セッションが進行中かどうか
     * @returns {boolean} 進行中の場合true
     */
    isActive() {
        return this.endTime === null;
    }

    /**
     * セッションを終了
     * @param {string} endTime - 終了時刻（ISO文字列、省略時は現在時刻）
     */
    end(endTime = new Date().toISOString()) {
        this.endTime = endTime;
        this.duration = this.calculateDuration();
    }

    /**
     * セッションをJSON形式に変換
     * @returns {Object} JSON表現
     */
    toJSON() {
        return {
            id: this.id,
            activityId: this.activityId,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.duration
        };
    }

    /**
     * JSONからセッションインスタンスを作成
     * @param {Object} json - JSON表現
     * @returns {Session} セッションインスタンス
     */
    static fromJSON(json) {
        const session = new Session(json.id, json.activityId, json.startTime, json.endTime);
        // 保存されたdurationがある場合は使用（計算誤差を避けるため）
        if (json.duration !== undefined) {
            session.duration = json.duration;
        }
        return session;
    }
}

/**
 * 一意IDを生成するユーティリティ関数
 * @param {string} prefix - プレフィックス（'order_', 'activity_', 'session_'など）
 * @returns {string} 一意ID
 */
function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `${prefix}${timestamp}_${randomStr}`;
}

/**
 * 時間をフォーマットするユーティリティ関数
 * @param {number} milliseconds - ミリ秒
 * @returns {string} HH:MM:SS形式の文字列
 */
function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// グローバルスコープに公開（モジュールシステムを使わない場合）
if (typeof window !== 'undefined') {
    window.Order = Order;
    window.Activity = Activity;
    window.Session = Session;
    window.generateId = generateId;
    window.formatDuration = formatDuration;
}