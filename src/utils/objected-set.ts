export default class ObjectedSet<T> {
  protected _static = this.constructor as typeof ObjectedSet<T>;
  protected set: Set<string>;

  constructor() {
    this.set = new Set();
  }

  public add(value: T): this {
    this.set.add(this._static.wrap(value));
    return this;
  }

  public values(): IterableIterator<T> {
    const stringIterator = this.set.values();
    return this.getIterator<T>(stringIterator, (item) => (
      this._static.unwrap(item)
    ));
  }

  public entries(): IterableIterator<[T, T]> {
    const stringIterator = this.set.entries();
    return this.getIterator<[T, T]>(stringIterator, (item) => (
      [this._static.unwrap(item[0]), this._static.unwrap(item[1])]
    ));
  }

  public delete(value: T): boolean {
    return this.set.delete(this._static.wrap(value));
  }

  public has(value: T): boolean {
    return this.set.has(this._static.wrap(value));
  }

  public clear() {
    this.set.clear();
  }

  private getIterator<P>(originalIterator: SetIterator<any>, mapper: (value: string) => P) {
    function* iterator(): IterableIterator<P> {
      for (const item of originalIterator) {
        yield mapper(item) as P;
      }
    }

    return iterator();
  }

  protected static wrap(value: any): string {
    return JSON.stringify(value);
  }

  protected static unwrap(value: string): any {
    return JSON.parse(value);
  }
}