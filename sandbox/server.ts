import {Client, Router} from "../dist";

(async () => {
  const server = await Client.connect('mqtt://localhost:1883', {
    clean: false,
    clientId: 'server:main',
  });

  setTimeout(async () => {
    const router = new Router();

    router.on('events', (data) => {
      console.log(data);
    }, { qos: 1, nl: true });

    router.handle('command', async (a: number) => {
      console.log('Received command');
      return a + 200;
    });

    await server.use('server:main', router);
  }, 1000);

  console.log(1);
})();