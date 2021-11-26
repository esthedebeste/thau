import "../../server/src/server.js";
import { run } from "./test_hoster.js";

const thauPort = process.env.PORT || 8080;
await run(+thauPort + 1, `http://localhost:${thauPort}/`);
