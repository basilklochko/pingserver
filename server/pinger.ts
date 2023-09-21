var ping = require("ping");

import { Response } from "../model/response";
import { Server } from "../model/server";
import { Point } from "../model/point";
import { Bad } from "../model/bad";

export class Pinger {
    public data: Point[] = [];
    public IsStopped: boolean = false;
    private timeout: number;
    public server: Server;
    private threshold: number;
    private bads: Bad[] = [];

    constructor(timeout: number, server: Server, threshold: number) {
        this.timeout = timeout;
        this.server = server;
        this.threshold = threshold;
        this.bads = [];
    }

    public Run(interval: number): void {
        const self = this;

        if (self.IsStopped) {
            self.bads = [];
            self.data = [];
            return;
        }

        self.server.ips.forEach((ip) => {
            ping.promise.probe(ip, {
                timeout: self.timeout
            }).then((res) => {
                if (self.data.filter(d => d.ip === ip).length === self.threshold) {
                    const tmp = self.data.filter(d => d.ip === ip)
                    tmp.splice(0, 1);
                    self.data = self.data.filter(d => d.ip !== ip).concat(tmp);
                }

                const data = new Response();
                data.host = res.host;
                data.alive = res.alive;
                data.time = res.time;
                data.numeric_host = res.numeric_host;

                self.trackBads(data, ip);

                const point = new Point();
                point.ip = ip;
                point.response = data;

                self.data.push(point);
            });
        });

        setTimeout(() => {
            self.Run(interval)
        }, interval);
    }

    private trackBads(data: Response, ip: string): void {
        if (!data.alive) {
            let bad = new Bad();
            bad.ip = ip;
            bad.loggedAt = Date.now();

            const existingBad = this.bads.findIndex(b => b.ip === bad.ip);

            if (existingBad > -1) {
                this.bads[existingBad].loggedAt = bad.loggedAt;
            } else {
                bad.startedAt = bad.loggedAt;
                this.bads.push(bad);
            }

            console.error(this.bads);

            this.notifyBads();
        }
    }

    private notifyBads(): void {
        this.bads.forEach(bad => {
            if (bad.loggedAt - bad.startedAt > this.threshold) {
                console.log("wake up!");
            }
        });
    }
}