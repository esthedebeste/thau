import { Coggers } from "coggers";
import { coggersSession } from "coggers-session";

const coggers = new Coggers(
	{
		$: [
			coggersSession({
				password: "secret",
				name: "thau-session",
				cookie: {
					maxAge: 604800,
					sameSite: "Lax",
					httpOnly: true,
					path: "/",
				},
			}),
		],
		keys: {
			$get(req, res) {
				// TODO: get keys from env
			},
		},
		auth: {
			$get(req, res) {
				if (!req.query.callback)
					return res.status(400).send("No callback specified");
				req.session.callback = req.query.callback;
				// TODO: send auth page
				return;
			},
		},
		done: {
			$get(req, res) {
				// TODO: redirect to callback
				return;
			},
		},
	},
	{
		xPoweredBy: "a bunch of little cogwheels spinning around",
	}
);

const PORT = process.env.PORT || 8080;
coggers
	.listen(PORT)
	.then(() => console.log(`Listening @ http://localhost:${PORT}/`));
// TODO:
//  - Server using Coggers
//  - /keys
//  - /auth?callback=[url]
