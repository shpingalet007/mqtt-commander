import {Client, Router} from "../src";
import {PublicationData} from "../src/core/types";

(async () => {
  // CLIENT SIDE
  const client = await Client.connect('mqtt://localhost:1883', {
    clientId: 'machine:01',
    clean: false,
    will: {
      topic: 'server/main/inform/state/machine/01',
      payload: JSON.stringify({
        id: '00000',
        time: Date.now(),
        data: false,
      }),
      retain: true,
      qos: 1,
    },
  });

  const agent = client.getAgent('server/main');

  console.log('Machine reported state', true);
  //await client.getMqttClient().publishAsync('server/main/inform/state', '', { retain: true });

  await agent.publishAsync('inform/state/machine/01', true, { qos: 1, retain: true });
  await agent.publishAsync('inform/state/machine/01', false, { qos: 1, retain: true });
  await agent.publishAsync('inform/state/machine/01', false, { qos: 1, retain: true });
  await agent.publishAsync('inform/state/machine/01', false, { qos: 1, retain: true });
  await agent.publishAsync('inform/state/machine/01', true, { qos: 1, retain: true });

  console.log('---------');

  // SERVER SIDE
  const server = await Client.connect('mqtt://localhost:1883', {
    clientId: 'server:main',
    clean: false,
  });

  const stateRoutes = new Router();
  const actionRoutes = new Router();

  stateRoutes.on('state/:group/:id', (pub) => {
    console.log('============================');
    console.log('Server received state', pub.data, 'from machine', `${pub.params.group}:${pub.params.id}`);
    console.log('============================');
  }, { qos: 1 });

  actionRoutes.handle(':group/:id/:command', (pub) => {
    console.log('ACTION_ROUTE', pub);
    return 'kukazava';
  });

  await server.use('server/main/inform', stateRoutes);
  await server.use('server/main/action', actionRoutes);

  const result = await agent.invokeAsync('action/machine/01/reboot');

  console.log('ACTION_ROUTE_RESULT', result);

  (await client.getMqttClient()).stream.destroy();
})();
