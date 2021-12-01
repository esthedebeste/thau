import * as thau_ from "./thau/web.js";
/** @type {import("../../../client/dist/web.js")} */
const thau = thau_;
const verifier = new thau.Thau({ urls: ["/sample/callback"] });
const query = new URLSearchParams(window.location.search);
const token = await verifier.verify(query.get("token"), query.get("signature"));

document.getElementById("uid").innerText = token.uid;

document.getElementById("token").innerText = query.get("token");
document.getElementById("signature").innerText = query.get("signature");
