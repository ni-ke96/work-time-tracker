/**
 * 統合テストクラス
 * UI操作からデータ保存までの一連のテストとブラウザ互換性テストを実施
 */
class IntegrationTest {
    constructor() {
        this.testResults = [];
        this.testStartTime = null;
        this.testEndTime = null;
        this.browserInfo = this.getBrowserInfo();
        this.originalData = null;
    }

    /**
     * ブラウザ情報を取得
     * @returns {Object} ブラウザ情報
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        const browserInfo = {
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        // ブラウザ種別の判定
        if (ua.includes('Chrome')) {
            browserInfo.browser = 'Chrome';
        } else if (ua.includes('Firefox')) {
            browserInfo.browser = 'Firefox';
        } else if (ua.includes('Safari')) {
            browserInfo.browser = 'Safari';
        } else if (ua.includes('Edge')) {
            browserInfo.browser = 'Edge';
        } else {
            browserInfo.browser = 'Unknown';
        }

        return browserInfo;
    }

    /**
     * 全統合テストを実行
     * @returns {Promise<Object>} テスト結果
     */
    async runAllTests() {
        console.log('=== 統合テスト開始 ===');
        console.log('ブラウザ情報:', this.browserInfo);
        
        this.testStartTime = new Date();
        this.testResults = [];

        try {
            // データのバックアップ
            await this.backupCurrentData();

            // 基本機能テスト
            await this.testBasicFunctionality();

            // UI操作テスト
            await this.testUIOperations();

            // データ整合性テスト
            await this.testDataIntegrity();

            // エラーハンドリングテスト
            await this.testErrorHandling();

            // パフォーマンステスト
            await this.testPerformance();

            // ブラウザ互換性テスト
            await this.testBrowserCompatibility();

            // データ復元
            await this.restoreOriginalData();

        } catch (error) {
            console.error('統合テスト中にエラーが発生:', error);
            this.addTestResult('統合テスト実行', false, `テスト実行エラー: ${error.message}`);
        }

        this.testEndTime = new Date();
        const testDuration = this.testEndTime.getTime() - this.testStartTime.getTime();

        const summary = this.generateTestSummary(testDuration);
        console.log('=== 統合テスト完了 ===');
        console.log('テスト結果サマリー:', summary);

        return summary;
    }

    /**
     * 現在のデータをバックアップ
     */
    async backupCurrentData() {
        try {
            if (window.app && window.app.repository) {
                this.originalData = window.app.repository.storageManager.load();
                this.addTestResult('データバックアップ', true, 'データのバックアップが完了しました');
            }
        } catch (error) {
            this.addTestResult('データバックアップ', false, `バックアップエラー: ${error.message}`);
        }
    }

    /**
     * 元のデータを復元
     */
    async restoreOriginalData() {
        try {
            if (this.originalData && window.app && window.app.repository) {
                window.app.repository.storageManager.save(this.originalData);
                this.addTestResult('データ復元', true, 'データの復元が完了しました');
            }
        } catch (error) {
            this.addTestResult('データ復元', false, `復元エラー: ${error.message}`);
        }
    }

    /**
     * 基本機能テスト
     */
    async testBasicFunctionality() {
        console.log('基本機能テストを実行中...');

        // アプリケーション初期化テスト
        await this.testApplicationInitialization();

        // オーダー管理テスト
        await this.testOrderManagement();

        // アクティビティ管理テスト
        await this.testActivityManagement();

        // タイマー機能テスト
        await this.testTimerFunctionality();

        // レポート機能テスト
        await this.testReportFunctionality();
    }

    /**
     * アプリケーション初期化テスト
     */
    async testApplicationInitialization() {
        try {
            // アプリケーションオブジェクトの存在確認
            if (!window.app) {
                throw new Error('アプリケーションオブジェクトが存在しません');
            }

            // 必要なコンポーネントの存在確認
            const requiredComponents = [
                'repository', 'timerService', 'reportService', 
                'uiManager', 'errorHandler', 'performanceOptimizer'
            ];

            for (const component of requiredComponents) {
                if (!window.app[component]) {
                    throw new Error(`${component}が初期化されていません`);
                }
            }

            // 初期化フラグの確認
            if (!window.app.isInitialized) {
                throw new Error('アプリケーションが正常に初期化されていません');
            }

            this.addTestResult('アプリケーション初期化', true, '全コンポーネントが正常に初期化されました');
        } catch (error) {
            this.addTestResult('アプリケーション初期化', false, error.message);
        }
    }

    /**
     * オーダー管理テスト
     */
    async testOrderManagement() {
        try {
            const repository = window.app.repository;
            const testOrderName = 'テスト統合オーダー';

            // オーダー作成テスト
            const order = repository.createOrder(testOrderName);
            if (!order || order.name !== testOrderName) {
                throw new Error('オーダー作成に失敗しました');
            }

            // オーダー取得テスト
            const retrievedOrder = repository.getOrderById(order.id);
            if (!retrievedOrder || retrievedOrder.name !== testOrderName) {
                throw new Error('オーダー取得に失敗しました');
            }

            // オーダー更新テスト
            const updatedName = 'テスト統合オーダー（更新済み）';
            const updatedOrder = repository.updateOrder(order.id, { name: updatedName });
            if (!updatedOrder || updatedOrder.name !== updatedName) {
                throw new Error('オーダー更新に失敗しました');
            }

            // オーダー削除テスト
            const deleteResult = repository.deleteOrder(order.id);
            if (!deleteResult) {
                throw new Error('オーダー削除に失敗しました');
            }

            this.addTestResult('オーダー管理', true, 'CRUD操作が正常に動作しました');
        } catch (error) {
            this.addTestResult('オーダー管理', false, error.message);
        }
    }

    /**
     * アクティビティ管理テスト
     */
    async testActivityManagement() {
        try {
            const repository = window.app.repository;

            // テスト用オーダーを作成
            const testOrder = repository.createOrder('テスト統合オーダー2');
            const testActivityName = 'テスト統合アクティビティ';

            // アクティビティ作成テスト
            const activity = repository.createActivity(testActivityName, testOrder.id);
            if (!activity || activity.name !== testActivityName) {
                throw new Error('アクティビティ作成に失敗しました');
            }

            // アクティビティ取得テスト
            const retrievedActivity = repository.getActivityById(activity.id);
            if (!retrievedActivity || retrievedActivity.name !== testActivityName) {
                throw new Error('アクティビティ取得に失敗しました');
            }

            // オーダー別アクティビティ取得テスト
            const orderActivities = repository.getActivitiesByOrderId(testOrder.id);
            if (!orderActivities || orderActivities.length === 0) {
                throw new Error('オーダー別アクティビティ取得に失敗しました');
            }

            // アクティビティ更新テスト
            const updatedName = 'テスト統合アクティビティ（更新済み）';
            const updatedActivity = repository.updateActivity(activity.id, { name: updatedName });
            if (!updatedActivity || updatedActivity.name !== updatedName) {
                throw new Error('アクティビティ更新に失敗しました');
            }

            // アクティビティ削除テスト
            const deleteResult = repository.deleteActivity(activity.id);
            if (!deleteResult) {
                throw new Error('アクティビティ削除に失敗しました');
            }

            // テスト用オーダーを削除
            repository.deleteOrder(testOrder.id);

            this.addTestResult('アクティビティ管理', true, 'CRUD操作が正常に動作しました');
        } catch (error) {
            this.addTestResult('アクティビティ管理', false, error.message);
        }
    }

    /**
     * タイマー機能テスト
     */
    async testTimerFunctionality() {
        try {
            const repository = window.app.repository;
            const timerService = window.app.timerService;

            // テスト用データを作成
            const testOrder = repository.createOrder('タイマーテスト用オーダー');
            const testActivity = repository.createActivity('タイマーテスト用アクティビティ', testOrder.id);

            // 作業開始テスト
            const startResult = timerService.startWork(testActivity.id);
            if (!startResult) {
                throw new Error('作業開始に失敗しました');
            }

            // 作業中状態の確認
            if (!timerService.isWorking()) {
                throw new Error('作業中状態が正しく設定されていません');
            }

            if (!timerService.isActivityActive(testActivity.id)) {
                throw new Error('アクティビティのアクティブ状態が正しく設定されていません');
            }

            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 経過時間の確認
            const elapsed = timerService.getCurrentElapsed();
            if (elapsed <= 0) {
                throw new Error('経過時間が正しく計算されていません');
            }

            // 作業停止テスト
            const stopResult = timerService.stopWork();
            if (!stopResult) {
                throw new Error('作業停止に失敗しました');
            }

            // 停止状態の確認
            if (timerService.isWorking()) {
                throw new Error('作業停止後も作業中状態が残っています');
            }

            // セッションデータの確認
            const sessions = repository.getSessionsByActivityId(testActivity.id);
            if (!sessions || sessions.length === 0) {
                throw new Error('セッションデータが保存されていません');
            }

            const session = sessions[0];
            if (!session.endTime || session.duration <= 0) {
                throw new Error('セッションデータが正しく保存されていません');
            }

            // テストデータを削除
            repository.deleteOrder(testOrder.id);

            this.addTestResult('タイマー機能', true, '開始・停止・時間計測が正常に動作しました');
        } catch (error) {
            this.addTestResult('タイマー機能', false, error.message);
        }
    }

    /**
     * レポート機能テスト
     */
    async testReportFunctionality() {
        try {
            const repository = window.app.repository;
            const reportService = window.app.reportService;

            // テスト用データを作成
            const testOrder = repository.createOrder('レポートテスト用オーダー');
            const testActivity = repository.createActivity('レポートテスト用アクティビティ', testOrder.id);
            
            // テスト用セッションを作成
            const session = repository.createSession(testActivity.id);
            const endedSession = repository.endSession(session.id);

            // オーダー別集計テスト
            const orderSummary = reportService.getOrderSummary();
            if (!orderSummary || !Array.isArray(orderSummary)) {
                throw new Error('オーダー別集計の取得に失敗しました');
            }

            // アクティビティ別集計テスト
            const activitySummary = reportService.getActivitySummary();
            if (!activitySummary || !Array.isArray(activitySummary)) {
                throw new Error('アクティビティ別集計の取得に失敗しました');
            }

            // 期間別レポートテスト
            const periodReport = reportService.getPeriodReport('day');
            if (!periodReport || typeof periodReport.totalDuration !== 'number') {
                throw new Error('期間別レポートの取得に失敗しました');
            }

            // 作業履歴テスト
            const workHistory = reportService.getWorkHistory(10);
            if (!workHistory || !Array.isArray(workHistory)) {
                throw new Error('作業履歴の取得に失敗しました');
            }

            // CSVエクスポートテスト
            const sessionsCSV = reportService.generateCSV('sessions');
            const summaryCSV = reportService.generateCSV('summary');
            
            if (!sessionsCSV || !summaryCSV) {
                throw new Error('CSVエクスポートに失敗しました');
            }

            // テストデータを削除
            repository.deleteOrder(testOrder.id);

            this.addTestResult('レポート機能', true, '集計・履歴・エクスポートが正常に動作しました');
        } catch (error) {
            this.addTestResult('レポート機能', false, error.message);
        }
    }

    /**
     * UI操作テスト
     */
    async testUIOperations() {
        console.log('UI操作テストを実行中...');

        // DOM要素の存在確認
        await this.testDOMElements();

        // モーダル操作テスト
        await this.testModalOperations();

        // 通知システムテスト
        await this.testNotificationSystem();
    }

    /**
     * DOM要素テスト
     */
    async testDOMElements() {
        try {
            const uiManager = window.app.uiManager;
            const requiredElements = [
                'orderList', 'addOrderBtn', 'activityGrid', 'addActivityBtn',
                'currentActivity', 'timerDisplay', 'stopWorkBtn', 'reportContent'
            ];

            for (const elementKey of requiredElements) {
                const element = uiManager.elements[elementKey];
                if (!element) {
                    throw new Error(`必要なDOM要素が見つかりません: ${elementKey}`);
                }
            }

            this.addTestResult('DOM要素', true, '全ての必要なDOM要素が存在します');
        } catch (error) {
            this.addTestResult('DOM要素', false, error.message);
        }
    }

    /**
     * モーダル操作テスト
     */
    async testModalOperations() {
        try {
            const uiManager = window.app.uiManager;

            // モーダル表示テスト
            uiManager.showModal('テストモーダル', '<p>テスト内容</p>');
            
            // モーダル要素の確認
            const modal = document.getElementById('modal-overlay');
            if (!modal || !modal.classList.contains('show')) {
                throw new Error('モーダルが正しく表示されていません');
            }

            // モーダル非表示テスト
            uiManager.hideModal();
            
            // 少し待機してアニメーション完了を待つ
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (modal.classList.contains('show')) {
                throw new Error('モーダルが正しく非表示になっていません');
            }

            this.addTestResult('モーダル操作', true, '表示・非表示が正常に動作しました');
        } catch (error) {
            this.addTestResult('モーダル操作', false, error.message);
        }
    }

    /**
     * 通知システムテスト
     */
    async testNotificationSystem() {
        try {
            const uiManager = window.app.uiManager;

            // 各種通知タイプのテスト
            const notificationTypes = ['success', 'error', 'warning', 'info'];
            
            for (const type of notificationTypes) {
                uiManager.showNotification(`テスト${type}通知`, type);
                
                // 通知要素の確認
                const notification = document.querySelector('.notification');
                if (!notification || !notification.classList.contains(`notification-${type}`)) {
                    throw new Error(`${type}通知が正しく表示されていません`);
                }
                
                // 通知を削除
                notification.remove();
            }

            this.addTestResult('通知システム', true, '全ての通知タイプが正常に動作しました');
        } catch (error) {
            this.addTestResult('通知システム', false, error.message);
        }
    }

    /**
     * データ整合性テスト
     */
    async testDataIntegrity() {
        console.log('データ整合性テストを実行中...');

        try {
            const storageManager = window.app.repository.storageManager;

            // 健全性チェックテスト
            const healthCheck = storageManager.performHealthCheck();
            if (!healthCheck || typeof healthCheck.healthy !== 'boolean') {
                throw new Error('健全性チェックが正常に動作していません');
            }

            // データ検証テスト
            const data = storageManager.load();
            if (!storageManager.validateSaveData(data)) {
                throw new Error('データ検証に失敗しました');
            }

            // バックアップ・復元テスト
            const backup = storageManager.createBackup();
            if (!backup) {
                throw new Error('バックアップ作成に失敗しました');
            }

            const restoreResult = storageManager.restoreFromBackup(backup);
            if (!restoreResult) {
                throw new Error('バックアップ復元に失敗しました');
            }

            this.addTestResult('データ整合性', true, '健全性チェック・検証・バックアップが正常に動作しました');
        } catch (error) {
            this.addTestResult('データ整合性', false, error.message);
        }
    }

    /**
     * エラーハンドリングテスト
     */
    async testErrorHandling() {
        console.log('エラーハンドリングテストを実行中...');

        try {
            const errorHandler = window.app.errorHandler;

            // エラーログ機能テスト
            const testError = new Error('テストエラー');
            errorHandler.handleError('TEST_ERROR', testError, { test: true });

            const errorLog = errorHandler.getErrorLog();
            if (!errorLog || errorLog.length === 0) {
                throw new Error('エラーログが記録されていません');
            }

            // エラー統計テスト
            const errorStats = errorHandler.getErrorStats();
            if (!errorStats || typeof errorStats.totalErrors !== 'number') {
                throw new Error('エラー統計が正常に取得できません');
            }

            // エラーログクリアテスト
            errorHandler.clearErrorLog();
            const clearedLog = errorHandler.getErrorLog();
            if (clearedLog.length !== 0) {
                throw new Error('エラーログのクリアに失敗しました');
            }

            this.addTestResult('エラーハンドリング', true, 'エラー記録・統計・クリアが正常に動作しました');
        } catch (error) {
            this.addTestResult('エラーハンドリング', false, error.message);
        }
    }

    /**
     * パフォーマンステスト
     */
    async testPerformance() {
        console.log('パフォーマンステストを実行中...');

        try {
            const performanceOptimizer = window.app.performanceOptimizer;

            // キャッシュ機能テスト
            const testKey = 'test_cache_key';
            const testValue = { test: 'data' };
            
            performanceOptimizer.setCache(testKey, testValue);
            const cachedValue = performanceOptimizer.getFromCache(testKey);
            
            if (!cachedValue || JSON.stringify(cachedValue) !== JSON.stringify(testValue)) {
                throw new Error('キャッシュ機能が正常に動作していません');
            }

            // パフォーマンス統計テスト
            const stats = performanceOptimizer.getPerformanceStats();
            if (!stats || typeof stats.cache.hitRate !== 'string') {
                throw new Error('パフォーマンス統計が正常に取得できません');
            }

            // デバウンス機能テスト
            let debounceCallCount = 0;
            const debounceFunc = () => { debounceCallCount++; };
            
            performanceOptimizer.debounce('test_debounce', debounceFunc, 100);
            performanceOptimizer.debounce('test_debounce', debounceFunc, 100);
            performanceOptimizer.debounce('test_debounce', debounceFunc, 100);
            
            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 150));
            
            if (debounceCallCount !== 1) {
                throw new Error('デバウンス機能が正常に動作していません');
            }

            this.addTestResult('パフォーマンス', true, 'キャッシュ・統計・デバウンスが正常に動作しました');
        } catch (error) {
            this.addTestResult('パフォーマンス', false, error.message);
        }
    }

    /**
     * ブラウザ互換性テスト
     */
    async testBrowserCompatibility() {
        console.log('ブラウザ互換性テストを実行中...');

        try {
            const compatibilityResults = [];

            // LocalStorage対応テスト
            try {
                localStorage.setItem('test_key', 'test_value');
                const value = localStorage.getItem('test_key');
                localStorage.removeItem('test_key');
                compatibilityResults.push({ feature: 'LocalStorage', supported: value === 'test_value' });
            } catch (error) {
                compatibilityResults.push({ feature: 'LocalStorage', supported: false });
            }

            // JSON対応テスト
            try {
                const testObj = { test: 'value' };
                const jsonString = JSON.stringify(testObj);
                const parsedObj = JSON.parse(jsonString);
                compatibilityResults.push({ feature: 'JSON', supported: parsedObj.test === 'value' });
            } catch (error) {
                compatibilityResults.push({ feature: 'JSON', supported: false });
            }

            // Date対応テスト
            try {
                const date = new Date();
                const isoString = date.toISOString();
                const parsedDate = new Date(isoString);
                compatibilityResults.push({ feature: 'Date', supported: !isNaN(parsedDate.getTime()) });
            } catch (error) {
                compatibilityResults.push({ feature: 'Date', supported: false });
            }

            // addEventListener対応テスト
            try {
                const testElement = document.createElement('div');
                let eventFired = false;
                testElement.addEventListener('click', () => { eventFired = true; });
                testElement.click();
                compatibilityResults.push({ feature: 'addEventListener', supported: eventFired });
            } catch (error) {
                compatibilityResults.push({ feature: 'addEventListener', supported: false });
            }

            // CSS Grid対応テスト
            try {
                const testElement = document.createElement('div');
                testElement.style.display = 'grid';
                compatibilityResults.push({ feature: 'CSS Grid', supported: testElement.style.display === 'grid' });
            } catch (error) {
                compatibilityResults.push({ feature: 'CSS Grid', supported: false });
            }

            // Performance API対応テスト
            compatibilityResults.push({ 
                feature: 'Performance API', 
                supported: typeof performance !== 'undefined' && typeof performance.now === 'function' 
            });

            // IntersectionObserver対応テスト
            compatibilityResults.push({ 
                feature: 'IntersectionObserver', 
                supported: 'IntersectionObserver' in window 
            });

            // 互換性結果の評価
            const unsupportedFeatures = compatibilityResults.filter(result => !result.supported);
            
            if (unsupportedFeatures.length === 0) {
                this.addTestResult('ブラウザ互換性', true, '全ての必要な機能がサポートされています');
            } else {
                const unsupportedList = unsupportedFeatures.map(f => f.feature).join(', ');
                this.addTestResult('ブラウザ互換性', false, `未サポート機能: ${unsupportedList}`);
            }

            // 詳細な互換性情報をログに出力
            console.log('ブラウザ互換性詳細:', compatibilityResults);

        } catch (error) {
            this.addTestResult('ブラウザ互換性', false, error.message);
        }
    }

    /**
     * テスト結果を追加
     * @param {string} testName - テスト名
     * @param {boolean} passed - 成功フラグ
     * @param {string} message - メッセージ
     */
    addTestResult(testName, passed, message) {
        this.testResults.push({
            testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * テストサマリーを生成
     * @param {number} duration - テスト実行時間
     * @returns {Object} テストサマリー
     */
    generateTestSummary(duration) {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(result => result.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

        return {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: successRate.toFixed(1) + '%',
                duration: duration + 'ms',
                browser: this.browserInfo.browser,
                timestamp: this.testEndTime.toISOString()
            },
            browserInfo: this.browserInfo,
            results: this.testResults,
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * 推奨事項を生成
     * @returns {Array} 推奨事項配列
     */
    generateRecommendations() {
        const recommendations = [];
        const failedTests = this.testResults.filter(result => !result.passed);

        if (failedTests.length > 0) {
            recommendations.push('失敗したテストを確認し、対応が必要な問題を修正してください。');
        }

        if (this.browserInfo.browser === 'Unknown') {
            recommendations.push('未知のブラウザで実行されています。主要ブラウザでのテストを推奨します。');
        }

        if (!navigator.cookieEnabled) {
            recommendations.push('Cookieが無効になっています。一部の機能が制限される可能性があります。');
        }

        if (!navigator.onLine) {
            recommendations.push('オフライン状態です。オンライン機能のテストができません。');
        }

        if (recommendations.length === 0) {
            recommendations.push('全てのテストが正常に完了しました。アプリケーションは正常に動作しています。');
        }

        return recommendations;
    }

    /**
     * テスト結果をHTMLで表示
     * @param {Object} summary - テストサマリー
     */
    displayTestResults(summary) {
        if (window.app && window.app.uiManager) {
            const resultsHtml = this.generateResultsHtml(summary);
            window.app.uiManager.showModal('統合テスト結果', resultsHtml);
        }
    }

    /**
     * テスト結果HTMLを生成
     * @param {Object} summary - テストサマリー
     * @returns {string} 結果HTML
     */
    generateResultsHtml(summary) {
        const { summary: testSummary, results, recommendations } = summary;
        
        let html = `
            <div class="test-results">
                <div class="test-summary">
                    <h3>テスト結果サマリー</h3>
                    <div class="summary-stats">
                        <div class="stat-item">
                            <span class="stat-label">総テスト数:</span>
                            <span class="stat-value">${testSummary.totalTests}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">成功:</span>
                            <span class="stat-value success">${testSummary.passedTests}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">失敗:</span>
                            <span class="stat-value failure">${testSummary.failedTests}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">成功率:</span>
                            <span class="stat-value">${testSummary.successRate}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">実行時間:</span>
                            <span class="stat-value">${testSummary.duration}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">ブラウザ:</span>
                            <span class="stat-value">${testSummary.browser}</span>
                        </div>
                    </div>
                </div>
                
                <div class="test-details">
                    <h4>詳細結果</h4>
                    <div class="test-list">
        `;
        
        results.forEach(result => {
            const statusClass = result.passed ? 'success' : 'failure';
            const statusIcon = result.passed ? '✓' : '✗';
            
            html += `
                <div class="test-item ${statusClass}">
                    <span class="test-status">${statusIcon}</span>
                    <span class="test-name">${result.testName}</span>
                    <span class="test-message">${result.message}</span>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
                
                <div class="recommendations">
                    <h4>推奨事項</h4>
                    <ul>
        `;
        
        recommendations.forEach(recommendation => {
            html += `<li>${recommendation}</li>`;
        });
        
        html += `
                    </ul>
                </div>
                
                <div class="test-actions">
                    <button class="btn btn-primary" id="export-test-results">結果をエクスポート</button>
                    <button class="btn btn-secondary" id="close-test-results">閉じる</button>
                </div>
            </div>
        `;
        
        // イベントリスナーを設定
        setTimeout(() => {
            const exportBtn = document.getElementById('export-test-results');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportTestResults(summary);
                });
            }
            
            const closeBtn = document.getElementById('close-test-results');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    window.app.uiManager.hideModal();
                });
            }
        }, 100);
        
        return html;
    }

    /**
     * テスト結果をエクスポート
     * @param {Object} summary - テストサマリー
     */
    exportTestResults(summary) {
        try {
            const exportData = {
                ...summary,
                exportedAt: new Date().toISOString(),
                version: '1.0.0'
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `integration-test-results-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            if (window.app && window.app.uiManager) {
                window.app.uiManager.showNotification('テスト結果をエクスポートしました', 'success');
            }
        } catch (error) {
            console.error('テスト結果エクスポートエラー:', error);
            if (window.app && window.app.uiManager) {
                window.app.uiManager.showNotification('エクスポートに失敗しました', 'error');
            }
        }
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.IntegrationTest = IntegrationTest;
}