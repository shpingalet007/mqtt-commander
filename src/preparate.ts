import {getRandomId} from "./helpers";
import {ObjectPayload} from "./client";

export function getFullTopic(topic: string, route?: string) {
  return (route) ? `${route}/${topic}` : topic;
}

export function getReqTopic(topic: string) {
  return `__req/${topic}`;
}

export function getResTopic(topic: string) {
  return `__res/${topic}`;
}

export function convertReqToResTopic(topic: string) {
  return topic.replace(/^__req\//g, '__res/');
}

export function getIdentified(topic: string, id: string) {
  return `${topic}/${id}`;
}

export function markData(data: any): ObjectPayload {
  return { id: getRandomId(), data };
}

export function envelopeData(data: any): string {
  return JSON.stringify(data);
}

export function unwrapData(buffer: Buffer): ObjectPayload {
  return JSON.parse(buffer.toString());
}