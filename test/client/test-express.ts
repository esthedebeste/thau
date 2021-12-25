import express from "express";
import * as thau from "../../client/src/index.js";

const port = process.env.PORT || 8080;
const app = express();
app.get("/", (_req, res) => {
	res.redirect(
		`https://thau.herokuapp.com/auth?callback=http://localhost:${port}/callback`
	);
});

app.get(
	"/callback",
	thau.express({ urls: ["http://localhost:8080/callback"] }),
	(req: express.Request & thau.ThauExtended, res) => {
		res.json(req.thau);
	}
);

console.log(`Thau testing @ http://localhost:${port}/`);
app.listen(port, () => console.log(`Thau testing @ http://localhost:${port}/`));
