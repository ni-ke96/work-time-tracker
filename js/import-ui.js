/**
 * インポート機能のUI管理クラス
 * ファイル選択、重複処理オプション、進行状況表示を管理
 */
class ImportUI {
    constructor(importService, uiManager) {
        this.importService = importService;
        this.uiManager = uiManager;
        this.currentFile = null;
        this.duplicateCheck = null;
        
        this.initializeEventListeners();
    }

    /**
     * イベントリスナーを初期化
     */
    initializeEventListeners() {
        // インポートボタンのクリックイベント
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportDialog());
        }
    }

    /**
     * インポートダイアログを表示
     */
    showImportDialog() {
        const modalContent = this.createImportDialogContent();
        this.uiManager.showModal('JSONインポート', modalContent);
        
        // ダイアログ内のイベントリスナーを設定
        this.setupDialogEventListeners();
    }

    /**
     * インポートダイアログのコンテンツを作成
     * @returns {string} HTMLコンテンツ
     */
    createImportDialogContent() {
        return `
            <div class="import-dialog">
                <div class="import-step" id="file-selection-step">
                    <h4>ファイル選択</h4>
                    <div class="file-input-container">
                        <input type="file" id="import-file-input" accept=".json" class="file-input">
                        <label for="import-file-input" class="file-input-label">
                            <span class="file-input-text">JSONファイルを選択してください</span>
                            <span class="file-input-button">ファイル選択</span>
                        </label>
                    </div>
                    <div class="file-info" id="file-info" style="display: none;">
                        <p><strong>選択されたファイル:</strong> <span id="file-name"></span></p>
                        <p><strong>ファイルサイズ:</strong> <span id="file-size"></span></p>
                    </div>
                    <div class="import-actions">
                        <button id="analyze-file-btn" class="btn btn-primary" disabled>ファイルを解析</button>
                        <button id="download-sample-btn" class="btn btn-secondary">サンプルファイルをダウンロード</button>
                    </div>
                </div>

                <div class="import-step" id="duplicate-options-step" style="display: none;">
                    <h4>重複処理オプション</h4>
                    <div class="duplicate-info" id="duplicate-info">
                        <!-- 重複情報がここに表示される -->
                    </div>
                    <div class="duplicate-options">
                        <label class="radio-option">
                            <input type="radio" name="duplicate-handling" value="skip" checked>
                            <span class="radio-label">スキップ</span>
                            <span class="radio-description">重複するデータをインポートしない</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="duplicate-handling" value="overwrite">
                            <span class="radio-label">上書き</span>
                            <span class="radio-description">既存データを新しいデータで置き換える</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="duplicate-handling" value="merge">
                            <span class="radio-label">統合</span>
                            <span class="radio-description">既存データを保持し、新しいデータを追加</span>
                        </label>
                    </div>
                    <div class="import-actions">
                        <button id="execute-import-btn" class="btn btn-success">インポート実行</button>
                        <button id="back-to-file-btn" class="btn btn-secondary">戻る</button>
                    </div>
                </div>

                <div class="import-step" id="progress-step" style="display: none;">
                    <h4>インポート中...</h4>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div class="progress-text" id="progress-text">処理中...</div>
                    </div>
                    <div class="progress-details" id="progress-details">
                        <!-- 進行状況の詳細がここに表示される -->
                    </div>
                </div>

                <div class="import-step" id="result-step" style="display: none;">
                    <h4>インポート結果</h4>
                    <div class="result-summary" id="result-summary">
                        <!-- 結果サマリーがここに表示される -->
                    </div>
                    <div class="import-actions">
                        <button id="close-import-btn" class="btn btn-primary">閉じる</button>
                        <button id="new-import-btn" class="btn btn-secondary">新しいファイルをインポート</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * ダイアログ内のイベントリスナーを設定
     */
    setupDialogEventListeners() {
        // ファイル選択
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }

        // ファイル解析ボタン
        const analyzeBtn = document.getElementById('analyze-file-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeFile());
        }

        // サンプルファイルダウンロード
        const sampleBtn = document.getElementById('download-sample-btn');
        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => this.downloadSampleFile());
        }

        // インポート実行ボタン
        const executeBtn = document.getElementById('execute-import-btn');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => this.executeImport());
        }

        // 戻るボタン
        const backBtn = document.getElementById('back-to-file-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showFileSelectionStep());
        }

        // 閉じるボタン
        const closeBtn = document.getElementById('close-import-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.uiManager.hideModal();
                // モーダルを閉じる際にもメイン画面を更新
                this.notifyMainScreenUpdate();
            });
        }

        // 新しいインポートボタン
        const newImportBtn = document.getElementById('new-import-btn');
        if (newImportBtn) {
            newImportBtn.addEventListener('click', () => this.resetImportDialog());
        }
    }

    /**
     * ファイル選択を処理
     * @param {Event} event - ファイル選択イベント
     */
    handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) {
            this.currentFile = null;
            this.hideFileInfo();
            this.disableAnalyzeButton();
            return;
        }

        this.currentFile = file;
        this.showFileInfo(file);
        this.enableAnalyzeButton();
    }

    /**
     * ファイル情報を表示
     * @param {File} file - 選択されたファイル
     */
    showFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');

        if (fileInfo && fileName && fileSize) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            fileInfo.style.display = 'block';
        }
    }

    /**
     * ファイル情報を非表示
     */
    hideFileInfo() {
        const fileInfo = document.getElementById('file-info');
        if (fileInfo) {
            fileInfo.style.display = 'none';
        }
    }

    /**
     * 解析ボタンを有効化
     */
    enableAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyze-file-btn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
        }
    }

    /**
     * 解析ボタンを無効化
     */
    disableAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyze-file-btn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
        }
    }

    /**
     * ファイルサイズをフォーマット
     * @param {number} bytes - バイト数
     * @returns {string} フォーマットされたサイズ
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * ファイルを解析
     */
    async analyzeFile() {
        if (!this.currentFile) {
            this.uiManager.showError('ファイルが選択されていません');
            return;
        }

        try {
            this.showProgressStep();
            this.updateProgress(0, 'ファイルを読み込み中...');

            // ファイル形式の検証
            if (!this.importService.validateFileFormat(this.currentFile)) {
                throw new Error('サポートされていないファイル形式です。JSONファイルを選択してください。');
            }

            this.updateProgress(25, 'ファイル内容を解析中...');

            // ファイル内容を読み込み
            const jsonContent = await this.importService.readFileContent(this.currentFile);
            
            this.updateProgress(50, 'データ形式を検証中...');

            // JSON解析
            const importData = this.importService.parseJSON(jsonContent);
            
            this.updateProgress(75, '重複をチェック中...');

            // データ形式の検証
            const validationResult = this.importService.validateImportData(importData);
            if (!validationResult.isValid) {
                throw new Error(`データ形式が無効です:\n${validationResult.errors.join('\n')}`);
            }

            // フラット構造のデータを使用して重複チェック
            this.flatData = validationResult.flattenedData;
            this.duplicateCheck = this.importService.checkDuplicates(this.flatData);

            this.updateProgress(100, '解析完了');

            // 重複処理オプションステップを表示
            setTimeout(() => {
                this.showDuplicateOptionsStep();
            }, 500);

        } catch (error) {
            console.error('ファイル解析エラー:', error);
            this.showErrorStep(error.message);
        }
    }

    /**
     * メイン画面の更新を通知
     */
    notifyMainScreenUpdate() {
        try {
            // メインアプリケーションが存在する場合、画面を更新
            if (window.app) {
                // オーダーリストを更新
                if (typeof window.app.updateOrderList === 'function') {
                    window.app.updateOrderList();
                }
                
                // アクティビティグリッドを更新
                if (typeof window.app.updateActivityGrid === 'function') {
                    window.app.updateActivityGrid();
                }
                
                // データが変更されたことを通知
                if (typeof window.app.onDataChanged === 'function') {
                    window.app.onDataChanged();
                }
                
                console.log('メイン画面の更新を完了しました');
            } else {
                console.warn('メインアプリケーションが見つかりません');
            }
        } catch (error) {
            console.error('メイン画面更新エラー:', error);
        }
    }

    /**
     * サンプルファイルをダウンロード
     */
    downloadSampleFile() {
        try {
            const sampleJSON = this.importService.generateSampleJSON();
            const blob = new Blob([sampleJSON], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sample-import.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.uiManager.showSuccess('サンプルファイルをダウンロードしました');
        } catch (error) {
            console.error('サンプルファイルダウンロードエラー:', error);
            this.uiManager.showError('サンプルファイルのダウンロードに失敗しました');
        }
    }

    /**
     * インポートを実行
     */
    async executeImport() {
        try {
            const duplicateHandling = this.getSelectedDuplicateHandling();
            
            this.showProgressStep();
            this.updateProgress(0, 'インポートを開始中...');

            const options = {
                duplicateHandling: duplicateHandling
            };

            // 既に解析済みのフラットデータを使用してインポートを実行
            const result = await this.importService.executeImport(this.flatData, this.duplicateCheck, options);

            this.updateProgress(100, 'インポート完了');

            // 結果表示
            setTimeout(() => {
                this.showResultStep(result);
                // メイン画面の更新を通知
                this.notifyMainScreenUpdate();
            }, 500);

        } catch (error) {
            console.error('インポート実行エラー:', error);
            this.showErrorStep(error.message);
        }
    }

    /**
     * 選択された重複処理方法を取得
     * @returns {string} 重複処理方法
     */
    getSelectedDuplicateHandling() {
        const radios = document.querySelectorAll('input[name="duplicate-handling"]');
        for (const radio of radios) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return 'skip'; // デフォルト
    }

    /**
     * ファイル選択ステップを表示
     */
    showFileSelectionStep() {
        this.hideAllSteps();
        const step = document.getElementById('file-selection-step');
        if (step) {
            step.style.display = 'block';
        }
    }

    /**
     * 重複処理オプションステップを表示
     */
    showDuplicateOptionsStep() {
        this.hideAllSteps();
        
        // 重複情報を表示
        this.displayDuplicateInfo();
        
        const step = document.getElementById('duplicate-options-step');
        if (step) {
            step.style.display = 'block';
        }
    }

    /**
     * 進行状況ステップを表示
     */
    showProgressStep() {
        this.hideAllSteps();
        const step = document.getElementById('progress-step');
        if (step) {
            step.style.display = 'block';
        }
    }

    /**
     * 結果ステップを表示
     * @param {Object} result - インポート結果
     */
    showResultStep(result) {
        this.hideAllSteps();
        
        // 結果サマリーを表示
        this.displayResultSummary(result);
        
        const step = document.getElementById('result-step');
        if (step) {
            step.style.display = 'block';
        }
    }

    /**
     * エラーステップを表示
     * @param {string|Error} errorMessage - エラーメッセージまたはエラーオブジェクト
     */
    showErrorStep(errorMessage) {
        this.hideAllSteps();
        
        const step = document.getElementById('result-step');
        if (step) {
            const resultSummary = document.getElementById('result-summary');
            if (resultSummary) {
                let errorHtml = '';
                
                // エラーオブジェクトの場合は詳細な表示を生成
                if (typeof errorMessage === 'object' && errorMessage.processedError) {
                    errorHtml = this.generateDetailedErrorHtml(errorMessage.processedError);
                } else {
                    // 文字列の場合は簡単な表示
                    errorHtml = `
                        <div class="error-message">
                            <div class="error-icon">❌</div>
                            <h5>エラーが発生しました</h5>
                            <p>${this.escapeHtml(errorMessage.toString())}</p>
                        </div>
                    `;
                }
                
                resultSummary.innerHTML = errorHtml;
            }
            step.style.display = 'block';
        }
    }

    /**
     * 詳細なエラーHTMLを生成
     * @param {Object} processedError - 処理されたエラー情報
     * @returns {string} エラーHTML
     */
    generateDetailedErrorHtml(processedError) {
        let html = '<div class="detailed-error-message">';
        
        // エラーヘッダー
        html += '<div class="error-header">';
        html += `<div class="error-icon ${processedError.severity}">`;
        html += processedError.severity === 'error' ? '❌' : '⚠️';
        html += '</div>';
        html += `<h5>${processedError.title}</h5>`;
        html += `<span class="error-severity ${processedError.severity}">${processedError.severity}</span>`;
        html += '</div>';

        // エラーメッセージ
        html += '<div class="error-content">';
        html += `<p class="error-description">${this.escapeHtml(processedError.message)}</p>`;
        
        // 検証結果の詳細表示
        if (processedError.validationResult && processedError.errorReport) {
            html += this.generateValidationErrorDetails(processedError.validationResult, processedError.errorReport);
        }
        
        // 解決策
        html += '<div class="error-solution">';
        html += '<h6>🔧 解決方法</h6>';
        html += `<p>${this.escapeHtml(processedError.solution)}</p>`;
        html += '</div>';
        
        // 推奨事項
        if (processedError.recommendations && processedError.recommendations.length > 0) {
            html += '<div class="error-recommendations">';
            html += '<h6>💡 推奨事項</h6>';
            html += '<ul>';
            processedError.recommendations.forEach(rec => {
                html += `<li class="recommendation ${rec.priority}">`;
                html += `<strong>${rec.action}</strong>: ${this.escapeHtml(rec.description)}`;
                html += '</li>';
            });
            html += '</ul>';
            html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
        
        return html;
    }

    /**
     * 検証エラーの詳細を生成
     * @param {Object} validationResult - 検証結果
     * @param {Object} errorReport - エラーレポート
     * @returns {string} 検証エラー詳細HTML
     */
    generateValidationErrorDetails(validationResult, errorReport) {
        let html = '<div class="validation-error-details">';
        
        // サマリー
        html += '<div class="validation-summary">';
        html += '<h6>📊 検証結果サマリー</h6>';
        html += '<div class="summary-stats">';
        html += `<span class="stat error">エラー: ${validationResult.errors ? validationResult.errors.length : 0}件</span>`;
        html += `<span class="stat warning">警告: ${validationResult.warnings ? validationResult.warnings.length : 0}件</span>`;
        if (validationResult.integrityScore !== undefined) {
            html += `<span class="stat score">整合性スコア: ${validationResult.integrityScore}/100</span>`;
        }
        html += '</div>';
        html += '</div>';

        // 主要なエラー（最大5件表示）
        if (validationResult.errors && validationResult.errors.length > 0) {
            html += '<div class="main-errors">';
            html += '<h6>🚨 主なエラー</h6>';
            html += '<ul class="error-list">';
            
            const displayErrors = validationResult.errors.slice(0, 5);
            displayErrors.forEach((error, index) => {
                html += `<li>${index + 1}. ${this.escapeHtml(error)}</li>`;
            });
            
            if (validationResult.errors.length > 5) {
                html += `<li class="more-errors">... 他${validationResult.errors.length - 5}件のエラー</li>`;
            }
            
            html += '</ul>';
            html += '</div>';
        }

        // 孤立したアクティビティの詳細
        if (validationResult.orphanedActivities && validationResult.orphanedActivities.length > 0) {
            html += '<div class="orphaned-activities">';
            html += '<h6>🔗 孤立したアクティビティ</h6>';
            html += '<div class="orphaned-list">';
            
            const displayOrphaned = validationResult.orphanedActivities.slice(0, 3);
            displayOrphaned.forEach(orphaned => {
                html += '<div class="orphaned-item">';
                html += `<strong>${this.escapeHtml(orphaned.activityName)}</strong>`;
                html += `<span class="missing-order">→ 存在しないオーダーID: ${this.escapeHtml(orphaned.missingOrderId)}</span>`;
                html += '</div>';
            });
            
            if (validationResult.orphanedActivities.length > 3) {
                html += `<div class="more-orphaned">... 他${validationResult.orphanedActivities.length - 3}件</div>`;
            }
            
            html += '</div>';
            html += '</div>';
        }

        // 重複の詳細
        if (validationResult.duplicateAnalysis) {
            const duplicateOrderIds = validationResult.duplicateAnalysis.orderIds || [];
            const duplicateActivityIds = validationResult.duplicateAnalysis.activityIds || [];
            
            if (duplicateOrderIds.length > 0 || duplicateActivityIds.length > 0) {
                html += '<div class="duplicate-details">';
                html += '<h6>🔄 重複データ</h6>';
                
                if (duplicateOrderIds.length > 0) {
                    html += '<div class="duplicate-orders">';
                    html += '<strong>重複オーダーID:</strong>';
                    html += '<ul>';
                    duplicateOrderIds.forEach(dup => {
                        html += `<li>${this.escapeHtml(dup.id)} (インデックス: ${dup.indices.join(', ')})</li>`;
                    });
                    html += '</ul>';
                    html += '</div>';
                }
                
                if (duplicateActivityIds.length > 0) {
                    html += '<div class="duplicate-activities">';
                    html += '<strong>重複アクティビティID:</strong>';
                    html += '<ul>';
                    duplicateActivityIds.forEach(dup => {
                        html += `<li>${this.escapeHtml(dup.id)} (インデックス: ${dup.indices.join(', ')})</li>`;
                    });
                    html += '</ul>';
                    html += '</div>';
                }
                
                html += '</div>';
            }
        }

        html += '</div>';
        return html;
    }

    /**
     * 全ステップを非表示
     */
    hideAllSteps() {
        const steps = document.querySelectorAll('.import-step');
        steps.forEach(step => {
            step.style.display = 'none';
        });
    }

    /**
     * 重複情報を表示
     */
    displayDuplicateInfo() {
        const duplicateInfo = document.getElementById('duplicate-info');
        if (!duplicateInfo || !this.duplicateCheck) return;

        if (!this.duplicateCheck.hasDuplicates) {
            duplicateInfo.innerHTML = `
                <div class="no-duplicates">
                    <p>重複するデータは見つかりませんでした。すべてのデータが新規作成されます。</p>
                </div>
            `;
            return;
        }

        let html = '<div class="duplicates-found">';
        html += '<p><strong>以下の重複が見つかりました:</strong></p>';
        
        if (this.duplicateCheck.duplicateOrders.length > 0) {
            html += '<h6>オーダー:</h6><ul>';
            this.duplicateCheck.duplicateOrders.forEach(dup => {
                html += `<li>${dup.import.name} (${dup.type === 'id' ? 'ID' : '名前'}が重複)</li>`;
            });
            html += '</ul>';
        }
        
        if (this.duplicateCheck.duplicateActivities.length > 0) {
            html += '<h6>アクティビティ:</h6><ul>';
            this.duplicateCheck.duplicateActivities.forEach(dup => {
                html += `<li>${dup.import.name} (${dup.type === 'id' ? 'ID' : '名前'}が重複)</li>`;
            });
            html += '</ul>';
        }
        
        html += '</div>';
        duplicateInfo.innerHTML = html;
    }

    /**
     * 結果サマリーを表示
     * @param {Object} result - インポート結果
     */
    displayResultSummary(result) {
        const resultSummary = document.getElementById('result-summary');
        if (!resultSummary) return;

        const html = this.generateResultHTML(result);
        resultSummary.innerHTML = html;
        
        // 結果に応じてUIを更新
        this.updateUIAfterImport(result);
    }

    /**
     * インポート結果のHTMLを生成
     * @param {Object} result - インポート結果
     * @returns {string} 結果HTML
     */
    generateResultHTML(result) {
        let html = '<div class="import-result">';
        
        if (result.success) {
            html += this.generateSuccessHTML(result);
        } else {
            html += this.generateErrorHTML(result);
        }
        
        // 詳細統計を追加
        html += this.generateDetailedStatsHTML(result);
        
        // 推奨アクションを追加
        html += this.generateRecommendedActionsHTML(result);
        
        html += '</div>';
        return html;
    }

    /**
     * 成功時のHTMLを生成
     * @param {Object} result - インポート結果
     * @returns {string} 成功HTML
     */
    generateSuccessHTML(result) {
        let html = '<div class="success-message">';
        html += '<div class="success-icon">✅</div>';
        html += '<h5>インポートが正常に完了しました</h5>';
        
        // サマリー統計
        const totalProcessed = result.newOrders + result.newActivities + result.updatedOrders + result.updatedActivities;
        html += `<p class="summary-text">合計 ${totalProcessed} 件のデータを処理しました</p>`;
        
        html += '<div class="result-stats">';
        
        // 新規作成
        if (result.newOrders > 0 || result.newActivities > 0) {
            html += '<div class="stat-group new-items">';
            html += '<h6>新規作成</h6>';
            if (result.newOrders > 0) {
                html += `<p><span class="stat-icon">📁</span> オーダー: ${result.newOrders}件</p>`;
            }
            if (result.newActivities > 0) {
                html += `<p><span class="stat-icon">⚡</span> アクティビティ: ${result.newActivities}件</p>`;
            }
            html += '</div>';
        }
        
        // 更新
        if (result.updatedOrders > 0 || result.updatedActivities > 0) {
            html += '<div class="stat-group updated-items">';
            html += '<h6>更新</h6>';
            if (result.updatedOrders > 0) {
                html += `<p><span class="stat-icon">🔄</span> オーダー: ${result.updatedOrders}件</p>`;
            }
            if (result.updatedActivities > 0) {
                html += `<p><span class="stat-icon">🔄</span> アクティビティ: ${result.updatedActivities}件</p>`;
            }
            html += '</div>';
        }
        
        // スキップ
        if (result.skippedOrders > 0 || result.skippedActivities > 0) {
            html += '<div class="stat-group skipped-items">';
            html += '<h6>スキップ</h6>';
            if (result.skippedOrders > 0) {
                html += `<p><span class="stat-icon">⏭️</span> オーダー: ${result.skippedOrders}件</p>`;
            }
            if (result.skippedActivities > 0) {
                html += `<p><span class="stat-icon">⏭️</span> アクティビティ: ${result.skippedActivities}件</p>`;
            }
            html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
        
        return html;
    }

    /**
     * エラー時のHTMLを生成
     * @param {Object} result - インポート結果
     * @returns {string} エラーHTML
     */
    generateErrorHTML(result) {
        let html = '<div class="error-message">';
        html += '<div class="error-icon">❌</div>';
        html += '<h5>インポート中にエラーが発生しました</h5>';
        
        if (result.errors && result.errors.length > 0) {
            html += '<div class="error-details">';
            html += '<h6>エラー詳細:</h6>';
            html += '<ul class="error-list">';
            result.errors.forEach(error => {
                html += `<li>${this.escapeHtml(error)}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }
        
        // 部分的な成功がある場合は表示
        const partialSuccess = result.newOrders > 0 || result.newActivities > 0 || 
                              result.updatedOrders > 0 || result.updatedActivities > 0;
        
        if (partialSuccess) {
            html += '<div class="partial-success">';
            html += '<h6>部分的に処理されたデータ:</h6>';
            html += '<div class="result-stats">';
            
            if (result.newOrders > 0) {
                html += `<p>新規オーダー: ${result.newOrders}件</p>`;
            }
            if (result.newActivities > 0) {
                html += `<p>新規アクティビティ: ${result.newActivities}件</p>`;
            }
            if (result.updatedOrders > 0) {
                html += `<p>更新されたオーダー: ${result.updatedOrders}件</p>`;
            }
            if (result.updatedActivities > 0) {
                html += `<p>更新されたアクティビティ: ${result.updatedActivities}件</p>`;
            }
            
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * 詳細統計のHTMLを生成
     * @param {Object} result - インポート結果
     * @returns {string} 詳細統計HTML
     */
    generateDetailedStatsHTML(result) {
        let html = '<div class="detailed-stats">';
        html += '<h6>処理統計</h6>';
        html += '<div class="stats-grid">';
        
        // 処理時間（実装時に追加）
        if (result.processingTime) {
            html += `<div class="stat-item">`;
            html += `<span class="stat-label">処理時間:</span>`;
            html += `<span class="stat-value">${result.processingTime}ms</span>`;
            html += `</div>`;
        }
        
        // ファイルサイズ
        if (result.fileSize) {
            html += `<div class="stat-item">`;
            html += `<span class="stat-label">ファイルサイズ:</span>`;
            html += `<span class="stat-value">${this.formatFileSize(result.fileSize)}</span>`;
            html += `</div>`;
        }
        
        // 処理日時
        html += `<div class="stat-item">`;
        html += `<span class="stat-label">処理日時:</span>`;
        html += `<span class="stat-value">${new Date().toLocaleString('ja-JP')}</span>`;
        html += `</div>`;
        
        html += '</div>';
        html += '</div>';
        
        return html;
    }

    /**
     * 推奨アクションのHTMLを生成
     * @param {Object} result - インポート結果
     * @returns {string} 推奨アクションHTML
     */
    generateRecommendedActionsHTML(result) {
        let html = '<div class="recommended-actions">';
        html += '<h6>推奨アクション</h6>';
        html += '<div class="action-list">';
        
        if (result.success) {
            html += '<div class="action-item success-action">';
            html += '<span class="action-icon">🎉</span>';
            html += '<span class="action-text">インポートが完了しました。新しいオーダーとアクティビティを確認してください。</span>';
            html += '</div>';
            
            if (result.newOrders > 0) {
                html += '<div class="action-item">';
                html += '<span class="action-icon">👀</span>';
                html += '<span class="action-text">オーダー一覧で新しく追加されたオーダーを確認してください。</span>';
                html += '</div>';
            }
            
            if (result.newActivities > 0) {
                html += '<div class="action-item">';
                html += '<span class="action-icon">⚡</span>';
                html += '<span class="action-text">オーダーを選択して新しいアクティビティを確認してください。</span>';
                html += '</div>';
            }
        } else {
            html += '<div class="action-item error-action">';
            html += '<span class="action-icon">🔧</span>';
            html += '<span class="action-text">エラーを修正してから再度インポートを試してください。</span>';
            html += '</div>';
            
            html += '<div class="action-item">';
            html += '<span class="action-icon">📋</span>';
            html += '<span class="action-text">サンプルファイルを参考に、正しい形式でデータを作成してください。</span>';
            html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
        
        return html;
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
     * インポート後のUI更新
     * @param {Object} result - インポート結果
     */
    updateUIAfterImport(result) {
        if (result.success && (result.newOrders > 0 || result.newActivities > 0)) {
            // UIマネージャーに更新を通知
            if (this.uiManager && typeof this.uiManager.refreshOrderList === 'function') {
                setTimeout(() => {
                    this.uiManager.refreshOrderList();
                    this.uiManager.showSuccess(`インポートが完了しました。新規オーダー: ${result.newOrders}件、新規アクティビティ: ${result.newActivities}件`);
                }, 1000);
            }
        }
    }

    /**
     * 進行状況を更新
     * @param {number} percentage - 進行率（0-100）
     * @param {string} text - 進行状況テキスト
     */
    updateProgress(percentage, text) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
    }

    /**
     * インポートダイアログをリセット
     */
    resetImportDialog() {
        this.currentFile = null;
        this.duplicateCheck = null;
        
        // ファイル入力をクリア
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // ファイル選択ステップに戻る
        this.showFileSelectionStep();
        this.hideFileInfo();
        this.disableAnalyzeButton();
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.ImportUI = ImportUI;
}