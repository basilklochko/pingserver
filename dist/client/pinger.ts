class Pinger {
    public wsService: any = "$WsService";
    public isServerOverlayHidden: boolean = false;
    public isSettingsOverlayHidden: boolean = false;
    public isSettingsButtonHidden: boolean = true;
    public servers: Server[] = [];
    public selectableServers: Server[] = [];
    public ips: string[] = [];
    public isServerSelected: boolean = false;
    public server: Server = null;
    public selectedServer: string = "";
    public newServer: string = "";
    public serverId: string = "";
    public isNewServer: boolean = false;
    public ip: string = "";
    public isNewIP: boolean = false;
    private charts = null;

    public $onComponentLoad(): void {
        this.onLoad();
    }

    public onLoad(): void {
        const self = this;
        const host = location.origin.replace(/^http/, 'ws');
        self.wsService.init(host);

        setTimeout(() => {
            self.wsService.listen((event) => {
                var result = JSON.parse(event.data);

                switch (result.command) {
                    case "get-servers":
                        self.servers = result.data;

                        if (!self.server) {
                            self.server = self.servers[0];
                        }

                        self.selectableServers = self.servers.filter(s => s.id !== self.server.id);
                        self.bind();
                        break;

                    case "get-points":
                        if (self.server) {
                            const data = result.data[self.server.id];

                            if (data && (!self.charts || Object.keys(self.charts).length === 0)) {
                                self.renderCharts(data.labels);
                            }

                            self.updateCharts(data);
                        }
                        break;
                }
            });
        }, 100);

        setTimeout(() => {
            self.getServers();
        }, 500);
    }

    private getServers(): void {
        this.wsService.send(JSON.stringify({ command: "get-servers" }));
    }

    private bind(): void {
        const self = this;

        setTimeout(() => {
            self.wsService.bindElements();
        }, 100);
    }

    public onServerOpen(): void {
        this.isServerOverlayHidden = true;
        this.isSettingsButtonHidden = false;

        setTimeout(() => {
            this.getServers();
        }, 100);
    }

    public onServerChange(id: string): void {
        this.server = this.servers.filter(s => s.id === id)[0];
        this.selectableServers = this.servers.filter(s => s.id !== this.server.id);

        this.onServerClose();
    }

    public onServerClose(): void {
        this.isServerOverlayHidden = false;
        this.isSettingsButtonHidden = true;
        this.charts = null;

        this.onSettingsClose();
    }

    public onSettingsOpen(): void {
        this.isSettingsOverlayHidden = true;
        this.isSettingsButtonHidden = false;

        setTimeout(() => {
            this.getServers();
        }, 100);
    }

    public onSettingsSave(): void {
        this.wsService.send(JSON.stringify({ command: "set-servers", data: JSON.stringify(this.servers) }));

        this.onSettingsClose();

        setTimeout(() => {
            this.charts = null;
        }, 100);
    }

    public onSettingsClose(): void {
        this.servers = [];

        this.isServerSelected = false;
        this.isSettingsOverlayHidden = false;
        this.isSettingsButtonHidden = true;
    }

    public onServer(id: string): void {
        const server = this.servers.filter(s => s.id == id)[0];

        this.isServerSelected = true;
        this.selectedServer = server.name;
        this.serverId = id;
        this.ips = server.ips;
    }

    public onNewServer(): void {
        this.isServerSelected = false;
        this.newServer = "";
        this.serverId = "";
        this.isNewServer = true;
    }

    public onNewIP(): void {
        this.ip = "";
        this.isNewIP = true;
    }

    public onNewServerSave(): void {
        if (this.newServer.length > 0) {
            this.servers.push({
                id: this.NewGuid(),
                name: this.newServer,
                ips: []
            });
        }

        this.onNewServerCancel();
    }

    public onNewIPSave(): void {
        const server = this.servers.filter(s => s.id == this.serverId)[0];
        server.ips.push(
            this.ip
        );

        this.onNewIPCancel();
    }

    public onNewServerCancel(): void {
        this.isNewServer = false;
        this.newServer = "";
        this.serverId = "";
    }

    public onNewIPCancel(): void {
        this.isNewIP = false;
        this.ip = "";
    }

    public onServerDelete(id: string): void {
        this.servers.splice(this.servers.findIndex(s => s.id === id), 1);

        if (this.servers.length === 0) {
            this.newServer = "";
            this.serverId = "";
            this.isServerSelected = false;
        }
    }

    public onIPDelete(item: string): void {
        const server = this.servers.filter(s => s.id == this.serverId)[0];
        server.ips.splice(server.ips.indexOf(item), 1);
    }

    private addChart(ip: string): void {
        const child = document.createElement("div");
        child.classList.add("col-3");
        child.innerHTML = "<h4 class='animated bounceInLeft'>" + ip + "</h4><div class='chart animated bounceIn' chart-id='" + ip.replace(/\./g, "_") + "'></div>";
        document.getElementsByClassName("charts")[0].appendChild(child);

        var chart = this.initChart(ip.replace(/\./g, "_"));
        this.charts[ip] = chart;
    }

    private renderCharts(hosts): void {
        this.charts = [];

        document.getElementsByClassName("charts")[0].innerHTML = "";

        for (const ip in hosts) {
            this.addChart(ip);
        }
    }

    private updateCharts(data): void {
        for (const ip in data.labels) {
            if (!this.charts[ip]) {
                this.addChart(ip);
            }

            var chartData = {
                series: [data.labels[ip].series]
            };

            this.charts[ip].update(chartData);
        }
    }

    private initChart(id) {
        var options = {
            axisX: {
                showLabel: false,
                showGrid: false
            },
            height: 200,
            chartPadding: {

            },
            low: 0,
            showArea: true,
            plugins: [

            ]
        };

        var data = {
            labels: [],
            series: [[]]
        };

        return new Chartist.Line(".chart[chart-id='" + id + "']", data, options);
    }

    private NewGuid(): string {
        let d = new Date().getTime();

        if (Date.now) {
            d = Date.now();
        }

        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

        return uuid;
    }
}

class Server {
    public name: string;
    public id: string;
    public ips: string[];
}