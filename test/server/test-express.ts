import express from "express";
import * as thau from "thau/src";

const app = express();
app.get("/", (_req, res) => {
	res.redirect(
		"https://thau.herokuapp.com/auth?callback=http://localhost:8080/callback"
	);
});

app.get(
	"/callback",
	thau.express({ urls: ["http://localhost:8080/callback"] }),
	(req: express.Request & thau.ThauExtended, res) => {
		const uid = req.thau.uid;
		res.send("You are now authenticated! Your thau ID is: " + uid);
	}
);

app.listen(8080, () => console.log("Listening on port 8080"));
