import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { createRefreshToken } from "../services/auth.services.js";
import RefreshToken from "../models/RefreshToken.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/refreshToken.js";
import { Op } from "sequelize";

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const existingUser = await User.findOne({ where: { email: email } });
    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists",
        success: false,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: name,
      email: email,
      password: hashedPassword,
    });
    res.status(201).json({
      message: "User registered successfully",
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        success: false,
      });
    }
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
        success: false,
      });
    }

    const isPassword = await bcrypt.compare(password, user.password);
    if (!isPassword) {
      return res.status(401).json({
        message: "Invalid email or password",
        success: false,
      });
    }

    const payload = {
      sub: String(user.id),
      email: user.email,
      role: user.role,
    };
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "15m",
    });

    const { token: refreshToken } = await createRefreshToken(user.id);

    // console.log("LOGIN REFRESH TOKEN GENERATED:", Boolean(refreshToken));

    res.status(200).json({
      message: "Login successful",
      success: true,
      token: token,
      refreshToken: refreshToken,
      // familyId: familyId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (typeof refreshToken !== "string" || !refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);

    const storedToken = await RefreshToken.findOne({
      where: { tokenHash },
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // A revoked token was used again: revoke its active token family.
    if (storedToken.revokedAt) {
      if (storedToken.familyId) {
        await RefreshToken.update(
          { revokedAt: new Date() },
          {
            where: {
              familyId: storedToken.familyId,
              revokedAt: null,
              expiresAt: { [Op.gt]: new Date() },
            },
          },
        );
      }

      return res.status(401).json({
        success: false,
        message: "Refresh token reuse detected. Please log in again.",
      });
    }

    if (storedToken.expiresAt <= new Date()) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const user = await User.findByPk(storedToken.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate replacement token
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);

    // Atomically claim the old token so concurrent refreshes
    // cannot both rotate the same token.
    const sequelize = RefreshToken.sequelize;

    const rotated = await sequelize.transaction(async (transaction) => {
      const [updatedCount] = await RefreshToken.update(
        { revokedAt: new Date() },
        {
          where: {
            id: storedToken.id,
            revokedAt: null,
            expiresAt: { [Op.gt]: new Date() },
          },
          transaction,
        },
      );

      if (updatedCount !== 1) return false;

      await RefreshToken.create(
        {
          userId: user.id,
          familyId: storedToken.familyId,
          tokenHash: newTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        { transaction },
      );

      return true;
    });

    if (!rotated) {
      return res.status(401).json({
        success: false,
        message: "Refresh token already used or expired",
      });
    }

    const accessToken = jwt.sign(
      { sub: String(user.id), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
      token: accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (typeof refreshToken !== "string" || !refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);

    const [revokedCount] = await RefreshToken.update(
      { revokedAt: new Date() },
      {
        where: {
          tokenHash,
          userId: Number(req.user.sub),
          revokedAt: null,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      count: revokedCount,
    });
  } catch (error) {
    return next(error);
  }
};
