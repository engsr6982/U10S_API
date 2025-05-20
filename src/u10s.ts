import { http, sha256, logger } from "./util.js";

type Parameters =
  | /**  */ "modem_main_state"
  | /**  */ "pin_status"
  | /**  */ "opms_wan_mode"
  | /**  */ "loginfo"
  | /**  */ "new_version_state"
  | /**  */ "current_upgrade_state"
  | /**  */ "is_mandatory"
  | /**  */ "wifi_dfs_status"
  | /**  */ "battery_value"
  | /**  */ "LD"
  | /**  */ "RD"
  | /**  */ "Language"
  | /**  */ "cr_version"
  | /**  */ "wa_inner_version"
  | /**  */ "web_wifi_password_init_flag"
  | /**  */ "puknumber"
  | /**  */ "pinnumber"
  | /**  */ "psw_fail_num_str"
  | /**  */ "login_lock_time"
  | /**  */ "ppp_dial_conn_fail_counter"
  | /**  */ "ACL_mode"
  | /**  */ "wifi_mac_black_list"
  | /**  */ "wifi_hostname_black_list"
  | /**  */ "wifi_cur_state"
  | /**  */ "user_ip_addr"
  | /**  */ "station_list"
  | /**  */ "signalbar"
  | /**  */ "network_type"
  | /**  */ "network_provider"
  | /**  */ "ppp_status"
  | /**  */ "EX_SSID1"
  | /**  */ "sta_ip_status"
  | /**  */ "EX_wifi_profile"
  | /**  */ "m_ssid_enable"
  | /**  */ "SSID1"
  | /**  */ "sta_count"
  | /**  */ "m_sta_count"
  | /**  */ "simcard_roam"
  | /**  */ "lan_ipaddr"
  | /**  */ "station_mac"
  | /**  */ "battery_charging"
  | /**  */ "battery_vol_percent"
  | /**  */ "battery_pers"
  | /**  */ "spn_display_flag"
  | /**  */ "plmn_display_flag"
  | /**  */ "spn_name_data"
  | /**  */ "spn_b1_flag"
  | /**  */ "spn_b2_flag"
  | /**  */ "realtime_tx_bytes"
  | /**  */ "realtime_rx_bytes"
  | /**  */ "realtime_time"
  | /**  */ "realtime_tx_thrpt"
  | /**  */ "realtime_rx_thrpt"
  | /**  */ "monthly_rx_bytes"
  | /**  */ "monthly_tx_bytes"
  | /**  */ "monthly_time"
  | /**  */ "date_month"
  | /**  */ "data_volume_limit_switch"
  | /**  */ "data_volume_limit_size"
  | /**  */ "data_volume_alert_percent"
  | /**  */ "data_volume_limit_unit"
  | /**  */ "roam_setting_option"
  | /**  */ "upg_roam_switch"
  | /**  */ "ap_station_mode"
  | /**  */ "simcard_active_slot_temp"
  | /**  */ "ssid"
  | /**  */ "wifi_enable"
  | /**  */ "wifi_5g_enable"
  | /**  */ "check_web_conflict"
  | /**  */ "dial_mode"
  | /**  */ "wifi_onoff_func_control"
  | /**  */ "wan_lte_ca"
  | /**  */ "privacy_read_flag"
  | /**  */ "upgrade_result"
  | /**  */ "password_remind";

enum LoginResult {
  /** 登陆成功 */ Success = 0,
  /** 登陆失败 */ Failed = 1,
  /** 重复登陆 */ DuplicateLogins = 2,
  /** 密码错误 */ WrongPassword = 3,
  /** 登陆成功 */ SuccessTest = 4,
  /** 退出登陆 */ Logout = 5,
}

export class U10S {
  /** 设备地址 */ host_: string;
  /** 设备是否登陆 */ isLogin_ = false;

  constructor(host: string) {
    this.host_ = host;
  }

  /**
   * 获取请求地址
   * @param isGet 是否为 GET 请求
   */
  getRequestUrl(isGet = true): string {
    return `http://${this.host_}${isGet ? "/goform/goform_get_cmd_process" : "/goform/goform_set_cmd_process"}`;
  }

  /**
   * 获取设备软件版本
   */
  async getSoftwareVersion(): Promise<string | null> {
    return await this.getDeviceParameter("wa_inner_version");
  }

  /**
   * 获取设备内部版本
   */
  async getInternalVersion(): Promise<string | null> {
    return await this.getDeviceParameter("cr_version");
  }

  /**
   * 获取设备参数
   */
  async getDeviceParameter<T extends Parameters[]>(...param: T): Promise<T["length"] extends 1 ? string | null : Record<string, unknown> | null> {
    if (param.length === 0) {
      throw new Error("未指定参数");
    }

    try {
      const query: {
        isTest: boolean;
        cmd: string;
        multi_data?: number;
      } = {
        isTest: false,
        cmd: "",
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
   * @param password 密码
   */
  async login(password: string): Promise<LoginResult> {
    const impl = async (password: string) => {
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
   */
  async logout(): Promise<boolean> {
    const soft = (await this.getSoftwareVersion()) as string;
    const internal = (await this.getInternalVersion()) as string;
    const deviceId = sha256(soft + internal); // 设备ID

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
   */
  async getBattery(): Promise<string | null> {
    if (!this.isLogin_) {
      return null;
    }
    const data = await this.getDeviceParameter("battery_value");
    return data as string;
  }
}
