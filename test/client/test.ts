import { Coggers, serveStatic } from "coggers";
import { coggers as coggersMW } from "../../client/src/index.js";
import "../../server/src/server.js";
const thauPort = process.env.PORT || 8080;
const port = +thauPort + 1;
const thauURL = `http://localhost:${thauPort}/`;

const redir = new URL(
	`/auth?callback=http://localhost:${port}/callback`,
	thauURL
).href;
const keyURL = new URL(`/keys`, thauURL).href;
const coggers = new Coggers({
	...serveStatic(new URL("../../client/dist", import.meta.url)),
	$get(_, res) {
		res.redirect(redir);
	},
	callback: {
		$get: [
			coggersMW({
				urls: [`http://localhost:${port}/callback`],
				url: keyURL,
			}),
			(req, res) => {
				res.html(
					`<style>html{font-family:system-ui;}code{font-weight:bold;border:2px solid #ccc;}</style>Data from server: <code>${JSON.stringify(
						req.thau,
						null,
						2
					)}</code> <br> Data from browser: <code data-keyurl="${keyURL}" id="scriptdata"></code><script type="module" src="/script.js"></script>`
				);
			},
		],
	},
	"script.js": {
		$get(_req, res) {
			res.sendFile(new URL("./static/script.js", import.meta.url));
		},
	},
});

await coggers.listen(port);
console.log(`Thau testing @ http://localhost:${port}/`);
