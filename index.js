const { http, sha256, logger } = require("./util");

class U10S {
  /** @type {string} 设备地址 */ host_;
  /** @type {boolean} 设备是否登陆 */ isLogin_ = false;
  /** @type {string} 设备内部版本 */ internalVersion_; // cr_version
  /** @type {string} 设备软件版本 */ softwareVersion_; // wa_inner_version

  constructor(host) {
    this.host_ = host;
    this.init();
  }

  /**
   * 获取请求地址
   * @param {boolean} isGet 是否为 GET 请求
   * @returns {string}
   */
  getRequestBaseUrl(isGet = true) {
    return `http://${this.host_}${
      isGet
        ? "/goform/goform_get_cmd_process"
        : "/goform/goform_set_cmd_process"
    }`;
  }

  /**
   * 初始化
   */
  async init() {
    logger.info("正在获取设备版本信息...");
    const versions = await this.getDeviceParameter(
      "cr_version",
      "wa_inner_version"
    );
    this.softwareVersion_ = versions.wa_inner_version;
    this.internalVersion_ = versions.cr_version;
    logger.info(`设备软件版本: ${this.softwareVersion_}`);
    logger.info(`设备内部版本: ${this.internalVersion_}`);
  }

  /**
   * 获取设备参数
   * @param {..."LD" | "RD" | "battery_value" | "Language" | "cr_version" | "wa_inner_version"} param
   * @returns {Promise<string>}
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

      const result = await http.get(this.getRequestBaseUrl(), query);
      const data = JSON.parse(result);
      return isMulti ? data : data[param[0]];
    } catch (e) {
      logger.error(e);
      return null;
    }
  }

  /**
   * 登陆设备
   */
  async login() {
    const loginImpl = async (password) => {
      const LD = await this.getDeviceParameter("LD");
      const sha256Password = sha256(sha256(password) + LD);

      logger.info(`正在登陆设备...`);
      const res = await http.post(this.getRequestBaseUrl(false), {
        isTest: false,
        goformId: "LOGIN",
        password: sha256Password,
      });
      return JSON.parse(res);
    };

    const password = "admin";
    const res = await loginImpl(password);
    switch (res.result) {
      case "0":
      case "4":
        logger.info("登陆成功");
        this.isLogin_ = true;
        break;
      case "1":
        logger.error("登陆失败");
        break;
      case "2":
        logger.error("重复登陆");
        break;
      case "5":
        logger.error("退出登陆");
        this.isLogin_ = false;
        break;
      default:
        logger.error(`未知错误: ${res.result}`);
    }
  }

  /**
   * 退出登陆
   */
  async logout() {
    const deviceId = sha256(this.softwareVersion_ + this.internalVersion_); // 设备ID

    const RD = await this.getDeviceParameter("RD");
    const AD = sha256(deviceId + RD);

    const res = await http.post(this.getRequestBaseUrl(false), {
      isTest: false,
      goformId: "LOGOUT",
      AD: AD,
    });
    logger.info(`退出登陆: ${res}`);
  }

  /**
   * 查询设备电量
   */
  async queryBattery() {
    if (!this.isLogin_) {
      logger.error("设备未登陆，无法查询电池电量");
      return;
    }

    logger.info("正在查询电池电量...");
    const data = await this.getDeviceParameter("battery_value");
    logger.info(`电池电量: ${data}`);
  }

  async test() {
    await this.login();
    await this.queryBattery();
    await this.logout();
  }
}

const u10s = new U10S("192.168.0.1");
u10s.test();
