import * as thau_ from "./index.js";
/** @type {typeof import("../../../client/src/index.js")["Thau"]} */
const Thau = thau_.Thau;

const scriptdata = document.getElementById("scriptdata");
const keyurl = scriptdata.dataset.keyurl;
const loc = Object.fromEntries(new URLSearchParams(location.search));
const thau = new Thau({
	urls: [`http://localhost:${location.port}/callback`],
	url: keyurl,
});

try {
	const token = await thau.verify(loc.token, loc.signature, loc.data);
	console.log(token);
	scriptdata.innerText = JSON.stringify(token, null, 2).replaceAll("\n", " ");
} catch (error) {
	scriptdata.innerText = "FAIL " + JSON.stringify(error, null, 2);
	throw error;
}
