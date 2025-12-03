import ObjectedSet from "./objected-set";
import {clearTimeout} from "node:timers";

export default class PersistentSet<T> extends ObjectedSet<T> {
  private readonly keepTime: number;
  private readonly timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(timer: number) {
    super();
    this.keepTime = timer;
  }

  public add(message: T) {
    const timer = setTimeout(() => super.delete(message), this.keepTime);
    this.timers.set(this._static.wrap(message), timer);
    return super.add(message);
  }

  public delete(message: T): boolean {
    const msg = this._static.wrap(message);

    const timer = this.timers.get(msg);
    clearTimeout(timer);
    this.timers.delete(msg);

    return super.delete(message);
  }

  public clear(): void {
    for (let timer of this.timers.values()) {
      console.log('Clearing persistent timer');
      clearTimeout(timer);
    }

    this.timers.clear();
    super.clear();
  }
}