import BotConfig from "../models/botConfig.model.js";

async function getBotConfig(req, res) {
  try {
    let config = await BotConfig.findOne();
    if (!config) {
      config = await BotConfig.create({});
    }
    res.json({
      success: true,
      data: {
        ownerIds: config.ownerIds,
        allowedUserIds: config.allowedUserIds,
        allowedGroupIds: config.allowedGroupIds,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
}

async function updateBotConfig(req, res) {
  try {
    if (!req.user?.admin) {
      return res.status(403).json({ success: false, msg: "Admins only" });
    }
    const { ownerIds, allowedUserIds, allowedGroupIds } = req.body;
    const config = await BotConfig.findOneAndUpdate(
      {},
      { ownerIds: ownerIds || [], allowedUserIds: allowedUserIds || [], allowedGroupIds: allowedGroupIds || [] },
      { upsert: true, new: true },
    );
    res.json({
      success: true,
      data: {
        ownerIds: config.ownerIds,
        allowedUserIds: config.allowedUserIds,
        allowedGroupIds: config.allowedGroupIds,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
}

export { getBotConfig, updateBotConfig };
