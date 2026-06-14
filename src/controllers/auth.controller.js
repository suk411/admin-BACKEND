import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

async function login(req, res) {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ msg: "Mobile and password are required", status: "failed" });
    }

    const user = await userModel.findOne({ mobile: String(mobile).trim() }).select("+password");

    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials", status: "failed" });
    }

    if (!user.admin) {
      return res.status(403).json({ msg: "Access denied: Not an admin account", status: "failed" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid credentials", status: "failed" });
    }

    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    const token = jwt.sign(
      { userId: user.userId, tokenVersion: user.tokenVersion },
      secret,
      { expiresIn: "24h" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    logger.info(`[AdminAuth] Login: userId=${user.userId}`);

    res.json({
      msg: "Login successful",
      status: "success",
      token,
      user: {
        userId: user.userId,
        mobile: user.mobile,
        admin: user.admin,
      },
    });
  } catch (error) {
    logger.error(error, { where: "adminLogin" });
    res.status(500).json({ msg: error.message, status: "failed" });
  }
}

async function logout(req, res) {
  res.clearCookie("token");
  res.json({ msg: "Logged out", status: "success" });
}

async function me(req, res) {
  try {
    const user = await userModel
      .findOne({ userId: req.user.userId })
      .select("userId mobile admin createdAt updatedAt");

    if (!user) {
      return res.status(404).json({ msg: "User not found", status: "failed" });
    }

    res.json({ status: "success", user });
  } catch (error) {
    logger.error(error, { where: "adminMe" });
    res.status(500).json({ msg: error.message, status: "failed" });
  }
}

export default { login, logout, me };
