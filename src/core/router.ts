import {
  CommanderSubscribeOptions,
  InvocationHandler,
  ListenerHandler,
  MqttClientSubscribeOptions,
} from "./types";

export interface PatternParams {
  name: string;
  index: number;
}

export interface ListenerSubscription {
  pattern: string;
  handler: ListenerHandler;
  options?: CommanderSubscribeOptions,
  params?: PatternParams[],
}

export interface HandlerSubscription {
  pattern: string;
  handler: InvocationHandler;
  options?: CommanderSubscribeOptions,
  params?: PatternParams[],
}

export interface MountedListenerSubscription extends ListenerSubscription {
  fullPattern: string;
}

export interface MountedHandlerSubscription extends HandlerSubscription {
  fullPattern: string;
}

abstract class RouterBase {
  abstract on(pattern: string, handler: ListenerHandler): void;
  abstract on(pattern: string, handler: ListenerHandler, options?: MqttClientSubscribeOptions): void;
  abstract _mountListeners(prefix: string): MountedListenerSubscription[]
}

export default class Router implements RouterBase {
  private readonly listenerRoutes: ListenerSubscription[] = [];
  private readonly handlerRoutes: HandlerSubscription[] = [];

  private readonly defaultOpts?: CommanderSubscribeOptions;

  constructor(opts?: CommanderSubscribeOptions) {
    this.defaultOpts = opts;
  }

  public on(pattern: string, handler: ListenerHandler, opts?: CommanderSubscribeOptions) {
    const options = { ...this.defaultOpts!, ...opts };
    const route: ListenerSubscription = { pattern, handler, options };

    this.listenerRoutes.push(route);
  }

  public handle(pattern: string, handler: InvocationHandler, opts?: CommanderSubscribeOptions) {
    const options = { ...this.defaultOpts!, ...opts };
    const route: HandlerSubscription = { pattern, handler, options };

    this.handlerRoutes.push(route);
  }

  public async use(route: string, router: Router) {
    const listeners = router._mountListeners(route);
    const handlers = router._mountHandlers(route);

    for (const handler of handlers) {
      const handlerRoute: HandlerSubscription = {
        pattern: handler.fullPattern,
        handler: handler.handler,
      };

      if (handler.options) {
        handlerRoute.options = handler.options;
      }

      this.handlerRoutes.push(handlerRoute);
    }

    for (const listener of listeners) {
      const listenerRoute: HandlerSubscription = {
        pattern: listener.fullPattern,
        handler: listener.handler,
      };

      if (listener.options) {
        listenerRoute.options = listener.options;
      }

      this.listenerRoutes.push(listenerRoute);
    }
  }

  public _mountListeners(prefix: string): MountedListenerSubscription[] {
    return this.listenerRoutes.map(route => {
      const fullPattern = `${prefix}/${route.pattern}`;
      return { ...route, fullPattern };
    });
  }

  public _mountHandlers(prefix: string): MountedHandlerSubscription[] {
    return this.handlerRoutes.map(route => {
      const fullPattern = `${prefix}/${route.pattern}`;
      return { ...route, fullPattern };
    });
  }
}