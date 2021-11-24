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
	process.exit(0);
}

const gave = arg => argv.includes(arg);
if (gave("--keys") || gave("-k")) {
	const file = new URL("./signing.json", import.meta.url);

	const { publicKey, privateKey } = generateKeyPairSync("ec", {
		namedCurve: "P-384",
	});
	writeFileSync(
		file,
		JSON.stringify({
			publicKey: publicKey.export({
				format: "jwk",
			}),
			privateKey: privateKey.export({
				format: "jwk",
			}),
		})
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
