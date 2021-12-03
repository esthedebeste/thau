import { webcrypto } from "node:crypto";
import type { IncomingMessage } from "node:http";
import * as http from "node:http";
import * as https from "node:https";
import { createThau } from "./thau.js";

const crypto = webcrypto as unknown as typeof globalThis.Crypto.prototype;

const request = (url: URL): Promise<IncomingMessage> => {
	return url.protocol === "https:"
		? new Promise(resolve => https.get(url, resolve))
		: new Promise(resolve => http.get(url, resolve));
};

export const Thau = createThau(crypto.subtle, {
	base64url(data: string): Buffer {
		return Buffer.from(data, "base64url");
	},
	stringify(data: Buffer): string {
		return data.toString("utf8");
	},
	async getJSON(url: string) {
		const res = await request(new URL(url));
		let body = "";
		for await (const chunk of res) body += chunk;
		return JSON.parse(body);
	},
});

export * from "./middleware.js";
