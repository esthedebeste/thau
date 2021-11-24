import { run } from "./host.js";

const PORT = process.env.PORT || 8080;
await run(PORT, `https://thau.herokuapp.com/`);
