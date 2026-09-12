import type { ApiPlatform } from '../meta';

/**
 * 与 Settings 中代理相关字段保持同构。
 * 不直接依赖完整 Settings，避免代理服务引入过重的类型耦合。
 */
type ProxySettings = Partial<{
  ProxyBase: string;
  useProxyGroq: boolean;
  useProxyZhipu: boolean;
  useProxyPollinations: boolean;
  useProxyDeapi: boolean;
  useProxyQwenstudio: boolean;
  useProxyVolcengine: boolean;
  useProxyNvidia: boolean;
}>;

type ProxyToggleKey =
  | 'useProxyGroq'
  | 'useProxyZhipu'
  | 'useProxyPollinations'
  | 'useProxyDeapi'
  | 'useProxyQwenstudio'
  | 'useProxyVolcengine'
  | 'useProxyNvidia';

type FetchInit = RequestInit & {
  duplex?: 'half' | 'full';
};

interface ProxyHostRule {
  platform: ApiPlatform;
  hosts: string[];
  /**
   * 反代服务器路由前缀。
   * 默认与 platform 相同；若平台需要走独立路由，可显式指定。
   */
  route?: string;
  /**
   * 设置项开关键名。
   * 默认与 platform 对应的 useProxy* 字段相同。
   */
  toggle?: ProxyToggleKey;
}

interface RegisteredHostRule {
  platform: ApiPlatform;
  route: string;
  toggle: ProxyToggleKey;
}

interface ResolvedProxyTarget {
  url: string;
  platform: ApiPlatform;
  route: string;
}

interface XhrState {
  method: string;
  url: string;
  async: boolean;
  username?: string | null;
  password?: string | null;
  route?: string;
}

const PROXY_TOGGLES: Record<ApiPlatform, ProxyToggleKey> = {
  groq: 'useProxyGroq',
  zhipu: 'useProxyZhipu',
  pollinations: 'useProxyPollinations',
  deapi: 'useProxyDeapi',
  qwenstudio: 'useProxyQwenstudio',
  volcengine: 'useProxyVolcengine',
  nvidia: 'useProxyNvidia',
};

const DEFAULT_PROXY_RULES: ProxyHostRule[] = [
  {
    platform: 'groq',
    hosts: ['api.groq.com'],
  },
  {
    platform: 'zhipu',
    hosts: ['open.bigmodel.cn'],
  },
  {
    platform: 'pollinations',
    hosts: ['gen.pollinations.ai'],
  },
  {
    platform: 'volcengine',
    hosts: ['ark.cn-beijing.volces.com'],
  },
  {
    platform: 'nvidia',
    hosts: ['integrate.api.nvidia.com'],
  },
  {
    // deapi 图像/视频任务端点：与 DeapiProvider.API_BASE 保持一致，
    // 否则 useProxyDeapi 开关失效（全链路直连）。
    platform: 'deapi',
    hosts: ['api.deapi.ai'],
  },
];

const globalScope = globalThis as typeof globalThis & {
  globalSettings?: ProxySettings;
  __PROXY_HOST_RULES__?: ProxyHostRule[];
};

class ProxyServiceImpl {
  private initialized = false;
  private originalFetch: typeof fetch | null = null;
  private originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null;

  private readonly hostRules = new Map<string, RegisteredHostRule>();
  private readonly xhrStates = new WeakMap<XMLHttpRequest, XhrState>();

  constructor() {
    this.registerRules(DEFAULT_PROXY_RULES);
    this.registerRules(globalScope.__PROXY_HOST_RULES__ ?? []);
  }

  /**
   * 初始化全局代理拦截器。
   * 仅应在应用启动时调用一次。
   */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const service = this;

    if (typeof globalScope.fetch === 'function') {
      const originalFetch = globalScope.fetch;
      this.originalFetch = originalFetch;

      globalScope.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const rawUrl =
          typeof input === 'string'
            ? input
            : input instanceof Request
              ? input.url
              : input.href;

        const parsedUrl = service.parseUrl(rawUrl);
        const target = parsedUrl ? service.resolveTarget(parsedUrl) : null;

        if (!target) {
          return originalFetch.call(globalScope, input, init);
        }

        return originalFetch.call(
          globalScope,
          target.url,
          service.buildFetchInit(input, init, target.route),
        );
      };
    }

    if (typeof globalScope.XMLHttpRequest !== 'undefined') {
      const originalOpen = globalScope.XMLHttpRequest.prototype.open;
      const originalSend = globalScope.XMLHttpRequest.prototype.send;

      this.originalXhrOpen = originalOpen;
      this.originalXhrSend = originalSend;

      globalScope.XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async: boolean = true,
        username?: string | null,
        password?: string | null,
      ) {
        const urlText = String(url);
        const parsedUrl = service.parseUrl(urlText);
        const target = parsedUrl ? service.resolveTarget(parsedUrl) : null;

        service.xhrStates.set(this, {
          method,
          url: urlText,
          async,
          username,
          password,
          route: target?.route,
        });

        if (target) {
          return originalOpen.call(
            this,
            method,
            target.url,
            async,
            username,
            password,
          );
        }

        return originalOpen.call(this, method, url, async, username, password);
      } as typeof XMLHttpRequest.prototype.open;

      globalScope.XMLHttpRequest.prototype.send = function (
        this: XMLHttpRequest,
        body?: Document | XMLHttpRequestBodyInit | null,
      ) {
        const state = service.xhrStates.get(this);

        if (state && !state.route) {
          const parsedUrl = service.parseUrl(state.url);
          const target = parsedUrl ? service.resolveTarget(parsedUrl) : null;

          if (target) {
            state.route = target.route;
            originalOpen.call(
              this,
              state.method,
              target.url,
              state.async,
              state.username,
              state.password,
            );
          }
        }

        if (state?.route) {
          try {
            this.setRequestHeader('X-Target-Platform', state.route);
          } catch {
            // 某些 XHR 实现可能禁止修改请求头，忽略即可。
          }
        }

        return originalSend.call(this, body);
      } as typeof XMLHttpRequest.prototype.send;
    }
  }

  /**
   * 还原全局拦截器。
   */
  public destroy(): void {
    if (!this.initialized) return;

    if (this.originalFetch) {
      globalScope.fetch = this.originalFetch;
    }

    if (typeof globalScope.XMLHttpRequest !== 'undefined') {
      if (this.originalXhrOpen) {
        globalScope.XMLHttpRequest.prototype.open = this.originalXhrOpen;
      }
      if (this.originalXhrSend) {
        globalScope.XMLHttpRequest.prototype.send = this.originalXhrSend;
      }
    }

    this.originalFetch = null;
    this.originalXhrOpen = null;
    this.originalXhrSend = null;
    this.initialized = false;
  }

  /**
   * 注入或合并代理配置。
   * 可接收完整 Settings，也可只传入代理相关字段。
   */
  public setSettings(settings?: ProxySettings | null): void {
    if (!settings) return;
    const prev = globalScope.globalSettings;
    globalScope.globalSettings = { ...(prev ?? {}), ...settings };
  }

  /**
   * 注册需要走代理的宿主。
   * 对 deapi / qwenstudio 等未内置默认宿主的平台尤其有用。
   */
  public registerHosts(
    platform: ApiPlatform,
    hosts: string[],
    options?: {
      route?: string;
      toggle?: ProxyToggleKey;
    },
  ): void {
    const route = options?.route ?? platform;
    const toggle = options?.toggle ?? PROXY_TOGGLES[platform];

    for (const host of hosts) {
      const normalizedHost = host.trim().toLowerCase();
      if (!normalizedHost) continue;

      this.hostRules.set(normalizedHost, {
        platform,
        route,
        toggle,
      });
    }
  }

  /**
   * 注销指定宿主。
   */
  public unregisterHosts(hosts: string[]): void {
    for (const host of hosts) {
      const normalizedHost = host.trim().toLowerCase();
      if (!normalizedHost) continue;
      this.hostRules.delete(normalizedHost);
    }
  }

  /**
   * 查询某平台当前是否启用代理。
   */
  public isProxyEnabled(platform: ApiPlatform): boolean {
    const toggle = PROXY_TOGGLES[platform];
    const proxyBase = String(this.settings.ProxyBase ?? '').trim();
    return Boolean(proxyBase) && this.settings[toggle] === true;
  }

  private registerRules(rules: ProxyHostRule[]): void {
    for (const rule of rules) {
      this.registerHosts(rule.platform, rule.hosts, {
        route: rule.route,
        toggle: rule.toggle,
      });
    }
  }

  private get settings(): ProxySettings {
    // 唯一数据源为 window.globalSettings（App 每次 settings 变更时镜像）：
    // 历史存在 __PROXY_SETTINGS__ 内部轨道 + globalSettings 双轨回退，从未写入前者。
    const source = globalScope.globalSettings;

    return {
      ProxyBase: source?.ProxyBase,
      useProxyGroq: source?.useProxyGroq,
      useProxyZhipu: source?.useProxyZhipu,
      useProxyPollinations: source?.useProxyPollinations,
      useProxyDeapi: source?.useProxyDeapi,
      useProxyQwenstudio: source?.useProxyQwenstudio,
      useProxyVolcengine: source?.useProxyVolcengine,
      useProxyNvidia: source?.useProxyNvidia,
    };
  }

  private parseUrl(value: string | URL): URL | null {
    const raw = typeof value === 'string' ? value : value.href;
    if (!raw) return null;
    if (typeof URL !== 'function') return null;

    try {
      const baseHref = (globalThis as { location?: { href?: string } })
        .location?.href;
      return new URL(raw, baseHref);
    } catch {
      return null;
    }
  }

  private resolveTarget(url: URL): ResolvedProxyTarget | null {
    const proxyBase = String(this.settings.ProxyBase ?? '').trim();
    if (!proxyBase) return null;

    let baseUrl: URL;
    try {
      baseUrl = new URL(proxyBase);
    } catch {
      return null;
    }

    // 已经是代理地址，避免二次代理。
    if (url.host === baseUrl.host) return null;

    const rule = this.hostRules.get(url.host.toLowerCase());
    if (!rule) return null;

    if (this.settings[rule.toggle] !== true) return null;

    const normalizedBase = proxyBase.replace(/\/+$/, '');

    return {
      url: `${normalizedBase}/${rule.route}${url.pathname}${url.search}`,
      platform: rule.platform,
      route: rule.route,
    };
  }

  private buildFetchInit(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    route: string,
  ): FetchInit {
    if (input instanceof Request) {
      const headers = new Headers(input.headers);

      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => {
          headers.set(key, value);
        });
      }

      headers.set('X-Target-Platform', route);

      const method = init?.method ?? input.method;
      const body = this.normalizeBody(
        method,
        init?.body ?? input.body,
      );

      const forward: FetchInit = {
        method,
        headers,
        body,
        cache: init?.cache ?? input.cache,
        credentials: init?.credentials ?? input.credentials,
        integrity: init?.integrity ?? input.integrity,
        keepalive: init?.keepalive ?? input.keepalive,
        mode: init?.mode ?? input.mode,
        redirect: init?.redirect ?? input.redirect,
        referrer: init?.referrer ?? input.referrer,
        referrerPolicy: init?.referrerPolicy ?? input.referrerPolicy,
        signal: init?.signal ?? input.signal,
      };

      if (this.needsDuplex(body)) {
        forward.duplex = 'half';
      }

      return forward;
    }

    const headers = new Headers(init?.headers);
    headers.set('X-Target-Platform', route);

    const method = init?.method;
    const body = this.normalizeBody(method, init?.body);

    const forward: FetchInit = {
      ...init,
      method,
      headers,
      body,
    };

    if (this.needsDuplex(body)) {
      forward.duplex = 'half';
    }

    return forward;
  }

  private normalizeBody(
    method: string | undefined,
    body: BodyInit | null | undefined,
  ): BodyInit | undefined {
    const upperMethod = (method ?? 'GET').toUpperCase();
    if (upperMethod === 'GET' || upperMethod === 'HEAD') {
      return undefined;
    }
    return body ?? undefined;
  }

  private needsDuplex(body: BodyInit | null | undefined): boolean {
    return (
      typeof ReadableStream !== 'undefined' && body instanceof ReadableStream
    );
  }
}

export const ProxyService = new ProxyServiceImpl();