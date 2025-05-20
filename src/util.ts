import * as http_ from "http";
import * as querystring from "querystring";
import * as crypto from "crypto";

/**
 * 计算 SHA256
 */
export function sha256(data: string) {
  return crypto.createHash("sha256").update(data).digest("hex").toLocaleUpperCase();
}

class Logger {
  ANSI_Colors = {
    Reset: "\x1b[0m",
    Red: "\x1b[31m", // 红色
    Green: "\x1b[32m", // 绿色
    Yellow: "\x1b[33m", // 黄色
  };

  constructor() {}

  info(...args: unknown[]) {
    console.log("ℹ", this.ANSI_Colors.Green, ...args, this.ANSI_Colors.Reset);
  }

  warn(...args: unknown[]) {
    console.log("⚠", this.ANSI_Colors.Yellow, ...args, this.ANSI_Colors.Reset);
  }

  error(...args: unknown[]) {
    console.log("❌", this.ANSI_Colors.Red, ...args, this.ANSI_Colors.Reset);
  }
}
export const logger = new Logger();

export class http {
  constructor() {
    throw new Error("This is a static class");
  }

  /**
   * 发起 HTTP GET 请求
   * @param url 请求地址(例如: http://192.168.0.1)
   * @param query 请求参数
   * @param headers 请求头
   * @param timeout 超时时间
   * @returns 响应内容
   */
  static get(url: string, query = {}, headers = {}, timeout = 10000): Promise<string> {
    const urlWithQuery = this.buildUrlWithQuery(url, query);
    return this._request(urlWithQuery, "GET", null, headers, timeout) as Promise<string>;
  }

  /**
   * 发起 HTTP POST 请求
   * @param url 请求地址
   * @param data 请求参数
   * @param headers 请求头
   * @param timeout 超时时间
   * @returns 响应内容
   */
  static post(url: string, data: object | null = null, headers = {}, timeout = 10000): Promise<string> {
    return this._request(url, "POST", data, headers, timeout) as Promise<string>;
  }

  static buildUrlWithQuery(url: string, query: object) {
    const urlObj = new URL(url);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, value.toString());
      }
    });
    return urlObj.toString();
  }

  static _request(url: string, method: "GET" | "POST", data: object | null, headers: object, timeout: number) {
    return new Promise((resolve, reject) => {
      const url_ = new URL(url);
      const options: http_.RequestOptions = {
        hostname: url_.hostname,
        port: url_.port || 80,
        path: url_.pathname + url_.search,
        method: method,
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...headers,
        },
        timeout: timeout,
        insecureHTTPParser: true,
      };

      let postData = null;
      if (method === "POST" && data) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        postData = querystring.stringify(data);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        options.headers["Content-Type"] = "application/x-www-form-urlencoded";
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        options.headers["Content-Length"] = Buffer.byteLength(postData);
      }

      const req = http_.request(options, (res) => {
        let rawData = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(rawData);
          } else {
            reject(new Error(`请求失败，状态码: ${res.statusCode}, 响应: ${rawData}`));
          }
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("request timeout"));
      });

      if (postData) {
        req.write(postData);
      }

      req.end();
    });
  }
}
