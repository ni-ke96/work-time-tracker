/**
 * UI管理クラス
 * ユーザーインターフェースの表示と更新を管理
 */
class UIManager {
    constructor() {
        this.elements = {};
        this.performanceOptimizer = new PerformanceOptimizer();
        this.initializeElements();
    }

    /**
     * DOM要素を初期化
     */
    initializeElements() {
        this.elements = {
            // オーダー関連
            orderList: document.getElementById('order-list'),
            addOrderBtn: document.getElementById('add-order-btn'),
            
            // アクティビティ関連
            activityGrid: document.getElementById('activity-grid'),
            addActivityBtn: document.getElementById('add-activity-btn'),
            activitySectionTitle: document.getElementById('activity-section-title'),
            
            // タイマー関連
            currentActivity: document.getElementById('current-activity'),
            timerDisplay: document.getElementById('timer-display'),
            stopWorkBtn: document.getElementById('stop-work-btn'),
            
            // レポート関連
            reportContent: document.getElementById('report-content'),
            periodSelect: document.getElementById('period-select'),
            targetDate: document.getElementById('target-date'),
            showHistoryBtn: document.getElementById('show-history-btn'),
            exportBtn: document.getElementById('export-btn'),
            resetSessionsBtn: document.getElementById('reset-sessions-btn'),
            resetAllBtn: document.getElementById('reset-all-btn'),
            
            // モーダル関連
            modalOverlay: document.getElementById('modal-overlay'),
            modalTitle: document.getElementById('modal-title'),
            modalContent: document.getElementById('modal-content'),
            modalClose: document.getElementById('modal-close'),
            
            // その他
            settingsBtn: document.getElementById('settings-btn')
        };
    }

    /**
     * オーダーリストを更新
     * @param {Array} orders - オーダー配列
     * @param {string} selectedOrderId - 選択中のオーダーID
     */
    updateOrderList(orders, selectedOrderId = null) {
        if (!this.elements.orderList) return;

        this.elements.orderList.innerHTML = '';

        orders.forEach((order, index) => {
            const orderElement = document.createElement('div');
            orderElement.className = `order-item ${order.id === selectedOrderId ? 'active' : ''}`;
            orderElement.dataset.orderId = order.id;
            orderElement.textContent = order.name;
            
            // アクセシビリティ属性
            orderElement.setAttribute('role', 'option');
            orderElement.setAttribute('tabindex', order.id === selectedOrderId ? '0' : '-1');
            orderElement.setAttribute('aria-selected', order.id === selectedOrderId ? 'true' : 'false');
            orderElement.setAttribute('aria-label', `オーダー: ${order.name}`);
            
            // クリックイベント（選択）
            orderElement.addEventListener('click', () => {
                this.selectOrder(order.id);
            });

            // キーボードイベント
            orderElement.addEventListener('keydown', (e) => {
                switch(e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.selectOrder(order.id);
                        break;
                    case 'F2':
                        e.preventDefault();
                        this.editOrder(order.id);
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        e.preventDefault();
                        this.focusNextOrder(index);
                        break;
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        e.preventDefault();
                        this.focusPreviousOrder(index);
                        break;
                }
            });

            // ダブルクリックイベント（編集）
            orderElement.addEventListener('dblclick', () => {
                this.editOrder(order.id);
            });

            // 右クリックイベント（コンテキストメニュー）
            orderElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.editOrder(order.id);
            });

            this.elements.orderList.appendChild(orderElement);
        });
        
        // ARIA属性を更新
        this.elements.orderList.setAttribute('aria-activedescendant', selectedOrderId || '');
    }

    /**
     * アクティビティグリッドを更新
     * @param {Array} activities - アクティビティ配列
     * @param {string} activeActivityId - アクティブなアクティビティID
     */
    updateActivityGrid(activities, activeActivityId = null) {
        if (!this.elements.activityGrid) return;

        this.elements.activityGrid.innerHTML = '';

        activities.forEach((activity, index) => {
            const activityElement = document.createElement('button');
            activityElement.className = `activity-btn ${activity.id === activeActivityId ? 'active' : ''}`;
            activityElement.dataset.activityId = activity.id;
            
            // アクセシビリティ属性
            activityElement.setAttribute('role', 'gridcell');
            activityElement.setAttribute('aria-pressed', activity.id === activeActivityId ? 'true' : 'false');
            activityElement.setAttribute('aria-label', 
                activity.id === activeActivityId 
                    ? `${activity.name} - 作業中` 
                    : `${activity.name} - 作業を開始`
            );
            
            // アクティビティ名とステータス表示
            const nameSpan = document.createElement('span');
            nameSpan.className = 'activity-name';
            nameSpan.textContent = activity.name;
            nameSpan.setAttribute('aria-hidden', 'true');
            
            const statusSpan = document.createElement('span');
            statusSpan.className = 'activity-status';
            if (activity.id === activeActivityId) {
                statusSpan.textContent = '作業中';
                statusSpan.style.color = 'white';
                statusSpan.style.fontSize = '0.8em';
                statusSpan.style.display = 'block';
                statusSpan.style.marginTop = '4px';
                statusSpan.setAttribute('aria-hidden', 'true');
            }
            
            activityElement.appendChild(nameSpan);
            if (statusSpan.textContent) {
                activityElement.appendChild(statusSpan);
            }
            
            // クリックイベント（作業開始）
            activityElement.addEventListener('click', () => {
                this.startActivity(activity.id);
            });

            // キーボードイベント
            activityElement.addEventListener('keydown', (e) => {
                switch(e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.startActivity(activity.id);
                        break;
                    case 'F2':
                        e.preventDefault();
                        this.editActivity(activity.id);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.focusNextActivity(index);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.focusPreviousActivity(index);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.focusActivityBelow(index);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.focusActivityAbove(index);
                        break;
                }
            });

            // 右クリックイベント（編集）
            activityElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.editActivity(activity.id);
            });

            // ダブルクリックイベント（編集）
            activityElement.addEventListener('dblclick', () => {
                this.editActivity(activity.id);
            });

            this.elements.activityGrid.appendChild(activityElement);
        });
    }

    /**
     * タイマー表示を更新
     * @param {number} elapsed - 経過時間（ミリ秒）
     * @param {string} activityName - アクティビティ名
     */
    updateTimer(elapsed, activityName = null) {
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = formatDuration(elapsed);
        }

        if (this.elements.currentActivity) {
            if (activityName) {
                this.elements.currentActivity.textContent = `作業中: ${activityName}`;
            } else {
                this.elements.currentActivity.textContent = '作業を開始してください';
            }
        }
    }

    /**
     * 作業停止ボタンの状態を更新
     * @param {boolean} enabled - 有効かどうか
     */
    updateStopButton(enabled) {
        if (this.elements.stopWorkBtn) {
            this.elements.stopWorkBtn.disabled = !enabled;
        }
    }

    /**
     * アクティビティ追加ボタンの状態を更新
     * @param {boolean} enabled - 有効かどうか
     */
    updateAddActivityButton(enabled) {
        if (this.elements.addActivityBtn) {
            this.elements.addActivityBtn.disabled = !enabled;
        }
    }

    /**
     * アクティビティセクションタイトルを更新
     * @param {string} orderName - オーダー名（nullの場合はデフォルトタイトル）
     */
    updateActivitySectionTitle(orderName = null) {
        if (this.elements.activitySectionTitle) {
            if (orderName) {
                this.elements.activitySectionTitle.textContent = `アクティビティ - ${orderName}`;
            } else {
                this.elements.activitySectionTitle.textContent = 'アクティビティ';
            }
        }
    }

    /**
     * レポート内容を更新
     * @param {Object} reportData - レポートデータ
     */
    updateReport(reportData) {
        if (!this.elements.reportContent) return;

        const { orderSummary, activitySummary } = reportData;

        let html = '<div class="report-sections">';

        // オーダー別サマリー
        if (orderSummary && orderSummary.length > 0) {
            html += '<div class="report-section">';
            html += '<h3>オーダー別集計</h3>';
            html += '<table class="report-table">';
            html += '<thead><tr><th>オーダー</th><th>アクティビティ数</th><th>総作業時間</th></tr></thead>';
            html += '<tbody>';
            
            orderSummary.forEach(item => {
                html += `<tr>
                    <td>${this.escapeHtml(item.order.name)}</td>
                    <td>${item.activityCount}</td>
                    <td>${item.formattedDuration}</td>
                </tr>`;
            });
            
            html += '</tbody></table></div>';
        }

        // アクティビティ別サマリー
        if (activitySummary && activitySummary.length > 0) {
            html += '<div class="report-section">';
            html += '<h3>アクティビティ別集計</h3>';
            html += '<table class="report-table">';
            html += '<thead><tr><th>アクティビティ</th><th>セッション数</th><th>総作業時間</th><th>最終作業</th></tr></thead>';
            html += '<tbody>';
            
            activitySummary.forEach(item => {
                html += `<tr>
                    <td>${this.escapeHtml(item.activity.name)}</td>
                    <td>${item.sessionCount}</td>
                    <td>${item.formattedDuration}</td>
                    <td>${item.lastWorked || '-'}</td>
                </tr>`;
            });
            
            html += '</tbody></table></div>';
        }

        html += '</div>';

        if (orderSummary.length === 0 && activitySummary.length === 0) {
            html = '<p class="no-data">まだ作業データがありません。</p>';
        }

        this.elements.reportContent.innerHTML = html;
    }

    /**
     * モーダルを表示
     * @param {string} title - タイトル
     * @param {string} content - 内容（HTML）
     */
    showModal(title, content) {
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = title;
        }
        
        if (this.elements.modalContent) {
            this.elements.modalContent.innerHTML = content;
        }
        
        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.classList.remove('hidden');
            
            // フォーカストラップを設定
            setTimeout(() => {
                this.setupModalFocusTrap();
            }, 100);
        }
    }

    /**
     * モーダルを非表示
     */
    hideModal() {
        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.classList.add('hidden');
        }
    }

    /**
     * モーダルのフォーカストラップを設定
     */
    setupModalFocusTrap() {
        if (!this.elements.modalOverlay || this.elements.modalOverlay.classList.contains('hidden')) {
            return;
        }

        const modal = this.elements.modalOverlay.querySelector('.modal');
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // 最初の要素にフォーカス
        firstElement.focus();

        // タブキーのトラップ
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            } else if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    /**
     * 通知メッセージを表示
     * @param {string} message - メッセージ
     * @param {string} type - タイプ（success, error, warning, info）
     */
    showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
        notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        notification.setAttribute('aria-atomic', 'true');

        // スタイルを設定
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 600;
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
            word-wrap: break-word;
        `;

        // タイプ別の背景色
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#2563eb'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // 3秒後に自動削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * HTMLエスケープ
     * @param {string} text - エスケープするテキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * キーボードナビゲーション - 次のオーダーにフォーカス
     * @param {number} currentIndex - 現在のインデックス
     */
    focusNextOrder(currentIndex) {
        const orderItems = this.elements.orderList.querySelectorAll('.order-item');
        const nextIndex = (currentIndex + 1) % orderItems.length;
        if (orderItems[nextIndex]) {
            orderItems[nextIndex].focus();
        }
    }

    /**
     * キーボードナビゲーション - 前のオーダーにフォーカス
     * @param {number} currentIndex - 現在のインデックス
     */
    focusPreviousOrder(currentIndex) {
        const orderItems = this.elements.orderList.querySelectorAll('.order-item');
        const prevIndex = currentIndex === 0 ? orderItems.length - 1 : currentIndex - 1;
        if (orderItems[prevIndex]) {
            orderItems[prevIndex].focus();
        }
    }

    /**
     * キーボードナビゲーション - 次のアクティビティにフォーカス
     * @param {number} currentIndex - 現在のインデックス
     */
    focusNextActivity(currentIndex) {
        const activityButtons = this.elements.activityGrid.querySelectorAll('.activity-btn');
        const nextIndex = (currentIndex + 1) % activityButtons.length;
        if (activityButtons[nextIndex]) {
            activityButtons[nextIndex].focus();
        }
    }

    /**
     * キーボードナビゲーション - 前のアクティビティにフォーカス
     * @param {number} currentIndex - 現在のインデックス
     */
    focusPreviousActivity(currentIndex) {
        const activityButtons = this.elements.activityGrid.querySelectorAll('.activity-btn');
        const prevIndex = currentIndex === 0 ? activityButtons.length - 1 : currentIndex - 1;
        if (activityButtons[prevIndex]) {
            activityButtons[prevIndex].focus();
        }
    }

    /**
     * キーボードナビゲーション - 下のアクティビティにフォーカス
     * @param {number} currentIndex - 現在のインデックス
     */
    focusActivityBelow(currentIndex) {
        const activityButtons = this.elements.activityGrid.querySelectorAll('.activity-btn');
        const gridColumns = Math.floor(this.elements.activityGrid.offsetWidth / 160); // 160pxは最小幅
        const nextIndex = currentIndex + gridColumns;
        if (activityButtons[nextIndex]) {
            activityButtons[nextIndex].focus();
        }
    }

    /**
     * キーボードナビゲーション - 上のアクティビティにフォーカス
     * @param {number} currentIndex - 現在のインデックス
     */
    focusActivityAbove(currentIndex) {
        const activityButtons = this.elements.activityGrid.querySelectorAll('.activity-btn');
        const gridColumns = Math.floor(this.elements.activityGrid.offsetWidth / 160); // 160pxは最小幅
        const prevIndex = currentIndex - gridColumns;
        if (prevIndex >= 0 && activityButtons[prevIndex]) {
            activityButtons[prevIndex].focus();
        }
    }

    // イベントハンドラー（アプリケーションから設定される）
    selectOrder(orderId) {
        // アプリケーションで実装
    }

    editOrder(orderId) {
        // アプリケーションで実装
    }

    startActivity(activityId) {
        // アプリケーションで実装
    }

    editActivity(activityId) {
        // アプリケーションで実装
    }

    /**
     * アクティビティボタンの状態を更新
     * @param {string} activityId - アクティビティID
     * @param {boolean} isActive - アクティブ状態
     */
    updateActivityButtonState(activityId, isActive) {
        if (!this.elements.activityGrid) return;

        // 全てのアクティビティボタンからactiveクラスとステータスを削除
        const allButtons = this.elements.activityGrid.querySelectorAll('.activity-btn');
        allButtons.forEach(btn => {
            btn.classList.remove('active');
            const statusSpan = btn.querySelector('.activity-status');
            if (statusSpan) {
                statusSpan.remove();
            }
        });

        // 指定されたアクティビティボタンにactiveクラスとステータスを追加
        if (isActive && activityId) {
            const targetButton = this.elements.activityGrid.querySelector(`[data-activity-id="${activityId}"]`);
            if (targetButton) {
                targetButton.classList.add('active');
                
                // ステータス表示を追加
                const statusSpan = document.createElement('span');
                statusSpan.className = 'activity-status';
                statusSpan.textContent = '作業中';
                statusSpan.style.color = 'white';
                statusSpan.style.fontSize = '0.75em';
                statusSpan.style.marginTop = '4px';
                statusSpan.style.opacity = '0.9';
                statusSpan.style.fontWeight = '400';
                
                targetButton.appendChild(statusSpan);
            }
        }
    }

    /**
     * アクティビティボタンのクリック効果
     * @param {string} activityId - アクティビティID
     */
    animateActivityButtonClick(activityId) {
        if (!this.elements.activityGrid) return;

        const targetButton = this.elements.activityGrid.querySelector(`[data-activity-id="${activityId}"]`);
        if (targetButton) {
            targetButton.style.transform = 'translateY(0)';
            setTimeout(() => {
                targetButton.style.transform = '';
            }, 100);
        }
    }

    /**
     * オーダーエリアにメッセージを表示
     * @param {string} message - 表示するメッセージ
     */
    showOrderMessage(message) {
        if (!this.elements.orderList) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'order-message';
        messageElement.textContent = message;
        
        this.elements.orderList.innerHTML = '';
        this.elements.orderList.appendChild(messageElement);
    }

    /**
     * オーダーメッセージを非表示
     */
    hideOrderMessage() {
        if (!this.elements.orderList) return;
        
        const messageElement = this.elements.orderList.querySelector('.order-message');
        if (messageElement) {
            messageElement.remove();
        }
    }

    /**
     * アクティビティエリアにメッセージを表示
     * @param {string} message - 表示するメッセージ
     */
    showActivityMessage(message) {
        if (!this.elements.activityGrid) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'activity-message';
        messageElement.textContent = message;
        
        this.elements.activityGrid.innerHTML = '';
        this.elements.activityGrid.appendChild(messageElement);
    }

    /**
     * アクティビティメッセージを非表示
     */
    hideActivityMessage() {
        if (!this.elements.activityGrid) return;
        
        const messageElement = this.elements.activityGrid.querySelector('.activity-message');
        if (messageElement) {
            messageElement.remove();
        }
    }

    /**
     * 作業履歴を表示
     * @param {Array} workHistory - 作業履歴データ
     */
    showWorkHistory(workHistory) {
        if (!this.elements.reportContent) return;

        let html = '<div class="work-history">';
        html += '<div class="history-header">';
        html += '<div class="history-title">作業履歴</div>';
        html += `<div class="history-count">${workHistory.length}件</div>`;
        html += '</div>';

        if (workHistory.length > 0) {
            html += '<div class="history-list">';
            workHistory.forEach(item => {
                html += '<div class="history-item">';
                html += '<div class="history-time">';
                html += `<div>${item.date}</div>`;
                html += `<div>${item.startTime} - ${item.endTime || '進行中'}</div>`;
                html += '</div>';
                html += '<div class="history-work">';
                html += `<div class="history-order">${this.escapeHtml(item.order ? item.order.name : '不明')}</div>`;
                html += `<div class="history-activity">${this.escapeHtml(item.activity ? item.activity.name : '不明')}</div>`;
                html += '</div>';
                html += `<div class="history-duration">${item.formattedDuration}</div>`;
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<p class="no-data">まだ作業履歴がありません。</p>';
        }

        html += '</div>';

        this.elements.reportContent.innerHTML = html;
    }

    /**
     * 期間別レポートを表示
     * @param {Object} periodReport - 期間別レポートデータ
     */
    showPeriodReport(periodReport) {
        if (!this.elements.reportContent) return;

        const periodNames = {
            day: '日別',
            week: '週別',
            month: '月別'
        };

        const startDate = new Date(periodReport.startDate).toLocaleDateString('ja-JP');
        const endDate = new Date(periodReport.endDate).toLocaleDateString('ja-JP');
        const dateRange = periodReport.period === 'day' ? startDate : `${startDate} - ${endDate}`;

        let html = '<div class="period-report">';
        html += '<div class="period-report-header">';
        html += `<div class="period-title">${periodNames[periodReport.period]}レポート (${dateRange})</div>`;
        html += `<div class="period-total">${periodReport.formattedDuration}</div>`;
        html += '</div>';

        if (periodReport.sessionCount > 0) {
            html += `<p>セッション数: ${periodReport.sessionCount}回</p>`;

            // 日別内訳（週別・月別の場合のみ表示）
            if (periodReport.period !== 'day' && periodReport.dailyBreakdown && periodReport.dailyBreakdown.length > 0) {
                html += '<div class="daily-breakdown">';
                periodReport.dailyBreakdown.forEach(day => {
                    if (day.totalDuration > 0) {
                        html += '<div class="daily-item">';
                        html += `<div class="daily-date">${day.formattedDate}</div>`;
                        html += `<div class="daily-duration">${day.formattedDuration}</div>`;
                        html += `<div class="daily-sessions">${day.sessionCount}セッション</div>`;
                        html += '</div>';
                    }
                });
                html += '</div>';
            }
        } else {
            html += '<p class="no-data">この期間には作業データがありません。</p>';
        }

        html += '</div>';

        this.elements.reportContent.innerHTML = html;
    }

    /**
     * パフォーマンス最適化されたアクティビティグリッド更新
     * @param {Array} activities - アクティビティ配列
     * @param {string} activeActivityId - アクティブなアクティビティID
     */
    updateActivityGridOptimized(activities, activeActivityId = null) {
        // 通常のupdateActivityGridと同じ処理を行う（簡略化版）
        this.updateActivityGrid(activities, activeActivityId);
    }

    /**
     * パフォーマンス最適化されたレポート更新
     * @param {Object} reportData - レポートデータ
     */
    updateReportOptimized(reportData) {
        // 通常のupdateReportと同じ処理を行う（簡略化版）
        this.updateReport(reportData);
    }

    /**
     * パフォーマンス統計を表示
     */
    showPerformanceStats() {
        const statsContent = `
            <div class="performance-stats">
                <h3>パフォーマンス統計</h3>
                <p>パフォーマンス統計機能は現在利用できません。</p>
                <div class="stats-actions">
                    <button class="btn btn-secondary" onclick="uiManager.hideModal()">閉じる</button>
                </div>
            </div>
        `;
        
        this.showModal('パフォーマンス統計', statsContent);
    }

    /**
     * エクスポートメニューを表示
     */
    showExportMenu() {
        const content = `
            <div class="export-menu">
                <h4>データエクスポート</h4>
                <div class="export-options">
                    <button id="export-sessions-csv" class="btn btn-primary export-option">
                        <span class="export-icon">📊</span>
                        <div class="export-text">
                            <div class="export-title">作業履歴 (CSV)</div>
                            <div class="export-desc">全ての作業セッションの詳細データ</div>
                        </div>
                    </button>
                    <button id="export-summary-csv" class="btn btn-primary export-option">
                        <span class="export-icon">📈</span>
                        <div class="export-text">
                            <div class="export-title">集計サマリー (CSV)</div>
                            <div class="export-desc">オーダー別の作業時間集計</div>
                        </div>
                    </button>
                    <button id="export-print" class="btn btn-secondary export-option">
                        <span class="export-icon">🖨️</span>
                        <div class="export-text">
                            <div class="export-title">レポート印刷</div>
                            <div class="export-desc">現在のレポートを印刷用に表示</div>
                        </div>
                    </button>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="uiManager.hideModal()">キャンセル</button>
                </div>
            </div>
        `;

        this.showModal('データエクスポート', content);
    }

    /**
     * 作業履歴リセット確認ダイアログを表示
     */
    showResetSessionsConfirmDialog() {
        const content = `
            <div class="reset-confirm">
                <div class="warning-icon">⚠️</div>
                <h4>作業履歴リセットの確認</h4>
                <p>この操作により、以下のデータが完全に削除されます：</p>
                <ul>
                    <li>全ての作業セッション履歴</li>
                    <li>作業時間の記録</li>
                    <li>レポートデータ</li>
                </ul>
                <p><strong>オーダーとアクティビティは保持されます。</strong></p>
                <p><strong>この操作は取り消すことができません。</strong></p>
                <p>続行する前に、必要なデータをエクスポートすることを推奨します。</p>
                
                <div class="reset-options">
                    <label>
                        <input type="checkbox" id="reset-sessions-confirm-checkbox">
                        上記の内容を理解し、作業履歴リセットを実行することに同意します
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="confirm-reset-sessions-btn" class="btn btn-warning" disabled>
                        作業履歴をリセット
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="uiManager.hideModal()">
                        キャンセル
                    </button>
                </div>
            </div>
        `;

        this.showModal('作業履歴リセット', content);
        
        // チェックボックスの状態に応じてボタンを有効/無効化
        setTimeout(() => {
            const checkbox = document.getElementById('reset-sessions-confirm-checkbox');
            const confirmBtn = document.getElementById('confirm-reset-sessions-btn');
            
            if (checkbox && confirmBtn) {
                checkbox.addEventListener('change', () => {
                    confirmBtn.disabled = !checkbox.checked;
                });
            }
        }, 100);
    }

    /**
     * 全データリセット確認ダイアログを表示
     */
    showResetAllConfirmDialog() {
        const content = `
            <div class="reset-confirm">
                <div class="warning-icon">⚠️</div>
                <h4>全データリセットの確認</h4>
                <p>この操作により、以下のデータが完全に削除されます：</p>
                <ul>
                    <li>全ての作業セッション履歴</li>
                    <li>全てのオーダー</li>
                    <li>全てのアクティビティ</li>
                    <li>設定情報</li>
                </ul>
                <p><strong>アプリケーションが完全に初期状態に戻ります。</strong></p>
                <p><strong>この操作は取り消すことができません。</strong></p>
                <p>続行する前に、必要なデータをエクスポートすることを強く推奨します。</p>
                
                <div class="reset-options">
                    <label>
                        <input type="checkbox" id="reset-all-confirm-checkbox">
                        上記の内容を理解し、全データリセットを実行することに同意します
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="confirm-reset-all-btn" class="btn btn-danger" disabled>
                        全データをリセット
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="uiManager.hideModal()">
                        キャンセル
                    </button>
                </div>
            </div>
        `;

        this.showModal('全データリセット', content);
        
        // チェックボックスの状態に応じてボタンを有効/無効化
        setTimeout(() => {
            const checkbox = document.getElementById('reset-all-confirm-checkbox');
            const confirmBtn = document.getElementById('confirm-reset-all-btn');
            
            if (checkbox && confirmBtn) {
                checkbox.addEventListener('change', () => {
                    confirmBtn.disabled = !checkbox.checked;
                });
            }
        }, 100);
    }

    /**
     * CSVファイルをダウンロード
     * @param {string} csvData - CSVデータ
     * @param {string} filename - ファイル名
     */
    downloadCSV(csvData, filename) {
        // BOMを追加してExcelでの文字化けを防ぐ
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvData], { type: 'text/csv;charset=utf-8;' });
        
        // ダウンロードリンクを作成
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // メモリを解放
        URL.revokeObjectURL(url);
        
        this.showNotification(`${filename} をダウンロードしました`, 'success');
    }

    /**
     * オーダーフォームを表示
     * @param {Object} order - 編集するオーダー（新規作成の場合はnull）
     */
    showOrderForm(order = null) {
        const isEdit = order !== null;
        const title = isEdit ? 'オーダー編集' : '新規オーダー作成';
        
        const content = `
            <form id="order-form" class="form">
                <div class="form-group">
                    <label for="order-name">オーダー名 <span class="required">*</span></label>
                    <input type="text" id="order-name" name="name" required 
                           value="${isEdit ? this.escapeHtml(order.name) : ''}"
                           placeholder="オーダー名を入力してください">
                </div>
                <div class="form-group">
                    <label for="order-description">説明</label>
                    <textarea id="order-description" name="description" rows="3"
                              placeholder="オーダーの説明を入力してください（任意）">${isEdit ? this.escapeHtml(order.description || '') : ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? '更新' : '作成'}
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="uiManager.hideModal()">
                        キャンセル
                    </button>
                    ${isEdit ? '<button type="button" class="btn btn-danger" id="delete-order-btn">削除</button>' : ''}
                </div>
            </form>
        `;
        
        this.showModal(title, content);
        
        // フォーカスを名前フィールドに設定
        setTimeout(() => {
            const nameField = document.getElementById('order-name');
            if (nameField) {
                nameField.focus();
                nameField.select();
            }
        }, 100);
    }

    /**
     * アクティビティフォームを表示
     * @param {Object} activity - 編集するアクティビティ（新規作成の場合はnull）
     * @param {string} orderId - 所属するオーダーID（新規作成時のみ）
     */
    showActivityForm(activity = null, orderId = null) {
        const isEdit = activity !== null;
        const title = isEdit ? 'アクティビティ編集' : '新規アクティビティ作成';
        
        const content = `
            <form id="activity-form" class="form">
                <div class="form-group">
                    <label for="activity-name">アクティビティ名 <span class="required">*</span></label>
                    <input type="text" id="activity-name" name="name" required 
                           value="${isEdit ? this.escapeHtml(activity.name) : ''}"
                           placeholder="アクティビティ名を入力してください">
                </div>
                <div class="form-group">
                    <label for="activity-description">説明</label>
                    <textarea id="activity-description" name="description" rows="3"
                              placeholder="アクティビティの説明を入力してください（任意）">${isEdit ? this.escapeHtml(activity.description || '') : ''}</textarea>
                </div>
                ${!isEdit ? `<input type="hidden" id="activity-order-id" value="${orderId}">` : ''}
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? '更新' : '作成'}
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="uiManager.hideModal()">
                        キャンセル
                    </button>
                    ${isEdit ? '<button type="button" class="btn btn-danger" id="delete-activity-btn">削除</button>' : ''}
                </div>
            </form>
        `;
        
        this.showModal(title, content);
        
        // フォーカスを名前フィールドに設定
        setTimeout(() => {
            const nameField = document.getElementById('activity-name');
            if (nameField) {
                nameField.focus();
                nameField.select();
            }
        }, 100);
    }

    /**
     * 印刷用ページを表示
     * @param {string} content - 印刷する内容（HTML）
     * @param {string} title - 印刷ページのタイトル
     */
    showPrintPage(content, title = 'レポート') {
        // 印刷用の新しいウィンドウを作成
        const printWindow = window.open('', '_blank');
        
        const printContent = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${this.escapeHtml(title)} - 作業時間記録ツール</title>
                <style>
                    body {
                        font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
                        margin: 20px;
                        color: #333;
                        line-height: 1.6;
                    }
                    .print-header {
                        border-bottom: 2px solid #2563eb;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .print-title {
                        font-size: 24px;
                        font-weight: bold;
                        color: #2563eb;
                        margin: 0;
                    }
                    .print-date {
                        font-size: 14px;
                        color: #666;
                        margin-top: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <div class="print-title">${this.escapeHtml(title)}</div>
                    <div class="print-date">出力日時: ${new Date().toLocaleString('ja-JP')}</div>
                </div>
                ${content}
                <script>
                    window.onload = function() {
                        window.print();
                    };
                    window.onafterprint = function() {
                        window.close();
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        this.showNotification('印刷ページを開きました', 'info');
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}