import { ExpressServer } from "./expressServer";

process.on("unhandledRejection", up => {
    console.log(up);
});

const expressServer = new ExpressServer(3003, 1000, 10);
expressServer.Start();