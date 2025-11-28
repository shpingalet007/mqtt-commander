import {Client} from "../dist";

(async () => {
  const server = await Client.connect('mqtt://localhost:1883', {
    clean: false,
    clientId: 'machine:01',
  });

  setTimeout(async () => {
    const agent = server.getAgent('server:main', { qos: 1 });

    //agent.publish('events', { a: 100 });
    //agent.publish('events', { a: 200 });

    const result1 = agent.invokeAsync<number>('command/shutdown', 100).catch(x => -100);
    const result2 = agent.invokeAsync<number>('command/restart', 200).catch(x => -100);
    const result3 = agent.invokeAsync<number>('command/restart/kuka', 300).catch(x => -100);

    const results = await Promise.all([result1, result2, result3]);

    console.log('result1', results[0], results[0] === 300);
    console.log('result2', results[1], results[1] === 400);
    console.log('result3', results[2], results[2] === 500);
  }, 1000);

  console.log(1);
})();