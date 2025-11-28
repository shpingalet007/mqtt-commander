export class ObjectedSet<T> {
  private set: Set<string>;

  constructor() {
    this.set = new Set();
  }

  public add(message: T): this {
    this.set.add(JSON.stringify(message));
    return this;
  }

  public values(): IterableIterator<T> {
    const stringIterator = this.set.values();
    return this.getIterator<T>(stringIterator, (item) => (
      JSON.parse(item)
    ));
  }

  public entries(): IterableIterator<[T, T]> {
    const stringIterator = this.set.entries();
    return this.getIterator<[T, T]>(stringIterator, (item) => (
      [JSON.parse(item[0]), JSON.parse(item[1])]
    ));
  }

  public delete(message: T): boolean {
    return this.set.delete(JSON.stringify(message));
  }

  public has(message: T): boolean {
    return this.set.has(JSON.stringify(message));
  }

  private getIterator<P>(originalIterator: SetIterator<any>, mapper: (value: string) => P) {
    function* iterator(): IterableIterator<P> {
      for (const item of originalIterator) {
        // Parse the JSON string back into the object T
        yield mapper(item) as P;
      }
    }

    return iterator();
  }
}