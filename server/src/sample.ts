import { Blueprint, serveStatic } from "coggers";

export const sample: Blueprint = {
	...serveStatic(new URL("../static/sample", import.meta.url), {
		index: ["index.html"],
	}),
	thau: serveStatic(new URL("../../client/dist", import.meta.url)),
};
