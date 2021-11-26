import { webcrypto } from "node:crypto";
import type { IncomingMessage } from "node:http";
import * as http from "node:http";
import * as https from "node:https";
import { createThau } from "./thau.js";

const { subtle } = webcrypto as unknown as typeof globalThis.Crypto.prototype;

const request = (url: URL): Promise<IncomingMessage> => {
	if (url.protocol === "https:")
		return new Promise(resolve => https.get(url, resolve));
	else return new Promise(resolve => http.get(url, resolve));
};

export const Thau = createThau({
	base64url(data: string): Buffer {
		return Buffer.from(data, "base64url");
	},
	async getData(url: string) {
		const res = await request(new URL(url));
		let body = "";
		for await (const chunk of res) body += chunk;
		const json = JSON.parse(body);
		return {
			key: await subtle.importKey(
				"jwk",
				json.key,
				{
					name: "ECDSA",
					hash: { name: json.shatype },
					namedCurve: json.key.crv,
				},
				false,
				["verify"]
			),
			shatype: json.shatype,
		};
	},
	stringify(data: Buffer): string {
		return data.toString("utf8");
	},
	async verify(
		key: CryptoKey,
		token: Buffer,
		signature: Buffer,
		shatype: string
	) {
		return await subtle.verify(
			{ name: "ECDSA", hash: shatype },
			key,
			signature,
			token
		);
	},
});
