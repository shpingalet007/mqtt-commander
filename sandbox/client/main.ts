import {Agent, Client, Router} from "../../src";
import {createWifiService} from "./services/wifi";
import EventEmitter from "node:events";

(async () => {
  const server = await Client.connect('mqtt://localhost:1883', {
    clean: false,
    clientId: 'machine:01',
  });

  const informReceiver = server.getAgent('machine:01', null, { qos: 1 });
  const wifiRoutes = server.getAgent('wifi', null, { qos: 1 });
  const wifiScanRoutes = server.getAgent('scan', wifiRoutes, { qos: 1 });

  await server.use('wifi', await createWifiService(wifiScanRoutes));

  console.log(1);
})();