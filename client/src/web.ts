/* eslint-env browser */
import { createThau } from "./thau.js";
import { base64ToArr, UTF8ArrToStr } from "./web-b64.js";

export const Thau = createThau({
	base64url(data: string): Uint8Array {
		const pad = data.length % 4;
		if (pad > 1) data += "==".repeat(4 - pad);
		return base64ToArr(data.replace(/-/g, "+").replace(/_/g, "/"));
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
	stringify: UTF8ArrToStr,
	async verify(
		key: CryptoKey,
		token: Uint8Array,
		signature: Uint8Array,
		shatype: string
	) {
		return await crypto.subtle.verify(
			{ name: "ECDSA", hash: shatype },
			key,
			signature,
			token
		);
	},
});
