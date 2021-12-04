import assert from "node:assert";
import { readFileSync } from "node:fs";
import pg from "pg";
import { prod } from "./utils.js";

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
INSERT INTO thau_users (id) 
SELECT id FROM (values ($1)) v(id) 
WHERE NOT EXISTS (SELECT 1 FROM thau_users WHERE id=$1);`.trim();
const query2 = `SELECT (uid) FROM thau_users WHERE id=$1;`;

declare const testdb: { users: Record<string, string>; currentid: number };

export const getsert = !prod
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
				assert(typeof res.rows[0].uid === "string");
				client.release();
				return res.rows[0].uid as string;
			} catch (error) {
				await client.query("ROLLBACK");
				client.release();
				throw error;
			}
	  };
