/* eslint-env browser */
import { createThau } from "./thau.js";
import { base64ToArr, UTF8ArrToStr } from "./web-b64.js";

const b64rep = {
	"-": "+",
	_: "/",
};

export const Thau = createThau(crypto.subtle, {
	base64url(data: string): Uint8Array {
		const pad = data.length % 4;
		if (pad > 1) data += "==".repeat(4 - pad);
		return base64ToArr(data.replace(/[-_]/g, chr => b64rep[chr]));
	},
	getJSON: (url: string) => fetch(url).then(res => res.json()),
	stringify: UTF8ArrToStr,
});
