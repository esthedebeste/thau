import { Coggers } from "coggers";
import * as thau from "../../client/src/index.js";
import "../../server/src/server.js";
const thauPort = process.env.PORT || 8080;
const PORT = +thauPort + 1;

const thauURL = `http://localhost:${thauPort}/`;

const coggers = new Coggers({
	$get(_, res) {
		res.redirect(
			new URL(`/auth?callback=http://localhost:${PORT}/callback`, thauURL).href
		);
	},
	callback: {
		$get: [
			thau.coggers({
				urls: [`http://localhost:${PORT}/callback`],
				url: `http://localhost:${thauPort}/keys`,
			}),
			(req, res) => {
				res.json(req.thau);
			},
		],
	},
});

await coggers.listen(PORT);
console.log(`Thau testing @ http://localhost:${PORT}/`);
