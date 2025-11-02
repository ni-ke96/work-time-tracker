/**
 * インポート機能専用のエラーハンドリングクラス
 * インポート処理中に発生する様々なエラーを適切に処理し、ユーザーに分かりやすいメッセージを提供
 */
class ImportErrorHandler {
    constructor() {
        this.errorTypes = {
            FILE_FORMAT_ERROR: 'ファイル形式エラー',
            FILE_SIZE_ERROR: 'ファイルサイズエラー',
            JSON_PARSE_ERROR: 'JSON解析エラー',
            SCHEMA_VALIDATION_ERROR: 'スキーマ検証エラー',
            DATA_INTEGRITY_ERROR: 'データ整合性エラー',
            IMPORT_EXECUTION_ERROR: 'インポート実行エラー',
            STORAGE_ERROR: 'ストレージエラー',
            NETWORK_ERROR: 'ネットワークエラー',
            UNKNOWN_ERROR: '不明なエラー'
        };
        
        this.errorMessages = new Map();
        this.initializeErrorMessages();
    }

    /**
     * エラーメッセージを初期化
     */
    initializeErrorMessages() {
        // ファイル形式エラー
        this.errorMessages.set('FILE_FORMAT_ERROR', {
            title: 'ファイル形式エラー',
            message: 'サポートされていないファイル形式です。',
            solution: 'JSONファイル（.json）を選択してください。',
            severity: 'error'
        });

        // ファイルサイズエラー
        this.errorMessages.set('FILE_SIZE_ERROR', {
            title: 'ファイルサイズエラー',
            message: 'ファイルサイズが制限を超えています。',
            solution: 'ファイルサイズを10MB以下にしてください。',
            severity: 'error'
        });

        // JSON解析エラー
        this.errorMessages.set('JSON_PARSE_ERROR', {
            title: 'JSON解析エラー',
            message: 'JSONファイルの形式が正しくありません。',
            solution: 'JSONファイルの構文を確認し、有効なJSON形式にしてください。',
            severity: 'error'
        });

        // スキーマ検証エラー
        this.errorMessages.set('SCHEMA_VALIDATION_ERROR', {
            title: 'データ形式エラー',
            message: 'データの形式が要求される仕様と一致しません。',
            solution: 'サンプルファイルを参考に、正しい形式でデータを作成してください。',
            severity: 'error'
        });

        // データ整合性エラー
        this.errorMessages.set('DATA_INTEGRITY_ERROR', {
            title: 'データ整合性エラー',
            message: 'データ間の関係に問題があります。',
            solution: 'オーダーとアクティビティの関係を確認してください。',
            severity: 'error'
        });

        // インポート実行エラー
        this.errorMessages.set('IMPORT_EXECUTION_ERROR', {
            title: 'インポート実行エラー',
            message: 'インポート処理中にエラーが発生しました。',
            solution: 'データを確認して再度お試しください。',
            severity: 'error'
        });

        // ストレージエラー
        this.errorMessages.set('STORAGE_ERROR', {
            title: 'ストレージエラー',
            message: 'データの保存中にエラーが発生しました。',
            solution: 'ブラウザのストレージ容量を確認してください。',
            severity: 'error'
        });

        // ネットワークエラー
        this.errorMessages.set('NETWORK_ERROR', {
            title: 'ネットワークエラー',
            message: 'ネットワーク接続に問題があります。',
            solution: 'インターネット接続を確認してください。',
            severity: 'error'
        });

        // 不明なエラー
        this.errorMessages.set('UNKNOWN_ERROR', {
            title: '予期しないエラー',
            message: '予期しないエラーが発生しました。',
            solution: 'ページを再読み込みして再度お試しください。',
            severity: 'error'
        });
    }

    /**
     * エラーを処理し、適切なメッセージを生成
     * @param {Error} error - 発生したエラー
     * @param {Object} context - エラーのコンテキスト情報
     * @returns {Object} 処理されたエラー情報
     */
    handleError(error, context = {}) {
        const errorType = this.classifyError(error, context);
        const errorInfo = this.errorMessages.get(errorType) || this.errorMessages.get('UNKNOWN_ERROR');
        
        const processedError = {
            type: errorType,
            title: errorInfo.title,
            message: this.generateDetailedMessage(error, errorInfo, context),
            solution: errorInfo.solution,
            severity: errorInfo.severity,
            originalError: error,
            context: context,
            timestamp: new Date().toISOString()
        };

        // エラーログを記録
        this.logError(processedError);

        return processedError;
    }

    /**
     * エラーを分類
     * @param {Error} error - 発生したエラー
     * @param {Object} context - エラーのコンテキスト情報
     * @returns {string} エラータイプ
     */
    classifyError(error, context) {
        const message = error.message.toLowerCase();
        
        // ファイル関連エラー
        if (message.includes('ファイル形式') || message.includes('file format')) {
            return 'FILE_FORMAT_ERROR';
        }
        
        if (message.includes('ファイルサイズ') || message.includes('file size')) {
            return 'FILE_SIZE_ERROR';
        }
        
        // JSON関連エラー
        if (error instanceof SyntaxError || message.includes('json') || message.includes('parse')) {
            return 'JSON_PARSE_ERROR';
        }
        
        // データ検証エラー
        if (message.includes('データ形式') || message.includes('スキーマ') || message.includes('schema')) {
            return 'SCHEMA_VALIDATION_ERROR';
        }
        
        if (message.includes('重複') || message.includes('整合性') || message.includes('関係')) {
            return 'DATA_INTEGRITY_ERROR';
        }
        
        // ストレージエラー
        if (message.includes('storage') || message.includes('ストレージ') || message.includes('保存')) {
            return 'STORAGE_ERROR';
        }
        
        // ネットワークエラー
        if (message.includes('network') || message.includes('ネットワーク') || message.includes('接続')) {
            return 'NETWORK_ERROR';
        }
        
        // インポート実行エラー
        if (message.includes('インポート') || message.includes('import')) {
            return 'IMPORT_EXECUTION_ERROR';
        }
        
        return 'UNKNOWN_ERROR';
    }

    /**
     * 詳細なエラーメッセージを生成
     * @param {Error} error - 発生したエラー
     * @param {Object} errorInfo - エラー情報
     * @param {Object} context - コンテキスト情報
     * @returns {string} 詳細メッセージ
     */
    generateDetailedMessage(error, errorInfo, context) {
        let message = errorInfo.message;
        
        // コンテキスト情報を追加
        if (context.fileName) {
            message += `\nファイル名: ${context.fileName}`;
        }
        
        if (context.fileSize) {
            message += `\nファイルサイズ: ${this.formatFileSize(context.fileSize)}`;
        }
        
        if (context.lineNumber) {
            message += `\n行番号: ${context.lineNumber}`;
        }
        
        // 検証結果の詳細を追加
        if (context.validationResult) {
            message += this.formatValidationErrors(context.validationResult);
        }
        
        // 具体的なエラー詳細を追加
        if (error.message && error.message !== errorInfo.message) {
            message += `\n詳細: ${error.message}`;
        }
        
        return message;
    }

    /**
     * 検証エラーをフォーマット
     * @param {Object} validationResult - 検証結果
     * @returns {string} フォーマットされた検証エラー
     */
    formatValidationErrors(validationResult) {
        if (!validationResult || validationResult.isValid) {
            return '';
        }

        let message = '\n\n【検証エラー詳細】';
        
        // エラー数のサマリー
        const errorCount = validationResult.errors ? validationResult.errors.length : 0;
        const warningCount = validationResult.warnings ? validationResult.warnings.length : 0;
        message += `\nエラー: ${errorCount}件, 警告: ${warningCount}件`;

        // 重要度の高いエラーを優先表示（最大5件）
        if (validationResult.errors && validationResult.errors.length > 0) {
            message += '\n\n主なエラー:';
            const displayErrors = validationResult.errors.slice(0, 5);
            displayErrors.forEach((error, index) => {
                message += `\n${index + 1}. ${error}`;
            });
            
            if (validationResult.errors.length > 5) {
                message += `\n... 他${validationResult.errors.length - 5}件のエラー`;
            }
        }

        // 整合性エラーの詳細
        if (validationResult.orphanedActivities && validationResult.orphanedActivities.length > 0) {
            message += '\n\n孤立したアクティビティ:';
            const displayOrphaned = validationResult.orphanedActivities.slice(0, 3);
            displayOrphaned.forEach(orphaned => {
                message += `\n- ${orphaned.activityName} → 存在しないオーダーID: ${orphaned.missingOrderId}`;
            });
            
            if (validationResult.orphanedActivities.length > 3) {
                message += `\n... 他${validationResult.orphanedActivities.length - 3}件`;
            }
        }

        return message;
    }

    /**
     * 検証エラー専用のエラーハンドリング
     * @param {Object} validationResult - 検証結果
     * @param {Object} context - コンテキスト情報
     * @returns {Object} 処理されたエラー情報
     */
    handleValidationError(validationResult, context = {}) {
        const errorType = this.classifyValidationError(validationResult);
        const errorInfo = this.errorMessages.get(errorType) || this.errorMessages.get('SCHEMA_VALIDATION_ERROR');
        
        const processedError = {
            type: errorType,
            title: errorInfo.title,
            message: this.generateValidationMessage(validationResult, errorInfo, context),
            solution: this.generateValidationSolution(validationResult, errorInfo),
            severity: this.determineValidationSeverity(validationResult),
            validationResult: validationResult,
            context: context,
            timestamp: new Date().toISOString(),
            recommendations: this.generateValidationRecommendations(validationResult)
        };

        // エラーログを記録
        this.logValidationError(processedError);

        return processedError;
    }

    /**
     * 検証エラーを分類
     * @param {Object} validationResult - 検証結果
     * @returns {string} エラータイプ
     */
    classifyValidationError(validationResult) {
        if (!validationResult.errors || validationResult.errors.length === 0) {
            return 'UNKNOWN_ERROR';
        }

        const errors = validationResult.errors;
        
        // 構造エラーの検出
        const hasStructuralErrors = errors.some(error => 
            error.includes('ルートオブジェクト') || 
            error.includes('必須プロパティ') ||
            error.includes('配列である必要')
        );
        
        if (hasStructuralErrors) {
            return 'SCHEMA_VALIDATION_ERROR';
        }

        // 整合性エラーの検出
        const hasIntegrityErrors = errors.some(error => 
            error.includes('重複') || 
            error.includes('存在しない') ||
            error.includes('孤立')
        );
        
        if (hasIntegrityErrors) {
            return 'DATA_INTEGRITY_ERROR';
        }

        // 形式エラーの検出
        const hasFormatErrors = errors.some(error => 
            error.includes('型である必要') || 
            error.includes('文字数制限') ||
            error.includes('無効です')
        );
        
        if (hasFormatErrors) {
            return 'SCHEMA_VALIDATION_ERROR';
        }

        return 'SCHEMA_VALIDATION_ERROR';
    }

    /**
     * 検証エラー用のメッセージを生成
     * @param {Object} validationResult - 検証結果
     * @param {Object} errorInfo - エラー情報
     * @param {Object} context - コンテキスト情報
     * @returns {string} 検証エラーメッセージ
     */
    generateValidationMessage(validationResult, errorInfo, context) {
        let message = errorInfo.message;
        
        // 統計情報を追加
        const errorCount = validationResult.errors ? validationResult.errors.length : 0;
        const warningCount = validationResult.warnings ? validationResult.warnings.length : 0;
        
        message += `\n\n検出された問題: エラー ${errorCount}件, 警告 ${warningCount}件`;
        
        // 重要度の高いエラーを表示
        if (validationResult.errors && validationResult.errors.length > 0) {
            message += '\n\n主な問題:';
            const criticalErrors = validationResult.errors.slice(0, 3);
            criticalErrors.forEach((error, index) => {
                message += `\n${index + 1}. ${error}`;
            });
        }

        return message;
    }

    /**
     * 検証エラー用の解決策を生成
     * @param {Object} validationResult - 検証結果
     * @param {Object} errorInfo - エラー情報
     * @returns {string} 解決策
     */
    generateValidationSolution(validationResult, errorInfo) {
        let solution = errorInfo.solution;
        
        // 具体的な解決策を追加
        if (validationResult.orphanedActivities && validationResult.orphanedActivities.length > 0) {
            solution += '\n\n孤立したアクティビティの修正:';
            solution += '\n- 存在しないオーダーIDを参照しているアクティビティを確認';
            solution += '\n- 正しいオーダーIDに修正するか、該当するオーダーを追加';
        }

        if (validationResult.duplicateAnalysis) {
            const duplicateOrderIds = validationResult.duplicateAnalysis.orderIds || [];
            const duplicateActivityIds = validationResult.duplicateAnalysis.activityIds || [];
            
            if (duplicateOrderIds.length > 0 || duplicateActivityIds.length > 0) {
                solution += '\n\n重複IDの修正:';
                solution += '\n- 重複しているIDを一意の値に変更';
                solution += '\n- データの統合が必要な場合は、重複処理オプションを使用';
            }
        }

        return solution;
    }

    /**
     * 検証エラーの重要度を判定
     * @param {Object} validationResult - 検証結果
     * @returns {string} 重要度
     */
    determineValidationSeverity(validationResult) {
        if (!validationResult.errors || validationResult.errors.length === 0) {
            return validationResult.warnings && validationResult.warnings.length > 0 ? 'warning' : 'info';
        }

        const errorCount = validationResult.errors.length;
        
        // 整合性エラーは常に高い重要度
        if (validationResult.orphanedActivities && validationResult.orphanedActivities.length > 0) {
            return 'error';
        }

        if (errorCount >= 10) return 'error';
        if (errorCount >= 5) return 'error';
        return 'warning';
    }

    /**
     * 検証エラー用の推奨事項を生成
     * @param {Object} validationResult - 検証結果
     * @returns {Object[]} 推奨事項配列
     */
    generateValidationRecommendations(validationResult) {
        const recommendations = [];

        if (validationResult.errors && validationResult.errors.length > 0) {
            recommendations.push({
                action: 'サンプルファイルを確認',
                description: '正しいデータ形式のサンプルファイルをダウンロードして参考にしてください',
                priority: 'high'
            });

            recommendations.push({
                action: 'データを段階的に修正',
                description: 'エラーの多い場合は、少量のデータから始めて段階的に修正してください',
                priority: 'medium'
            });
        }

        if (validationResult.orphanedActivities && validationResult.orphanedActivities.length > 0) {
            recommendations.push({
                action: '孤立したアクティビティを修正',
                description: '存在しないオーダーを参照しているアクティビティのorderIdを修正してください',
                priority: 'critical'
            });
        }

        if (validationResult.warnings && validationResult.warnings.length > 0) {
            recommendations.push({
                action: '警告事項を確認',
                description: '警告は必須ではありませんが、データ品質向上のため確認することをお勧めします',
                priority: 'low'
            });
        }

        return recommendations;
    }

    /**
     * 検証エラーをログに記録
     * @param {Object} processedError - 処理されたエラー情報
     */
    logValidationError(processedError) {
        const logEntry = {
            timestamp: processedError.timestamp,
            type: processedError.type,
            severity: processedError.severity,
            errorCount: processedError.validationResult.errors ? processedError.validationResult.errors.length : 0,
            warningCount: processedError.validationResult.warnings ? processedError.validationResult.warnings.length : 0,
            context: processedError.context
        };
        
        console.error('Validation Error:', logEntry);
        
        // 詳細な検証結果もログに記録
        if (processedError.validationResult) {
            console.group('Validation Details:');
            console.log('Errors:', processedError.validationResult.errors);
            console.log('Warnings:', processedError.validationResult.warnings);
            if (processedError.validationResult.orphanedActivities) {
                console.log('Orphaned Activities:', processedError.validationResult.orphanedActivities);
            }
            console.groupEnd();
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
     * エラーをログに記録
     * @param {Object} processedError - 処理されたエラー情報
     */
    logError(processedError) {
        const logEntry = {
            timestamp: processedError.timestamp,
            type: processedError.type,
            title: processedError.title,
            message: processedError.message,
            context: processedError.context,
            stack: processedError.originalError.stack
        };
        
        console.error('Import Error:', logEntry);
        
        // 必要に応じて外部ログサービスに送信
        // this.sendToLogService(logEntry);
    }

    /**
     * 復旧可能なエラーかどうかを判定
     * @param {string} errorType - エラータイプ
     * @returns {boolean} 復旧可能な場合true
     */
    isRecoverable(errorType) {
        const recoverableErrors = [
            'FILE_FORMAT_ERROR',
            'FILE_SIZE_ERROR',
            'JSON_PARSE_ERROR',
            'SCHEMA_VALIDATION_ERROR',
            'DATA_INTEGRITY_ERROR'
        ];
        
        return recoverableErrors.includes(errorType);
    }

    /**
     * エラーに対する推奨アクションを取得
     * @param {string} errorType - エラータイプ
     * @returns {Object[]} 推奨アクション配列
     */
    getRecommendedActions(errorType) {
        const actions = {
            'FILE_FORMAT_ERROR': [
                { action: 'ファイル形式を確認', description: 'JSONファイル（.json拡張子）を選択してください' },
                { action: 'サンプルファイルをダウンロード', description: '正しい形式のサンプルファイルを参考にしてください' }
            ],
            'FILE_SIZE_ERROR': [
                { action: 'ファイルサイズを削減', description: 'データを分割するか、不要なデータを削除してください' },
                { action: 'データを圧縮', description: 'JSONファイルを圧縮してサイズを削減してください' }
            ],
            'JSON_PARSE_ERROR': [
                { action: 'JSON構文を確認', description: 'JSONバリデーターでファイルの構文を確認してください' },
                { action: 'エンコーディングを確認', description: 'ファイルがUTF-8エンコーディングで保存されているか確認してください' }
            ],
            'SCHEMA_VALIDATION_ERROR': [
                { action: 'データ形式を確認', description: 'サンプルファイルと同じ形式でデータを作成してください' },
                { action: '必須フィールドを確認', description: 'id、name、createdAtなどの必須フィールドが含まれているか確認してください' }
            ],
            'DATA_INTEGRITY_ERROR': [
                { action: 'データの関係を確認', description: 'アクティビティのorderIdが存在するオーダーのIDを参照しているか確認してください' },
                { action: '重複データを確認', description: 'IDや名前の重複がないか確認してください' }
            ]
        };
        
        return actions[errorType] || [
            { action: 'ページを再読み込み', description: 'ページを再読み込みして再度お試しください' },
            { action: 'サポートに連絡', description: '問題が解決しない場合は、サポートにお問い合わせください' }
        ];
    }

    /**
     * ユーザーフレンドリーなエラーメッセージを生成
     * @param {Object} processedError - 処理されたエラー情報
     * @returns {string} ユーザー向けメッセージ
     */
    generateUserMessage(processedError) {
        let message = `${processedError.title}\n\n${processedError.message}\n\n`;
        
        message += '【解決方法】\n';
        message += `${processedError.solution}\n\n`;
        
        const actions = this.getRecommendedActions(processedError.type);
        if (actions.length > 0) {
            message += '【推奨アクション】\n';
            actions.forEach((action, index) => {
                message += `${index + 1}. ${action.action}: ${action.description}\n`;
            });
        }
        
        return message;
    }

    /**
     * エラー統計を取得
     * @returns {Object} エラー統計情報
     */
    getErrorStatistics() {
        // 実装では、エラーの発生頻度や傾向を追跡
        return {
            totalErrors: 0,
            errorsByType: {},
            mostCommonError: null,
            errorTrends: []
        };
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.ImportErrorHandler = ImportErrorHandler;
}