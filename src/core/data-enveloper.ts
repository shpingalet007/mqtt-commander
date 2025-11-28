import getRandomId from "../utils/id-generator";
import {ObjectPayload} from "./types";

export function markData(data: any): ObjectPayload {
  return { id: getRandomId(), data };
}

export function envelopeData(data: any): string {
  return JSON.stringify(data);
}

export function unwrapData(buffer: Buffer): ObjectPayload {
  return JSON.parse(buffer.toString());
}