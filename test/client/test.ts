import { Coggers } from "coggers";
import * as thau from "../../client/src/index.js";

console.log("Using thau server at https://thau.herokuapp.com/keys");
const port = process.env.PORT || 8080;

const coggers = new Coggers({
	$get(_, res) {
		res.redirect(
			`https://thau.herokuapp.com/auth?callback=http://localhost:${port}/callback`
		);
	},
	callback: {
		$get: [
			thau.coggers({
				urls: [`http://localhost:${port}/callback`],
			}),
			(req, res) => {
				res.json(req.thau);
			},
		],
	},
});

await coggers.listen(port);
console.log(`Thau testing @ http://localhost:${port}/`);
