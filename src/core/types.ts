import {IClientSubscribeOptions, IClientSubscribeProperties} from "mqtt";

export interface PublicationData<T = any> {
  params: Record<string, string>,
  data?: T
}

export interface ParamMap {
  name: string;
  index: number;
}

export interface ObjectPayload {
  id: string;
  time: number;
  data?: any;
}

export interface ParsedMessage {
  topic: string;
  payload: ObjectPayload;
}

export interface CommanderSubscribeOptions extends IClientSubscribeOptions, IClientSubscribeProperties {
  debounce?: number;
}

export type ResponderHandler = (data: any) => void;
export type ListenerHandler = (pub: PublicationData) => void;
export type InvocationHandler = (pub: PublicationData) => Promise<any> | any;
export type MqttClientSubscribeOptions = IClientSubscribeOptions | IClientSubscribeProperties

export type Nullable<T> = T | null;