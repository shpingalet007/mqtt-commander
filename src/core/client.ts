import EventEmitter from "node:events";
import mqtt, {IConnackPacket} from "mqtt";
import mqttMatch from "mqtt-match";
import Agent from "./agent";
import ObjectedSet from "../utils/objected-set";
import PersistentSet from "../utils/persistent-set";
import Router from "./router";
import {envelopeData, markData, unwrapData} from "./data-enveloper";
import {convertReqToResTopic, getIdTopic, getReqTopic, getResTopic} from "./topic-protocol";
import {InvocationHandler, ListenerHandler, ParsedMessage} from "./types";

abstract class ClientBase {
  abstract use(route: string, router: Router): void;
}

export default class Client implements ClientBase {
  private static readonly PersistedCleanAfter: number = 5 * 60 * 1000;

  private readonly mClient: mqtt.MqttClient;
  private readonly events: EventEmitter = new EventEmitter();

  private readonly handlers: Map<string, InvocationHandler> = new Map();
  private readonly listeners: Map<string, ListenerHandler> = new Map();
  private readonly responders: Map<string, ListenerHandler> = new Map();
  private readonly buffered: ObjectedSet<ParsedMessage> = new ObjectedSet();
  private readonly persisted: ObjectedSet<ParsedMessage> = new PersistentSet(Client.PersistedCleanAfter);

  private constructor(url: string, opts?: mqtt.IClientOptions) {
    this.mClient = mqtt.connect(url, opts);

    this.mClient.on('message', this.handleMessage.bind(this));
    this.mClient.on('connect', this.handleConnect.bind(this));
  }

  private handleConnect(connection: IConnackPacket) {
    this.events.emit('connected', connection);
  }

  private async handleMessage(topic: string, payload: Buffer) {
    const isResolution = topic.startsWith('__res');
    const isInvocation = topic.startsWith('__req');

    console.log('RAW', topic, payload);

    let message: Partial<ParsedMessage> = { topic };

    try {
      message.payload = JSON.parse(payload.toString());
    } catch (e) {
      console.error('UNSUPPORTED PAYLOAD');
      return;
    }

    if (isResolution) {
      for (const responder of this.responders.entries()) {
        const pattern = responder[0];
        const resolver = responder[1];

        const isMatched = mqttMatch(pattern, topic);

        if (isMatched) {
          const isDuplicated = this.persisted.has(message as ParsedMessage);

          if (isDuplicated) {
            break;
          }

          resolver(unwrapData(payload));
          return;
        }
      }

      return;
    }

    if (isInvocation) {
      for (const handler of this.handlers.entries()) {
        const reqPattern = getReqTopic(handler[0]);
        const resolver = handler[1];

        const isMatched = mqttMatch(reqPattern, topic);

        if (isMatched) {
          const isDuplicated = this.persisted.has(message as ParsedMessage);

          if (isDuplicated) {
            break;
          }

          console.log('MESSAGE', topic, message);
          const result = await resolver(message.payload!.data);
          const marked = markData(result);
          const envelope = envelopeData(marked);
          const resTopic = convertReqToResTopic(topic);
          const idResTopic = getIdTopic(resTopic, message.payload!.id);

          console.log('SEND RESULT', idResTopic, result);

          this.mClient.publish(idResTopic, envelope);
          this.persisted.add(message as ParsedMessage);
          return;
        }
      }

      return;
    }

    for (const listener of this.listeners.entries()) {
      const pattern = listener[0];
      const handler = listener[1];

      console.log('CHECK MATCH', pattern, topic);

      const isMatched = mqttMatch(pattern, topic);

      if (isMatched) {
        const isDuplicated = this.persisted.has(message as ParsedMessage);

        if (isDuplicated) {
          break;
        }

        console.log('MESSAGE', topic, message);
        handler(message.payload!.data);
        this.persisted.add(message as ParsedMessage);
        return;
      }
    }

    console.log('BUFFERING', topic, payload);

    this.buffered.add(message as ParsedMessage);
  }

  private whenConnected() {
    return new Promise<IConnackPacket>((resolve, reject) => {
      this.events.on('connected', resolve);
    });
  }

  public static async connect(url: string, opts?: mqtt.IClientOptions): Promise<Client> {
    const client = new Client(url, opts);

    const {sessionPresent} = await client.whenConnected();

    console.log('Connected with session?', sessionPresent);

    return client;
  }

  public async use(route: string, router: Router) {
    const listeners = router._mountListeners(route);
    const handlers = router._mountHandlers(route);

    for (const handler of handlers) {
      const requestTopic = getReqTopic(handler.fullPattern);

      this.handlers.set(handler.fullPattern, handler.handler);
      await this.mClient.subscribeAsync(requestTopic, handler.options);

      // TODO: Do we need to buffer handler messages?
    }

    for (const listener of listeners) {
      this.listeners.set(listener.fullPattern, listener.handler);
      await this.mClient.subscribeAsync(listener.fullPattern, listener.options);

      for (const message of this.buffered.values()) {
        const isMatched = mqttMatch(listener.fullPattern, message.topic);

        if (isMatched) {
          console.log('BUFFERED MESSAGE', message.topic, message.payload);
          listener.handler(message.payload);
          this.buffered.delete(message);
        }
      }
    }
  }

  public async handleResponse(topic: string, id: string, handler: ListenerHandler) {
    const resTopic = getResTopic(`${topic}/${id}`);

    console.log('WAITING RESPONSE ON', resTopic);

    this.responders.set(resTopic, handler);
  }

  public getAgent(route?: string, opts?: mqtt.IClientPublishOptions): Agent {
    return new Agent(this, route, opts);
  }

  public getMqttClient() {
    return this.mClient;
  }
}