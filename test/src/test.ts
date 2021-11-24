import "../../server/src/server.js";
import { run } from "./host.js";

const thauPort = process.env.PORT || 8080;
await run(+thauPort + 1, `http://localhost:${thauPort}/`);
