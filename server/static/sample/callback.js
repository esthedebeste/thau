import * as thau_ from "./thau/web.js";
/** @type {import("../../../client/dist/web.js")} */
const thau = thau_;
const verifier = new thau.Thau({ urls: ["/sample/callback"] });
const query = new URLSearchParams(window.location.search);
const token = await verifier.verify(query.get("token"), query.get("signature"));

document.querySelector("#uid").textContent = token.uid;

document.querySelector("#token").textContent = query.get("token");
document.querySelector("#signature").textContent = query.get("signature");
