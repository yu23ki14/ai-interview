/**
 * テスト用データベースヘルパー
 */

/** 全テーブルのデータを削除する */
export async function cleanDatabase(db: D1Database) {
	await db.batch([db.prepare("DELETE FROM users")]);
}

/** テストユーザーを作成する */
export async function createTestUser(db: D1Database, userId: string, name: string) {
	await db
		.prepare("INSERT INTO users (id, name, created_at) VALUES (?, ?, unixepoch())")
		.bind(userId, name)
		.run();
}
