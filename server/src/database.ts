import { readFileSync } from "node:fs";
import pg from "pg";

const pool = new pg.Pool({
	connectionString:
		process.env.DATABASE_URL ||
		readFileSync(new URL("../secrets/database_url", import.meta.url), "utf8"),
	ssl: {
		rejectUnauthorized: false,
	},
});
await pool.connect();
const query1 = `
INSERT INTO thau_users(id)
	VALUES($1)
	ON CONFLICT(id) DO NOTHING;`.trim();
const query2 = `SELECT (uid) FROM thau_users WHERE id=$1;`;

declare const testdb: { users: Record<string, string>; currentid: number };

export const getsert = process.argv.includes("--dev")
	? async (accountType: string, accountId: string) => {
			const id = accountType.toLowerCase() + "_" + accountId;
			globalThis.testdb ??= <typeof testdb>{ users: {}, currentid: 0 };
			return id in testdb.users
				? testdb.users[id]
				: (testdb.users[id] = String(testdb.currentid++));
	  }
	: async (accountType: string, accountId: string) => {
			const id = accountType.toLowerCase() + "_" + accountId;
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				await client.query(query1, [id]);
				const res = await client.query(query2, [id]);
				await client.query("COMMIT");
				return res.rows[0].uid;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
	  };
