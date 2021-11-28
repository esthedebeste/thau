// Rewrite of https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding

const b64ToUint6 = (chr: number) =>
	chr > 64 && chr < 91
		? chr - 65
		: chr > 96 && chr < 123
		? chr - 71
		: chr > 47 && chr < 58
		? chr + 4
		: chr === 43
		? 62
		: chr === 47
		? 63
		: 0;

export function base64ToArr(base64: string): Uint8Array {
	const b64 = base64.replace(/[^A-Za-z0-9+/]/g, ""),
		inLen = b64.length,
		outLen = (inLen * 3 + 1) >> 2,
		bytes = new Uint8Array(outLen);
	let uint24 = 0;
	let outI = 0;
	for (let inI = 0; inI < inLen; inI++) {
		const mod4 = inI & 3;
		uint24 |= b64ToUint6(b64.charCodeAt(inI)) << (6 * (3 - mod4));
		if (mod4 === 3 || inLen - inI === 1) {
			for (let mod3 = 0; mod3 < 3 && outI < outLen; mod3++, outI++)
				bytes[outI] = (uint24 >>> ((16 >>> mod3) & 24)) & 255;
			uint24 = 0;
		}
	}

	return bytes;
}

/* Base64 string to array encoding */

const uint6ToB64 = (uint6: number) =>
	uint6 < 26
		? uint6 + 65
		: uint6 < 52
		? uint6 + 71
		: uint6 < 62
		? uint6 - 4
		: uint6 === 62
		? 43
		: uint6 === 63
		? 47
		: 65;

export function arrToBase64(bytes: Uint8Array): string {
	let mod3 = 2,
		base64 = "",
		uint24 = 0;
	for (let i = 0; i < bytes.length; i++) {
		mod3 = i % 3;
		if (i > 0 && ((i * 4) / 3) % 76 === 0) base64 += "\r\n";
		uint24 |= bytes[i] << ((16 >>> mod3) & 24);
		if (mod3 === 2 || bytes.length - i === 1) {
			base64 += String.fromCharCode(
				uint6ToB64((uint24 >>> 18) & 63),
				uint6ToB64((uint24 >>> 12) & 63),
				uint6ToB64((uint24 >>> 6) & 63),
				uint6ToB64(uint24 & 63)
			);
			uint24 = 0;
		}
	}

	return (
		base64.slice(0, base64.length - 2 + mod3) +
		(mod3 === 2 ? "" : mod3 === 1 ? "=" : "==")
	);
}

export function UTF8ArrToStr(bytes: Uint8Array): string {
	let str = "";

	const len = bytes.length;
	for (let i = 0; i < len; i++) {
		const byte = bytes[i];
		str += String.fromCharCode(
			byte > 251 && byte < 254 && i + 5 < len /* 6 bytes */
				? /* (byte - 252 << 30) may be not so safe in ECMAScript! So...: */
				  (byte - 252) * 1073741824 +
						((bytes[++i] - 128) << 24) +
						((bytes[++i] - 128) << 18) +
						((bytes[++i] - 128) << 12) +
						((bytes[++i] - 128) << 6) +
						bytes[++i] -
						128
				: byte > 247 && byte < 252 && i + 4 < len /* 5 bytes */
				? ((byte - 248) << 24) +
				  ((bytes[++i] - 128) << 18) +
				  ((bytes[++i] - 128) << 12) +
				  ((bytes[++i] - 128) << 6) +
				  bytes[++i] -
				  128
				: byte > 239 && byte < 248 && i + 3 < len /* 4 bytes */
				? ((byte - 240) << 18) +
				  ((bytes[++i] - 128) << 12) +
				  ((bytes[++i] - 128) << 6) +
				  bytes[++i] -
				  128
				: byte > 223 && byte < 240 && i + 2 < len /* 3 bytes */
				? ((byte - 224) << 12) + ((bytes[++i] - 128) << 6) + bytes[++i] - 128
				: byte > 191 && byte < 224 && i + 1 < len /* 2 bytes */
				? ((byte - 192) << 6) + bytes[++i] - 128
				: /* nPart < 127 ? */ /* 1 byte */
				  byte
		);
	}

	return str;
}
