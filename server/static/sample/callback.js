import * as thau_ from "./thau/web.js";
/** @type {import("../../../client/dist/web.js")} */
const thau = thau_;
const keys = new URL("/keys", location.href);
const verifier = new thau.Thau({ urls: ["/sample/callback"], url: keys });
const query = new URLSearchParams(window.location.search);
const token = await verifier.verify(query.get("token"), query.get("signature"));

document.querySelector("#uid").textContent = token.uid;
const tbody = document.querySelector("tbody");
function add(key, value = token[key]) {
	const row = tbody.insertRow();
	const name = document.createElement("th");
	name.textContent = key;
	row.append(name);
	const val = row.insertCell();
	val.append(value);
}
add("uid", token.uid);
add("iat", token.iat);
add("aud", token.aud);
add("extra.name", token.extra.name);
const avatar = document.createElement("a");
avatar.href = token.extra.avatar;
avatar.target = "_blank";
avatar.textContent = token.extra.avatar;
add("extra.avatar", avatar);

document.querySelector("#token").textContent = query.get("token");
document.querySelector("#signature").textContent = query.get("signature");
