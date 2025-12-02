import {Agent, Router} from "../../../src";

export async function createWifiService(scanControl: Agent) {
  const scanSection = new Router();

  scanSection.on('start', () => {
    console.log('Started scanning');

    setInterval(() => {
      scanControl.publish('list', ['Bulba']);
    }, 1000);
  }, { qos: 1 });

  scanSection.on('stop', () => {
    console.log('Stopped scanning');
  }, { qos: 1 });

  const wifiService = new Router();

  await wifiService.use('scan', scanSection);

  return wifiService;
}