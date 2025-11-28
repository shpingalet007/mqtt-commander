import mqtt from "mqtt";
import Client from "./client";
import {envelopeData, markData} from "./data-enveloper";
import {getFullTopic, getIdTopic, getReqTopic, getResTopic} from "./topic-protocol";
import {MqttClientSubscribeOptions, ObjectPayload} from "./types";

export default class Agent {
  private readonly client: Client;
  private readonly mClient: mqtt.MqttClient;
  private readonly mSubOpts: mqtt.IClientPublishOptions;
  private readonly mPubOpts: MqttClientSubscribeOptions;
  private readonly route?: string;

  constructor(client: Client, route?: string, subOpts: mqtt.IClientPublishOptions = {}, pubOpts: MqttClientSubscribeOptions = {}) {
    this.client = client;
    this.mClient = client.getMqttClient();
    this.mSubOpts = subOpts;
    this.mPubOpts = pubOpts;
    this.route = route;
  }

  public publish(topic: string, message?: any, options?: mqtt.IClientPublishOptions) {
    this.publishAsync(topic, message, options);
    return this;
  }

  public async publishAsync(topic: string, message?: any, options?: mqtt.IClientPublishOptions) {
    const fullTopic = getFullTopic(topic, this.route);
    const marked = markData(message);
    const envelope = envelopeData(marked);
    const prepOpts = { ...this.mSubOpts, ...options };

    return this.mClient.publishAsync(fullTopic, envelope, prepOpts);
  }

  public invoke(topic: string, message?: any, options?: mqtt.IClientPublishOptions) {
    const fullTopic = getFullTopic(topic, this.route);
    const reqTopic = getReqTopic(fullTopic);
    const marked = markData(message);
    const envelope = envelopeData(marked);
    const prepOpts: mqtt.IClientPublishOptions = { ...this.mSubOpts, qos: 1, ...options };

    this.mClient.publish(reqTopic, envelope, prepOpts);
  }

  public async invokeAsync<T>(topic: string, message?: any, pubOpts?: mqtt.IClientPublishOptions, subOpts?: MqttClientSubscribeOptions) {
    const fullTopic = getFullTopic(topic, this.route);
    const reqTopic = getReqTopic(fullTopic);
    const resTopic = getResTopic(fullTopic);
    const marked = markData(message);
    const envelope = envelopeData(marked);
    const prepPubOpts: mqtt.IClientPublishOptions = { ...this.mSubOpts, qos: 1, ...pubOpts };
    const prepSubOpts: MqttClientSubscribeOptions = { ...this.mPubOpts, qos: 1, ...subOpts };

    console.log('SUBSCRIBING TO', resTopic);

    const idResTopic = getIdTopic(resTopic, marked.id);
    await this.mClient.subscribeAsync(idResTopic, prepSubOpts);

    const responsePromise = new Promise<T>((resolve, reject) => {
      const responseTimer = setTimeout(() => {
        reject(Error('INVOKE_TIMEOUT'));
      }, 5000);

      this.client.handleResponse(fullTopic, marked.id, (payload: ObjectPayload) => {
        this.mClient.unsubscribe(idResTopic);
        resolve(payload.data);
        clearInterval(responseTimer);
      });
    });

    await this.mClient.publishAsync(reqTopic, envelope, prepPubOpts);

    return responsePromise;
  }
}