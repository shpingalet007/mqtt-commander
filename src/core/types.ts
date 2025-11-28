import {IClientSubscribeOptions, IClientSubscribeProperties} from "mqtt";

export interface ObjectPayload {
  id: string;
  data: any;
}

export interface ParsedMessage {
  topic: string;
  payload: ObjectPayload;
}

export type ListenerHandler = (payload: any) => void;
export type InvocationHandler = (payload: any) => Promise<any> | void;
export type MqttClientSubscribeOptions = IClientSubscribeOptions | IClientSubscribeProperties
