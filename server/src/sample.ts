import { Blueprint, serveStatic } from "coggers";
import { coggers } from "thau";

export const sample: Blueprint = {
	$get(_req, res) {
		res.sendFile(new URL("../static/sample/index.html", import.meta.url));
	},
	custom: {
		$get(_req, res) {
			res.sendFile(new URL("../static/sample/custom.html", import.meta.url));
		},
	},
	callback: {
		$: coggers({ urls: ["/sample/callback"] }),
		$get(_req, res) {
			res.sendFile(new URL("../static/sample/callback.html", import.meta.url));
		},
	},
	...serveStatic(new URL("../static/sample", import.meta.url)),
	thau: serveStatic(new URL("../../client/dist", import.meta.url)),
};
