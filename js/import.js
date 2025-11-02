/**
 * JSONインポート機能を管理するクラス
 * 外部JSONファイルからオーダーとアクティビティをインポートする
 */
class ImportService {
    constructor(dataRepository) {
        this.dataRepository = dataRepository;
        this.supportedVersion = '1.0.0';
        this.errorHandler = new ImportErrorHandler();
    }

    /**
     * JSONファイルを読み込んでインポートを実行
     * @param {File} file - インポートするJSONファイル
     * @param {Object} options - インポートオプション
     * @returns {Promise<Object>} インポート結果
     */
    async importFromFile(file, options = {}) {
        try {
            // ファイル形式の検証
            if (!this.validateFileFormat(file)) {
                throw new Error('サポートされていないファイル形式です。JSONファイルを選択してください。');
            }

            // ファイルサイズの検証
            if (!this.validateFileSize(file)) {
                throw new Error('ファイルサイズが大きすぎます（最大10MB）。');
            }

            // ファイル内容を読み込み
            const jsonContent = await this.readFileContent(file);
            
            // JSONデータの解析とインポート
            return await this.importFromJSON(jsonContent, options);
        } catch (error) {
            console.error('ファイルインポートエラー:', error);
            
            // 検証エラーの場合は専用ハンドリング
            if (error.validationResult) {
                const processedError = this.errorHandler.handleValidationError(error.validationResult, {
                    fileName: file.name,
                    fileSize: file.size,
                    operation: 'importFromFile'
                });
                
                const enhancedError = new Error(this.errorHandler.generateUserMessage(processedError));
                enhancedError.processedError = processedError;
                throw enhancedError;
            }
            
            // 一般的なエラーハンドリング
            const processedError = this.errorHandler.handleError(error, {
                fileName: file.name,
                fileSize: file.size,
                operation: 'importFromFile'
            });
            
            // 処理されたエラーを投げる
            const enhancedError = new Error(this.errorHandler.generateUserMessage(processedError));
            enhancedError.processedError = processedError;
            throw enhancedError;
        }
    }

    /**
     * JSON文字列からデータをインポート
     * @param {string} jsonString - JSON文字列
     * @param {Object} options - インポートオプション
     * @returns {Promise<Object>} インポート結果
     */
    async importFromJSON(jsonString, options = {}) {
        try {
            // JSON解析
            const importData = this.parseJSON(jsonString);
            
            // データ形式の検証
            const validationResult = this.validateImportData(importData);
            if (!validationResult.isValid) {
                // 詳細なエラーレポートを生成
                const errorReport = this.generateErrorReport(validationResult);
                
                // 検証結果を含むエラーを作成
                const validationError = new Error(`データ形式が無効です`);
                validationError.validationResult = validationResult;
                validationError.errorReport = errorReport;
                throw validationError;
            }

            // フラット構造のデータを使用
            const flatData = validationResult.flattenedData;

            // 既存データとの重複チェック
            const duplicateCheck = this.checkDuplicates(flatData);
            
            // インポート処理の実行
            const result = await this.executeImport(flatData, duplicateCheck, options);
            
            // データを保存
            if (result.success && this.dataRepository.saveData) {
                this.dataRepository.saveData();
            }
            
            return result;
        } catch (error) {
            console.error('JSONインポートエラー:', error);
            throw error;
        }
    }

    /**
     * ファイル形式を検証
     * @param {File} file - 検証するファイル
     * @returns {boolean} 有効な場合true
     */
    validateFileFormat(file) {
        if (!file) return false;
        
        // ファイル拡張子チェック
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.json')) {
            return false;
        }
        
        // MIMEタイプチェック
        const validMimeTypes = ['application/json', 'text/json', 'text/plain'];
        if (file.type && !validMimeTypes.includes(file.type)) {
            return false;
        }
        
        return true;
    }

    /**
     * ファイルサイズを検証
     * @param {File} file - 検証するファイル
     * @returns {boolean} 有効な場合true
     */
    validateFileSize(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        return file.size <= maxSize;
    }

    /**
     * ファイル内容を読み込み
     * @param {File} file - 読み込むファイル
     * @returns {Promise<string>} ファイル内容
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('ファイルの読み込みに失敗しました'));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * JSON文字列を解析
     * @param {string} jsonString - JSON文字列
     * @returns {Object} 解析されたJSONオブジェクト
     */
    parseJSON(jsonString) {
        try {
            if (!jsonString || typeof jsonString !== 'string') {
                throw new Error('無効なJSON文字列です');
            }
            
            const trimmedJson = jsonString.trim();
            if (trimmedJson.length === 0) {
                throw new Error('空のファイルです');
            }
            
            return JSON.parse(trimmedJson);
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('JSONファイルの形式が正しくありません');
            }
            throw error;
        }
    }

    /**
     * インポートデータの形式を検証
     * @param {Object} data - 検証するデータ
     * @returns {Object} 検証結果
     */
    validateImportData(data) {
        const errors = [];
        const warnings = [];
        
        // JSONスキーマ検証
        const schemaResult = this.validateJSONSchema(data);
        if (!schemaResult.isValid) {
            errors.push(...schemaResult.errors);
            return { isValid: false, errors, warnings: schemaResult.warnings };
        }
        warnings.push(...schemaResult.warnings);

        // フラット構造からネスト構造への変換
        const flattenedData = this.convertNestedToFlat(data);

        // オーダー配列の検証
        if (Array.isArray(flattenedData.orders)) {
            flattenedData.orders.forEach((order, index) => {
                const orderErrors = this.validateDataTypes(order, 'order', index);
                errors.push(...orderErrors);
            });
        }

        // アクティビティ配列の検証
        if (Array.isArray(flattenedData.activities)) {
            flattenedData.activities.forEach((activity, index) => {
                const activityErrors = this.validateDataTypes(activity, 'activity', index);
                errors.push(...activityErrors);
            });
        }

        // データ整合性の検証
        if (Array.isArray(flattenedData.orders) && Array.isArray(flattenedData.activities)) {
            const integrityResult = this.validateDataIntegrity(flattenedData.orders, flattenedData.activities);
            if (!integrityResult.isValid) {
                errors.push(...integrityResult.errors);
            }
            warnings.push(...integrityResult.warnings);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            flattenedData: flattenedData
        };
    }

    /**
     * オーダーデータを検証
     * @param {Object} order - 検証するオーダー
     * @param {number} index - 配列内のインデックス
     * @returns {string[]} エラーメッセージ配列
     */
    validateOrderData(order, index) {
        const errors = [];
        const prefix = `オーダー[${index}]`;

        if (!order || typeof order !== 'object') {
            errors.push(`${prefix}: 無効なオーダーデータです`);
            return errors;
        }

        // 必須フィールドの検証
        if (!order.id || typeof order.id !== 'string' || order.id.trim().length === 0) {
            errors.push(`${prefix}: IDが無効です`);
        }

        if (!order.name || typeof order.name !== 'string' || order.name.trim().length === 0) {
            errors.push(`${prefix}: 名前が無効です`);
        } else if (order.name.length > 100) {
            errors.push(`${prefix}: 名前が長すぎます（100文字以内）`);
        }

        if (!order.createdAt || isNaN(new Date(order.createdAt).getTime())) {
            errors.push(`${prefix}: 作成日時が無効です`);
        }

        return errors;
    }

    /**
     * アクティビティデータを検証
     * @param {Object} activity - 検証するアクティビティ
     * @param {number} index - 配列内のインデックス
     * @returns {string[]} エラーメッセージ配列
     */
    validateActivityData(activity, index) {
        const errors = [];
        const prefix = `アクティビティ[${index}]`;

        if (!activity || typeof activity !== 'object') {
            errors.push(`${prefix}: 無効なアクティビティデータです`);
            return errors;
        }

        // 必須フィールドの検証
        if (!activity.id || typeof activity.id !== 'string' || activity.id.trim().length === 0) {
            errors.push(`${prefix}: IDが無効です`);
        }

        if (!activity.name || typeof activity.name !== 'string' || activity.name.trim().length === 0) {
            errors.push(`${prefix}: 名前が無効です`);
        } else if (activity.name.length > 100) {
            errors.push(`${prefix}: 名前が長すぎます（100文字以内）`);
        }

        if (!activity.orderId || typeof activity.orderId !== 'string' || activity.orderId.trim().length === 0) {
            errors.push(`${prefix}: オーダーIDが無効です`);
        }

        if (!activity.createdAt || isNaN(new Date(activity.createdAt).getTime())) {
            errors.push(`${prefix}: 作成日時が無効です`);
        }

        return errors;
    }

    /**
     * オーダーとアクティビティの関係整合性を検証
     * @param {Object[]} orders - オーダー配列
     * @param {Object[]} activities - アクティビティ配列
     * @returns {string[]} エラーメッセージ配列
     */
    validateRelationships(orders, activities) {
        const errors = [];
        
        // オーダーIDの重複チェック
        const orderIds = orders.map(order => order.id);
        const duplicateOrderIds = orderIds.filter((id, index) => orderIds.indexOf(id) !== index);
        if (duplicateOrderIds.length > 0) {
            errors.push(`重複するオーダーIDが見つかりました: ${duplicateOrderIds.join(', ')}`);
        }

        // アクティビティIDの重複チェック
        const activityIds = activities.map(activity => activity.id);
        const duplicateActivityIds = activityIds.filter((id, index) => activityIds.indexOf(id) !== index);
        if (duplicateActivityIds.length > 0) {
            errors.push(`重複するアクティビティIDが見つかりました: ${duplicateActivityIds.join(', ')}`);
        }

        // アクティビティのオーダーID参照チェック
        const validOrderIds = new Set(orderIds);
        activities.forEach((activity, index) => {
            if (!validOrderIds.has(activity.orderId)) {
                errors.push(`アクティビティ[${index}]: 存在しないオーダーID「${activity.orderId}」を参照しています`);
            }
        });

        return errors;
    }

    /**
     * 既存データとの重複をチェック
     * @param {Object} importData - インポートデータ
     * @returns {Object} 重複チェック結果
     */
    checkDuplicates(importData) {
        const existingOrders = this.dataRepository.getAllOrders();
        const existingActivities = this.dataRepository.getAllActivities();
        
        const duplicateOrders = [];
        const duplicateActivities = [];
        
        // オーダーの重複チェック
        if (importData.orders && Array.isArray(importData.orders)) {
            importData.orders.forEach(importOrder => {
                const existing = existingOrders.find(order => 
                    order.id === importOrder.id || order.name === importOrder.name
                );
                if (existing) {
                    duplicateOrders.push({
                        import: importOrder,
                        existing: existing,
                        type: existing.id === importOrder.id ? 'id' : 'name'
                    });
                }
            });
        }
        
        // アクティビティの重複チェック
        if (importData.activities && Array.isArray(importData.activities)) {
            importData.activities.forEach(importActivity => {
                const existing = existingActivities.find(activity => 
                    activity.id === importActivity.id || 
                    (activity.orderId === importActivity.orderId && activity.name === importActivity.name)
                );
                if (existing) {
                    duplicateActivities.push({
                        import: importActivity,
                        existing: existing,
                        type: existing.id === importActivity.id ? 'id' : 'name'
                    });
                }
            });
        }
        
        return {
            hasDuplicates: duplicateOrders.length > 0 || duplicateActivities.length > 0,
            duplicateOrders: duplicateOrders,
            duplicateActivities: duplicateActivities
        };
    }

    /**
     * インポート処理を実行
     * @param {Object} importData - インポートデータ
     * @param {Object} duplicateCheck - 重複チェック結果
     * @param {Object} options - インポートオプション
     * @returns {Promise<Object>} インポート結果
     */
    async executeImport(importData, duplicateCheck, options) {
        const result = {
            success: true,
            newOrders: 0,
            newActivities: 0,
            skippedOrders: 0,
            skippedActivities: 0,
            updatedOrders: 0,
            updatedActivities: 0,
            errors: []
        };

        try {
            // 重複処理オプションのデフォルト値
            const duplicateHandling = options.duplicateHandling || 'skip';
            
            // オーダーのインポート
            const orderImportResult = await this.importOrders(
                importData.orders, 
                duplicateCheck.duplicateOrders, 
                duplicateHandling
            );
            
            result.newOrders = orderImportResult.created;
            result.skippedOrders = orderImportResult.skipped;
            result.updatedOrders = orderImportResult.updated;
            result.errors.push(...orderImportResult.errors);

            // アクティビティのインポート
            const activityImportResult = await this.importActivities(
                importData.activities, 
                duplicateCheck.duplicateActivities, 
                duplicateHandling
            );
            
            result.newActivities = activityImportResult.created;
            result.skippedActivities = activityImportResult.skipped;
            result.updatedActivities = activityImportResult.updated;
            result.errors.push(...activityImportResult.errors);

            // エラーがある場合は成功フラグを更新
            if (result.errors.length > 0) {
                result.success = false;
            }

            // データを保存
            if (result.success && this.dataRepository.saveData) {
                try {
                    this.dataRepository.saveData();
                    console.log('インポートデータを保存しました');
                } catch (saveError) {
                    console.error('データ保存エラー:', saveError);
                    result.errors.push('データの保存に失敗しました');
                    result.success = false;
                }
            }

            return result;
        } catch (error) {
            result.success = false;
            result.errors.push(error.message);
            return result;
        }
    }

    /**
     * オーダーをインポート
     * @param {Object[]} orders - インポートするオーダー配列
     * @param {Object[]} duplicates - 重複するオーダー配列
     * @param {string} duplicateHandling - 重複処理方法
     * @returns {Promise<Object>} インポート結果
     */
    async importOrders(orders, duplicates, duplicateHandling) {
        const result = { created: 0, skipped: 0, updated: 0, errors: [] };
        const duplicateIds = new Set(duplicates.map(dup => dup.import.id));
        
        for (const order of orders) {
            try {
                if (duplicateIds.has(order.id)) {
                    // 重複処理
                    const duplicate = duplicates.find(dup => dup.import.id === order.id);
                    
                    switch (duplicateHandling) {
                        case 'overwrite':
                            this.dataRepository.updateOrder(order.id, {
                                name: order.name,
                                createdAt: order.createdAt
                            });
                            result.updated++;
                            break;
                        case 'merge':
                            // 既存データを保持し、新しいデータで補完
                            const existingOrder = duplicate.existing;
                            const mergedData = {
                                name: existingOrder.name, // 既存の名前を保持
                                createdAt: existingOrder.createdAt // 既存の作成日時を保持
                            };
                            this.dataRepository.updateOrder(order.id, mergedData);
                            result.updated++;
                            break;
                        case 'skip':
                        default:
                            result.skipped++;
                            break;
                    }
                } else {
                    // 新規作成（インポート用）
                    const success = this.createOrderForImport(order);
                    if (success) {
                        result.created++;
                    } else {
                        result.errors.push(`オーダー「${order.name}」の作成に失敗しました`);
                    }
                }
            } catch (error) {
                result.errors.push(`オーダー「${order.name}」のインポートに失敗: ${error.message}`);
            }
        }
        
        return result;
    }

    /**
     * アクティビティをインポート
     * @param {Object[]} activities - インポートするアクティビティ配列
     * @param {Object[]} duplicates - 重複するアクティビティ配列
     * @param {string} duplicateHandling - 重複処理方法
     * @returns {Promise<Object>} インポート結果
     */
    async importActivities(activities, duplicates, duplicateHandling) {
        const result = { created: 0, skipped: 0, updated: 0, errors: [] };
        const duplicateIds = new Set(duplicates.map(dup => dup.import.id));
        
        for (const activity of activities) {
            try {
                if (duplicateIds.has(activity.id)) {
                    // 重複処理
                    const duplicate = duplicates.find(dup => dup.import.id === activity.id);
                    
                    switch (duplicateHandling) {
                        case 'overwrite':
                            this.dataRepository.updateActivity(activity.id, {
                                name: activity.name,
                                orderId: activity.orderId,
                                createdAt: activity.createdAt
                            });
                            result.updated++;
                            break;
                        case 'merge':
                            // 既存データを保持し、新しいデータで補完
                            const existingActivity = duplicate.existing;
                            const mergedData = {
                                name: existingActivity.name, // 既存の名前を保持
                                orderId: existingActivity.orderId, // 既存のオーダーIDを保持
                                createdAt: existingActivity.createdAt // 既存の作成日時を保持
                            };
                            this.dataRepository.updateActivity(activity.id, mergedData);
                            result.updated++;
                            break;
                        case 'skip':
                        default:
                            result.skipped++;
                            break;
                    }
                } else {
                    // 新規作成（インポート用）
                    const success = this.createActivityForImport(activity);
                    if (success) {
                        result.created++;
                    } else {
                        result.errors.push(`アクティビティ「${activity.name}」の作成に失敗しました`);
                    }
                }
            } catch (error) {
                result.errors.push(`アクティビティ「${activity.name}」のインポートに失敗: ${error.message}`);
            }
        }
        
        return result;
    }

    /**
     * 高度なJSONスキーマ検証
     * @param {Object} data - 検証するデータ
     * @returns {Object} 詳細な検証結果
     */
    validateJSONSchema(data) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            schemaVersion: this.supportedVersion,
            validationDetails: {
                structure: { isValid: true, errors: [] },
                properties: { isValid: true, errors: [] },
                dataTypes: { isValid: true, errors: [] },
                constraints: { isValid: true, errors: [] }
            }
        };

        try {
            // 1. ルートレベルの構造検証
            const structureResult = this.validateRootStructure(data);
            result.validationDetails.structure = structureResult;
            if (!structureResult.isValid) {
                result.isValid = false;
                result.errors.push(...structureResult.errors);
                return result; // 構造が無効な場合は以降の検証をスキップ
            }

            // 2. 必須プロパティの検証
            const propertiesResult = this.validateRequiredProperties(data);
            result.validationDetails.properties = propertiesResult;
            if (!propertiesResult.isValid) {
                result.isValid = false;
                result.errors.push(...propertiesResult.errors);
            }

            // 3. データ型の詳細検証
            const dataTypesResult = this.validateSchemaDataTypes(data);
            result.validationDetails.dataTypes = dataTypesResult;
            if (!dataTypesResult.isValid) {
                result.isValid = false;
                result.errors.push(...dataTypesResult.errors);
            }

            // 4. 制約の検証
            const constraintsResult = this.validateSchemaConstraints(data);
            result.validationDetails.constraints = constraintsResult;
            if (!constraintsResult.isValid) {
                result.isValid = false;
                result.errors.push(...constraintsResult.errors);
            }
            result.warnings.push(...constraintsResult.warnings);

            // 5. バージョン互換性チェック
            const versionResult = this.validateSchemaVersion(data);
            if (versionResult.warnings.length > 0) {
                result.warnings.push(...versionResult.warnings);
            }

            // 6. パフォーマンス警告
            const performanceWarnings = this.generatePerformanceWarnings(data);
            result.warnings.push(...performanceWarnings);

        } catch (error) {
            result.isValid = false;
            result.errors.push(`スキーマ検証中にエラーが発生しました: ${error.message}`);
        }

        return result;
    }

    /**
     * ルート構造の検証
     * @param {any} data - 検証するデータ
     * @returns {Object} 構造検証結果
     */
    validateRootStructure(data) {
        const result = { isValid: true, errors: [] };

        if (data === null || data === undefined) {
            result.isValid = false;
            result.errors.push('データが null または undefined です');
            return result;
        }

        if (typeof data !== 'object') {
            result.isValid = false;
            result.errors.push(`ルートオブジェクトの型が無効です。期待値: object, 実際: ${typeof data}`);
            return result;
        }

        if (Array.isArray(data)) {
            result.isValid = false;
            result.errors.push('ルートは配列ではなくオブジェクトである必要があります');
            return result;
        }

        // 空オブジェクトのチェック
        if (Object.keys(data).length === 0) {
            result.isValid = false;
            result.errors.push('空のオブジェクトです。データが含まれていません');
            return result;
        }

        return result;
    }

    /**
     * 必須プロパティの検証
     * @param {Object} data - 検証するデータ
     * @returns {Object} プロパティ検証結果
     */
    validateRequiredProperties(data) {
        const result = { isValid: true, errors: [] };
        const requiredProperties = ['orders'];
        const optionalProperties = ['version', 'metadata', 'exportedAt'];

        // 必須プロパティの存在確認
        for (const prop of requiredProperties) {
            if (!(prop in data)) {
                result.isValid = false;
                result.errors.push(`必須プロパティ「${prop}」が見つかりません`);
                continue;
            }

            // 配列型の確認
            if (!Array.isArray(data[prop])) {
                result.isValid = false;
                result.errors.push(`プロパティ「${prop}」は配列である必要があります。実際の型: ${typeof data[prop]}`);
                continue;
            }

            // null配列のチェック
            if (data[prop] === null) {
                result.isValid = false;
                result.errors.push(`プロパティ「${prop}」が null です`);
            }
        }

        // 予期しないプロパティのチェック
        const allowedProperties = [...requiredProperties, ...optionalProperties];
        const unexpectedProperties = Object.keys(data).filter(key => !allowedProperties.includes(key));
        
        if (unexpectedProperties.length > 0) {
            // 警告として扱う（エラーではない）
            result.warnings = [`予期しないプロパティが含まれています: ${unexpectedProperties.join(', ')}`];
        }

        return result;
    }

    /**
     * スキーマレベルでのデータ型検証
     * @param {Object} data - 検証するデータ
     * @returns {Object} データ型検証結果
     */
    validateSchemaDataTypes(data) {
        const result = { isValid: true, errors: [] };

        try {
            // オーダー配列の型検証（ネスト構造対応）
            if (data.orders && Array.isArray(data.orders)) {
                data.orders.forEach((order, index) => {
                    const orderTypeResult = this.validateNestedOrderSchemaTypes(order, index);
                    if (!orderTypeResult.isValid) {
                        result.isValid = false;
                        result.errors.push(...orderTypeResult.errors);
                    }
                });
            }

            // オプショナルフィールドの型検証
            if ('version' in data && typeof data.version !== 'string') {
                result.isValid = false;
                result.errors.push(`versionフィールドは文字列である必要があります。実際の型: ${typeof data.version}`);
            }

            if ('exportedAt' in data && typeof data.exportedAt !== 'string') {
                result.isValid = false;
                result.errors.push(`exportedAtフィールドは文字列である必要があります。実際の型: ${typeof data.exportedAt}`);
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`データ型検証中にエラーが発生しました: ${error.message}`);
        }

        return result;
    }

    /**
     * ネスト構造のオーダーのスキーマ型検証
     * @param {any} order - 検証するオーダー
     * @param {number} index - 配列内のインデックス
     * @returns {Object} 型検証結果
     */
    validateNestedOrderSchemaTypes(order, index) {
        const result = { isValid: true, errors: [] };
        const prefix = `オーダー[${index}]`;

        if (!order || typeof order !== 'object' || Array.isArray(order)) {
            result.isValid = false;
            result.errors.push(`${prefix}: オブジェクトである必要があります。実際の型: ${typeof order}`);
            return result;
        }

        // 必須フィールドの型チェック
        const requiredFields = {
            id: 'string',
            name: 'string'
        };

        for (const [field, expectedType] of Object.entries(requiredFields)) {
            if (!(field in order)) {
                result.isValid = false;
                result.errors.push(`${prefix}: 必須フィールド「${field}」が見つかりません`);
            } else if (typeof order[field] !== expectedType) {
                result.isValid = false;
                result.errors.push(`${prefix}.${field}: ${expectedType}型である必要があります。実際の型: ${typeof order[field]}`);
            }
        }

        // activitiesフィールドの検証（オプショナル）
        if ('activities' in order) {
            if (!Array.isArray(order.activities)) {
                result.isValid = false;
                result.errors.push(`${prefix}.activities: 配列である必要があります。実際の型: ${typeof order.activities}`);
            } else {
                // 各アクティビティの型検証
                order.activities.forEach((activity, actIndex) => {
                    const activityTypeResult = this.validateActivitySchemaTypes(activity, actIndex, prefix);
                    if (!activityTypeResult.isValid) {
                        result.isValid = false;
                        result.errors.push(...activityTypeResult.errors);
                    }
                });
            }
        }

        return result;
    }

    /**
     * オーダーのスキーマ型検証（フラット構造用）
     * @param {any} order - 検証するオーダー
     * @param {number} index - 配列内のインデックス
     * @returns {Object} 型検証結果
     */
    validateOrderSchemaTypes(order, index) {
        const result = { isValid: true, errors: [] };
        const prefix = `オーダー[${index}]`;

        if (!order || typeof order !== 'object' || Array.isArray(order)) {
            result.isValid = false;
            result.errors.push(`${prefix}: オブジェクトである必要があります。実際の型: ${typeof order}`);
            return result;
        }

        // 必須フィールドの型チェック
        const requiredFields = {
            id: 'string',
            name: 'string',
            createdAt: 'string'
        };

        for (const [field, expectedType] of Object.entries(requiredFields)) {
            if (!(field in order)) {
                result.isValid = false;
                result.errors.push(`${prefix}: 必須フィールド「${field}」が見つかりません`);
            } else if (typeof order[field] !== expectedType) {
                result.isValid = false;
                result.errors.push(`${prefix}.${field}: ${expectedType}型である必要があります。実際の型: ${typeof order[field]}`);
            }
        }

        return result;
    }

    /**
     * アクティビティのスキーマ型検証
     * @param {any} activity - 検証するアクティビティ
     * @param {number} index - 配列内のインデックス
     * @param {string} parentPrefix - 親要素のプレフィックス（ネスト構造用）
     * @returns {Object} 型検証結果
     */
    validateActivitySchemaTypes(activity, index, parentPrefix = '') {
        const result = { isValid: true, errors: [] };
        const prefix = parentPrefix ? `${parentPrefix}.activities[${index}]` : `アクティビティ[${index}]`;

        if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
            result.isValid = false;
            result.errors.push(`${prefix}: オブジェクトである必要があります。実際の型: ${typeof activity}`);
            return result;
        }

        // 必須フィールドの型チェック（ネスト構造ではorderIdは不要）
        const requiredFields = parentPrefix ? {
            id: 'string',
            name: 'string'
        } : {
            id: 'string',
            name: 'string',
            orderId: 'string',
            createdAt: 'string'
        };

        for (const [field, expectedType] of Object.entries(requiredFields)) {
            if (!(field in activity)) {
                result.isValid = false;
                result.errors.push(`${prefix}: 必須フィールド「${field}」が見つかりません`);
            } else if (typeof activity[field] !== expectedType) {
                result.isValid = false;
                result.errors.push(`${prefix}.${field}: ${expectedType}型である必要があります。実際の型: ${typeof activity[field]}`);
            }
        }

        return result;
    }

    /**
     * スキーマ制約の検証
     * @param {Object} data - 検証するデータ
     * @returns {Object} 制約検証結果
     */
    validateSchemaConstraints(data) {
        const result = { isValid: true, errors: [], warnings: [] };

        try {
            // データサイズの制約
            const dataSize = JSON.stringify(data).length;
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            if (dataSize > maxSize) {
                result.isValid = false;
                result.errors.push(`データサイズが制限を超えています。最大: ${this.formatFileSize(maxSize)}, 実際: ${this.formatFileSize(dataSize)}`);
            } else if (dataSize > 5 * 1024 * 1024) { // 5MB
                result.warnings.push(`データサイズが大きいため、処理に時間がかかる可能性があります: ${this.formatFileSize(dataSize)}`);
            }

            // 配列要素数の制約
            if (data.orders) {
                const orderCount = data.orders.length;
                if (orderCount > 10000) {
                    result.isValid = false;
                    result.errors.push(`オーダー数が制限を超えています。最大: 10,000件, 実際: ${orderCount}件`);
                } else if (orderCount > 1000) {
                    result.warnings.push(`オーダー数が多いため、処理に時間がかかる可能性があります: ${orderCount}件`);
                }
            }

            if (data.activities) {
                const activityCount = data.activities.length;
                if (activityCount > 50000) {
                    result.isValid = false;
                    result.errors.push(`アクティビティ数が制限を超えています。最大: 50,000件, 実際: ${activityCount}件`);
                } else if (activityCount > 5000) {
                    result.warnings.push(`アクティビティ数が多いため、処理に時間がかかる可能性があります: ${activityCount}件`);
                }
            }

            // 文字列長の制約チェック
            const stringConstraintResult = this.validateStringConstraints(data);
            if (!stringConstraintResult.isValid) {
                result.isValid = false;
                result.errors.push(...stringConstraintResult.errors);
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`制約検証中にエラーが発生しました: ${error.message}`);
        }

        return result;
    }

    /**
     * 文字列制約の検証
     * @param {Object} data - 検証するデータ
     * @returns {Object} 文字列制約検証結果
     */
    validateStringConstraints(data) {
        const result = { isValid: true, errors: [] };

        // オーダーの文字列制約
        if (data.orders && Array.isArray(data.orders)) {
            data.orders.forEach((order, index) => {
                if (order.id && order.id.length > 100) {
                    result.isValid = false;
                    result.errors.push(`オーダー[${index}].id: 文字数制限を超えています（最大100文字）`);
                }
                if (order.name && order.name.length > 200) {
                    result.isValid = false;
                    result.errors.push(`オーダー[${index}].name: 文字数制限を超えています（最大200文字）`);
                }
            });
        }

        // アクティビティの文字列制約
        if (data.activities && Array.isArray(data.activities)) {
            data.activities.forEach((activity, index) => {
                if (activity.id && activity.id.length > 100) {
                    result.isValid = false;
                    result.errors.push(`アクティビティ[${index}].id: 文字数制限を超えています（最大100文字）`);
                }
                if (activity.name && activity.name.length > 200) {
                    result.isValid = false;
                    result.errors.push(`アクティビティ[${index}].name: 文字数制限を超えています（最大200文字）`);
                }
                if (activity.orderId && activity.orderId.length > 100) {
                    result.isValid = false;
                    result.errors.push(`アクティビティ[${index}].orderId: 文字数制限を超えています（最大100文字）`);
                }
            });
        }

        return result;
    }

    /**
     * スキーマバージョンの検証
     * @param {Object} data - 検証するデータ
     * @returns {Object} バージョン検証結果
     */
    validateSchemaVersion(data) {
        const result = { isValid: true, warnings: [] };

        if ('version' in data) {
            const version = data.version;
            if (version !== this.supportedVersion) {
                result.warnings.push(`スキーマバージョンが異なります。サポート版: ${this.supportedVersion}, ファイル版: ${version}`);
            }
        } else {
            result.warnings.push('スキーマバージョンが指定されていません。最新版として処理します');
        }

        return result;
    }

    /**
     * パフォーマンス警告の生成
     * @param {Object} data - 検証するデータ
     * @returns {string[]} 警告メッセージ配列
     */
    generatePerformanceWarnings(data) {
        const warnings = [];

        // メモリ使用量の推定
        const estimatedMemoryUsage = this.estimateMemoryUsage(data);
        if (estimatedMemoryUsage > 50 * 1024 * 1024) { // 50MB
            warnings.push(`推定メモリ使用量が大きいです: ${this.formatFileSize(estimatedMemoryUsage)}`);
        }

        // 処理時間の推定
        const estimatedProcessingTime = this.estimateProcessingTime(data);
        if (estimatedProcessingTime > 10000) { // 10秒
            warnings.push(`処理時間が長くなる可能性があります: 約${Math.round(estimatedProcessingTime / 1000)}秒`);
        }

        return warnings;
    }

    /**
     * メモリ使用量の推定
     * @param {Object} data - データ
     * @returns {number} 推定メモリ使用量（バイト）
     */
    estimateMemoryUsage(data) {
        // 簡易的な推定（実際のJSONサイズの3-5倍程度）
        const jsonSize = JSON.stringify(data).length;
        return jsonSize * 4;
    }

    /**
     * 処理時間の推定
     * @param {Object} data - データ
     * @returns {number} 推定処理時間（ミリ秒）
     */
    estimateProcessingTime(data) {
        // 簡易的な推定（要素数に基づく）
        const orderCount = data.orders ? data.orders.length : 0;
        const activityCount = data.activities ? data.activities.length : 0;
        
        // 1要素あたり約1msと仮定
        return (orderCount + activityCount) * 1;
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
     * 関係整合性の詳細チェック
     * @param {Object[]} orders - オーダー配列
     * @param {Object[]} activities - アクティビティ配列
     * @returns {Object} 整合性チェック結果
     */
    validateDataIntegrity(orders, activities) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            orphanedActivities: [],
            circularReferences: [],
            duplicateAnalysis: {
                orderIds: [],
                activityIds: [],
                orderNames: [],
                activityNames: []
            },
            relationshipAnalysis: {
                totalRelationships: 0,
                validRelationships: 0,
                invalidRelationships: 0,
                orderActivityCounts: new Map()
            },
            integrityScore: 0
        };

        try {
            // 1. ID重複の詳細分析
            const idDuplicateResult = this.analyzeIdDuplicates(orders, activities);
            result.duplicateAnalysis = idDuplicateResult;
            if (!idDuplicateResult.isValid) {
                result.isValid = false;
                result.errors.push(...idDuplicateResult.errors);
            }

            // 2. 関係性の詳細分析
            const relationshipResult = this.analyzeRelationships(orders, activities);
            result.relationshipAnalysis = relationshipResult;
            result.orphanedActivities = relationshipResult.orphanedActivities;
            if (!relationshipResult.isValid) {
                result.isValid = false;
                result.errors.push(...relationshipResult.errors);
            }

            // 3. 名前重複の分析（警告レベル）
            const nameAnalysisResult = this.analyzeNameDuplicates(orders, activities);
            result.warnings.push(...nameAnalysisResult.warnings);

            // 4. データ品質の分析
            const qualityResult = this.analyzeDataQuality(orders, activities);
            result.warnings.push(...qualityResult.warnings);

            // 5. 循環参照のチェック（将来の拡張用）
            const circularResult = this.checkCircularReferences(orders, activities);
            result.circularReferences = circularResult.circularReferences;
            if (!circularResult.isValid) {
                result.isValid = false;
                result.errors.push(...circularResult.errors);
            }

            // 6. 整合性スコアの計算
            result.integrityScore = this.calculateIntegrityScore(result);

            // 7. 詳細な統計情報の生成
            result.statistics = this.generateIntegrityStatistics(orders, activities, result);

        } catch (error) {
            result.isValid = false;
            result.errors.push(`整合性チェック中にエラーが発生しました: ${error.message}`);
        }

        return result;
    }

    /**
     * ID重複の詳細分析
     * @param {Object[]} orders - オーダー配列
     * @param {Object[]} activities - アクティビティ配列
     * @returns {Object} ID重複分析結果
     */
    analyzeIdDuplicates(orders, activities) {
        const result = {
            isValid: true,
            errors: [],
            orderIds: [],
            activityIds: []
        };

        // オーダーIDの重複分析
        const orderIdMap = new Map();
        const orderIdCounts = new Map();

        orders.forEach((order, index) => {
            const id = order.id;
            
            // カウント
            orderIdCounts.set(id, (orderIdCounts.get(id) || 0) + 1);
            
            if (orderIdMap.has(id)) {
                // 重複発見
                const existingIndex = orderIdMap.get(id);
                const duplicateInfo = {
                    id: id,
                    indices: [existingIndex, index],
                    names: [orders[existingIndex].name, order.name],
                    severity: 'error'
                };
                
                result.orderIds.push(duplicateInfo);
                result.isValid = false;
            } else {
                orderIdMap.set(id, index);
            }
        });

        // アクティビティIDの重複分析
        const activityIdMap = new Map();
        const activityIdCounts = new Map();

        activities.forEach((activity, index) => {
            const id = activity.id;
            
            // カウント
            activityIdCounts.set(id, (activityIdCounts.get(id) || 0) + 1);
            
            if (activityIdMap.has(id)) {
                // 重複発見
                const existingIndex = activityIdMap.get(id);
                const duplicateInfo = {
                    id: id,
                    indices: [existingIndex, index],
                    names: [activities[existingIndex].name, activity.name],
                    orderIds: [activities[existingIndex].orderId, activity.orderId],
                    severity: 'error'
                };
                
                result.activityIds.push(duplicateInfo);
                result.isValid = false;
            } else {
                activityIdMap.set(id, index);
            }
        });

        // エラーメッセージの生成
        if (result.orderIds.length > 0) {
            const duplicateIds = result.orderIds.map(dup => dup.id);
            result.errors.push(`重複するオーダーID（${result.orderIds.length}件）: ${duplicateIds.join(', ')}`);
        }

        if (result.activityIds.length > 0) {
            const duplicateIds = result.activityIds.map(dup => dup.id);
            result.errors.push(`重複するアクティビティID（${result.activityIds.length}件）: ${duplicateIds.join(', ')}`);
        }

        return result;
    }

    /**
     * 関係性の詳細分析
     * @param {Object[]} orders - オーダー配列
     * @param {Object[]} activities - アクティビティ配列
     * @returns {Object} 関係性分析結果
     */
    analyzeRelationships(orders, activities) {
        const result = {
            isValid: true,
            errors: [],
            orphanedActivities: [],
            totalRelationships: activities.length,
            validRelationships: 0,
            invalidRelationships: 0,
            orderActivityCounts: new Map(),
            relationshipDetails: []
        };

        // オーダーIDのセットを作成
        const validOrderIds = new Set(orders.map(order => order.id));
        
        // 各オーダーのアクティビティ数を初期化
        orders.forEach(order => {
            result.orderActivityCounts.set(order.id, 0);
        });

        // アクティビティの関係性をチェック
        activities.forEach((activity, index) => {
            const relationshipDetail = {
                activityIndex: index,
                activityId: activity.id,
                activityName: activity.name,
                orderId: activity.orderId,
                isValid: false,
                issues: []
            };

            if (!activity.orderId) {
                relationshipDetail.issues.push('オーダーIDが空です');
                result.invalidRelationships++;
            } else if (!validOrderIds.has(activity.orderId)) {
                // 孤立したアクティビティ
                const orphanedActivity = {
                    index: index,
                    activityId: activity.id,
                    activityName: activity.name,
                    missingOrderId: activity.orderId,
                    severity: 'error'
                };
                
                result.orphanedActivities.push(orphanedActivity);
                relationshipDetail.issues.push(`存在しないオーダーID「${activity.orderId}」を参照`);
                result.invalidRelationships++;
                result.isValid = false;
            } else {
                // 有効な関係
                relationshipDetail.isValid = true;
                result.validRelationships++;
                
                // オーダーのアクティビティ数をカウント
                const currentCount = result.orderActivityCounts.get(activity.orderId) || 0;
                result.orderActivityCounts.set(activity.orderId, currentCount + 1);
            }

            result.relationshipDetails.push(relationshipDetail);
        });

        // エラーメッセージの生成
        if (result.orphanedActivities.length > 0) {
            result.errors.push(`存在しないオーダーを参照するアクティビティが${result.orphanedActivities.length}件見つかりました`);
            
            // 詳細なエラー情報
            result.orphanedActivities.forEach(orphaned => {
                result.errors.push(`  - アクティビティ「${orphaned.activityName}」(ID: ${orphaned.activityId}) → 存在しないオーダーID「${orphaned.missingOrderId}」`);
            });
        }

        // 空のオーダーの警告
        const emptyOrders = [];
        result.orderActivityCounts.forEach((count, orderId) => {
            if (count === 0) {
                const order = orders.find(o => o.id === orderId);
                emptyOrders.push({
                    orderId: orderId,
                    orderName: order ? order.name : '不明'
                });
            }
        });

        if (emptyOrders.length > 0) {
            result.warnings = [`アクティビティが関連付けられていないオーダーが${emptyOrders.length}件あります`];
        }

        return result;
    }

    /**
     * 名前重複の分析
     * @param {Object[]} orders - オーダー配列
     * @param {Object[]} activities - アクティビティ配列
     * @returns {Object} 名前重複分析結果
     */
    analyzeNameDuplicates(orders, activities) {
        const result = {
            warnings: [],
            orderNames: [],
            activityNames: []
        };

        // オーダー名の重複チェック
        const orderNameMap = new Map();
        orders.forEach((order, index) => {
            const normalizedName = order.name.trim().toLowerCase();
            
            if (orderNameMap.has(normalizedName)) {
                const existingIndex = orderNameMap.get(normalizedName);
                const duplicateInfo = {
                    name: order.name,
                    indices: [existingIndex, index],
                    severity: 'warning'
                };
                
                result.orderNames.push(duplicateInfo);
                result.warnings.push(`オーダー名「${order.name}」が重複しています（インデックス: ${existingIndex}, ${index}）`);
            } else {
                orderNameMap.set(normalizedName, index);
            }
        });

        // 同一オーダー内でのアクティビティ名重複チェック
        const activityNamesByOrder = new Map();
        activities.forEach((activity, index) => {
            const orderId = activity.orderId;
            const normalizedName = activity.name.trim().toLowerCase();
            
            if (!activityNamesByOrder.has(orderId)) {
                activityNamesByOrder.set(orderId, new Map());
            }
            
            const orderActivities = activityNamesByOrder.get(orderId);
            if (orderActivities.has(normalizedName)) {
                const existingIndex = orderActivities.get(normalizedName);
                const duplicateInfo = {
                    name: activity.name,
                    orderId: orderId,
                    indices: [existingIndex, index],
                    severity: 'warning'
                };
                
                result.activityNames.push(duplicateInfo);
                result.warnings.push(`オーダー「${orderId}」内でアクティビティ名「${activity.name}」が重複しています（インデックス: ${existingIndex}, ${index}）`);
            } else {
                orderActivities.set(normalizedName, index);
            }
        });

        return result;
    }

    /**
     * データ品質の分析
     * @param {Object[]} orders - オーダー配列
     * @param {Object[]} activities - アクティビティ配列
     * @returns {Object} データ品質分析結果
     */
    analyzeDataQuality(orders, activities) {
        const result = {
            warnings: [],
            qualityIssues: []
        };

        // 空の名前やIDのチェック
        orders.forEach((order, index) => {
            if (!order.name || order.name.trim().length === 0) {
                result.warnings.push(`オーダー[${index}]: 名前が空です`);
            }
            if (!order.id || order.id.trim().length === 0) {
                result.warnings.push(`オーダー[${index}]: IDが空です`);
            }
        });

        activities.forEach((activity, index) => {
            if (!activity.name || activity.name.trim().length === 0) {
                result.warnings.push(`アクティビティ[${index}]: 名前が空です`);
            }
            if (!activity.id || activity.id.trim().length === 0) {
                result.warnings.push(`アクティビティ[${index}]: IDが空です`);
            }
        });

        // 異常に長い名前のチェック
        const maxReasonableLength = 50;
        orders.forEach((order, index) => {
            if (order.name && order.name.length > maxReasonableLength) {
                result.warnings.push(`オーダー[${index}]: 名前が異常に長いです（${order.name.length}文字）`);
            }
        });

        activities.forEach((activity, index) => {
            if (activity.name && activity.name.length > maxReasonableLength) {
                result.warnings.push(`アクティビティ[${index}]: 名前が異常に長いです（${activity.name.length}文字）`);
            }
        });

        // 日付の妥当性チェック
        const now = new Date();
        const minDate = new Date('2000-01-01');
        const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1年後まで

        orders.forEach((order, index) => {
            if (order.createdAt) {
                const date = new Date(order.createdAt);
                if (date < minDate || date > maxDate) {
                    result.warnings.push(`オーダー[${index}]: 作成日時が異常です（${order.createdAt}）`);
                }
            }
        });

        activities.forEach((activity, index) => {
            if (activity.createdAt) {
                const date = new Date(activity.createdAt);
                if (date < minDate || date > maxDate) {
                    result.warnings.push(`アクティビティ[${index}]: 作成日時が異常です（${activity.createdAt}）`);
                }
            }
        });

        return result;
    }

    /**
     * 循環参照のチェック（将来の拡張用）
     * @param {Object[]} orders - オーダー配列
     * @param {Object[]} activities - アクティビティ配列
     * @returns {Object} 循環参照チェック結果
     */
    checkCircularReferences(orders, activities) {
        const result = {
            isValid: true,
            errors: [],
            circularReferences: []
        };

        // 現在のスキーマでは循環参照は発生しないが、将来の拡張に備えて実装
        // 例：オーダー間の親子関係が追加された場合など

        return result;
    }

    /**
     * 整合性スコアの計算
     * @param {Object} integrityResult - 整合性チェック結果
     * @returns {number} 整合性スコア（0-100）
     */
    calculateIntegrityScore(integrityResult) {
        let score = 100;
        
        // エラーによる減点
        score -= integrityResult.errors.length * 10;
        
        // 警告による減点
        score -= integrityResult.warnings.length * 2;
        
        // 孤立したアクティビティによる減点
        score -= integrityResult.orphanedActivities.length * 5;
        
        // 重複による減点
        if (integrityResult.duplicateAnalysis) {
            score -= integrityResult.duplicateAnalysis.orderIds.length * 8;
            score -= integrityResult.duplicateAnalysis.activityIds.length * 8;
        }
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * 整合性統計情報の生成
     * @param {Object[]} orders - オーダー配列
     * @param {Object[]} activities - アクティビティ配列
     * @param {Object} integrityResult - 整合性チェック結果
     * @returns {Object} 統計情報
     */
    generateIntegrityStatistics(orders, activities, integrityResult) {
        return {
            totalOrders: orders.length,
            totalActivities: activities.length,
            validRelationships: integrityResult.relationshipAnalysis.validRelationships,
            invalidRelationships: integrityResult.relationshipAnalysis.invalidRelationships,
            relationshipValidityRate: integrityResult.relationshipAnalysis.totalRelationships > 0 
                ? (integrityResult.relationshipAnalysis.validRelationships / integrityResult.relationshipAnalysis.totalRelationships * 100).toFixed(2)
                : 100,
            duplicateOrderIds: integrityResult.duplicateAnalysis.orderIds.length,
            duplicateActivityIds: integrityResult.duplicateAnalysis.activityIds.length,
            orphanedActivities: integrityResult.orphanedActivities.length,
            integrityScore: integrityResult.integrityScore,
            averageActivitiesPerOrder: orders.length > 0 ? (activities.length / orders.length).toFixed(2) : 0
        };
    }

    /**
     * データ型の詳細検証
     * @param {Object} item - 検証するアイテム
     * @param {string} type - アイテムタイプ（'order' または 'activity'）
     * @param {number} index - 配列内のインデックス
     * @returns {string[]} エラーメッセージ配列
     */
    validateDataTypes(item, type, index) {
        const errors = [];
        const prefix = `${type === 'order' ? 'オーダー' : 'アクティビティ'}[${index}]`;

        // 基本構造チェック
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            errors.push(`${prefix}: 無効なデータ構造です`);
            return errors;
        }

        // ID検証
        if (!this.validateId(item.id)) {
            errors.push(`${prefix}: IDが無効です（空文字、null、または不正な文字が含まれています）`);
        }

        // 名前検証
        if (!this.validateName(item.name)) {
            errors.push(`${prefix}: 名前が無効です（空文字、null、または長すぎます）`);
        }

        // 作成日時検証
        if (!this.validateDateTime(item.createdAt)) {
            errors.push(`${prefix}: 作成日時が無効です（不正な日時形式です）`);
        }

        // アクティビティ固有の検証
        if (type === 'activity') {
            if (!this.validateId(item.orderId)) {
                errors.push(`${prefix}: オーダーIDが無効です`);
            }
        }

        // 追加プロパティの検証（予期しないプロパティの警告）
        const expectedProperties = type === 'order' 
            ? ['id', 'name', 'createdAt']
            : ['id', 'name', 'orderId', 'createdAt'];
        
        const unexpectedProperties = Object.keys(item).filter(key => !expectedProperties.includes(key));
        if (unexpectedProperties.length > 0) {
            errors.push(`${prefix}: 予期しないプロパティが含まれています: ${unexpectedProperties.join(', ')}`);
        }

        return errors;
    }

    /**
     * ID形式の検証
     * @param {any} id - 検証するID
     * @returns {boolean} 有効な場合true
     */
    validateId(id) {
        if (!id || typeof id !== 'string') return false;
        
        const trimmedId = id.trim();
        if (trimmedId.length === 0) return false;
        if (trimmedId.length > 100) return false;
        
        // 不正な文字のチェック（制御文字など）
        if (/[\x00-\x1F\x7F]/.test(trimmedId)) return false;
        
        return true;
    }

    /**
     * 名前形式の検証
     * @param {any} name - 検証する名前
     * @returns {boolean} 有効な場合true
     */
    validateName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const trimmedName = name.trim();
        if (trimmedName.length === 0) return false;
        if (trimmedName.length > 100) return false;
        
        return true;
    }

    /**
     * 日時形式の検証
     * @param {any} dateTime - 検証する日時
     * @returns {boolean} 有効な場合true
     */
    validateDateTime(dateTime) {
        if (!dateTime || typeof dateTime !== 'string') return false;
        
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) return false;
        
        // 妥当な範囲の日時かチェック（1900年〜2100年）
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) return false;
        
        return true;
    }

    /**
     * エラーメッセージを分類
     * @param {string[]} errors - エラーメッセージ配列
     * @returns {Object} 分類されたエラー
     */
    categorizeErrors(errors) {
        const categories = {
            structural: [],
            validation: [],
            integrity: [],
            format: []
        };

        errors.forEach(error => {
            if (error.includes('構造') || error.includes('プロパティ')) {
                categories.structural.push(error);
            } else if (error.includes('重複') || error.includes('参照') || error.includes('孤立')) {
                categories.integrity.push(error);
            } else if (error.includes('形式') || error.includes('無効')) {
                categories.format.push(error);
            } else {
                categories.validation.push(error);
            }
        });

        return categories;
    }

    /**
     * 詳細なエラーレポートを生成
     * @param {Object} validationResult - 検証結果
     * @returns {Object} 構造化されたエラーレポート
     */
    generateErrorReport(validationResult) {
        const report = {
            isValid: validationResult.isValid,
            summary: {
                totalErrors: validationResult.errors ? validationResult.errors.length : 0,
                totalWarnings: validationResult.warnings ? validationResult.warnings.length : 0,
                severity: this.determineSeverity(validationResult)
            },
            categories: {},
            recommendations: [],
            textReport: '',
            htmlReport: ''
        };

        if (validationResult.isValid) {
            report.summary.message = 'データは有効です。';
            report.textReport = 'データは有効です。';
            return report;
        }

        // エラーの分類
        const categorizedErrors = this.categorizeErrors(validationResult.errors || []);
        report.categories = categorizedErrors;

        // 推奨事項の生成
        report.recommendations = this.generateRecommendations(validationResult, categorizedErrors);

        // テキストレポートの生成
        report.textReport = this.generateTextReport(validationResult, categorizedErrors, report.recommendations);

        // HTMLレポートの生成
        report.htmlReport = this.generateHtmlReport(validationResult, categorizedErrors, report.recommendations);

        return report;
    }

    /**
     * エラーの重要度を判定
     * @param {Object} validationResult - 検証結果
     * @returns {string} 重要度レベル
     */
    determineSeverity(validationResult) {
        if (!validationResult.errors || validationResult.errors.length === 0) {
            return validationResult.warnings && validationResult.warnings.length > 0 ? 'warning' : 'success';
        }

        const errorCount = validationResult.errors.length;
        if (errorCount >= 10) return 'critical';
        if (errorCount >= 5) return 'high';
        if (errorCount >= 1) return 'medium';
        return 'low';
    }

    /**
     * 推奨事項を生成
     * @param {Object} validationResult - 検証結果
     * @param {Object} categorizedErrors - 分類されたエラー
     * @returns {Object[]} 推奨事項配列
     */
    generateRecommendations(validationResult, categorizedErrors) {
        const recommendations = [];

        // 構造エラーに対する推奨事項
        if (categorizedErrors.structural.length > 0) {
            recommendations.push({
                category: 'structural',
                priority: 'high',
                title: 'データ構造の修正',
                description: 'JSONファイルの基本構造を確認してください',
                actions: [
                    'サンプルファイルをダウンロードして形式を確認',
                    'JSONバリデーターでファイルの構文をチェック',
                    '必須プロパティ（orders、activities）が含まれているか確認'
                ]
            });
        }

        // 形式エラーに対する推奨事項
        if (categorizedErrors.format.length > 0) {
            recommendations.push({
                category: 'format',
                priority: 'high',
                title: 'データ形式の修正',
                description: 'フィールドの形式やデータ型を確認してください',
                actions: [
                    'ID、名前、作成日時などの必須フィールドを確認',
                    '文字数制限（ID: 100文字、名前: 200文字）を確認',
                    '日時形式がISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）になっているか確認'
                ]
            });
        }

        // 整合性エラーに対する推奨事項
        if (categorizedErrors.integrity.length > 0) {
            recommendations.push({
                category: 'integrity',
                priority: 'critical',
                title: 'データ整合性の修正',
                description: 'データ間の関係や重複を確認してください',
                actions: [
                    'アクティビティのorderIdが存在するオーダーのIDを参照しているか確認',
                    'ID の重複がないか確認',
                    '孤立したアクティビティ（存在しないオーダーを参照）を修正'
                ]
            });
        }

        // 検証エラーに対する推奨事項
        if (categorizedErrors.validation.length > 0) {
            recommendations.push({
                category: 'validation',
                priority: 'medium',
                title: 'データ検証の修正',
                description: 'データの妥当性を確認してください',
                actions: [
                    '空の値や null 値がないか確認',
                    '不正な文字が含まれていないか確認',
                    'データ型が正しいか確認（文字列、数値など）'
                ]
            });
        }

        // 警告に対する推奨事項
        if (validationResult.warnings && validationResult.warnings.length > 0) {
            recommendations.push({
                category: 'warning',
                priority: 'low',
                title: 'データ品質の改善',
                description: '警告事項を確認して、必要に応じて修正してください',
                actions: [
                    '名前の重複を確認（必要に応じて修正）',
                    'データサイズが大きい場合は分割を検討',
                    '異常に長い名前や古い日付を確認'
                ]
            });
        }

        // 一般的な推奨事項
        recommendations.push({
            category: 'general',
            priority: 'low',
            title: '一般的な対処法',
            description: '問題が解決しない場合の対処法',
            actions: [
                'ファイルをUTF-8エンコーディングで保存し直す',
                'データを小さな単位に分割してインポートを試す',
                'サンプルファイルを参考に新しいファイルを作成する'
            ]
        });

        return recommendations;
    }

    /**
     * テキスト形式のレポートを生成
     * @param {Object} validationResult - 検証結果
     * @param {Object} categorizedErrors - 分類されたエラー
     * @param {Object[]} recommendations - 推奨事項
     * @returns {string} テキストレポート
     */
    generateTextReport(validationResult, categorizedErrors, recommendations) {
        let report = 'データ検証エラーレポート\n';
        report += '=' .repeat(50) + '\n\n';

        // サマリー
        report += `エラー数: ${validationResult.errors.length}\n`;
        report += `警告数: ${validationResult.warnings ? validationResult.warnings.length : 0}\n`;
        report += `重要度: ${this.determineSeverity(validationResult)}\n\n`;

        // エラー詳細
        if (categorizedErrors.structural.length > 0) {
            report += '【構造エラー】\n';
            categorizedErrors.structural.forEach((error, index) => {
                report += `${index + 1}. ${error}\n`;
            });
            report += '\n';
        }

        if (categorizedErrors.format.length > 0) {
            report += '【形式エラー】\n';
            categorizedErrors.format.forEach((error, index) => {
                report += `${index + 1}. ${error}\n`;
            });
            report += '\n';
        }

        if (categorizedErrors.integrity.length > 0) {
            report += '【整合性エラー】\n';
            categorizedErrors.integrity.forEach((error, index) => {
                report += `${index + 1}. ${error}\n`;
            });
            report += '\n';
        }

        if (categorizedErrors.validation.length > 0) {
            report += '【検証エラー】\n';
            categorizedErrors.validation.forEach((error, index) => {
                report += `${index + 1}. ${error}\n`;
            });
            report += '\n';
        }

        // 警告
        if (validationResult.warnings && validationResult.warnings.length > 0) {
            report += '【警告】\n';
            validationResult.warnings.forEach((warning, index) => {
                report += `${index + 1}. ${warning}\n`;
            });
            report += '\n';
        }

        // 推奨事項
        report += '【推奨事項】\n';
        recommendations.forEach((rec, index) => {
            if (rec.priority === 'critical' || rec.priority === 'high') {
                report += `${index + 1}. ${rec.title} (${rec.priority})\n`;
                report += `   ${rec.description}\n`;
                rec.actions.forEach(action => {
                    report += `   - ${action}\n`;
                });
                report += '\n';
            }
        });

        return report;
    }

    /**
     * HTML形式のレポートを生成
     * @param {Object} validationResult - 検証結果
     * @param {Object} categorizedErrors - 分類されたエラー
     * @param {Object[]} recommendations - 推奨事項
     * @returns {string} HTMLレポート
     */
    generateHtmlReport(validationResult, categorizedErrors, recommendations) {
        let html = '<div class="validation-report">';
        
        // ヘッダー
        html += '<div class="report-header">';
        html += '<h3>データ検証レポート</h3>';
        html += `<div class="report-summary ${this.determineSeverity(validationResult)}">`;
        html += `<span class="error-count">エラー: ${validationResult.errors.length}件</span>`;
        html += `<span class="warning-count">警告: ${validationResult.warnings ? validationResult.warnings.length : 0}件</span>`;
        html += '</div>';
        html += '</div>';

        // エラー詳細
        if (validationResult.errors.length > 0) {
            html += '<div class="error-details">';
            
            if (categorizedErrors.structural.length > 0) {
                html += this.generateErrorCategoryHtml('構造エラー', categorizedErrors.structural, 'structural');
            }
            
            if (categorizedErrors.format.length > 0) {
                html += this.generateErrorCategoryHtml('形式エラー', categorizedErrors.format, 'format');
            }
            
            if (categorizedErrors.integrity.length > 0) {
                html += this.generateErrorCategoryHtml('整合性エラー', categorizedErrors.integrity, 'integrity');
            }
            
            if (categorizedErrors.validation.length > 0) {
                html += this.generateErrorCategoryHtml('検証エラー', categorizedErrors.validation, 'validation');
            }
            
            html += '</div>';
        }

        // 警告
        if (validationResult.warnings && validationResult.warnings.length > 0) {
            html += '<div class="warning-details">';
            html += '<h4 class="category-title warning">⚠️ 警告</h4>';
            html += '<ul class="error-list warning">';
            validationResult.warnings.forEach(warning => {
                html += `<li>${this.escapeHtml(warning)}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // 推奨事項
        html += '<div class="recommendations">';
        html += '<h4>🔧 推奨事項</h4>';
        recommendations.forEach(rec => {
            if (rec.priority === 'critical' || rec.priority === 'high') {
                html += `<div class="recommendation ${rec.priority}">`;
                html += `<h5>${rec.title} <span class="priority">(${rec.priority})</span></h5>`;
                html += `<p>${rec.description}</p>`;
                html += '<ul>';
                rec.actions.forEach(action => {
                    html += `<li>${this.escapeHtml(action)}</li>`;
                });
                html += '</ul>';
                html += '</div>';
            }
        });
        html += '</div>';

        html += '</div>';
        return html;
    }

    /**
     * エラーカテゴリのHTMLを生成
     * @param {string} title - カテゴリタイトル
     * @param {string[]} errors - エラー配列
     * @param {string} category - カテゴリ名
     * @returns {string} カテゴリHTML
     */
    generateErrorCategoryHtml(title, errors, category) {
        const icons = {
            structural: '🏗️',
            format: '📝',
            integrity: '🔗',
            validation: '✅'
        };

        let html = `<div class="error-category ${category}">`;
        html += `<h4 class="category-title ${category}">${icons[category]} ${title}</h4>`;
        html += `<ul class="error-list ${category}">`;
        errors.forEach(error => {
            html += `<li>${this.escapeHtml(error)}</li>`;
        });
        html += '</ul>';
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
     * 検証結果のサマリーを生成
     * @param {Object} validationResult - 検証結果
     * @returns {Object} サマリー情報
     */
    generateValidationSummary(validationResult) {
        const summary = {
            isValid: validationResult.isValid,
            totalIssues: (validationResult.errors ? validationResult.errors.length : 0) + 
                        (validationResult.warnings ? validationResult.warnings.length : 0),
            severity: this.determineSeverity(validationResult),
            categories: {},
            recommendations: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0
            }
        };

        // カテゴリ別の集計
        if (validationResult.errors) {
            const categorized = this.categorizeErrors(validationResult.errors);
            summary.categories = {
                structural: categorized.structural.length,
                format: categorized.format.length,
                integrity: categorized.integrity.length,
                validation: categorized.validation.length
            };
        }

        // 推奨事項の優先度別集計
        const recommendations = this.generateRecommendations(validationResult, summary.categories);
        recommendations.forEach(rec => {
            summary.recommendations[rec.priority]++;
        });

        return summary;
    }

    /**
     * ネスト構造をフラット構造に変換
     * @param {Object} nestedData - ネスト構造のデータ
     * @returns {Object} フラット構造のデータ
     */
    convertNestedToFlat(nestedData) {
        const flatData = {
            orders: [],
            activities: []
        };

        if (!nestedData.orders || !Array.isArray(nestedData.orders)) {
            return flatData;
        }

        const currentTime = new Date().toISOString();

        nestedData.orders.forEach((order, index) => {
            // オーダーの基本検証
            if (!order || typeof order !== 'object') {
                console.warn(`オーダー[${index}]が無効です:`, order);
                return;
            }

            // オーダーをフラット構造に追加
            const flatOrder = {
                id: order.id || `generated_order_${index}`,
                name: order.name || `オーダー${index}`,
                createdAt: order.createdAt || currentTime
            };
            flatData.orders.push(flatOrder);

            // ネストされたアクティビティをフラット構造に変換
            if (order.activities && Array.isArray(order.activities)) {
                order.activities.forEach((activity, actIndex) => {
                    // アクティビティの基本検証
                    if (!activity || typeof activity !== 'object') {
                        console.warn(`アクティビティ[${index}.${actIndex}]が無効です:`, activity);
                        return;
                    }

                    const flatActivity = {
                        id: activity.id || `generated_activity_${index}_${actIndex}`,
                        name: activity.name || `アクティビティ${actIndex}`,
                        orderId: flatOrder.id, // 親オーダーのIDを設定
                        createdAt: activity.createdAt || currentTime
                    };
                    flatData.activities.push(flatActivity);
                });
            }
        });

        return flatData;
    }

    /**
     * フラット構造をネスト構造に変換
     * @param {Object} flatData - フラット構造のデータ
     * @returns {Object} ネスト構造のデータ
     */
    convertFlatToNested(flatData) {
        const nestedData = {
            orders: []
        };

        if (!flatData.orders || !Array.isArray(flatData.orders)) {
            return nestedData;
        }

        // オーダーごとにアクティビティをグループ化
        const activitiesByOrder = new Map();
        if (flatData.activities && Array.isArray(flatData.activities)) {
            flatData.activities.forEach(activity => {
                if (!activitiesByOrder.has(activity.orderId)) {
                    activitiesByOrder.set(activity.orderId, []);
                }
                activitiesByOrder.get(activity.orderId).push({
                    id: activity.id,
                    name: activity.name,
                    createdAt: activity.createdAt
                });
            });
        }

        // ネスト構造を構築
        flatData.orders.forEach(order => {
            const nestedOrder = {
                id: order.id,
                name: order.name,
                createdAt: order.createdAt,
                activities: activitiesByOrder.get(order.id) || []
            };
            nestedData.orders.push(nestedOrder);
        });

        return nestedData;
    }

    /**
     * インポート用のオーダー作成
     * @param {Object} orderData - オーダーデータ
     * @returns {boolean} 成功した場合true
     */
    createOrderForImport(orderData) {
        try {
            // 入力値検証
            if (!orderData.name || typeof orderData.name !== 'string' || orderData.name.trim().length === 0) {
                console.error('オーダー名が無効です:', orderData);
                return false;
            }

            // 重複チェック（IDベース）
            const existingOrder = this.dataRepository.data.orders.find(order => order.id === orderData.id);
            if (existingOrder) {
                console.warn('同じIDのオーダーが既に存在します:', orderData.id);
                return false;
            }

            // オーダーオブジェクトを作成
            const order = new Order(orderData.id, orderData.name.trim(), orderData.createdAt);
            
            if (!order.isValid()) {
                console.error('無効なオーダーデータです:', orderData);
                return false;
            }

            // データリポジトリに直接追加
            this.dataRepository.data.orders.push(order.toJSON());
            
            console.log('オーダーを作成しました:', order.id, order.name);
            return true;

        } catch (error) {
            console.error('オーダー作成エラー:', error, orderData);
            return false;
        }
    }

    /**
     * インポート用のアクティビティ作成
     * @param {Object} activityData - アクティビティデータ
     * @returns {boolean} 成功した場合true
     */
    createActivityForImport(activityData) {
        try {
            // 入力値検証
            if (!activityData.name || typeof activityData.name !== 'string' || activityData.name.trim().length === 0) {
                console.error('アクティビティ名が無効です:', activityData);
                return false;
            }

            if (!activityData.orderId) {
                console.error('オーダーIDが無効です:', activityData);
                return false;
            }

            // オーダーの存在確認
            const existingOrder = this.dataRepository.data.orders.find(order => order.id === activityData.orderId);
            if (!existingOrder) {
                console.error('指定されたオーダーが存在しません:', activityData.orderId);
                return false;
            }

            // 重複チェック（IDベース）
            const existingActivity = this.dataRepository.data.activities.find(activity => activity.id === activityData.id);
            if (existingActivity) {
                console.warn('同じIDのアクティビティが既に存在します:', activityData.id);
                return false;
            }

            // アクティビティオブジェクトを作成
            const activity = new Activity(activityData.id, activityData.name.trim(), activityData.orderId, activityData.createdAt);
            
            if (!activity.isValid()) {
                console.error('無効なアクティビティデータです:', activityData);
                return false;
            }

            // データリポジトリに直接追加
            this.dataRepository.data.activities.push(activity.toJSON());
            
            console.log('アクティビティを作成しました:', activity.id, activity.name, '→', activity.orderId);
            return true;

        } catch (error) {
            console.error('アクティビティ作成エラー:', error, activityData);
            return false;
        }
    }

    /**
     * サンプルJSONデータを生成（ネスト構造）
     * @returns {string} サンプルJSON文字列
     */
    generateSampleJSON() {
        const sampleData = {
            orders: [
                {
                    id: "order_sample_1",
                    name: "サンプルプロジェクト",
                    activities: [
                        {
                            id: "activity_sample_1",
                            name: "要件定義"
                        },
                        {
                            id: "activity_sample_2",
                            name: "設計"
                        }
                    ]
                }
            ]
        };
        
        return JSON.stringify(sampleData, null, 2);
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.ImportService = ImportService;
}