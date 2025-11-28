import {InvocationHandler, ListenerHandler, MqttClientSubscribeOptions} from "./types";

export interface ListenerSubscription {
  pattern: string;
  handler: ListenerHandler;
  options?: MqttClientSubscribeOptions,
}

export interface HandlerSubscription {
  pattern: string;
  handler: InvocationHandler;
  options?: MqttClientSubscribeOptions,
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

  public on(pattern: string, handler: ListenerHandler, options?: MqttClientSubscribeOptions) {
    const route: ListenerSubscription = { pattern, handler };

    if (options) route.options = options;

    this.listenerRoutes.push(route);
  }

  public handle(pattern: string, handler: InvocationHandler, options?: MqttClientSubscribeOptions) {
    const route: HandlerSubscription = { pattern, handler };

    // TODO: ADD RESOLVER HERE... PUBLISH...

    if (options) route.options = options;

    this.handlerRoutes.push(route);
  }

  public _mountListeners(prefix: string): MountedListenerSubscription[] {
    return this.listenerRoutes.map(route => ({
      ...route,
      fullPattern: `${prefix}/${route.pattern}`,
    }));
  }

  public _mountHandlers(prefix: string): MountedHandlerSubscription[] {
    return this.handlerRoutes.map(route => ({
      ...route,
      fullPattern: `${prefix}/${route.pattern}`,
    }));
  }
}