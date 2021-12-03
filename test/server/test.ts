import { Coggers } from "coggers";
import * as thau from "../../client/src/index.js";
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
	$get(_, res) {
		res.redirect(redir);
	},
	callback: {
		$get: [
			thau.coggers({
				urls: [`http://localhost:${port}/callback`],
				url: keyURL,
			}),
			(req, res) => {
				res.json(req.thau);
			},
		],
	},
});

await coggers.listen(port);
console.log(`Thau testing @ http://localhost:${port}/`);
