let token;
const query = new URLSearchParams(window.location.search);
if (query.has("id_token")) {
	// openid connect, b64url impl copied from client/web.ts
	const b64urlToUint6 = chr =>
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
	const b64urldecode = base64url => {
		const b64 = base64url.replace(/[^\w-]/g, ""),
			inLen = b64.length,
			outLen = (inLen * 3 + 1) >> 2,
			bytes = new Uint8Array(outLen);
		let uint24 = 0,
			outI = 0;
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
	};
	const [header, data, signature] = query
		.get("id_token")
		.split(".")
		.map(part => b64urldecode(part));
	const textData = new TextDecoder().decode(data);
	console.log({ header, rawData: data, data: JSON.parse(textData), signature });
	token = JSON.parse(textData);
	document.querySelector("#token").textContent = query.get("id_token");
	document.querySelector("#signature").textContent =
		"(integrated into the token JWT)";
} else if (query.has("token")) {
	// thau-style
	/** @type {import("../../../client/dist/web.js")} */
	const { Thau } = await import("./thau/web.js");
	const keys = new URL("/key", location.href);
	const verifier = new Thau({ urls: ["/sample/callback"], url: keys });
	token = await verifier.verifyQuery(query);
	document.querySelector("#token").textContent = query.get("token");
	document.querySelector("#signature").textContent = query.get("signature");
}

document.querySelector("#uid").textContent = token.uid || token.sub;
const tbody = document.querySelector("tbody");
function add(key, value = token[key]) {
	const row = tbody.insertRow();
	const name = document.createElement("th");
	name.textContent = key;
	row.append(name);
	const val = row.insertCell();
	val.append(value);
}
if (token.sub)
	// openid connect
	add("sub", token.sub);
else if (token.uid)
	// thau
	add("uid", token.uid);
add("iat", token.iat);
add("aud", token.aud);
add("extra.name", token.extra.name);
if (token.extra.avatar == null) add("extra.avatar", "undefined");
else {
	const avatar = document.createElement("a");
	avatar.href = token.extra.avatar;
	avatar.target = "_blank";
	avatar.textContent = token.extra.avatar;
	add("extra.avatar", avatar);
}
