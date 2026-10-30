
import { randomUUID } from "node:crypto";
import RefreshToken from "../models/RefreshToken.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/refreshToken.js";

export const createRefreshToken = async (
  userId,
  familyId = randomUUID()
) => {
  const token = generateRefreshToken();

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  await RefreshToken.create({
    userId,
    familyId,
    tokenHash: hashRefreshToken(token),
    expiresAt,
  });

  return { token, familyId };
};
