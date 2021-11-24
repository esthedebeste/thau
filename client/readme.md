# Thau

An easy cookie-less way to implement authentication into your application.

### Motivation

"Login With..." is hard to implement.
For each provider, you have to:

- Create a developer account at that provider
- Write a bunch of authentication code
- Add server environment variables for that provider
- Add a button to the login page

And that tends to get messy. Instead, you can use Thau to do all of that for you.

Thau doesn't need a developer account, it doesn't need any shared secrets, if you wanted to you could implement "Login With" without even having a backend. It's a completely open & free method of authentication, powered by cryptography.

### Examples

#### [Express](https://npmjs.com/express)

```ts
import express from "express";
import * as thau from "thau";

const app = express();
app.get("/login", (req, res) => {
	res.redirect(
		"https://thau.herokuapp.com/auth?callback=http://localhost:8080/callback"
	);
});

app.get(
	"/callback",
	thau.express({ urls: ["http://localhost:8080/callback"] }),
	(req, res) => {
		const uid = req.thau.uid;
		res.send("You are now authenticated! Your thau ID is: " + uid);
	}
);

app.listen(8080, () => console.log("Listening on port 8080"));
```

#### [Coggers](https://npmjs.com/coggers)

```ts
import { Coggers } from "coggers";
import * as thau from "thau";

const coggers = new Coggers({
	login: {
		$get(_, res) {
			res.redirect(
				"https://thau.herokuapp.com/auth?callback=http://localhost:8080/callback"
			);
		},
	},
	callback: {
		$get: [
			thau.coggers({ urls: ["http://localhost:8080/callback"] }),
			(req, res) => {
				const uid = req.thau.uid;
				res.send("You are now authenticated! Your thau ID is: " + uid);
			},
		],
	},
});

coggers.listen(8080).then(() => console.log("Listening on port 8080"));
```

[See the thau repo for more information](https://github.com/tbhmens/thau)
