import ObjectedSet from "./objected-set";

export default class PersistentSet<T> extends ObjectedSet<T> {
  private readonly timer: number;

  constructor(timer: number) {
    super();
    this.timer = timer;
  }

  public add(message: T) {
    setTimeout(() => super.delete(message), this.timer);
    return super.add(message);
  }
}