import { Coggers } from "coggers";
import * as thau from "../../client/src/index.js";

export const run = async (port: number | string, thauURL: string) => {
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
};
