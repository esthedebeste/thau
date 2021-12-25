import { generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const help = `
node generate.js [--keys | -k] [--session | -s]
  --keys OR -k => (Re)generate signing keys
  --session OR -s => Add a session secret
`.trim();
const argv = process.argv.slice(2);
if (argv.length === 0) {
	console.log(help);
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(0);
}

const gave = arg => argv.includes(arg);
if (gave("--keys") || gave("-k")) {
	const file = new URL("./signing.json", import.meta.url);

	const { publicKey, privateKey } = generateKeyPairSync("ec", {
		namedCurve: "P-384",
	});
	const pubJWK = publicKey.export({
		format: "jwk",
	});
	pubJWK.kid = "1";
	pubJWK.alg = "ES384";
	pubJWK.key_ops = ["verify"];
	const privJWK = privateKey.export({
		format: "jwk",
	});
	privJWK.kid = "1";
	privJWK.alg = "ES384";
	privJWK.key_ops = ["sign"];
	writeFileSync(
		file,
		JSON.stringify([
			{
				public: pubJWK,
				private: privJWK,
			},
		])
	);
	console.log("Generated signing keys");
}

if (gave("--session") || gave("-s")) {
	const file = new URL("./session.json", import.meta.url);

	const current = existsSync(file) ? JSON.parse(readFileSync(file)) : [];
	current.push(randomBytes(64).toString("base64url"));
	writeFileSync(file, JSON.stringify(current));
	console.log(`Added a session secret (new password count: ${current.length})`);
}
