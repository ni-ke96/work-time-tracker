/**
 * タイマー機能の単体テスト
 * 時間計算ロジックとセッション切り替えのテスト
 */

/**
 * シンプルなテストフレームワーク
 */
class SimpleTest {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    /**
     * テストを追加
     * @param {string} name - テスト名
     * @param {Function} testFn - テスト関数
     */
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    /**
     * アサーション: 等価チェック
     * @param {*} actual - 実際の値
     * @param {*} expected - 期待値
     * @param {string} message - エラーメッセージ
     */
    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
        }
    }

    /**
     * アサーション: 真偽値チェック
     * @param {boolean} condition - 条件
     * @param {string} message - エラーメッセージ
     */
    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`${message} - Expected true, but got false`);
        }
    }

    /**
     * アサーション: null/undefinedチェック
     * @param {*} value - 値
     * @param {string} message - エラーメッセージ
     */
    assertNotNull(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} - Expected non-null value`);
        }
    }

    /**
     * 全テストを実行
     */
    async run() {
        console.log('=== タイマー機能テスト開始 ===');
        
        for (const test of this.tests) {
            try {
                await test.testFn();
                this.results.push({ name: test.name, status: 'PASS', error: null });
                console.log(`✓ ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, status: 'FAIL', error: error.message });
                console.error(`✗ ${test.name}: ${error.message}`);
            }
        }

        this.printSummary();
    }

    /**
     * テスト結果のサマリーを表示
     */
    printSummary() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log('\n=== テスト結果サマリー ===');
        console.log(`総テスト数: ${this.results.length}`);
        console.log(`成功: ${passed}`);
        console.log(`失敗: ${failed}`);
        
        if (failed > 0) {
            console.log('\n失敗したテスト:');
            this.results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`- ${r.name}: ${r.error}`);
            });
        }
    }
}

/**
 * モックリポジトリクラス（テスト用）
 */
class MockRepository {
    constructor() {
        this.sessions = [];
        this.activities = [];
        this.currentSession = null;
        this.sessionIdCounter = 1;
    }

    createSession(activityId, startTime = new Date().toISOString()) {
        const session = {
            id: `session_${this.sessionIdCounter++}`,
            activityId: activityId,
            startTime: startTime,
            endTime: null,
            duration: 0
        };
        this.sessions.push(session);
        return session;
    }

    endSession(sessionId, endTime = new Date().toISOString()) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (session) {
            session.endTime = endTime;
            const start = new Date(session.startTime);
            const end = new Date(endTime);
            session.duration = end.getTime() - start.getTime();
        }
        return session;
    }

    setCurrentSession(activityId, startTime = new Date().toISOString()) {
        if (activityId === null) {
            this.currentSession = null;
        } else {
            this.currentSession = {
                activityId: activityId,
                startTime: startTime
            };
        }
    }

    getCurrentSession() {
        if (!this.currentSession) return null;
        
        const session = this.sessions.find(s => 
            s.activityId === this.currentSession.activityId && 
            s.endTime === null
        );
        
        return session ? {
            ...session,
            isActive: () => session.endTime === null
        } : null;
    }

    getActivityById(activityId) {
        return this.activities.find(a => a.id === activityId) || {
            id: activityId,
            name: `Activity ${activityId}`,
            orderId: 'order_1'
        };
    }
}

/**
 * タイマーテストスイート
 */
function createTimerTests() {
    const testSuite = new SimpleTest();

    // テスト1: TimerServiceの初期化
    testSuite.test('TimerService初期化テスト', () => {
        const mockRepo = new MockRepository();
        const timerService = new TimerService(mockRepo);
        
        testSuite.assertEqual(timerService.currentSession, null, '初期状態では現在のセッションはnull');
        testSuite.assertEqual(timerService.timerInterval, null, '初期状態ではタイマーインターバルはnull');
        testSuite.assertEqual(timerService.isWorking(), false, '初期状態では作業中ではない');
    });

    // テスト2: 作業開始機能
    testSuite.test('作業開始機能テスト', () => {
        const mockRepo = new MockRepository();
        const timerService = new TimerService(mockRepo);
        
        const result = timerService.startWork('activity_1');
        
        testSuite.assertTrue(result, '作業開始が成功する');
        testSuite.assertTrue(timerService.isWorking(), '作業中状態になる');
        testSuite.assertNotNull(timerService.getCurrentSession(), '現在のセッションが設定される');
        testSuite.assertEqual(timerService.getCurrentSession().activityId, 'activity_1', '正しいアクティビティIDが設定される');
    });

    // テスト3: 作業停止機能
    testSuite.test('作業停止機能テスト', () => {
        const mockRepo = new MockRepository();
        const timerService = new TimerService(mockRepo);
        
        // 作業を開始
        timerService.startWork('activity_1');
        testSuite.assertTrue(timerService.isWorking(), '作業が開始されている');
        
        // 作業を停止
        const result = timerService.stopWork();
        
        testSuite.assertTrue(result, '作業停止が成功する');
        testSuite.assertEqual(timerService.isWorking(), false, '作業中ではない状態になる');
        testSuite.assertEqual(timerService.getCurrentSession(), null, '現在のセッションがnullになる');
    });

    // テスト4: 作業切り替え機能
    testSuite.test('作業切り替え機能テスト', () => {
        const mockRepo = new MockRepository();
        const timerService = new TimerService(mockRepo);
        
        // 最初の作業を開始
        timerService.startWork('activity_1');
        testSuite.assertEqual(timerService.getCurrentSession().activityId, 'activity_1', '最初のアクティビティが開始される');
        
        // 別の作業に切り替え
        const result = timerService.switchWork('activity_2');
        
        testSuite.assertTrue(result, '作業切り替えが成功する');
        testSuite.assertTrue(timerService.isWorking(), '作業中状態が継続される');
        testSuite.assertEqual(timerService.getCurrentSession().activityId, 'activity_2', '新しいアクティビティに切り替わる');
    });

    // テスト5: 経過時間計算
    testSuite.test('経過時間計算テスト', async () => {
        const mockRepo = new MockRepository();
        const timerService = new TimerService(mockRepo);
        
        // 作業を開始
        timerService.startWork('activity_1');
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const elapsed = timerService.getCurrentElapsed();
        
        testSuite.assertTrue(elapsed >= 90, '経過時間が正しく計算される（最低90ms）');
        testSuite.assertTrue(elapsed <= 200, '経過時間が妥当な範囲内（最大200ms）');
    });

    // テスト6: アクティビティ状態チェック
    testSuite.test('アクティビティ状態チェックテスト', () => {
        const mockRepo = new MockRepository();
        const timerService = new TimerService(mockRepo);
        
        // 作業開始前
        testSuite.assertEqual(timerService.isActivityActive('activity_1'), false, '作業開始前はアクティブではない');
        
        // 作業開始後
        timerService.startWork('activity_1');
        testSuite.assertTrue(timerService.isActivityActive('activity_1'), '作業開始後はアクティブになる');
        testSuite.assertEqual(timerService.isActivityActive('activity_2'), false, '他のアクティビティはアクティブではない');
        
        // 作業切り替え後
        timerService.switchWork('activity_2');
        testSuite.assertEqual(timerService.isActivityActive('activity_1'), false, '前のアクティビティはアクティブではない');
        testSuite.assertTrue(timerService.isActivityActive('activity_2'), '新しいアクティビティがアクティブになる');
    });

    // テスト7: コールバック機能
    testSuite.test('コールバック機能テスト', () => {
        const mockRepo = new MockRepository();
        const timerService = new TimerService(mockRepo);
        
        let startCallbackCalled = false;
        let stopCallbackCalled = false;
        let switchCallbackCalled = false;
        
        // コールバックを設定
        timerService.on('start', () => { startCallbackCalled = true; });
        timerService.on('stop', () => { stopCallbackCalled = true; });
        timerService.on('switch', () => { switchCallbackCalled = true; });
        
        // 作業開始
        timerService.startWork('activity_1');
        testSuite.assertTrue(startCallbackCalled, 'startコールバックが呼ばれる');
        
        // 作業切り替え
        timerService.switchWork('activity_2');
        testSuite.assertTrue(switchCallbackCalled, 'switchコールバックが呼ばれる');
        
        // 作業停止
        timerService.stopWork();
        testSuite.assertTrue(stopCallbackCalled, 'stopコールバックが呼ばれる');
    });

    // テスト8: エラーハンドリング
    testSuite.test('エラーハンドリングテスト', () => {
        const mockRepo = new MockRepository();
        
        // createSessionでエラーを発生させる
        mockRepo.createSession = () => {
            throw new Error('テスト用エラー');
        };
        
        const timerService = new TimerService(mockRepo);
        
        // エラーが発生しても例外が投げられないことを確認
        const result = timerService.startWork('activity_1');
        testSuite.assertEqual(result, false, 'エラー時はfalseが返される');
        testSuite.assertEqual(timerService.isWorking(), false, 'エラー時は作業中状態にならない');
    });

    // テスト9: 重複セッション防止
    testSuite.test('重複セッション防止テスト', () => {
        const mockRepo = new MockRepository();
        const timerService = new TimerService(mockRepo);
        
        // 最初の作業を開始
        timerService.startWork('activity_1');
        const firstSessionId = timerService.getCurrentSession().id;
        
        // 同じアクティビティで再度開始を試行
        timerService.startWork('activity_1');
        const secondSessionId = timerService.getCurrentSession().id;
        
        // 新しいセッションが作成されることを確認（前のセッションは自動的に終了される）
        testSuite.assertTrue(firstSessionId !== secondSessionId, '新しいセッションが作成される');
        testSuite.assertTrue(timerService.isWorking(), '作業中状態が維持される');
    });

    return testSuite;
}

/**
 * テストを実行する関数
 */
async function runTimerTests() {
    // 必要なクラスが利用可能かチェック
    if (typeof TimerService === 'undefined') {
        console.error('TimerServiceクラスが見つかりません。timer.jsを読み込んでください。');
        return;
    }

    const testSuite = createTimerTests();
    await testSuite.run();
}

// ブラウザ環境での自動実行
if (typeof window !== 'undefined') {
    window.runTimerTests = runTimerTests;
    
    // DOMContentLoadedイベントでテストを実行（デバッグ用）
    // document.addEventListener('DOMContentLoaded', runTimerTests);
}

// Node.js環境での実行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTimerTests, createTimerTests };
}