import * as fs from "fs";
import { Server } from "../model/server";

export class DataManager {
    private static file: string = "./server/data.json";

    public static setServers(servers: Server[]): void {
        fs.writeFileSync(this.file, servers, "utf8");
    }

    public static getServers(): Server[] {
        return this.getData();
    }

    private static getData(): Server[] {
        const rawdata = fs.readFileSync(this.file, "utf8");
        const data = JSON.parse(rawdata) as Server[];
        return data;
    }
}