import * as http from "http";
import * as path from "path";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as eWs from "express-ws";
import { Message } from "../model/message";
import { Pinger } from "./pinger";
import { DataManager } from "./dataManager";

export class ExpressServer {
    private app: any;
    private port: any;
    private expressWs: any;

    private interval: number;
    private threshold: number;
    private clients: number = 0;
    private servers: any[] = [];
    private pingers: Pinger[] = [];

    constructor(port: number, interval: number, threshold: number) {
        this.interval = interval;
        this.threshold = threshold;
        this.port = process.env.PORT || port;

        this.app = express();

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: false }));

        this.setWebSockets();
        this.setRoutes();

        const server = http.createServer(this.app);
    }

    private setRoutes(): void {
        this.app.use(express.static(path.join(__dirname, "../client/")));

        this.app.get("*", (req, res) => {
            res.sendFile(path.join(__dirname, "../client/index.html"));
        });
    }

    public Start(): void {
        this.app.disable("etag");

        this.app.listen(this.port, () => {
            console.log(`Express Server running on localhost: ${this.port}`);

            this.servers = DataManager.getServers();

            this.setPingers();

            console.log(`WebSocket Server running...`);
        });
    }

    private setPingers(): void {
        this.pingers = [];

        this.servers.forEach(server => {
            const pinger: Pinger = new Pinger(10, server, this.threshold);

            this.pingers.push(pinger);
        });

        this.startPing();
    }

    private setWebSockets(): void {
        const self = this;
        this.expressWs = new eWs(this.app);

        this.app.ws("/", function (ws, req) {
            self.clients++;

            if (self.clients > 0) {
                self.startPing();
                self.broadcast();
            }

            ws.on("close", () => {
                if (self.clients > 0) {
                    self.clients--;

                    if (self.clients == 0) {
                        self.stopPing();
                    }
                }
            });

            ws.on("message", (request) => {
                const message = JSON.parse(request) as Message;

                switch (message.command) {
                    case "get-servers":
                        const servers = DataManager.getServers();
                        ws.send(JSON.stringify({ command: "get-servers", data: servers }));
                        break;

                    case "set-servers":
                        DataManager.setServers(message.data);
                        self.servers = DataManager.getServers();
                        self.setPingers();
                        self.startPing();
                        break;
                }
            });
        });
    }

    private startPing(): void {
        this.pingers.forEach(pinger => {
            pinger.IsStopped = false;
            pinger.Run(this.interval);
        });
    }

    private stopPing(): void {
        this.pingers.forEach(pinger => {
            if (!pinger.IsStopped) {
                pinger.IsStopped = true;
            }
        });
    }

    private broadcast(): void {
        if (this.pingers.some(p => p.IsStopped)) {
            return;
        }

        const servers: {} = {};

        this.pingers.forEach((pinger, index) => {
            servers[pinger.server.id] = { labels: {} };

            pinger.data.forEach((point) => {
                if (!servers[pinger.server.id].labels[point.ip]) {
                    servers[pinger.server.id].labels[point.ip] = {
                        series: []
                    };
                }
            });

            for (let ip in servers[pinger.server.id].labels) {
                pinger.data.filter(p => p.ip === ip).forEach((point) => {
                    servers[pinger.server.id].labels[ip].series.push(point.response.time);
                });
            }
        });

        this.expressWs.getWss('/').clients.forEach(function each(client) {
            client.send(JSON.stringify({
                command: "get-points",
                data: servers
            }));
        });

        setTimeout(() => {
            this.broadcast()
        }, this.interval);
    }
}
