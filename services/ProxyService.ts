/**
 * 自动化全局代理管理器 (Transparent Global Proxy Manager)
 * 
 * 职责：
 * 1. 拦截全局 fetch 请求。
 * 2. 自动根据 URL 识别目标平台。
 * 3. 检查全局设置，决定是否重定向到反代服务器。
 * 4. 自动注入 X-Target-Platform 头，无需在业务代码中做任何处理。
 * 反代服务器代码：
 * export default {
    async fetch(request, env) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        };

        // 1. 拦截 OPTIONS 预检请求
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const firstPath = pathParts[1];

        // 2. 根路径 (/) 健康检查心跳响应 (解决 路由 [/] 报错)
        if (!firstPath || firstPath === '') {
            return new Response(JSON.stringify({
                status: 'online',
                service: 'AntiGravity API Reverse Proxy',
                message: '反代 Worker 服务运行正常。',
                availableRoutes: ['/google', '/groq', '/pollinations', '/zhipu', '/gemini', '/accounts']
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // 3. 忽略浏览器 favicon.ico 自动请求
        if (firstPath === 'favicon.ico') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // 4. 全量路由映射表
        const routeMap = {
            'google': 'generativelanguage.googleapis.com',
            'groq': 'api.groq.com',
            'pollinations': 'gen.pollinations.ai',
            'zhipu': 'open.bigmodel.cn',
            'gemini': 'gemini.google.com',
            'accounts': 'accounts.google.com',
        };

        const targetHost = routeMap[firstPath];

        if (!targetHost) {
            return new Response(JSON.stringify({
                error: 'Invalid Proxy Route',
                message: `路由 [/${firstPath}] 未在反代服务器路由表中注册。`,
                supportedRoutes: Object.keys(routeMap)
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // 5. 构建真实目标地址 (以字符串替换方式保留原始 URL 编码，防止自动解码导致的特殊字符解析异常)
        let targetUrlStr = request.url.replace(url.host, targetHost);
        if (targetUrlStr.includes(`/${firstPath}/`)) {
            targetUrlStr = targetUrlStr.replace(`/${firstPath}/`, '/');
        } else {
            targetUrlStr = targetUrlStr.replace(`/${firstPath}`, '/');
        }
        const targetUrl = new URL(targetUrlStr);

        // 6. 清理并补全请求头
        const headers = new Headers(request.headers);
        headers.delete('Host');
        headers.delete('Origin');
        headers.delete('Referer');
        headers.delete('accept-encoding');

        // 设置通用浏览器 User-Agent，防止 Cloudflare WAF 等网关无感知拦截 Worker 请求
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

        if (firstPath === 'gemini' || firstPath === 'accounts') {
            headers.set('Referer', 'https://gemini.google.com/');
            headers.set('Origin', 'https://gemini.google.com');
        }

        // 7. 安全发送转发请求（包含 duplex: 'half' 避开 V8 Stream 转发限制）
        const requestInit = {
            method: request.method,
            headers: headers,
            redirect: 'follow',
            duplex: 'half'
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            requestInit.body = request.body;
        }

        try {
            const modifiedRequest = new Request(targetUrl.toString(), requestInit);
            const response = await fetch(modifiedRequest);

            // 8. 过滤冲突 Header 并注入跨域头
            const newHeaders = new Headers(response.headers);
            newHeaders.delete('content-encoding');
            newHeaders.delete('content-length');

            Object.entries(corsHeaders).forEach(([key, value]) => {
                newHeaders.set(key, value);
            });

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });

        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Proxy Transmission Error',
                message: error.message,
                target: targetUrl.toString()
            }), {
                status: 502,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }
};
 */
const PLATFORM_MAP: Record<string, string> = {
  'api.groq.com': 'groq',
  'generativelanguage.googleapis.com': 'google',
  'open.bigmodel.cn': 'zhipu',
  'gen.pollinations.ai': 'pollinations',
};

class ProxyServiceImpl {
  private isInitialized = false;

  /**
   * 初始化代理拦截器
   * 仅应在应用启动时调用一次
   */
  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const settings = (window as any).globalSettings;
      if (!settings || !settings.ProxyBase) {
        return originalFetch(input, init);
      }

      let urlString = '';
      if (typeof input === 'string') urlString = input;
      else if (input instanceof URL) urlString = input.href;
      else if (input instanceof Request) urlString = input.url;

      try {
        const url = new URL(urlString);
        const host = url.host;
        const platform = PLATFORM_MAP[host];

        // 如果匹配到平台，检查代理开关
        if (platform) {
          const proxyKey = `useProxy${platform.charAt(0).toUpperCase()}${platform.slice(1)}`;
          const isProxyEnabled = settings[proxyKey] === true;

          if (isProxyEnabled) {
            const proxyBase = settings.ProxyBase.replace(/\/+$/, '');
            // 核心转换：将原 Host 替换为 ProxyBase，并加上平台子路由前缀以适配反代的服务路由分配
            // 另外注入 X-Target-Platform Header（部分反代也可能通过 Header 识别，此处保留）
            const newUrl = `${proxyBase}/${platform}${url.pathname}${url.search}`;

            const newInit: RequestInit = { ...(init || {}) };
            const newHeaders = new Headers(newInit.headers || {});
            newHeaders.set('X-Target-Platform', platform);
            newInit.headers = newHeaders;

            console.log(`[代理拦截] ${platform} -> ${proxyBase}`);
            return originalFetch(newUrl, newInit);
          }
        }
      } catch (e) {
        // 解析失败按原样执行
      }

      return originalFetch(input, init);
    };

    // ── XHR 拦截：Puter.js SDK 使用 XMLHttpRequest 发起 LLM 请求 ──
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      user?: string | null,
      password?: string | null,
    ) {
      (this as any).__proxy_url = url.toString();
      (this as any).__proxy_method = method;
      return originalXHROpen.call(this, method, url, async, user, password);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const urlStr = (this as any).__proxy_url || '';
      try {
        const urlObj = new URL(urlStr);
        const host = urlObj.host;
        const platform = PLATFORM_MAP[host];
        if (platform) {
          const settings = (window as any).globalSettings;
          const proxyEnabled = settings?.[`useProxy${platform.charAt(0).toUpperCase() + platform.slice(1)}`];
          if (proxyEnabled && settings?.ProxyBase) {
            const proxyUrl = `${settings.ProxyBase}/${platform}${urlObj.pathname}${urlObj.search}`;
            (this as any).__proxied = true;
            // 重写 URL，让 open 已注册的请求走代理
            originalXHROpen.call(this, (this as any).__proxy_method, proxyUrl, true);
            (this as any).__proxy_url = proxyUrl;
          }
        }
      } catch { /* 解析失败不处理 */ }
      return originalXHRSend.call(this, body);
    };

    console.log('>> [系统] 全局代理拦截器服务已激活 (fetch + XHR)');
  }
}

export const ProxyService = new ProxyServiceImpl();
