import { Coggers, express } from "coggers";
import sirv from "sirv";
import { fileURLToPath } from "url";
import { coggers as coggersMW } from "../../client/src/index.js";
import "../../server/src/server.js";
// Test web-node interop
// import { server } from "../../server/src/server.js";
// console.log(server);
const thauPort = process.env.PORT || 8080;
const port = +thauPort + 1;
const thauURL = `http://localhost:${thauPort}/`;

const redir = new URL(
	`/auth?callback=http://localhost:${port}/callback`,
	thauURL
).href;
const keyURL = new URL(`/keys`, thauURL).href;
const coggers = new Coggers({
	$: express(
		sirv(fileURLToPath(new URL("../../client/dist", import.meta.url)))
	),
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
					`Data: <br>${JSON.stringify(
						req.thau,
						null,
						2
					)} Script accepts: <span data-keyurl="${keyURL}" id="scriptok"></span><script type="module" src="/script.js"></script>`
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
