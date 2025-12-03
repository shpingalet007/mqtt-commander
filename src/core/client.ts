import EventEmitter from "node:events";
import mqtt, {IConnackPacket} from "mqtt";
import mqttMatch from "mqtt-match";
import Agent from "./agent";
import ObjectedSet from "../utils/objected-set";
import PersistentSet from "../utils/persistent-set";
import Router, {MountedHandlerSubscription, MountedListenerSubscription} from "./router";
import {envelopeData, markData} from "./data-enveloper";
import {convertReqToResTopic, getIdTopic, getReqTopic, getResTopic} from "./topic-protocol";
import {
  ListenerHandler,
  Nullable,
  ObjectPayload,
  ParsedMessage,
  PublicationData, ResponderHandler
} from "./types";
import {extractPathParams, mapParams, wilcardParams} from "./topic-params";
import {clearTimeout} from "node:timers";

abstract class ClientBase {
  abstract use(route: string, router: Router): void;
}

export default class Client implements ClientBase {
  private static readonly PersistedCleanAfter: number = 5 * 60 * 1000;

  private readonly mClient: mqtt.MqttClient;
  private readonly events: EventEmitter = new EventEmitter();

  private readonly handlers: Map<string, MountedHandlerSubscription> = new Map();
  private readonly listeners: Map<string, MountedListenerSubscription> = new Map();
  private readonly responders: Map<string, ResponderHandler> = new Map();
  private readonly buffered: ObjectedSet<ParsedMessage> = new ObjectedSet();
  private readonly persisted: ObjectedSet<ParsedMessage> = new PersistentSet(Client.PersistedCleanAfter);
  private readonly debounced: Map<string, NodeJS.Timeout> = new Map();

  private constructor(url: string, opts?: mqtt.IClientOptions) {
    this.mClient = mqtt.connect(url, opts);

    this.mClient.on('message', this.handleMessage.bind(this));
    this.mClient.on('connect', this.handleConnect.bind(this));
  }

  private handleConnect(connection: IConnackPacket) {
    this.events.emit('connected', connection);
  }

  private async handleMessage(topic: string, rawPayload: Buffer) {
    const isResolution = topic.startsWith('__res');
    const isInvocation = topic.startsWith('__req');

    //console.log('RAW', topic, rawPayload);

    let payload: ObjectPayload;

    try {
      payload = JSON.parse(rawPayload.toString());
    } catch (e) {
      console.error('UNSUPPORTED PAYLOAD');
      return;
    }

    let message: ParsedMessage = { topic, payload };

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

          resolver(message.payload);
          return;
        }
      }

      return;
    }

    if (isInvocation) {
      for (const handler of this.handlers.entries()) {
        const reqPattern = getReqTopic(handler[0]);
        const resolver = handler[1].handler;
        const params = handler[1].params;

        const isMatched = mqttMatch(reqPattern, topic);

        if (isMatched) {
          const isDuplicated = this.persisted.has(message as ParsedMessage);

          if (isDuplicated) {
            break;
          }

          const pubData: PublicationData = {
            params: extractPathParams(topic, params),
          };

          if (message.payload.data !== undefined) {
            pubData.data = message.payload.data;
          }

          //console.log('MESSAGE', topic, message);
          const result = await resolver(pubData);
          const marked = markData(result);
          const envelope = envelopeData(marked);
          const resTopic = convertReqToResTopic(topic);
          const idResTopic = getIdTopic(resTopic, message.payload.id);

          //console.log('SEND RESULT', idResTopic, result);

          this.mClient.publish(idResTopic, envelope);
          this.persisted.add(message as ParsedMessage);
          return;
        }
      }

      return;
    }

    for (const listener of this.listeners.entries()) {
      const pattern = listener[0];
      const handler = listener[1].handler;
      const params = listener[1].params;
      const options = listener[1].options;

      //console.log('CHECK MATCH', pattern, topic);

      const isMatched = mqttMatch(pattern, topic);

      if (isMatched) {
        const isDuplicated = this.persisted.has(message as ParsedMessage);

        if (isDuplicated) {
          break;
        }

        const pubData: PublicationData = {
          params: extractPathParams(topic, params),
        };

        if (message.payload.data !== undefined) {
          pubData.data = message.payload.data;
        }

        //console.log('MESSAGE', topic, message);

        if (options?.debounce) {
          const oldDebouncer = this.debounced.get(topic);
          this.debounced.delete(topic);

          clearTimeout(oldDebouncer);

          const debouncer = setTimeout(() => handler(pubData), options.debounce);
          this.debounced.set(topic, debouncer);
        } else {
          handler(pubData);
        }

        this.persisted.add(message as ParsedMessage);
        return;
      }
    }

    const isDuplicated = this.persisted.has(message as ParsedMessage);

    if (isDuplicated) return;

    //console.log('BUFFERING', topic, payload);

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

    //console.log('Connected with session?', sessionPresent);

    return client;
  }

  public async use(route: string, router: Router) {
    const listeners = router._mountListeners(route);
    const handlers = router._mountHandlers(route);

    for (const handler of handlers) {
      const requestTopic = getReqTopic(handler.fullPattern);

      const fullPattern = wilcardParams(handler.fullPattern);
      const fullReqPattern = wilcardParams(requestTopic);
      handler.params = mapParams(requestTopic);

      this.handlers.set(fullPattern, handler);

      //console.log('SUBSCRIBE', fullReqPattern, handler.options);
      await this.mClient.subscribeAsync(fullReqPattern, handler.options);
    }

    for (const listener of listeners) {
      const fullPattern = wilcardParams(listener.fullPattern);
      listener.params = mapParams(listener.fullPattern);

      this.listeners.set(fullPattern, listener);

      //console.log('SUBSCRIBE', fullPattern, listener.options);
      await this.mClient.subscribeAsync(fullPattern, listener.options);

      for (const message of this.buffered.values()) {
        const isMatched = mqttMatch(listener.fullPattern, message.topic);

        if (isMatched) {
          const pubData: PublicationData = {
            data: message.payload.data,
            params: extractPathParams(message.topic, listener.params),
          };

          //console.log('BUFFERED MESSAGE', message.topic, message.payload);
          listener.handler(pubData);
          this.buffered.delete(message);
        }
      }
    }
  }

  public async handleResponse(topic: string, id: string, handler: ListenerHandler) {
    const resTopic = getResTopic(`${topic}/${id}`);

    //console.log('WAITING RESPONSE ON', resTopic);

    this.responders.set(resTopic, handler);
  }

  // TODO: Make overrides with 2 and 3 arguments so the base is optional
  public getAgent(route?: string, base?: Nullable<Agent>, opts?: mqtt.IClientPublishOptions): Agent {
    if (base) {
      const baseRoute = base.getRoute();
      return new Agent(this, `${baseRoute}/${route}`, opts);
    }

    return new Agent(this, route, opts);
  }

  public getMqttClient() {
    return this.mClient;
  }
}