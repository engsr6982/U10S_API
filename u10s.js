const { http, sha256, logger } = require("./util");

class U10S {
  /** @type {string} 设备地址 */ host_;
  /** @type {boolean} 设备是否登陆 */ isLogin_ = false;
  /** @type {string} 设备内部版本 */ internalVersion_; // cr_version
  /** @type {string} 设备软件版本 */ softwareVersion_; // wa_inner_version

  constructor(host) {
    this.host_ = host;
    this._initialize();
  }

  async _initialize() {
    const versions = await this.getDeviceParameter("cr_version", "wa_inner_version");
    this.softwareVersion_ = versions.wa_inner_version;
    this.internalVersion_ = versions.cr_version;
  }

  /**
   * 获取请求地址
   * @param {boolean} isGet 是否为 GET 请求
   */
  getRequestUrl(isGet = true) {
    return `http://${this.host_}${isGet ? "/goform/goform_get_cmd_process" : "/goform/goform_set_cmd_process"}`;
  }

  /**
   * 获取设备软件版本
   * @returns {string}
   */
  getSoftwareVersion() {
    return this.softwareVersion_;
  }

  /**
   * 获取设备内部版本
   * @returns {string}
   */
  getInternalVersion() {
    return this.internalVersion_;
  }

  /**
   * 获取设备参数
   * @param {..."LD" | "RD" | "battery_value" | "Language" | "cr_version" | "wa_inner_version"} param
   * @returns {Promise<string | null>}
   */
  async getDeviceParameter(...param) {
    if (param.length === 0) {
      throw new Error("未指定参数");
    }

    try {
      const query = {
        isTest: false,
      };

      const isMulti = param.length > 1; // 是否多个参数
      if (isMulti) {
        query.cmd = param.join(",");
        query.multi_data = 1;
      } else {
        query.cmd = param[0];
      }

      const result = await http.get(this.getRequestUrl(), query);
      const data = JSON.parse(result);
      return isMulti ? data : data[param[0]];
    } catch (e) {
      logger.error(e);
      return null;
    }
  }

  /**
   * 登陆设备
   * @param {string} password 密码
   * @returns {Promise<number>} 0: 登陆成功, 1: 登陆失败, 2: 重复登陆, 3: 密码错误, 4: 登陆成功(测试), 5: 退出登陆
   */
  async login(password) {
    const impl = async (password) => {
      const LD = await this.getDeviceParameter("LD");
      const sha256Password = sha256(sha256(password) + LD);

      const res = await http.post(this.getRequestUrl(false), {
        isTest: false,
        goformId: "LOGIN",
        password: sha256Password,
      });
      return JSON.parse(res);
    };

    const res = await impl(password);
    const code = parseInt(res.result);

    if (code === 0 || code === 4) {
      this.isLogin_ = true;
    }
    return code;
  }

  /**
   * 退出登陆
   * @returns {Promise<boolean>}
   */
  async logout() {
    const deviceId = sha256(this.softwareVersion_ + this.internalVersion_); // 设备ID

    const RD = await this.getDeviceParameter("RD");
    const AD = sha256(deviceId + RD);

    const res = await http.post(this.getRequestUrl(false), {
      isTest: false,
      goformId: "LOGOUT",
      AD: AD,
    });

    this.isLogin_ = false;
    return JSON.parse(res).result == "success";
  }

  /**
   * 获取电池电量
   * @returns {Promise<string | null>}
   */
  async getBattery() {
    if (!this.isLogin_) {
      return null;
    }
    const data = await this.getDeviceParameter("battery_value");
    return data;
  }
}

module.exports = U10S;
