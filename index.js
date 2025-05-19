const U10S = require("./u10s");
const { logger } = require("./util");

const u10s = new U10S("192.168.0.1");

const loginImpl = async () => {
  logger.info("登陆设备...");
  const res = await u10s.login("admin");
  switch (res) {
    case 0:
      logger.info("登陆成功");
      break;
    case 1:
      logger.error("登陆失败");
      break;
    case 2:
      logger.error("重复登陆");
      break;
    case 3:
      logger.error("密码错误");
      break;
    case 4:
      logger.info("登陆成功(测试)");
      break;
  }
};

const logoutImpl = async () => {
  logger.info("退出登陆...");
  const res = await u10s.logout();
  if (res) {
    logger.info("退出登陆成功");
  } else {
    logger.error("退出登陆失败");
  }
};

const getBatteryImpl = async () => {
  logger.info("获取电池电量...");
  const res = await u10s.getBattery();
  if (res) {
    logger.info(`电池电量: ${res}%`);
  } else {
    logger.error("获取电池电量失败");
  }
};

async function main() {
  await loginImpl();
  await getBatteryImpl();
  await logoutImpl();
}

main();
