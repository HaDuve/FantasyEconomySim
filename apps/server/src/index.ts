import { createServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const server = createServer();

server.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
