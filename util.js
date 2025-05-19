const http_ = require("http");
const querystring = require("querystring");

/**
 * 计算 SHA256
 */
function sha256(data) {
  return require("crypto").createHash("sha256").update(data).digest("hex").toLocaleUpperCase();
}

class Logger {
  ANSI_Colors = {
    Reset: "\x1b[0m",
    Red: "\x1b[31m", // 红色
    Green: "\x1b[32m", // 绿色
    Yellow: "\x1b[33m", // 黄色
  };

  debug_ = false;

  constructor(debug = false) {
    this.debug_ = debug;
  }

  info(...args) {
    console.log("ℹ", this.ANSI_Colors.Green, ...args, this.ANSI_Colors.Reset);
  }

  warn(...args) {
    console.log("⚠", this.ANSI_Colors.Yellow, ...args, this.ANSI_Colors.Reset);
  }

  error(...args) {
    console.log("❌", this.ANSI_Colors.Red, ...args, this.ANSI_Colors.Reset);
  }
}
const logger = new Logger();

class http {
  constructor() {
    throw new Error("This is a static class");
  }

  /**
   * 发起 HTTP GET 请求
   * @param {string} url 请求地址(例如: http://192.168.0.1)
   * @param {object} query 请求参数
   * @param {object} headers 请求头
   * @param {number} timeout 超时时间
   * @returns {Promise<string>} 响应内容
   */
  static get(url, query = {}, headers = {}, timeout = 10000) {
    const urlWithQuery = this.buildUrlWithQuery(url, query);
    return this._request(urlWithQuery, "GET", null, headers, timeout);
  }

  /**
   * 发起 HTTP POST 请求
   * @param {string} url 请求地址
   * @param {object} data 请求参数
   * @param {object} headers 请求头
   * @param {number} timeout 超时时间
   * @returns {Promise<string>} 响应内容
   */
  static post(url, data = null, headers = {}, timeout = 10000) {
    return this._request(url, "POST", data, headers, timeout);
  }

  static buildUrlWithQuery(url, query) {
    const urlObj = new URL(url);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, value.toString());
      }
    });
    return urlObj.toString();
  }

  static _request(url, method, data, headers, timeout) {
    return new Promise((resolve, reject) => {
      const url_ = new URL(url);
      const options = {
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
        postData = querystring.stringify(data);
        options.headers["Content-Type"] = "application/x-www-form-urlencoded";
        options.headers["Content-Length"] = Buffer.byteLength(postData);
      }

      const req = http_.request(options, (res) => {
        let rawData = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
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

module.exports = { sha256, logger, http };
