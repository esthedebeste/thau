/* eslint-env browser */
import { createThau } from "./thau.js";

const toArrayBuffer = (str: string): ArrayBuffer =>
	new TextEncoder().encode(str);

export const Thau = createThau({
	base64url(data: string): string {
		const pad = data.length % 4;
		if (pad > 1) data += "==".repeat(4 - pad);
		return window.atob(data.replace(/-/g, "+").replace(/_/g, "/"));
	},
	async getData(url: string) {
		const res = await fetch(url);
		const json = await res.json();
		return {
			key: await crypto.subtle.importKey(
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
	stringify(data: string): string {
		return data;
	},
	async verify(
		key: CryptoKey,
		token: string,
		signature: string,
		shatype: string
	) {
		return await crypto.subtle.verify(
			{ name: "ECDSA", hash: shatype },
			key,
			toArrayBuffer(signature),
			toArrayBuffer(token)
		);
	},
});
