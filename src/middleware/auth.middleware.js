import userModel from "../models/user.model.js";
import accountModel from "../models/account.model.js";
import jwt from "jsonwebtoken";

export async function authMiddleware(req, res, next) {
  try {
    const botToken = (req.headers["x-bot-token"] || '').trim();
    if (botToken) {
      const expectedToken = (process.env.BOT_API_KEY || '').trim();
      if (!expectedToken || botToken !== expectedToken) {
        return res.status(403).json({ msg: "Invalid bot token", status: "failed" });
      }
      req.user = { bot: true };
      return next();
    }

    const token =
      req.cookies.token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        msg: "Authentication token is missing",
        status: "failed",
      });
    }

    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    const user = await userModel.findOne({ userId: decoded.userId });

    if (!user) {
      return res.status(401).json({ msg: "User not found", status: "failed" });
    }

    if (!user.admin) {
      return res.status(403).json({ msg: "Access denied: Admins only", status: "failed" });
    }

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ msg: "Session expired. Please login again.", status: "failed" });
    }

    const account = await accountModel.findOne({ user: user.userId }).select("status");
    if (account && account.status !== "active") {
      return res.status(403).json({ msg: `Account is ${account.status}`, status: "failed" });
    }

    req.user = {
      userId: user.userId,
      _id: user._id,
      mobile: user.mobile,
      admin: user.admin,
    };

    next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid authentication token", status: "failed" });
  }
}

export default { authMiddleware };
