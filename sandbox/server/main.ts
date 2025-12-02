import EventEmitter from "node:events";
import {Agent, Client, Router} from "../../src";

class VendingServer {
  private group: string;
  private id: string;
  private client?: Client;

  private wifi?: WifiService;

  constructor(group: string, id: string) {
    this.group = group;
    this.id = id;
  }

  public static async init(group: string, id: string) {
    const vendingClient = new VendingServer(group, id);

    vendingClient.client = await Client.connect('mqtt://localhost:1883', {
      clean: false,
      clientId: `${group}:${id}`,
    });

    vendingClient.wifi = new WifiService(vendingClient);

    return vendingClient;
  }

  public getWifi() {
    return this.wifi!;
  }

  public getAgent() {
    return this.client!.getAgent(this.id);
  }

  public registerRouter(router: Router) {
    return this.client!.use(this.id, router);
  }
}

class WifiService {
  private agent: Agent;
  private events = new EventEmitter();

  constructor(client: VendingServer) {
    this.agent = client.getAgent();

    const informRouter = this.getRouter();
    client.registerRouter(informRouter);
  }

  private getRouter() {
    const router = new Router();

    router.on('wifi/scan/result', (networks: string[]) => {
      this.events.emit('result', networks);
    });

    return router;
  }

  public startScan() {
    this.agent.publish('wifi/scan/start');
  }

  public stopScan() {
    this.agent.publish('wifi/scan/stop');
  }

  public onScanResult(handler: (networks: string[]) => void) {
    this.events.on('result', handler);
  }

  /*private listenScanCommands() {
    const commands = new Router();

    commands.on('start', this.handleScanStart.bind(this));
    commands.on('stop', this.handleScanStart.bind(this));

    this.client.use('scan', commands);
  }

  private handleScanStart() {
    console.log('[WIFI SCANNER] Starting scan ...');

    this.scannerInterval = setInterval(this.scan.bind(this), 1000);
  }

  private scan() {
    const result = ['Bulba', 'Bulba_5G'];
    this.inform.publish('scan/result', result);
  }*/
}

(async () => {
  const c = await VendingServer.init('server', 'main');
  const w = c.getWifi();

  w.onScanResult((nets) => {
    console.log('Scan result', nets);
  });

  w.startScan();
})();
