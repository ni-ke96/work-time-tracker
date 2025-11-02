/**
 * インポート機能の単体テスト
 * ImportService、ImportUI、ImportErrorHandlerの機能をテスト
 */
class ImportTest {
    constructor() {
        this.testResults = [];
        this.mockDataRepository = this.createMockDataRepository();
        this.importService = new ImportService(this.mockDataRepository);
    }

    /**
     * モックデータリポジトリを作成
     * @returns {Object} モックデータリポジトリ
     */
    createMockDataRepository() {
        return {
            data: {
                orders: [
                    { id: 'existing_order_1', name: '既存オーダー1', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'existing_activity_1', name: '既存アクティビティ1', orderId: 'existing_order_1', createdAt: '2024-01-01T00:00:00Z' }
                ],
                sessions: []
            },
            getAllOrders: function() {
                return this.data.orders.map(order => Order.fromJSON(order));
            },
            getAllActivities: function() {
                return this.data.activities.map(activity => Activity.fromJSON(activity));
            },
            updateOrder: function(id, updates) {
                const index = this.data.orders.findIndex(order => order.id === id);
                if (index !== -1) {
                    this.data.orders[index] = { ...this.data.orders[index], ...updates };
                    return Order.fromJSON(this.data.orders[index]);
                }
                return null;
            },
            updateActivity: function(id, updates) {
                const index = this.data.activities.findIndex(activity => activity.id === id);
                if (index !== -1) {
                    this.data.activities[index] = { ...this.data.activities[index], ...updates };
                    return Activity.fromJSON(this.data.activities[index]);
                }
                return null;
            }
        };
    }

    /**
     * 全テストを実行
     * @returns {Object} テスト結果
     */
    runAllTests() {
        console.log('インポート機能のテストを開始します...');
        
        // JSON解析テスト
        this.testJSONParsing();
        
        // データ検証テスト
        this.testDataValidation();
        
        // 重複チェックテスト
        this.testDuplicateCheck();
        
        // インポート実行テスト
        this.testImportExecution();
        
        // エラーハンドリングテスト
        this.testErrorHandling();
        
        // ファイル形式検証テスト
        this.testFileValidation();
        
        // 高度な検証機能テスト
        this.testAdvancedValidation();
        
        // パフォーマンステスト
        this.testPerformance();
        
        // エッジケーステスト
        this.testEdgeCases();
        
        // ネスト構造変換テスト
        this.testNestedStructureConversion();
        
        return this.generateTestReport();
    }

    /**
     * JSON解析機能のテスト
     */
    testJSONParsing() {
        console.log('JSON解析テストを実行中...');
        
        // 正常なJSONの解析
        this.runTest('正常なJSON解析', () => {
            const validJSON = '{"orders": []}';
            const result = this.importService.parseJSON(validJSON);
            return result && typeof result === 'object' && Array.isArray(result.orders);
        });
        
        // 複雑なJSONの解析（ネスト構造）
        this.runTest('複雑なJSON解析（ネスト構造）', () => {
            const complexJSON = JSON.stringify({
                orders: [
                    { 
                        id: 'order1', 
                        name: 'テストオーダー',
                        activities: [
                            { id: 'activity1', name: 'テストアクティビティ' }
                        ]
                    }
                ]
            });
            const result = this.importService.parseJSON(complexJSON);
            return result && result.orders.length === 1 && result.orders[0].activities.length === 1;
        });
        
        // 不正なJSONの解析
        this.runTest('不正なJSON解析エラー', () => {
            try {
                const invalidJSON = '{"orders": [], "activities":}';
                this.importService.parseJSON(invalidJSON);
                return false; // エラーが発生しなかった場合は失敗
            } catch (error) {
                return error.message.includes('JSON');
            }
        });
        
        // 空文字列の処理
        this.runTest('空文字列の処理', () => {
            try {
                this.importService.parseJSON('');
                return false;
            } catch (error) {
                return error.message.includes('空');
            }
        });
        
        // null値の処理
        this.runTest('null値の処理', () => {
            try {
                this.importService.parseJSON(null);
                return false;
            } catch (error) {
                return error.message.includes('無効');
            }
        });
        
        // undefined値の処理
        this.runTest('undefined値の処理', () => {
            try {
                this.importService.parseJSON(undefined);
                return false;
            } catch (error) {
                return error.message.includes('無効');
            }
        });
        
        // 空白のみの文字列の処理
        this.runTest('空白のみの文字列の処理', () => {
            try {
                this.importService.parseJSON('   \n\t  ');
                return false;
            } catch (error) {
                return error.message.includes('空');
            }
        });
        
        // 不完全なJSONの処理
        this.runTest('不完全なJSON（開始括弧のみ）', () => {
            try {
                this.importService.parseJSON('{');
                return false;
            } catch (error) {
                return error.message.includes('JSON');
            }
        });
        
        // 不正な文字を含むJSONの処理
        this.runTest('不正な文字を含むJSON', () => {
            try {
                this.importService.parseJSON('{"orders": [], "activities": [}');
                return false;
            } catch (error) {
                return error.message.includes('JSON');
            }
        });
        
        // 非文字列型の処理
        this.runTest('数値型の処理', () => {
            try {
                this.importService.parseJSON(123);
                return false;
            } catch (error) {
                return error.message.includes('無効');
            }
        });
        
        // オブジェクト型の処理
        this.runTest('オブジェクト型の処理', () => {
            try {
                this.importService.parseJSON({orders: [], activities: []});
                return false;
            } catch (error) {
                return error.message.includes('無効');
            }
        });
    }

    /**
     * データ検証機能のテスト
     */
    testDataValidation() {
        console.log('データ検証テストを実行中...');
        
        // 正常なデータの検証（ネスト構造）
        this.runTest('正常なデータ検証（ネスト構造）', () => {
            const validData = {
                orders: [
                    { 
                        id: 'order_1', 
                        name: 'テストオーダー',
                        activities: [
                            { id: 'activity_1', name: 'テストアクティビティ' }
                        ]
                    }
                ]
            };
            const result = this.importService.validateImportData(validData);
            return result.isValid === true;
        });
        
        // 空のデータの検証
        this.runTest('空のデータ検証', () => {
            const emptyData = {
                orders: []
            };
            const result = this.importService.validateImportData(emptyData);
            return result.isValid === true; // 空のデータは有効
        });
        
        // 必須フィールド不足の検証（オーダー）
        this.runTest('オーダーの必須フィールド不足', () => {
            const invalidData = {
                orders: [
                    { id: 'order_1' } // nameとcreatedAtが不足
                ],
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false && result.errors.length > 0;
        });
        
        // 必須フィールド不足の検証（アクティビティ）
        this.runTest('アクティビティの必須フィールド不足', () => {
            const invalidData = {
                orders: [
                    { id: 'order_1', name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'activity_1', name: 'テストアクティビティ' } // orderIdとcreatedAtが不足
                ]
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false && result.errors.length > 0;
        });
        
        // データ型エラーの検証（ID）
        this.runTest('ID型エラーの検証', () => {
            const invalidData = {
                orders: [
                    { id: 123, name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z' } // idが数値
                ],
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false;
        });
        
        // データ型エラーの検証（名前）
        this.runTest('名前型エラーの検証', () => {
            const invalidData = {
                orders: [
                    { id: 'order_1', name: 123, createdAt: '2024-01-01T00:00:00Z' } // nameが数値
                ],
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false;
        });
        
        // 関係整合性エラーの検証
        this.runTest('関係整合性エラーの検証', () => {
            const invalidData = {
                orders: [
                    { id: 'order_1', name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'activity_1', name: 'テストアクティビティ', orderId: 'nonexistent_order', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false && result.errors.some(error => error.includes('存在しない'));
        });
        
        // 文字数制限の検証
        this.runTest('文字数制限の検証', () => {
            const longString = 'a'.repeat(201); // 200文字を超える文字列
            const invalidData = {
                orders: [
                    { id: 'order_1', name: longString, createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false && result.errors.some(error => error.includes('文字数制限'));
        });
        
        // 日時形式エラーの検証
        this.runTest('日時形式エラーの検証', () => {
            const invalidData = {
                orders: [
                    { id: 'order_1', name: 'テストオーダー', createdAt: 'invalid-date' }
                ],
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false;
        });
        
        // 空文字列の検証
        this.runTest('空文字列の検証', () => {
            const invalidData = {
                orders: [
                    { id: '', name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false;
        });
        
        // null値の検証
        this.runTest('null値の検証', () => {
            const invalidData = {
                orders: [
                    { id: null, name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false;
        });
        
        // 配列以外のorders/activitiesの検証
        this.runTest('配列以外のorders検証', () => {
            const invalidData = {
                orders: 'not-an-array',
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false;
        });
        
        // 予期しないプロパティの検証
        this.runTest('予期しないプロパティの検証', () => {
            const dataWithExtraProps = {
                orders: [
                    { id: 'order_1', name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z', extraProp: 'extra' }
                ],
                activities: []
            };
            const result = this.importService.validateImportData(dataWithExtraProps);
            // 予期しないプロパティは警告として扱われるが、エラーではない
            return result.isValid === false && result.errors.some(error => error.includes('予期しない'));
        });
        
        // 重複IDの検証
        this.runTest('重複IDの検証', () => {
            const invalidData = {
                orders: [
                    { id: 'order_1', name: 'テストオーダー1', createdAt: '2024-01-01T00:00:00Z' },
                    { id: 'order_1', name: 'テストオーダー2', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.validateImportData(invalidData);
            return result.isValid === false && result.errors.some(error => error.includes('重複'));
        });
        
        // 大量データの検証
        this.runTest('大量データの検証', () => {
            const largeData = {
                orders: [],
                activities: []
            };
            
            // 1000件のオーダーを生成
            for (let i = 0; i < 1000; i++) {
                largeData.orders.push({
                    id: `order_${i}`,
                    name: `テストオーダー${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                });
            }
            
            const result = this.importService.validateImportData(largeData);
            return result.isValid === true; // 大量データでも正常に処理される
        });
    }

    /**
     * 重複チェック機能のテスト
     */
    testDuplicateCheck() {
        console.log('重複チェックテストを実行中...');
        
        // 重複なしの場合
        this.runTest('重複なしの場合', () => {
            const importData = {
                orders: [
                    { id: 'new_order_1', name: '新規オーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'new_activity_1', name: '新規アクティビティ', orderId: 'new_order_1', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === false;
        });
        
        // オーダーID重複の検出
        this.runTest('オーダーID重複の検出', () => {
            const importData = {
                orders: [
                    { id: 'existing_order_1', name: '重複オーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === true && result.duplicateOrders.length > 0;
        });
        
        // オーダー名前重複の検出
        this.runTest('オーダー名前重複の検出', () => {
            const importData = {
                orders: [
                    { id: 'new_order_1', name: '既存オーダー1', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === true && result.duplicateOrders.length > 0;
        });
        
        // アクティビティID重複の検出
        this.runTest('アクティビティID重複の検出', () => {
            const importData = {
                orders: [],
                activities: [
                    { id: 'existing_activity_1', name: '重複アクティビティ', orderId: 'existing_order_1', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === true && result.duplicateActivities.length > 0;
        });
        
        // アクティビティ名前重複の検出（同一オーダー内）
        this.runTest('アクティビティ名前重複の検出', () => {
            const importData = {
                orders: [],
                activities: [
                    { id: 'new_activity_1', name: '既存アクティビティ1', orderId: 'existing_order_1', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === true && result.duplicateActivities.length > 0;
        });
        
        // 複数の重複タイプの検出
        this.runTest('複数の重複タイプの検出', () => {
            const importData = {
                orders: [
                    { id: 'existing_order_1', name: '重複オーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'existing_activity_1', name: '重複アクティビティ', orderId: 'existing_order_1', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === true && 
                   result.duplicateOrders.length > 0 && 
                   result.duplicateActivities.length > 0;
        });
        
        // 重複タイプの詳細確認（ID重複）
        this.runTest('重複タイプ詳細確認（ID）', () => {
            const importData = {
                orders: [
                    { id: 'existing_order_1', name: '異なる名前', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === true && 
                   result.duplicateOrders.length > 0 &&
                   result.duplicateOrders[0].type === 'id';
        });
        
        // 重複タイプの詳細確認（名前重複）
        this.runTest('重複タイプ詳細確認（名前）', () => {
            const importData = {
                orders: [
                    { id: 'different_id', name: '既存オーダー1', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === true && 
                   result.duplicateOrders.length > 0 &&
                   result.duplicateOrders[0].type === 'name';
        });
        
        // 空のデータでの重複チェック
        this.runTest('空のデータでの重複チェック', () => {
            const importData = {
                orders: [],
                activities: []
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === false;
        });
        
        // 大量データでの重複チェック
        this.runTest('大量データでの重複チェック', () => {
            const importData = {
                orders: [],
                activities: []
            };
            
            // 100件の新規データを生成
            for (let i = 0; i < 100; i++) {
                importData.orders.push({
                    id: `new_order_${i}`,
                    name: `新規オーダー${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                });
            }
            
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === false; // 全て新規なので重複なし
        });
        
        // 部分的重複の検出
        this.runTest('部分的重複の検出', () => {
            const importData = {
                orders: [
                    { id: 'new_order_1', name: '新規オーダー1', createdAt: '2024-01-01T00:00:00Z' },
                    { id: 'existing_order_1', name: '重複オーダー', createdAt: '2024-01-01T00:00:00Z' },
                    { id: 'new_order_2', name: '新規オーダー2', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.checkDuplicates(importData);
            return result.hasDuplicates === true && result.duplicateOrders.length === 1;
        });
        
        // 重複情報の詳細確認
        this.runTest('重複情報の詳細確認', () => {
            const importData = {
                orders: [
                    { id: 'existing_order_1', name: '重複オーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            const result = this.importService.checkDuplicates(importData);
            
            if (!result.hasDuplicates || result.duplicateOrders.length === 0) {
                return false;
            }
            
            const duplicate = result.duplicateOrders[0];
            return duplicate.import && duplicate.existing && duplicate.type;
        });
    }

    /**
     * インポート実行機能のテスト
     */
    testImportExecution() {
        console.log('インポート実行テストを実行中...');
        
        // 新規データのインポート
        this.runTest('新規データのインポート', async () => {
            const importData = {
                orders: [
                    { id: 'new_order_2', name: '新規オーダー2', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'new_activity_2', name: '新規アクティビティ2', orderId: 'new_order_2', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'skip' });
            
            return result.success === true && result.newOrders === 1 && result.newActivities === 1;
        });
        
        // 重複データのスキップ
        this.runTest('重複データのスキップ', async () => {
            const importData = {
                orders: [
                    { id: 'existing_order_1', name: '既存オーダー1', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'skip' });
            
            return result.success === true && result.skippedOrders === 1;
        });
        
        // 重複データの上書き
        this.runTest('重複データの上書き', async () => {
            const importData = {
                orders: [
                    { id: 'existing_order_1', name: '更新されたオーダー名', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'overwrite' });
            
            return result.success === true && result.updatedOrders === 1;
        });
        
        // 重複データのマージ
        this.runTest('重複データのマージ', async () => {
            const importData = {
                orders: [
                    { id: 'existing_order_1', name: '新しい名前', createdAt: '2024-02-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'merge' });
            
            return result.success === true && result.updatedOrders === 1;
        });
        
        // 混合データのインポート（新規+重複）
        this.runTest('混合データのインポート', async () => {
            const importData = {
                orders: [
                    { id: 'new_order_3', name: '新規オーダー3', createdAt: '2024-01-01T00:00:00Z' },
                    { id: 'existing_order_1', name: '既存オーダー1', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'new_activity_3', name: '新規アクティビティ3', orderId: 'new_order_3', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'skip' });
            
            return result.success === true && 
                   result.newOrders === 1 && 
                   result.skippedOrders === 1 && 
                   result.newActivities === 1;
        });
        
        // 空のデータのインポート
        this.runTest('空のデータのインポート', async () => {
            const importData = {
                orders: [],
                activities: []
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'skip' });
            
            return result.success === true && 
                   result.newOrders === 0 && 
                   result.newActivities === 0;
        });
        
        // 大量データのインポート
        this.runTest('大量データのインポート', async () => {
            const importData = {
                orders: [],
                activities: []
            };
            
            // 50件のデータを生成
            for (let i = 0; i < 50; i++) {
                importData.orders.push({
                    id: `bulk_order_${i}`,
                    name: `バルクオーダー${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                });
                
                importData.activities.push({
                    id: `bulk_activity_${i}`,
                    name: `バルクアクティビティ${i}`,
                    orderId: `bulk_order_${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                });
            }
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'skip' });
            
            return result.success === true && 
                   result.newOrders === 50 && 
                   result.newActivities === 50;
        });
        
        // エラーハンドリングのテスト（不正なオーダーID参照）
        this.runTest('不正なオーダーID参照のエラーハンドリング', async () => {
            const importData = {
                orders: [
                    { id: 'valid_order', name: '有効なオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'valid_activity', name: '有効なアクティビティ', orderId: 'valid_order', createdAt: '2024-01-01T00:00:00Z' },
                    { id: 'invalid_activity', name: '無効なアクティビティ', orderId: 'nonexistent_order', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'skip' });
            
            // 一部成功、一部エラーの場合
            return result.newOrders === 1 && 
                   result.newActivities === 1 && 
                   result.errors.length > 0;
        });
        
        // インポート結果の詳細確認
        this.runTest('インポート結果の詳細確認', async () => {
            const importData = {
                orders: [
                    { id: 'result_test_order', name: '結果テストオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            const result = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'skip' });
            
            // 結果オブジェクトの構造確認
            return result.hasOwnProperty('success') &&
                   result.hasOwnProperty('newOrders') &&
                   result.hasOwnProperty('newActivities') &&
                   result.hasOwnProperty('skippedOrders') &&
                   result.hasOwnProperty('skippedActivities') &&
                   result.hasOwnProperty('updatedOrders') &&
                   result.hasOwnProperty('updatedActivities') &&
                   result.hasOwnProperty('errors');
        });
        
        // デフォルトオプションのテスト
        this.runTest('デフォルトオプションのテスト', async () => {
            const importData = {
                orders: [
                    { id: 'existing_order_1', name: '既存オーダー1', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const duplicateCheck = this.importService.checkDuplicates(importData);
            // オプションを指定しない場合のデフォルト動作（skip）
            const result = await this.importService.executeImport(importData, duplicateCheck);
            
            return result.success === true && result.skippedOrders === 1;
        });
    }

    /**
     * エラーハンドリング機能のテスト
     */
    testErrorHandling() {
        console.log('エラーハンドリングテストを実行中...');
        
        // エラー分類のテスト（JSON解析エラー）
        this.runTest('JSON解析エラーの分類', () => {
            const errorHandler = new ImportErrorHandler();
            
            const jsonError = new SyntaxError('Unexpected token');
            const processedError = errorHandler.handleError(jsonError, {});
            
            return processedError.type === 'JSON_PARSE_ERROR';
        });
        
        // エラー分類のテスト（ファイル形式エラー）
        this.runTest('ファイル形式エラーの分類', () => {
            const errorHandler = new ImportErrorHandler();
            
            const formatError = new Error('ファイル形式が無効です');
            const processedError = errorHandler.handleError(formatError, {});
            
            return processedError.type === 'FILE_FORMAT_ERROR';
        });
        
        // エラー分類のテスト（データ整合性エラー）
        this.runTest('データ整合性エラーの分類', () => {
            const errorHandler = new ImportErrorHandler();
            
            const integrityError = new Error('重複するIDが見つかりました');
            const processedError = errorHandler.handleError(integrityError, {});
            
            return processedError.type === 'DATA_INTEGRITY_ERROR';
        });
        
        // ユーザーメッセージ生成のテスト
        this.runTest('ユーザーメッセージ生成', () => {
            const errorHandler = new ImportErrorHandler();
            
            const error = new Error('ファイル形式が無効です');
            const processedError = errorHandler.handleError(error, { fileName: 'test.txt' });
            const userMessage = errorHandler.generateUserMessage(processedError);
            
            return userMessage.includes('ファイル形式エラー') && userMessage.includes('test.txt');
        });
        
        // コンテキスト情報の処理テスト
        this.runTest('コンテキスト情報の処理', () => {
            const errorHandler = new ImportErrorHandler();
            
            const error = new Error('テストエラー');
            const context = {
                fileName: 'test.json',
                fileSize: 1024,
                operation: 'importFromFile'
            };
            const processedError = errorHandler.handleError(error, context);
            
            return processedError.context.fileName === 'test.json' &&
                   processedError.context.fileSize === 1024 &&
                   processedError.message.includes('test.json');
        });
        
        // 検証エラーの専用ハンドリング
        this.runTest('検証エラーの専用ハンドリング', () => {
            const errorHandler = new ImportErrorHandler();
            
            const validationResult = {
                isValid: false,
                errors: ['必須フィールドが不足しています', 'データ型が無効です'],
                warnings: ['名前が重複しています']
            };
            
            const processedError = errorHandler.handleValidationError(validationResult, { fileName: 'test.json' });
            
            return processedError.type === 'SCHEMA_VALIDATION_ERROR' &&
                   processedError.validationResult === validationResult &&
                   processedError.recommendations.length > 0;
        });
        
        // 復旧可能性判定のテスト
        this.runTest('復旧可能性判定', () => {
            const errorHandler = new ImportErrorHandler();
            
            const recoverable = errorHandler.isRecoverable('FILE_FORMAT_ERROR');
            const nonRecoverable = errorHandler.isRecoverable('UNKNOWN_ERROR');
            
            return recoverable === true && nonRecoverable === false;
        });
        
        // 推奨アクションの生成テスト
        this.runTest('推奨アクションの生成', () => {
            const errorHandler = new ImportErrorHandler();
            
            const actions = errorHandler.getRecommendedActions('FILE_FORMAT_ERROR');
            
            return Array.isArray(actions) && 
                   actions.length > 0 &&
                   actions[0].hasOwnProperty('action') &&
                   actions[0].hasOwnProperty('description');
        });
        
        // エラーメッセージの詳細化テスト
        this.runTest('エラーメッセージの詳細化', () => {
            const errorHandler = new ImportErrorHandler();
            
            const error = new Error('ファイルサイズが大きすぎます');
            const context = {
                fileName: 'large-file.json',
                fileSize: 20 * 1024 * 1024 // 20MB
            };
            
            const processedError = errorHandler.handleError(error, context);
            const detailedMessage = errorHandler.generateDetailedMessage(error, errorHandler.errorMessages.get('FILE_SIZE_ERROR'), context);
            
            return detailedMessage.includes('large-file.json') &&
                   detailedMessage.includes('20 MB');
        });
        
        // 複数エラータイプの処理テスト
        this.runTest('複数エラータイプの処理', () => {
            const errorHandler = new ImportErrorHandler();
            
            const errors = [
                new Error('JSONファイルの形式が正しくありません'),
                new Error('ファイルサイズが制限を超えています'),
                new Error('重複するデータが見つかりました')
            ];
            
            const processedErrors = errors.map(error => errorHandler.handleError(error, {}));
            const errorTypes = processedErrors.map(pe => pe.type);
            
            return errorTypes.includes('JSON_PARSE_ERROR') &&
                   errorTypes.includes('FILE_SIZE_ERROR') &&
                   errorTypes.includes('DATA_INTEGRITY_ERROR');
        });
        
        // エラーログ記録のテスト
        this.runTest('エラーログ記録', () => {
            const errorHandler = new ImportErrorHandler();
            
            // コンソールログをキャプチャ
            const originalConsoleError = console.error;
            let loggedError = null;
            console.error = (message, data) => {
                if (message === 'Import Error:') {
                    loggedError = data;
                }
            };
            
            const error = new Error('テストエラー');
            const processedError = errorHandler.handleError(error, { fileName: 'test.json' });
            
            // コンソールログを復元
            console.error = originalConsoleError;
            
            return loggedError !== null &&
                   loggedError.type === processedError.type &&
                   loggedError.context.fileName === 'test.json';
        });
        
        // 検証エラーの重要度判定テスト
        this.runTest('検証エラーの重要度判定', () => {
            const errorHandler = new ImportErrorHandler();
            
            const criticalValidation = {
                isValid: false,
                errors: Array(15).fill('重大なエラー'),
                orphanedActivities: [{ activityName: 'test' }]
            };
            
            const warningValidation = {
                isValid: false,
                errors: ['軽微なエラー'],
                warnings: ['警告メッセージ']
            };
            
            const criticalSeverity = errorHandler.determineValidationSeverity(criticalValidation);
            const warningSeverity = errorHandler.determineValidationSeverity(warningValidation);
            
            return criticalSeverity === 'error' && warningSeverity === 'warning';
        });
        
        // ファイルサイズフォーマットのテスト
        this.runTest('ファイルサイズフォーマット', () => {
            const errorHandler = new ImportErrorHandler();
            
            const bytes = errorHandler.formatFileSize(1024);
            const kilobytes = errorHandler.formatFileSize(1024 * 1024);
            const megabytes = errorHandler.formatFileSize(1024 * 1024 * 1024);
            
            return bytes === '1 KB' &&
                   kilobytes === '1 MB' &&
                   megabytes === '1 GB';
        });
    }

    /**
     * ファイル形式検証機能のテスト
     */
    testFileValidation() {
        console.log('ファイル形式検証テストを実行中...');
        
        // 正常なJSONファイルの検証
        this.runTest('正常なJSONファイル検証', () => {
            const mockFile = {
                name: 'test.json',
                type: 'application/json',
                size: 1024
            };
            
            return this.importService.validateFileFormat(mockFile) === true;
        });
        
        // 大文字拡張子の検証
        this.runTest('大文字拡張子の検証', () => {
            const mockFile = {
                name: 'test.JSON',
                type: 'application/json',
                size: 1024
            };
            
            return this.importService.validateFileFormat(mockFile) === true;
        });
        
        // 不正な拡張子の検証
        this.runTest('不正な拡張子の検証', () => {
            const mockFile = {
                name: 'test.txt',
                type: 'text/plain',
                size: 1024
            };
            
            return this.importService.validateFileFormat(mockFile) === false;
        });
        
        // 拡張子なしファイルの検証
        this.runTest('拡張子なしファイルの検証', () => {
            const mockFile = {
                name: 'test',
                type: 'application/json',
                size: 1024
            };
            
            return this.importService.validateFileFormat(mockFile) === false;
        });
        
        // 複数拡張子の検証
        this.runTest('複数拡張子の検証', () => {
            const mockFile = {
                name: 'test.backup.json',
                type: 'application/json',
                size: 1024
            };
            
            return this.importService.validateFileFormat(mockFile) === true;
        });
        
        // 代替MIMEタイプの検証
        this.runTest('代替MIMEタイプの検証', () => {
            const textJsonFile = {
                name: 'test.json',
                type: 'text/json',
                size: 1024
            };
            
            const textPlainFile = {
                name: 'test.json',
                type: 'text/plain',
                size: 1024
            };
            
            return this.importService.validateFileFormat(textJsonFile) === true &&
                   this.importService.validateFileFormat(textPlainFile) === true;
        });
        
        // 不正なMIMEタイプの検証
        this.runTest('不正なMIMEタイプの検証', () => {
            const mockFile = {
                name: 'test.json',
                type: 'image/jpeg',
                size: 1024
            };
            
            return this.importService.validateFileFormat(mockFile) === false;
        });
        
        // MIMEタイプなしの検証
        this.runTest('MIMEタイプなしの検証', () => {
            const mockFile = {
                name: 'test.json',
                type: '',
                size: 1024
            };
            
            return this.importService.validateFileFormat(mockFile) === true; // 拡張子で判定
        });
        
        // nullファイルの検証
        this.runTest('nullファイルの検証', () => {
            return this.importService.validateFileFormat(null) === false;
        });
        
        // undefinedファイルの検証
        this.runTest('undefinedファイルの検証', () => {
            return this.importService.validateFileFormat(undefined) === false;
        });
        
        // ファイルサイズ検証（正常範囲）
        this.runTest('ファイルサイズ検証（正常範囲）', () => {
            const validSizeFile = {
                name: 'test.json',
                type: 'application/json',
                size: 1024 * 1024 // 1MB
            };
            
            return this.importService.validateFileSize(validSizeFile) === true;
        });
        
        // ファイルサイズ検証（制限超過）
        this.runTest('ファイルサイズ検証（制限超過）', () => {
            const invalidSizeFile = {
                name: 'test.json',
                type: 'application/json',
                size: 20 * 1024 * 1024 // 20MB
            };
            
            return this.importService.validateFileSize(invalidSizeFile) === false;
        });
        
        // ファイルサイズ検証（境界値）
        this.runTest('ファイルサイズ検証（境界値）', () => {
            const boundaryFile = {
                name: 'test.json',
                type: 'application/json',
                size: 10 * 1024 * 1024 // 10MB（制限値）
            };
            
            return this.importService.validateFileSize(boundaryFile) === true;
        });
        
        // ファイルサイズ検証（0バイト）
        this.runTest('ファイルサイズ検証（0バイト）', () => {
            const emptyFile = {
                name: 'test.json',
                type: 'application/json',
                size: 0
            };
            
            return this.importService.validateFileSize(emptyFile) === true;
        });
        
        // ファイルサイズ検証（負の値）
        this.runTest('ファイルサイズ検証（負の値）', () => {
            const negativeFile = {
                name: 'test.json',
                type: 'application/json',
                size: -1
            };
            
            return this.importService.validateFileSize(negativeFile) === true; // 負の値は0として扱われる
        });
        
        // 統合ファイル検証テスト
        this.runTest('統合ファイル検証', () => {
            const validFile = {
                name: 'valid-import.json',
                type: 'application/json',
                size: 5 * 1024 * 1024 // 5MB
            };
            
            const invalidFormatFile = {
                name: 'invalid.xml',
                type: 'application/xml',
                size: 1024
            };
            
            const invalidSizeFile = {
                name: 'large.json',
                type: 'application/json',
                size: 15 * 1024 * 1024 // 15MB
            };
            
            return this.importService.validateFileFormat(validFile) === true &&
                   this.importService.validateFileSize(validFile) === true &&
                   this.importService.validateFileFormat(invalidFormatFile) === false &&
                   this.importService.validateFileSize(invalidSizeFile) === false;
        });
    }

    /**
     * 個別テストを実行
     * @param {string} testName - テスト名
     * @param {Function} testFunction - テスト関数
     */
    runTest(testName, testFunction) {
        try {
            const startTime = performance.now();
            const result = testFunction();
            const endTime = performance.now();
            
            // Promiseの場合は非同期処理
            if (result instanceof Promise) {
                result.then(asyncResult => {
                    this.recordTestResult(testName, asyncResult, endTime - startTime);
                }).catch(error => {
                    this.recordTestResult(testName, false, endTime - startTime, error.message);
                });
            } else {
                this.recordTestResult(testName, result, endTime - startTime);
            }
        } catch (error) {
            this.recordTestResult(testName, false, 0, error.message);
        }
    }

    /**
     * テスト結果を記録
     * @param {string} testName - テスト名
     * @param {boolean} passed - テスト結果
     * @param {number} duration - 実行時間
     * @param {string} error - エラーメッセージ
     */
    recordTestResult(testName, passed, duration, error = null) {
        this.testResults.push({
            name: testName,
            passed: passed,
            duration: Math.round(duration * 100) / 100,
            error: error,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const durationText = `(${duration.toFixed(2)}ms)`;
        const errorText = error ? ` - ${error}` : '';
        
        console.log(`${status} ${testName} ${durationText}${errorText}`);
    }

    /**
     * テストレポートを生成
     * @returns {Object} テストレポート
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(result => result.passed).length;
        const failedTests = totalTests - passedTests;
        const totalDuration = this.testResults.reduce((sum, result) => sum + result.duration, 0);
        
        const report = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
                totalDuration: Math.round(totalDuration * 100) / 100
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
        
        console.log('\n=== インポート機能テスト結果 ===');
        console.log(`総テスト数: ${totalTests}`);
        console.log(`成功: ${passedTests}`);
        console.log(`失敗: ${failedTests}`);
        console.log(`成功率: ${report.summary.passRate}%`);
        console.log(`総実行時間: ${report.summary.totalDuration}ms`);
        
        if (failedTests > 0) {
            console.log('\n=== 失敗したテスト ===');
            this.testResults.filter(result => !result.passed).forEach(result => {
                console.log(`❌ ${result.name}: ${result.error}`);
            });
        }
        
        return report;
    }

    /**
     * 高度な検証機能のテスト
     */
    testAdvancedValidation() {
        console.log('高度な検証機能テストを実行中...');
        
        // JSONスキーマ検証のテスト
        this.runTest('JSONスキーマ検証', () => {
            const validData = {
                orders: [
                    { id: 'order_1', name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'activity_1', name: 'テストアクティビティ', orderId: 'order_1', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            
            const result = this.importService.validateJSONSchema(validData);
            return result.isValid === true && result.schemaVersion === this.importService.supportedVersion;
        });
        
        // データ整合性の詳細検証
        this.runTest('データ整合性の詳細検証', () => {
            const orders = [
                { id: 'order_1', name: 'オーダー1', createdAt: '2024-01-01T00:00:00Z' },
                { id: 'order_2', name: 'オーダー2', createdAt: '2024-01-01T00:00:00Z' }
            ];
            
            const activities = [
                { id: 'activity_1', name: 'アクティビティ1', orderId: 'order_1', createdAt: '2024-01-01T00:00:00Z' },
                { id: 'activity_2', name: 'アクティビティ2', orderId: 'order_3', createdAt: '2024-01-01T00:00:00Z' } // 存在しないオーダー
            ];
            
            const result = this.importService.validateDataIntegrity(orders, activities);
            return result.isValid === false && 
                   result.orphanedActivities.length === 1 &&
                   result.integrityScore < 100;
        });
        
        // ID重複の詳細分析
        this.runTest('ID重複の詳細分析', () => {
            const orders = [
                { id: 'duplicate_id', name: 'オーダー1', createdAt: '2024-01-01T00:00:00Z' },
                { id: 'duplicate_id', name: 'オーダー2', createdAt: '2024-01-01T00:00:00Z' }
            ];
            
            const activities = [];
            
            const result = this.importService.analyzeIdDuplicates(orders, activities);
            return result.isValid === false && 
                   result.orderIds.length === 1 &&
                   result.orderIds[0].id === 'duplicate_id';
        });
        
        // 文字列制約の検証
        this.runTest('文字列制約の検証', () => {
            const longId = 'a'.repeat(101); // 100文字を超える
            const longName = 'b'.repeat(201); // 200文字を超える
            
            const data = {
                orders: [
                    { id: longId, name: longName, createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const result = this.importService.validateStringConstraints(data);
            return result.isValid === false && result.errors.length >= 2;
        });
        
        // バージョン互換性の検証
        this.runTest('バージョン互換性の検証', () => {
            const dataWithVersion = {
                version: '0.9.0', // 異なるバージョン
                orders: [],
                activities: []
            };
            
            const result = this.importService.validateSchemaVersion(dataWithVersion);
            return result.isValid === true && result.warnings.length > 0;
        });
        
        // パフォーマンス警告の生成
        this.runTest('パフォーマンス警告の生成', () => {
            const largeData = {
                orders: Array(2000).fill(null).map((_, i) => ({
                    id: `order_${i}`,
                    name: `オーダー${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                })),
                activities: []
            };
            
            const warnings = this.importService.generatePerformanceWarnings(largeData);
            return warnings.length > 0 && warnings.some(w => w.includes('処理時間'));
        });
        
        // データ品質分析
        this.runTest('データ品質分析', () => {
            const orders = [
                { id: 'order_1', name: '', createdAt: '2024-01-01T00:00:00Z' }, // 空の名前
                { id: 'order_2', name: 'a'.repeat(60), createdAt: '1800-01-01T00:00:00Z' } // 異常に長い名前と古い日付
            ];
            
            const activities = [];
            
            const result = this.importService.analyzeDataQuality(orders, activities);
            return result.warnings.length >= 2;
        });
        
        // 名前重複の分析
        this.runTest('名前重複の分析', () => {
            const orders = [
                { id: 'order_1', name: '重複名前', createdAt: '2024-01-01T00:00:00Z' },
                { id: 'order_2', name: '重複名前', createdAt: '2024-01-01T00:00:00Z' }
            ];
            
            const activities = [];
            
            const result = this.importService.analyzeNameDuplicates(orders, activities);
            return result.warnings.length > 0 && result.orderNames.length === 1;
        });
        
        // 整合性スコアの計算
        this.runTest('整合性スコアの計算', () => {
            const perfectResult = {
                errors: [],
                warnings: [],
                orphanedActivities: [],
                duplicateAnalysis: { orderIds: [], activityIds: [] }
            };
            
            const problematicResult = {
                errors: ['エラー1', 'エラー2'],
                warnings: ['警告1'],
                orphanedActivities: [{}],
                duplicateAnalysis: { orderIds: [{}], activityIds: [] }
            };
            
            const perfectScore = this.importService.calculateIntegrityScore(perfectResult);
            const problematicScore = this.importService.calculateIntegrityScore(problematicResult);
            
            return perfectScore === 100 && problematicScore < 100;
        });
    }

    /**
     * パフォーマンステスト
     */
    testPerformance() {
        console.log('パフォーマンステストを実行中...');
        
        // 大量データの解析性能
        this.runTest('大量データの解析性能', () => {
            const largeJSON = JSON.stringify({
                orders: Array(1000).fill(null).map((_, i) => ({
                    id: `perf_order_${i}`,
                    name: `パフォーマンステストオーダー${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                })),
                activities: Array(5000).fill(null).map((_, i) => ({
                    id: `perf_activity_${i}`,
                    name: `パフォーマンステストアクティビティ${i}`,
                    orderId: `perf_order_${i % 1000}`,
                    createdAt: '2024-01-01T00:00:00Z'
                }))
            });
            
            const startTime = performance.now();
            const result = this.importService.parseJSON(largeJSON);
            const endTime = performance.now();
            
            const processingTime = endTime - startTime;
            return result && processingTime < 1000; // 1秒以内
        });
        
        // 検証処理の性能
        this.runTest('検証処理の性能', () => {
            const largeData = {
                orders: Array(500).fill(null).map((_, i) => ({
                    id: `val_order_${i}`,
                    name: `検証テストオーダー${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                })),
                activities: Array(2500).fill(null).map((_, i) => ({
                    id: `val_activity_${i}`,
                    name: `検証テストアクティビティ${i}`,
                    orderId: `val_order_${i % 500}`,
                    createdAt: '2024-01-01T00:00:00Z'
                }))
            };
            
            const startTime = performance.now();
            const result = this.importService.validateImportData(largeData);
            const endTime = performance.now();
            
            const processingTime = endTime - startTime;
            return result.isValid === true && processingTime < 2000; // 2秒以内
        });
        
        // 重複チェックの性能
        this.runTest('重複チェックの性能', () => {
            const duplicateData = {
                orders: Array(200).fill(null).map((_, i) => ({
                    id: `dup_order_${i}`,
                    name: `重複チェックオーダー${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                })),
                activities: Array(1000).fill(null).map((_, i) => ({
                    id: `dup_activity_${i}`,
                    name: `重複チェックアクティビティ${i}`,
                    orderId: `dup_order_${i % 200}`,
                    createdAt: '2024-01-01T00:00:00Z'
                }))
            };
            
            const startTime = performance.now();
            const result = this.importService.checkDuplicates(duplicateData);
            const endTime = performance.now();
            
            const processingTime = endTime - startTime;
            return result.hasDuplicates === false && processingTime < 500; // 0.5秒以内
        });
        
        // メモリ使用量の推定
        this.runTest('メモリ使用量の推定', () => {
            const testData = {
                orders: Array(100).fill(null).map((_, i) => ({
                    id: `mem_order_${i}`,
                    name: `メモリテストオーダー${i}`,
                    createdAt: '2024-01-01T00:00:00Z'
                })),
                activities: []
            };
            
            const estimatedMemory = this.importService.estimateMemoryUsage(testData);
            const actualSize = JSON.stringify(testData).length;
            
            return estimatedMemory > actualSize && estimatedMemory < actualSize * 10;
        });
        
        // 処理時間の推定
        this.runTest('処理時間の推定', () => {
            const testData = {
                orders: Array(1000).fill(null).map((_, i) => ({ id: `${i}` })),
                activities: Array(5000).fill(null).map((_, i) => ({ id: `${i}` }))
            };
            
            const estimatedTime = this.importService.estimateProcessingTime(testData);
            
            return estimatedTime > 0 && estimatedTime === 6000; // 6000ms (1000 + 5000 要素)
        });
    }

    /**
     * エッジケーステスト
     */
    testEdgeCases() {
        console.log('エッジケーステストを実行中...');
        
        // 極端に長いID/名前の処理
        this.runTest('極端に長いID/名前の処理', () => {
            const extremelyLongString = 'x'.repeat(1000);
            const data = {
                orders: [
                    { id: extremelyLongString, name: extremelyLongString, createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const result = this.importService.validateImportData(data);
            return result.isValid === false && result.errors.length > 0;
        });
        
        // 特殊文字を含むデータの処理
        this.runTest('特殊文字を含むデータの処理', () => {
            const specialChars = '!@#$%^&*()[]{}|;:,.<>?/~`"\'\\';
            const data = {
                orders: [
                    { id: 'special_order', name: `テスト${specialChars}オーダー`, createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const result = this.importService.validateImportData(data);
            return result.isValid === true; // 特殊文字は許可される
        });
        
        // Unicode文字の処理
        this.runTest('Unicode文字の処理', () => {
            const unicodeData = {
                orders: [
                    { id: 'unicode_order', name: '🚀 テスト 📊 オーダー 🎯', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'unicode_activity', name: '🔧 アクティビティ 💻', orderId: 'unicode_order', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            
            const result = this.importService.validateImportData(unicodeData);
            return result.isValid === true;
        });
        
        // 制御文字を含むデータの処理
        this.runTest('制御文字を含むデータの処理', () => {
            const controlChars = '\x00\x01\x02\x03\x04\x05';
            const data = {
                orders: [
                    { id: `control${controlChars}order`, name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const result = this.importService.validateImportData(data);
            return result.isValid === false; // 制御文字は無効
        });
        
        // 極端な日付の処理
        this.runTest('極端な日付の処理', () => {
            const extremeDates = [
                '1000-01-01T00:00:00Z', // 非常に古い日付
                '3000-01-01T00:00:00Z', // 非常に未来の日付
                '2024-02-30T00:00:00Z', // 存在しない日付
                'invalid-date'          // 無効な日付形式
            ];
            
            let invalidCount = 0;
            extremeDates.forEach((date, index) => {
                const data = {
                    orders: [
                        { id: `date_test_${index}`, name: 'テストオーダー', createdAt: date }
                    ],
                    activities: []
                };
                
                const result = this.importService.validateImportData(data);
                if (!result.isValid) {
                    invalidCount++;
                }
            });
            
            return invalidCount >= 3; // 少なくとも3つは無効と判定される
        });
        
        // 循環参照のような構造の処理
        this.runTest('循環参照のような構造の処理', () => {
            // 現在のスキーマでは循環参照は不可能だが、将来の拡張を考慮
            const data = {
                orders: [
                    { id: 'order_a', name: 'オーダーA', createdAt: '2024-01-01T00:00:00Z' },
                    { id: 'order_b', name: 'オーダーB', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'activity_a', name: 'アクティビティA', orderId: 'order_a', createdAt: '2024-01-01T00:00:00Z' },
                    { id: 'activity_b', name: 'アクティビティB', orderId: 'order_b', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            
            const result = this.importService.checkCircularReferences(data.orders, data.activities);
            return result.isValid === true && result.circularReferences.length === 0;
        });
        
        // 空白のみの値の処理
        this.runTest('空白のみの値の処理', () => {
            const whitespaceData = {
                orders: [
                    { id: '   ', name: '\t\n  ', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: []
            };
            
            const result = this.importService.validateImportData(data);
            return result.isValid === false; // 空白のみは無効
        });
        
        // 非常に深いネストの処理
        this.runTest('非常に深いネストの処理', () => {
            // JSONの深いネスト構造をテスト
            let deepObject = { value: 'deep' };
            for (let i = 0; i < 100; i++) {
                deepObject = { nested: deepObject };
            }
            
            const data = {
                orders: [
                    { id: 'deep_order', name: 'ディープオーダー', createdAt: '2024-01-01T00:00:00Z', deep: deepObject }
                ],
                activities: []
            };
            
            try {
                const result = this.importService.validateImportData(data);
                return result.isValid === false; // 予期しないプロパティとして検出される
            } catch (error) {
                return true; // スタックオーバーフローなどのエラーが発生する可能性
            }
        });
        
        // 同時実行のシミュレーション
        this.runTest('同時実行のシミュレーション', async () => {
            const promises = [];
            
            for (let i = 0; i < 5; i++) {
                const data = {
                    orders: [
                        { id: `concurrent_order_${i}`, name: `同時実行オーダー${i}`, createdAt: '2024-01-01T00:00:00Z' }
                    ],
                    activities: []
                };
                
                promises.push(
                    new Promise(resolve => {
                        setTimeout(() => {
                            const result = this.importService.validateImportData(data);
                            resolve(result.isValid);
                        }, Math.random() * 100);
                    })
                );
            }
            
            const results = await Promise.all(promises);
            return results.every(result => result === true);
        });
    }

    /**
     * ネスト構造変換のテスト
     */
    testNestedStructureConversion() {
        console.log('ネスト構造変換テストを実行中...');
        
        // ネスト構造からフラット構造への変換
        this.runTest('ネスト→フラット変換', () => {
            const nestedData = {
                orders: [
                    {
                        id: 'order_1',
                        name: 'テストオーダー',
                        activities: [
                            { id: 'activity_1', name: 'アクティビティ1' },
                            { id: 'activity_2', name: 'アクティビティ2' }
                        ]
                    }
                ]
            };
            
            const flatData = this.importService.convertNestedToFlat(nestedData);
            
            return flatData.orders.length === 1 &&
                   flatData.activities.length === 2 &&
                   flatData.activities[0].orderId === 'order_1' &&
                   flatData.activities[1].orderId === 'order_1';
        });
        
        // フラット構造からネスト構造への変換
        this.runTest('フラット→ネスト変換', () => {
            const flatData = {
                orders: [
                    { id: 'order_1', name: 'テストオーダー', createdAt: '2024-01-01T00:00:00Z' }
                ],
                activities: [
                    { id: 'activity_1', name: 'アクティビティ1', orderId: 'order_1', createdAt: '2024-01-01T00:00:00Z' },
                    { id: 'activity_2', name: 'アクティビティ2', orderId: 'order_1', createdAt: '2024-01-01T00:00:00Z' }
                ]
            };
            
            const nestedData = this.importService.convertFlatToNested(flatData);
            
            return nestedData.orders.length === 1 &&
                   nestedData.orders[0].activities.length === 2 &&
                   nestedData.orders[0].activities[0].id === 'activity_1';
        });
        
        // 空のデータの変換
        this.runTest('空データの変換', () => {
            const emptyNested = { orders: [] };
            const emptyFlat = { orders: [], activities: [] };
            
            const flatResult = this.importService.convertNestedToFlat(emptyNested);
            const nestedResult = this.importService.convertFlatToNested(emptyFlat);
            
            return flatResult.orders.length === 0 &&
                   flatResult.activities.length === 0 &&
                   nestedResult.orders.length === 0;
        });
        
        // アクティビティなしオーダーの変換
        this.runTest('アクティビティなしオーダーの変換', () => {
            const nestedData = {
                orders: [
                    { id: 'order_1', name: 'テストオーダー' }
                ]
            };
            
            const flatData = this.importService.convertNestedToFlat(nestedData);
            
            return flatData.orders.length === 1 &&
                   flatData.activities.length === 0 &&
                   flatData.orders[0].createdAt; // createdAtが自動生成される
        });
        
        // 複数オーダーの変換
        this.runTest('複数オーダーの変換', () => {
            const nestedData = {
                orders: [
                    {
                        id: 'order_1',
                        name: 'オーダー1',
                        activities: [
                            { id: 'activity_1', name: 'アクティビティ1' }
                        ]
                    },
                    {
                        id: 'order_2',
                        name: 'オーダー2',
                        activities: [
                            { id: 'activity_2', name: 'アクティビティ2' },
                            { id: 'activity_3', name: 'アクティビティ3' }
                        ]
                    }
                ]
            };
            
            const flatData = this.importService.convertNestedToFlat(nestedData);
            
            return flatData.orders.length === 2 &&
                   flatData.activities.length === 3 &&
                   flatData.activities.filter(a => a.orderId === 'order_1').length === 1 &&
                   flatData.activities.filter(a => a.orderId === 'order_2').length === 2;
        });
        
        // 不正なデータの変換
        this.runTest('不正なデータの変換', () => {
            const invalidData = { orders: null };
            const flatData = this.importService.convertNestedToFlat(invalidData);
            
            return flatData.orders.length === 0 && flatData.activities.length === 0;
        });
        
        // createdAtの自動生成
        this.runTest('createdAtの自動生成', () => {
            const nestedData = {
                orders: [
                    {
                        id: 'order_1',
                        name: 'テストオーダー',
                        activities: [
                            { id: 'activity_1', name: 'アクティビティ1' }
                        ]
                    }
                ]
            };
            
            const flatData = this.importService.convertNestedToFlat(nestedData);
            
            return flatData.orders[0].createdAt &&
                   flatData.activities[0].createdAt &&
                   new Date(flatData.orders[0].createdAt).getTime() > 0;
        });
        
        // 既存のcreatedAtの保持
        this.runTest('既存のcreatedAtの保持', () => {
            const testDate = '2024-01-01T00:00:00Z';
            const nestedData = {
                orders: [
                    {
                        id: 'order_1',
                        name: 'テストオーダー',
                        createdAt: testDate,
                        activities: [
                            { id: 'activity_1', name: 'アクティビティ1', createdAt: testDate }
                        ]
                    }
                ]
            };
            
            const flatData = this.importService.convertNestedToFlat(nestedData);
            
            return flatData.orders[0].createdAt === testDate &&
                   flatData.activities[0].createdAt === testDate;
        });
    }

    /**
     * サンプルデータでのインテグレーションテスト
     * @returns {Promise<Object>} テスト結果
     */
    async runIntegrationTest() {
        console.log('インテグレーションテストを実行中...');
        
        try {
            // サンプルJSONデータを生成
            const sampleJSON = this.importService.generateSampleJSON();
            
            // JSONを解析
            const importData = this.importService.parseJSON(sampleJSON);
            
            // データを検証
            const validationResult = this.importService.validateImportData(importData);
            if (!validationResult.isValid) {
                throw new Error(`データ検証に失敗: ${validationResult.errors.join(', ')}`);
            }
            
            // 重複をチェック
            const duplicateCheck = this.importService.checkDuplicates(importData);
            
            // インポートを実行
            const importResult = await this.importService.executeImport(importData, duplicateCheck, { duplicateHandling: 'skip' });
            
            if (!importResult.success) {
                throw new Error(`インポートに失敗: ${importResult.errors.join(', ')}`);
            }
            
            console.log('✅ インテグレーションテスト成功');
            return { success: true, result: importResult };
            
        } catch (error) {
            console.log(`❌ インテグレーションテスト失敗: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
    window.ImportTest = ImportTest;
}