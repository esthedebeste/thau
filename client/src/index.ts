import type { JsonWebKey, KeyObject } from "node:crypto";
import * as crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import * as https from "node:https";

const request = (url: string): Promise<IncomingMessage> =>
	new Promise(resolve => https.get(url, resolve));
export type ThauOptions = {
	/** Defaults to https://thau.herokuapp.com/keys */
	url: string;
};
export class Thau {
	url: string;
	key: KeyObject;
	constructor(options: ThauOptions) {
		this.url = options.url;
	}
	/** Refreshes signature keys. */
	async refreshData() {
		type KeysResponse = {
			key: JsonWebKey;
		};
		const res = await request(this.url);
		let body = "";
		for await (const chunk of res) body += chunk;
		const json: KeysResponse = JSON.parse(body);
		this.key = crypto.createPublicKey({
			format: "jwk",
			key: json.key,
		});
	}

	async verify(data: Buffer, signature: Buffer) {
		if (this.key == null) await this.refreshData();
		const verifier = crypto.createVerify("SHA256");
		verifier.update(data);
		verifier.end();
		return verifier.verify(this.key, signature);
	}
}

export * from "./middleware.js";
