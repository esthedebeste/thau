/* eslint-env browser */
import { createThau } from "./thau.js";

const b64urlToUint6 = (chr: number) =>
	chr > 64 && chr < 91 /* A-Z */
		? chr - 65
		: chr > 96 && chr < 123 /* a-z */
		? chr - 71
		: chr > 47 && chr < 58 /* 0-9 */
		? chr + 4
		: chr === 45 /* - */
		? 62
		: chr === 95 /* _ */
		? 63
		: 0;

export const Thau = createThau(crypto.subtle, {
	// base64url modification of base64DecToArr from https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
	base64url: (base64url: string) => {
		const b64 = base64url.replace(/[^A-Za-z0-9_-]/g, ""),
			inLen = b64.length,
			outLen = (inLen * 3 + 1) >> 2,
			bytes = new Uint8Array(outLen);
		let uint24 = 0;
		let outI = 0;
		for (let inI = 0; inI < inLen; inI++) {
			const mod4 = inI & 3;
			uint24 |= b64urlToUint6(b64.charCodeAt(inI)) << (6 * (3 - mod4));
			if (mod4 === 3 || inLen - inI === 1) {
				for (let mod3 = 0; mod3 < 3 && outI < outLen; mod3++, outI++)
					bytes[outI] = (uint24 >>> ((16 >>> mod3) & 24)) & 255;
				uint24 = 0;
			}
		}
		return bytes;
	},
	getJSON: (url: string) => fetch(url).then(res => res.json()),
	stringify: (arr: Uint8Array) => new TextDecoder().decode(arr),
});
