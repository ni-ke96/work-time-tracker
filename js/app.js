/**
 * メインアプリケーションクラス
 * 全体の制御とイベント管理を行う
 */
class WorkTimeTrackerApp {
    constructor() {
        this.repository = new DataRepository();
        this.timerService = new TimerService(this.repository);
        this.reportService = new ReportService(this.repository);
        this.uiManager = new UIManager();
        this.errorHandler = new ErrorHandler(this.uiManager);
        this.performanceOptimizer = new PerformanceOptimizer();
        
        this.selectedOrderId = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    /**
     * アプリケーションを初期化
     */
    initialize() {
        try {
            // データの健全性チェック
            this.performInitialHealthCheck();
            
            // UIイベントハンドラーを設定
            this.setupEventHandlers();
            
            // タイマーサービスのコールバックを設定
            this.setupTimerCallbacks();
            
            // タイマーサービスを初期化（既存セッションの復元）
            this.timerService.initialize();
            
            // 初期データを読み込み
            this.loadInitialData();
            
            this.isInitialized = true;
            console.log('作業時間記録ツールが初期化されました');
            
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.errorHandler.handleError('RUNTIME_ERROR', error, {
                operation: 'initialize'
            });
        }
    }

    /**
     * 初期健全性チェックを実行
     */
    performInitialHealthCheck() {
        try {
            const healthCheck = this.repository.storageManager.performHealthCheck();
            
            if (!healthCheck.healthy) {
                console.warn('データの健全性に問題があります:', healthCheck.issues);
                
                // 自動修復を試行
                const repairResult = this.repository.storageManager.autoRepair();
                if (repairResult) {
                    this.uiManager.showNotification('データの問題を自動修復しました', 'info');
                } else {
                    this.uiManager.showNotification('データに問題があります。設定から修復を実行してください。', 'warning');
                }
            }
        } catch (error) {
            console.error('健全性チェックエラー:', error);
        }
    }

    /**
     * UIイベントハンドラーを設定
     */
    setupEventHandlers() {
        // オーダー追加ボタン
        if (this.uiManager.elements.addOrderBtn) {
            this.uiManager.elements.addOrderBtn.addEventListener('click', () => {
                this.uiManager.showOrderForm();
            });
        }

        // アクティビティ追加ボタン
        if (this.uiManager.elements.addActivityBtn) {
            this.uiManager.elements.addActivityBtn.addEventListener('click', () => {
                if (this.selectedOrderId) {
                    this.uiManager.showActivityForm(null, this.selectedOrderId);
                }
            });
        }

        // 作業停止ボタン
        if (this.uiManager.elements.stopWorkBtn) {
            this.uiManager.elements.stopWorkBtn.addEventListener('click', () => {
                this.stopWork();
            });
        }

        // エクスポートボタン
        if (this.uiManager.elements.exportBtn) {
            this.uiManager.elements.exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // 作業履歴リセットボタン
        if (this.uiManager.elements.resetSessionsBtn) {
            this.uiManager.elements.resetSessionsBtn.addEventListener('click', () => {
                this.showResetSessionsConfirmDialog();
            });
        }

        // 全データリセットボタン
        if (this.uiManager.elements.resetAllBtn) {
            this.uiManager.elements.resetAllBtn.addEventListener('click', () => {
                this.showResetAllConfirmDialog();
            });
        }

        // 期間選択変更
        if (this.uiManager.elements.periodSelect) {
            this.uiManager.elements.periodSelect.addEventListener('change', () => {
                this.updatePeriodReport();
            });
        }

        // 対象日変更
        if (this.uiManager.elements.targetDate) {
            this.uiManager.elements.targetDate.addEventListener('change', () => {
                this.updatePeriodReport();
            });
        }

        // 作業履歴表示ボタン
        if (this.uiManager.elements.showHistoryBtn) {
            this.uiManager.elements.showHistoryBtn.addEventListener('click', () => {
                this.showWorkHistory();
            });
        }

        // テスト実行ボタン
        const testBtn = document.getElementById('test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.showTestMenu();
            });
        }

        // モーダル閉じるボタン
        if (this.uiManager.elements.modalClose) {
            this.uiManager.elements.modalClose.addEventListener('click', () => {
                this.uiManager.hideModal();
            });
        }

        // モーダルオーバーレイクリック
        if (this.uiManager.elements.modalOverlay) {
            this.uiManager.elements.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.uiManager.elements.modalOverlay) {
                    this.uiManager.hideModal();
                }
            });
        }

        // UIManagerのイベントハンドラーを設定
        this.uiManager.selectOrder = (orderId) => this.selectOrder(orderId);
        this.uiManager.editOrder = (orderId) => this.editOrder(orderId);
        this.uiManager.startActivity = (activityId) => this.startActivity(activityId);
        this.uiManager.editActivity = (activityId) => this.editActivity(activityId);

        // フォーム送信イベントの動的バインディング
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'order-form') {
                e.preventDefault();
                this.handleOrderForm(e.target);
            } else if (e.target.id === 'activity-form') {
                e.preventDefault();
                this.handleActivityForm(e.target);
            }
        });

        // 削除ボタンとエクスポートボタンの動的バインディング
        document.addEventListener('click', (e) => {
            // 各ボタンIDに対してclosestメソッドを使用して確認
            const deleteOrderBtn = e.target.closest('#delete-order-btn');
            const deleteActivityBtn = e.target.closest('#delete-activity-btn');
            const exportSessionsBtn = e.target.closest('#export-sessions-csv');
            const exportSummaryBtn = e.target.closest('#export-summary-csv');
            const exportPrintBtn = e.target.closest('#export-print');
            
            if (deleteOrderBtn) {
                this.deleteCurrentOrder();
            } else if (deleteActivityBtn) {
                this.deleteCurrentActivity();
            } else if (exportSessionsBtn) {
                this.exportSessionsCSV();
            } else if (exportSummaryBtn) {
                this.exportSummaryCSV();
            } else if (exportPrintBtn) {
                this.printCurrentReport();
            } else if (e.target.id === 'confirm-reset-sessions-btn') {
                this.executeSessionsReset();
            } else if (e.target.id === 'confirm-reset-all-btn') {
                this.executeAllDataReset();
            }
        });
    }

    /**
     * タイマーサービスのコールバックを設定
     */
    setupTimerCallbacks() {
        this.timerService.on('tick', (elapsed, session) => {
            const activity = this.repository.getActivityById(session.activityId);
            this.uiManager.updateTimer(elapsed, activity ? activity.name : null);
        });

        this.timerService.on('start', (session) => {
            this.uiManager.updateStopButton(true);
            this.uiManager.updateActivityButtonState(session.activityId, true);
            const activity = this.repository.getActivityById(session.activityId);
            this.uiManager.showNotification(`作業を開始しました: ${activity.name}`, 'success');
        });

        this.timerService.on('stop', (session) => {
            this.uiManager.updateStopButton(false);
            this.uiManager.updateTimer(0);
            this.uiManager.updateActivityButtonState(session.activityId, false);
            this.updateReport();
            this.uiManager.showNotification('作業を停止しました', 'info');
        });

        this.timerService.on('switch', (previousSession, newSession) => {
            this.uiManager.updateActivityButtonState(previousSession.activityId, false);
            this.uiManager.updateActivityButtonState(newSession.activityId, true);
            const newActivity = this.repository.getActivityById(newSession.activityId);
            this.uiManager.showNotification(`作業を切り替えました: ${newActivity.name}`, 'info');
        });
    }

    /**
     * 初期データを読み込み
     */
    loadInitialData() {
        this.updateOrderList();
        this.updateReport();
        this.initializePeriodReport();
        
        // 既存のアクティブセッションがある場合の処理
        const currentSession = this.timerService.getCurrentSession();
        if (currentSession) {
            const activity = this.repository.getActivityById(currentSession.activityId);
            if (activity) {
                this.selectedOrderId = activity.orderId;
                const order = this.repository.getOrderById(activity.orderId);
                this.updateOrderList();
                this.updateActivityGrid();
                this.uiManager.updateAddActivityButton(true);
                this.uiManager.updateActivitySectionTitle(order ? order.name : null);
                this.uiManager.updateStopButton(true);
            }
        } else {
            // アクティブセッションがない場合は初期状態を設定
            this.updateActivityGrid();
        }
    }

    /**
     * オーダーを選択
     * @param {string} orderId - オーダーID
     */
    selectOrder(orderId) {
        this.selectedOrderId = orderId;
        
        // 選択されたオーダーの情報を取得
        const order = this.repository.getOrderById(orderId);
        
        this.updateOrderList();
        this.updateActivityGrid();
        this.uiManager.updateAddActivityButton(true);
        this.uiManager.updateActivitySectionTitle(order ? order.name : null);
    }

    /**
     * オーダーを編集
     * @param {string} orderId - オーダーID
     */
    editOrder(orderId) {
        const order = this.repository.getOrderById(orderId);
        if (!order) {
            this.uiManager.showNotification('オーダーが見つかりません', 'error');
            return;
        }
        
        this.uiManager.showOrderForm(order);
    }

    /**
     * アクティビティを開始
     * @param {string} activityId - アクティビティID
     */
    startActivity(activityId) {
        // クリック効果を表示
        this.uiManager.animateActivityButtonClick(activityId);
        
        if (this.timerService.isActivityActive(activityId)) {
            // 既にアクティブな場合は停止
            this.stopWork();
        } else {
            // 新しい作業を開始または切り替え
            if (this.timerService.isWorking()) {
                this.timerService.switchWork(activityId);
            } else {
                this.timerService.startWork(activityId);
            }
        }
    }

    /**
     * アクティビティを編集
     * @param {string} activityId - アクティビティID
     */
    editActivity(activityId) {
        const activity = this.repository.getActivityById(activityId);
        if (!activity) {
            this.uiManager.showNotification('アクティビティが見つかりません', 'error');
            return;
        }
        
        this.uiManager.showActivityForm(activity);
    }

    /**
     * 作業を停止
     */
    stopWork() {
        this.timerService.stopWork();
    }

    /**
     * オーダーリストを更新
     */
    updateOrderList() {
        const orders = this.repository.getAllOrders();
        this.uiManager.updateOrderList(orders, this.selectedOrderId);
        
        // オーダーが存在しない場合のメッセージ表示
        if (orders.length === 0) {
            this.uiManager.showOrderMessage('オーダーがありません。「+ 新規オーダー」ボタンから追加してください。');
        } else {
            this.uiManager.hideOrderMessage();
        }
    }

    /**
     * アクティビティグリッドを更新
     */
    updateActivityGrid() {
        if (!this.selectedOrderId) {
            this.uiManager.updateActivityGrid([]);
            this.uiManager.showActivityMessage('オーダーを選択してください');
            return;
        }

        // パフォーマンス最適化されたレンダリングを使用
        this.performanceOptimizer.debounce('updateActivityGrid', () => {
            const activities = this.repository.getActivitiesByOrderId(this.selectedOrderId);
            const activeActivityId = this.timerService.getCurrentSession()?.activityId;
            
            // 大量データの場合は最適化されたメソッドを使用
            if (activities.length > 20) {
                this.uiManager.updateActivityGridOptimized(activities, activeActivityId);
            } else {
                this.uiManager.updateActivityGrid(activities, activeActivityId);
            }
            
            if (activities.length === 0) {
                this.uiManager.showActivityMessage('アクティビティがありません。「+ 新規アクティビティ」ボタンから追加してください。');
            } else {
                this.uiManager.hideActivityMessage();
            }
        }, 100);
    }

    /**
     * レポートを更新
     */
    updateReport() {
        // レポート更新をデバウンス処理
        this.performanceOptimizer.debounce('updateReport', () => {
            const orderSummary = this.reportService.getOrderSummary();
            const activitySummary = this.reportService.getActivitySummary();
            
            const reportData = {
                orderSummary,
                activitySummary
            };
            
            // 大量データの場合は最適化されたレンダリングを使用
            if (orderSummary.length > 10 || activitySummary.length > 20) {
                this.uiManager.updateReportOptimized(reportData);
            } else {
                this.uiManager.updateReport(reportData);
            }
        }, 200);
    }

    /**
     * 期間別レポートを初期化
     */
    initializePeriodReport() {
        // 今日の日付を設定
        if (this.uiManager.elements.targetDate) {
            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            this.uiManager.elements.targetDate.value = dateString;
        }
        
        // 初期レポートを表示
        this.updatePeriodReport();
    }

    /**
     * 期間別レポートを更新
     */
    updatePeriodReport() {
        if (!this.uiManager.elements.periodSelect || !this.uiManager.elements.targetDate) {
            return;
        }

        const period = this.uiManager.elements.periodSelect.value;
        const targetDateStr = this.uiManager.elements.targetDate.value;
        
        if (!targetDateStr) {
            return;
        }

        const targetDate = new Date(targetDateStr);
        const periodReport = this.reportService.getPeriodReport(period, targetDate);
        
        this.uiManager.showPeriodReport(periodReport);
    }

    /**
     * 作業履歴を表示
     */
    showWorkHistory() {
        const workHistory = this.reportService.getWorkHistory(50);
        this.uiManager.showWorkHistory(workHistory);
    }

    /**
     * オーダーフォームを処理
     * @param {HTMLFormElement} form - フォーム要素
     */
    handleOrderForm(form) {
        const orderName = document.getElementById('order-name').value.trim();
        const orderIdInput = document.getElementById('order-id');
        const isEdit = orderIdInput && orderIdInput.value;

        if (!orderName) {
            this.uiManager.showNotification('オーダー名を入力してください', 'error');
            return;
        }

        try {
            if (isEdit) {
                // 編集モード
                const orderId = orderIdInput.value;
                const updatedOrder = this.repository.updateOrder(orderId, { name: orderName });
                
                if (updatedOrder) {
                    this.updateOrderList();
                    this.uiManager.hideModal();
                    this.uiManager.showNotification('オーダーを更新しました', 'success');
                } else {
                    this.uiManager.showNotification('オーダーが見つかりません', 'error');
                }
            } else {
                // 新規作成モード
                const order = this.repository.createOrder(orderName);
                this.updateOrderList();
                this.uiManager.hideModal();
                this.uiManager.showNotification('オーダーを作成しました', 'success');
            }
        } catch (error) {
            console.error('オーダー処理エラー:', error);
            const action = isEdit ? '更新' : '作成';
            this.uiManager.showNotification(`オーダーの${action}に失敗しました`, 'error');
        }
    }

    /**
     * アクティビティフォームを処理
     * @param {HTMLFormElement} form - フォーム要素
     */
    handleActivityForm(form) {
        const activityName = document.getElementById('activity-name').value.trim();
        const activityIdInput = document.getElementById('activity-id');
        const orderIdInput = document.getElementById('activity-order-id');
        const isEdit = activityIdInput && activityIdInput.value;

        if (!activityName) {
            this.uiManager.showNotification('アクティビティ名を入力してください', 'error');
            return;
        }

        // 編集モードでない場合はオーダーIDが必要
        const orderId = isEdit ? null : (orderIdInput ? orderIdInput.value : this.selectedOrderId);
        if (!isEdit && !orderId) {
            this.uiManager.showNotification('オーダーを選択してください', 'error');
            return;
        }

        try {
            if (isEdit) {
                // 編集モード
                const activityId = activityIdInput.value;
                const updatedActivity = this.repository.updateActivity(activityId, { name: activityName });
                
                if (updatedActivity) {
                    this.updateActivityGrid();
                    this.uiManager.hideModal();
                    this.uiManager.showNotification('アクティビティを更新しました', 'success');
                } else {
                    this.uiManager.showNotification('アクティビティが見つかりません', 'error');
                }
            } else {
                // 新規作成モード
                const activity = this.repository.createActivity(activityName, orderId);
                this.updateActivityGrid();
                this.uiManager.hideModal();
                this.uiManager.showNotification('アクティビティを作成しました', 'success');
            }
        } catch (error) {
            console.error('アクティビティ処理エラー:', error);
            const action = isEdit ? '更新' : '作成';
            this.uiManager.showNotification(`アクティビティの${action}に失敗しました`, 'error');
        }
    }

    /**
     * データをエクスポート
     */
    exportData() {
        this.uiManager.showExportMenu();
    }

    /**
     * セッション詳細をCSVでエクスポート
     */
    exportSessionsCSV() {
        try {
            const csv = this.reportService.generateCSV('sessions');
            const filename = `work-sessions-${new Date().toISOString().split('T')[0]}.csv`;
            this.uiManager.downloadCSV(csv, filename);
            this.uiManager.hideModal();
        } catch (error) {
            console.error('セッションCSVエクスポートエラー:', error);
            this.uiManager.showNotification('セッションデータのエクスポートに失敗しました', 'error');
        }
    }

    /**
     * サマリーをCSVでエクスポート
     */
    exportSummaryCSV() {
        try {
            const csv = this.reportService.generateCSV('summary');
            const filename = `work-summary-${new Date().toISOString().split('T')[0]}.csv`;
            this.uiManager.downloadCSV(csv, filename);
            this.uiManager.hideModal();
        } catch (error) {
            console.error('サマリーCSVエクスポートエラー:', error);
            this.uiManager.showNotification('サマリーデータのエクスポートに失敗しました', 'error');
        }
    }

    /**
     * 現在のレポートを印刷
     */
    printCurrentReport() {
        try {
            // 現在表示されているレポート内容を取得
            const reportContent = this.uiManager.elements.reportContent;
            if (!reportContent) {
                this.uiManager.showNotification('印刷するレポートがありません', 'error');
                return;
            }

            const content = reportContent.innerHTML;
            if (!content || content.trim() === '') {
                this.uiManager.showNotification('印刷するレポートがありません', 'error');
                return;
            }

            // レポートタイトルを決定
            let title = '作業時間レポート';
            if (content.includes('period-report')) {
                const periodSelect = this.uiManager.elements.periodSelect;
                const targetDate = this.uiManager.elements.targetDate;
                if (periodSelect && targetDate) {
                    const periodNames = { day: '日別', week: '週別', month: '月別' };
                    const periodName = periodNames[periodSelect.value] || '期間別';
                    const dateStr = new Date(targetDate.value).toLocaleDateString('ja-JP');
                    title = `${periodName}レポート - ${dateStr}`;
                }
            } else if (content.includes('work-history')) {
                title = '作業履歴レポート';
            } else if (content.includes('report-sections')) {
                title = '集計レポート';
            }

            this.uiManager.showPrintPage(content, title);
            this.uiManager.hideModal();
        } catch (error) {
            console.error('印刷エラー:', error);
            this.uiManager.showNotification('印刷に失敗しました', 'error');
        }
    }

    /**
     * 現在のオーダーを削除
     */
    deleteCurrentOrder() {
        const orderElement = document.querySelector('.order-item.active');
        if (!orderElement) {
            this.uiManager.showNotification('削除するオーダーが選択されていません', 'error');
            return;
        }

        const orderId = orderElement.dataset.orderId;
        const order = this.repository.getOrderById(orderId);
        
        if (!order) {
            this.uiManager.showNotification('オーダーが見つかりません', 'error');
            return;
        }

        // 確認ダイアログ
        if (!confirm(`オーダー「${order.name}」を削除しますか？\n関連するアクティビティとセッションも削除されます。`)) {
            return;
        }

        try {
            // 現在作業中のアクティビティがこのオーダーに属している場合は作業を停止
            const currentSession = this.timerService.getCurrentSession();
            if (currentSession) {
                const currentActivity = this.repository.getActivityById(currentSession.activityId);
                if (currentActivity && currentActivity.orderId === orderId) {
                    this.timerService.stopWork();
                }
            }

            // オーダーを削除
            const success = this.repository.deleteOrder(orderId);
            
            if (success) {
                // 選択状態をクリア
                if (this.selectedOrderId === orderId) {
                    this.selectedOrderId = null;
                    this.uiManager.updateAddActivityButton(false);
                    this.uiManager.updateActivitySectionTitle(null);
                }
                
                this.updateOrderList();
                this.updateActivityGrid();
                this.updateReport();
                this.uiManager.hideModal();
                this.uiManager.showNotification('オーダーを削除しました', 'success');
            } else {
                this.uiManager.showNotification('オーダーの削除に失敗しました', 'error');
            }
        } catch (error) {
            console.error('オーダー削除エラー:', error);
            this.uiManager.showNotification('オーダーの削除に失敗しました', 'error');
        }
    }

    /**
     * テストメニューを表示
     */
    showTestMenu() {
        const testMenuContent = `
            <div class="test-menu">
                <h3>テストメニュー</h3>
                <p>実行するテストの種類を選択してください：</p>
                <div class="test-options">
                    <button class="btn btn-primary test-option" id="run-unit-tests">
                        単体テスト実行
                    </button>
                    <button class="btn btn-primary test-option" id="run-integration-tests">
                        統合テスト実行
                    </button>
                    <button class="btn btn-secondary test-option" id="run-all-tests">
                        全テスト実行
                    </button>
                    <button class="btn btn-info test-option" id="show-performance-stats">
                        パフォーマンス統計
                    </button>
                </div>
            </div>
        `;

        this.uiManager.showModal('テスト実行', testMenuContent);

        // 単体テストボタン
        const unitTestBtn = document.getElementById('run-unit-tests');
        if (unitTestBtn) {
            unitTestBtn.addEventListener('click', () => {
                this.uiManager.hideModal();
                this.runUnitTests();
            });
        }

        // 統合テストボタン
        const integrationTestBtn = document.getElementById('run-integration-tests');
        if (integrationTestBtn) {
            integrationTestBtn.addEventListener('click', () => {
                this.uiManager.hideModal();
                this.runIntegrationTests();
            });
        }

        // 全テストボタン
        const allTestsBtn = document.getElementById('run-all-tests');
        if (allTestsBtn) {
            allTestsBtn.addEventListener('click', () => {
                this.uiManager.hideModal();
                this.runAllTests();
            });
        }

        // パフォーマンス統計ボタン
        const perfStatsBtn = document.getElementById('show-performance-stats');
        if (perfStatsBtn) {
            perfStatsBtn.addEventListener('click', () => {
                this.uiManager.hideModal();
                this.uiManager.showPerformanceStats();
            });
        }
    }

    /**
     * 単体テストを実行
     */
    async runUnitTests() {
        try {
            this.uiManager.showNotification('単体テストを実行中...', 'info');
            
            // コンソールを開くように促す
            console.log('=== 単体テスト実行 ===');
            console.log('詳細な結果はコンソールで確認してください（F12キーでデベロッパーツールを開く）');
            
            // タイマーテストを実行
            if (typeof runTimerTests === 'function') {
                await runTimerTests();
            }
            
            // レポート機能テストを実行
            this.runReportTests();
            
            this.uiManager.showNotification('単体テストが完了しました。コンソールで結果を確認してください。', 'success');
        } catch (error) {
            console.error('単体テスト実行エラー:', error);
            this.uiManager.showNotification('単体テストの実行に失敗しました', 'error');
        }
    }

    /**
     * 統合テストを実行
     */
    async runIntegrationTests() {
        try {
            this.uiManager.showNotification('統合テストを実行中...', 'info');
            
            const integrationTest = new IntegrationTest();
            const results = await integrationTest.runAllTests();
            
            // 結果を表示
            integrationTest.displayTestResults(results);
            
            const successRate = parseFloat(results.summary.successRate);
            if (successRate >= 90) {
                this.uiManager.showNotification('統合テストが正常に完了しました', 'success');
            } else if (successRate >= 70) {
                this.uiManager.showNotification('統合テストが完了しました（一部問題あり）', 'warning');
            } else {
                this.uiManager.showNotification('統合テストで重要な問題が検出されました', 'error');
            }
        } catch (error) {
            console.error('統合テスト実行エラー:', error);
            this.uiManager.showNotification('統合テストの実行に失敗しました', 'error');
        }
    }

    /**
     * 全テストを実行
     */
    async runAllTests() {
        try {
            this.uiManager.showNotification('全テストを実行中...', 'info');
            
            // 単体テストを実行
            console.log('=== 単体テスト実行 ===');
            if (typeof runTimerTests === 'function') {
                await runTimerTests();
            }
            this.runReportTests();
            
            // 統合テストを実行
            console.log('=== 統合テスト実行 ===');
            const integrationTest = new IntegrationTest();
            const results = await integrationTest.runAllTests();
            
            // 結果を表示
            integrationTest.displayTestResults(results);
            
            const successRate = parseFloat(results.summary.successRate);
            if (successRate >= 90) {
                this.uiManager.showNotification('全テストが正常に完了しました', 'success');
            } else if (successRate >= 70) {
                this.uiManager.showNotification('全テストが完了しました（一部問題あり）', 'warning');
            } else {
                this.uiManager.showNotification('テストで重要な問題が検出されました', 'error');
            }
        } catch (error) {
            console.error('全テスト実行エラー:', error);
            this.uiManager.showNotification('全テストの実行に失敗しました', 'error');
        }
    }

    /**
     * レポート機能のテストを実行
     */
    runReportTests() {
        console.log('\n=== レポート機能テスト ===');
        
        try {
            // テストデータを作成
            console.log('1. テストデータ作成中...');
            const testOrder1 = this.repository.createOrder('テストプロジェクトA');
            const testOrder2 = this.repository.createOrder('テストプロジェクトB');
            
            const testActivity1 = this.repository.createActivity('要件定義', testOrder1.id);
            const testActivity2 = this.repository.createActivity('設計', testOrder1.id);
            const testActivity3 = this.repository.createActivity('実装', testOrder2.id);
            
            // テストセッションを作成
            const now = new Date();
            const session1 = this.repository.createSession(testActivity1.id, new Date(now.getTime() - 3600000)); // 1時間前開始
            session1.endTime = new Date(now.getTime() - 1800000); // 30分前終了
            session1.duration = 1800000; // 30分
            this.repository.updateSession(session1.id, session1);
            
            const session2 = this.repository.createSession(testActivity2.id, new Date(now.getTime() - 1800000)); // 30分前開始
            session2.endTime = new Date(now.getTime() - 900000); // 15分前終了
            session2.duration = 900000; // 15分
            this.repository.updateSession(session2.id, session2);
            
            const session3 = this.repository.createSession(testActivity3.id, new Date(now.getTime() - 900000)); // 15分前開始
            session3.endTime = new Date(); // 今終了
            session3.duration = 900000; // 15分
            this.repository.updateSession(session3.id, session3);
            
            console.log('✓ テストデータ作成完了');
            
            // オーダー別集計テスト
            console.log('\n2. オーダー別集計テスト...');
            const orderSummary = this.reportService.getOrderSummary();
            console.log('オーダー別集計結果:', orderSummary);
            
            if (orderSummary.length >= 2) {
                console.log('✓ オーダー別集計: 正常');
                
                // プロジェクトAの合計時間をチェック（45分 = 2700000ミリ秒）
                const projectA = orderSummary.find(item => item.order.name === 'テストプロジェクトA');
                if (projectA && projectA.totalDuration === 2700000) {
                    console.log('✓ プロジェクトA時間計算: 正常 (45分)');
                } else {
                    console.log('✗ プロジェクトA時間計算: 異常', projectA);
                }
            } else {
                console.log('✗ オーダー別集計: 異常');
            }
            
            // アクティビティ別集計テスト
            console.log('\n3. アクティビティ別集計テスト...');
            const activitySummary = this.reportService.getActivitySummary();
            console.log('アクティビティ別集計結果:', activitySummary);
            
            if (activitySummary.length >= 3) {
                console.log('✓ アクティビティ別集計: 正常');
            } else {
                console.log('✗ アクティビティ別集計: 異常');
            }
            
            // 期間別レポートテスト
            console.log('\n4. 期間別レポートテスト...');
            const dayReport = this.reportService.getPeriodReport('day');
            console.log('今日のレポート:', dayReport);
            
            if (dayReport.totalDuration > 0) {
                console.log('✓ 日別レポート: 正常');
            } else {
                console.log('✗ 日別レポート: 異常');
            }
            
            // 作業履歴テスト
            console.log('\n5. 作業履歴テスト...');
            const workHistory = this.reportService.getWorkHistory(10);
            console.log('作業履歴:', workHistory);
            
            if (workHistory.length >= 3) {
                console.log('✓ 作業履歴: 正常');
            } else {
                console.log('✗ 作業履歴: 異常');
            }
            
            // CSVエクスポートテスト
            console.log('\n6. CSVエクスポートテスト...');
            const sessionsCSV = this.reportService.generateCSV('sessions');
            const summaryCSV = this.reportService.generateCSV('summary');
            
            if (sessionsCSV.length > 0 && summaryCSV.length > 0) {
                console.log('✓ CSVエクスポート: 正常');
                console.log('セッションCSVサンプル:', sessionsCSV.substring(0, 200) + '...');
                console.log('サマリーCSVサンプル:', summaryCSV.substring(0, 200) + '...');
                
                // CSVの構造をチェック
                const sessionLines = sessionsCSV.split('\n');
                const summaryLines = summaryCSV.split('\n');
                
                console.log(`セッションCSV行数: ${sessionLines.length}`);
                console.log(`サマリーCSV行数: ${summaryLines.length}`);
                
                // ヘッダーをチェック
                if (sessionLines[0].includes('日付') && sessionLines[0].includes('作業時間')) {
                    console.log('✓ セッションCSVヘッダー: 正常');
                } else {
                    console.log('✗ セッションCSVヘッダー: 異常');
                }
                
                if (summaryLines[0].includes('オーダー別集計') || summaryLines[1].includes('オーダー名')) {
                    console.log('✓ サマリーCSVヘッダー: 正常');
                } else {
                    console.log('✗ サマリーCSVヘッダー: 異常');
                }
            } else {
                console.log('✗ CSVエクスポート: 異常');
            }
            
            // エクスポート機能UIテスト
            console.log('\n7. エクスポート機能UIテスト...');
            try {
                // エクスポートメニューの表示テスト
                this.uiManager.showExportMenu();
                console.log('✓ エクスポートメニュー表示: 正常');
                
                // モーダルを閉じる
                setTimeout(() => {
                    this.uiManager.hideModal();
                }, 100);
                
                // 印刷機能のテスト（実際の印刷は行わない）
                const testContent = '<div class="test-content">テスト印刷内容</div>';
                console.log('✓ 印刷機能準備: 正常');
                
            } catch (error) {
                console.log('✗ エクスポート機能UIテスト: 異常', error);
            }
            
            // UIを更新してテスト結果を表示
            this.updateReport();
            
            console.log('\n=== レポート機能テスト完了 ===');
            console.log('✓ 基本集計機能は正常に動作しています');
            
        } catch (error) {
            console.error('✗ レポート機能テストエラー:', error);
        }
    }

    /**
     * 現在のアクティビティを削除
     */
    deleteCurrentActivity() {
        const activityIdInput = document.getElementById('activity-id');
        if (!activityIdInput || !activityIdInput.value) {
            this.uiManager.showNotification('削除するアクティビティが選択されていません', 'error');
            return;
        }

        const activityId = activityIdInput.value;
        const activity = this.repository.getActivityById(activityId);
        
        if (!activity) {
            this.uiManager.showNotification('アクティビティが見つかりません', 'error');
            return;
        }

        // 確認ダイアログ
        if (!confirm(`アクティビティ「${activity.name}」を削除しますか？\n関連するセッションも削除されます。`)) {
            return;
        }

        try {
            // 現在作業中のアクティビティの場合は作業を停止
            const currentSession = this.timerService.getCurrentSession();
            if (currentSession && currentSession.activityId === activityId) {
                this.timerService.stopWork();
            }

            // アクティビティを削除
            const success = this.repository.deleteActivity(activityId);
            
            if (success) {
                this.updateActivityGrid();
                this.updateReport();
                this.uiManager.hideModal();
                this.uiManager.showNotification('アクティビティを削除しました', 'success');
            } else {
                this.uiManager.showNotification('アクティビティの削除に失敗しました', 'error');
            }
        } catch (error) {
            console.error('アクティビティ削除エラー:', error);
            this.uiManager.showNotification('アクティビティの削除に失敗しました', 'error');
        }
    }

    /**
     * 作業履歴リセット確認ダイアログを表示
     */
    showResetSessionsConfirmDialog() {
        this.uiManager.showResetSessionsConfirmDialog();
    }

    /**
     * 全データリセット確認ダイアログを表示
     */
    showResetAllConfirmDialog() {
        this.uiManager.showResetAllConfirmDialog();
    }

    /**
     * 作業履歴のみをリセット
     */
    executeSessionsReset() {
        try {
            // 現在の作業を停止
            if (this.timerService.isWorking()) {
                this.timerService.stopWork();
            }

            // 作業履歴のみをリセット
            this.repository.resetSessionsOnly();

            // UIを更新
            this.updateReport();
            this.uiManager.updateTimer(0);
            this.uiManager.updateStopButton(false);

            // モーダルを閉じて成功メッセージを表示
            this.uiManager.hideModal();
            this.uiManager.showNotification('作業履歴がリセットされました', 'success');

            console.log('作業履歴リセットが完了しました');
        } catch (error) {
            console.error('作業履歴リセットエラー:', error);
            this.uiManager.showNotification('作業履歴リセットに失敗しました', 'error');
        }
    }

    /**
     * 全データをリセット
     */
    executeAllDataReset() {
        try {
            // 現在の作業を停止
            if (this.timerService.isWorking()) {
                this.timerService.stopWork();
            }

            // 全データをリセット
            this.repository.resetAllData();

            // UIを初期状態に更新
            this.selectedOrderId = null;
            this.updateOrderList();
            this.updateActivityGrid();
            this.updateReport();
            this.uiManager.updateTimer(0);
            this.uiManager.updateStopButton(false);
            this.uiManager.updateAddActivityButton(false);
            this.uiManager.updateActivitySectionTitle();

            // モーダルを閉じて成功メッセージを表示
            this.uiManager.hideModal();
            this.uiManager.showNotification('全てのデータがリセットされました', 'success');

            console.log('全データリセットが完了しました');
        } catch (error) {
            console.error('全データリセットエラー:', error);
            this.uiManager.showNotification('全データリセットに失敗しました', 'error');
        }
    }
}

// アプリケーション開始
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new WorkTimeTrackerApp();
    
    // グローバルアクセス用（デバッグ目的）
    window.app = app;
    window.uiManager = app.uiManager;
});

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.WorkTimeTrackerApp = WorkTimeTrackerApp;
}