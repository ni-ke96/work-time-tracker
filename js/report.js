/**
 * レポートサービスクラス
 * 時間集計とレポート生成を行う
 */
class ReportService {
    constructor(repository) {
        this.repository = repository;
    }

    /**
     * オーダー別の総作業時間を取得
     * @returns {Array} オーダー別集計結果
     */
    getOrderSummary() {
        const orders = this.repository.getAllOrders();
        const activities = this.repository.getAllActivities();
        const sessions = this.repository.getAllSessions();

        return orders.map(order => {
            const orderActivities = activities.filter(activity => activity.orderId === order.id);
            const totalDuration = orderActivities.reduce((total, activity) => {
                const activitySessions = sessions.filter(session => session.activityId === activity.id);
                const activityDuration = activitySessions.reduce((sum, session) => sum + session.duration, 0);
                return total + activityDuration;
            }, 0);

            return {
                order: order,
                totalDuration: totalDuration,
                formattedDuration: formatDuration(totalDuration),
                activityCount: orderActivities.length
            };
        });
    }

    /**
     * アクティビティ別の作業時間を取得
     * @param {string} orderId - オーダーID（省略時は全アクティビティ）
     * @returns {Array} アクティビティ別集計結果
     */
    getActivitySummary(orderId = null) {
        let activities = this.repository.getAllActivities();
        if (orderId) {
            activities = activities.filter(activity => activity.orderId === orderId);
        }

        const sessions = this.repository.getAllSessions();

        return activities.map(activity => {
            const activitySessions = sessions.filter(session => session.activityId === activity.id);
            const totalDuration = activitySessions.reduce((sum, session) => sum + session.duration, 0);

            return {
                activity: activity,
                totalDuration: totalDuration,
                formattedDuration: formatDuration(totalDuration),
                sessionCount: activitySessions.length,
                lastWorked: this.getLastWorkedTime(activitySessions)
            };
        });
    }

    /**
     * 期間別レポートを取得
     * @param {string} period - 期間（'day', 'week', 'month'）
     * @param {Date} targetDate - 対象日（省略時は今日）
     * @returns {Object} 期間別レポート
     */
    getPeriodReport(period = 'day', targetDate = new Date()) {
        const sessions = this.repository.getAllSessions();
        const { startDate, endDate } = this.getPeriodRange(period, targetDate);

        const periodSessions = sessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate >= startDate && sessionDate <= endDate;
        });

        const totalDuration = periodSessions.reduce((sum, session) => sum + session.duration, 0);

        return {
            period: period,
            startDate: startDate,
            endDate: endDate,
            totalDuration: totalDuration,
            formattedDuration: formatDuration(totalDuration),
            sessionCount: periodSessions.length,
            dailyBreakdown: this.getDailyBreakdown(periodSessions, startDate, endDate)
        };
    }

    /**
     * 作業履歴の詳細を取得
     * @param {number} limit - 取得件数制限（省略時は50件）
     * @returns {Array} 作業履歴
     */
    getWorkHistory(limit = 50) {
        const sessions = this.repository.getAllSessions()
            .filter(session => session.endTime !== null) // 完了したセッションのみ
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)) // 新しい順
            .slice(0, limit);

        const activities = this.repository.getAllActivities();
        const orders = this.repository.getAllOrders();

        return sessions.map(session => {
            const activity = activities.find(a => a.id === session.activityId);
            const order = activity ? orders.find(o => o.id === activity.orderId) : null;

            return {
                session: session,
                activity: activity,
                order: order,
                formattedDuration: formatDuration(session.duration),
                date: new Date(session.startTime).toLocaleDateString('ja-JP'),
                startTime: new Date(session.startTime).toLocaleTimeString('ja-JP'),
                endTime: session.endTime ? new Date(session.endTime).toLocaleTimeString('ja-JP') : null
            };
        });
    }

    /**
     * CSVエクスポート用データを生成
     * @param {string} type - エクスポートタイプ（'sessions', 'summary'）
     * @returns {string} CSV文字列
     */
    generateCSV(type = 'sessions') {
        if (type === 'sessions') {
            return this.generateSessionsCSV();
        } else if (type === 'summary') {
            return this.generateSummaryCSV();
        }
        return '';
    }

    /**
     * セッション詳細のCSVを生成
     * @returns {string} CSV文字列
     */
    generateSessionsCSV() {
        const history = this.getWorkHistory(1000); // 最大1000件
        
        const headers = [
            '日付', 
            '開始時刻', 
            '終了時刻', 
            'オーダー', 
            'アクティビティ', 
            '作業時間', 
            '作業時間（分）',
            'セッションID',
            'オーダーID',
            'アクティビティID'
        ];
        
        const rows = history.map(item => [
            item.date,
            item.startTime,
            item.endTime || '',
            item.order ? item.order.name : '',
            item.activity ? item.activity.name : '',
            item.formattedDuration,
            Math.round(item.session.duration / 60000), // 分単位
            item.session.id,
            item.order ? item.order.id : '',
            item.activity ? item.activity.id : ''
        ]);

        return this.arrayToCSV([headers, ...rows]);
    }

    /**
     * サマリーのCSVを生成
     * @returns {string} CSV文字列
     */
    generateSummaryCSV() {
        const orderSummary = this.getOrderSummary();
        
        // オーダー別サマリー
        const orderHeaders = [
            'オーダー名', 
            'アクティビティ数', 
            '総作業時間', 
            '総作業時間（分）',
            '総作業時間（時間）',
            'オーダーID',
            '作成日'
        ];
        
        const orderRows = orderSummary.map(item => [
            item.order.name,
            item.activityCount.toString(),
            item.formattedDuration,
            Math.round(item.totalDuration / 60000), // 分単位
            (item.totalDuration / 3600000).toFixed(2), // 時間単位（小数点2桁）
            item.order.id,
            new Date(item.order.createdAt).toLocaleDateString('ja-JP')
        ]);

        let csv = '# オーダー別集計\n';
        csv += this.arrayToCSV([orderHeaders, ...orderRows]);
        
        // アクティビティ別サマリー
        const activitySummary = this.getActivitySummary();
        const activityHeaders = [
            'アクティビティ名',
            'オーダー名',
            'セッション数',
            '総作業時間',
            '総作業時間（分）',
            '総作業時間（時間）',
            '最終作業日時',
            'アクティビティID',
            'オーダーID'
        ];
        
        const orders = this.repository.getAllOrders();
        const activityRows = activitySummary.map(item => {
            const order = orders.find(o => o.id === item.activity.orderId);
            return [
                item.activity.name,
                order ? order.name : '',
                item.sessionCount.toString(),
                item.formattedDuration,
                Math.round(item.totalDuration / 60000), // 分単位
                (item.totalDuration / 3600000).toFixed(2), // 時間単位（小数点2桁）
                item.lastWorked || '',
                item.activity.id,
                item.activity.orderId
            ];
        });

        csv += '\n\n# アクティビティ別集計\n';
        csv += this.arrayToCSV([activityHeaders, ...activityRows]);

        return csv;
    }

    /**
     * 配列をCSV文字列に変換
     * @param {Array} data - 2次元配列
     * @returns {string} CSV文字列
     */
    arrayToCSV(data) {
        return data.map(row => 
            row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`)
               .join(',')
        ).join('\n');
    }

    /**
     * 期間の開始日と終了日を取得
     * @param {string} period - 期間タイプ
     * @param {Date} targetDate - 対象日
     * @returns {Object} 開始日と終了日
     */
    getPeriodRange(period, targetDate) {
        const date = new Date(targetDate);
        let startDate, endDate;

        switch (period) {
            case 'day':
                startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
                break;
            case 'week':
                const dayOfWeek = date.getDay();
                startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek);
                endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek + 7);
                break;
            case 'month':
                startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
                break;
            default:
                startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        }

        return { startDate, endDate };
    }

    /**
     * 日別の作業時間内訳を取得
     * @param {Array} sessions - セッション配列
     * @param {Date} startDate - 開始日
     * @param {Date} endDate - 終了日
     * @returns {Array} 日別内訳
     */
    getDailyBreakdown(sessions, startDate, endDate) {
        const breakdown = [];
        const currentDate = new Date(startDate);

        while (currentDate < endDate) {
            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

            const daySessions = sessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= dayStart && sessionDate < dayEnd;
            });

            const totalDuration = daySessions.reduce((sum, session) => sum + session.duration, 0);

            breakdown.push({
                date: new Date(currentDate),
                formattedDate: currentDate.toLocaleDateString('ja-JP'),
                totalDuration: totalDuration,
                formattedDuration: formatDuration(totalDuration),
                sessionCount: daySessions.length
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return breakdown;
    }

    /**
     * 最後に作業した時刻を取得
     * @param {Array} sessions - セッション配列
     * @returns {string|null} 最後の作業時刻
     */
    getLastWorkedTime(sessions) {
        if (sessions.length === 0) return null;

        const lastSession = sessions
            .filter(session => session.endTime !== null)
            .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0];

        return lastSession ? new Date(lastSession.endTime).toLocaleString('ja-JP') : null;
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.ReportService = ReportService;
}