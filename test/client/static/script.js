import * as thau_ from "./index.js";
/** @type {typeof import("../../../client/src/index.js")["Thau"]} */
const Thau = thau_.Thau;

const scriptok = document.getElementById("scriptok");
const keyurl = scriptok.dataset.keyurl;
const loc = Object.fromEntries(new URLSearchParams(location.search));
const thau = new Thau({
	urls: [`http://localhost:${location.port}/`],
	url: keyurl,
});

try {
	const token = await thau.verify(loc.token, loc.signature, loc.data);
	console.log(token);
	scriptok.innerText = "SUCCESS";
} catch (error) {
	scriptok.innerText = "FAIL";
	throw error;
}
