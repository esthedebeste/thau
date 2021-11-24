import { readFileSync } from "fs";
// @ts-ignore
import pg from "pg";

const pool = new (pg as typeof import("pg")).Pool({
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
export const getsert = async (accountType: string, accountId: string) => {
	const id = accountType.toLowerCase() + "_" + accountId;
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query(query1, [id]);
		const res = await client.query(query2, [id]);
		await client.query("COMMIT");
		return res.rows[0].uid;
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
	}
};
