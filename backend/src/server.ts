import "dotenv/config";
import { createServer } from "http";
import { app } from "./app";
import { initSocket } from "./core/socket/socket.service";

const port = Number(process.env.PORT ?? 3001);

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
