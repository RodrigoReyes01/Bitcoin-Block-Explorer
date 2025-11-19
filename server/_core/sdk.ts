import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  constructor() {
    console.log("[Auth] Initialized mock SDK");
  }

  async authenticateRequest(req: Request): Promise<User> {
    // Mock user for development
    const mockUser: User = {
      id: 1,
      openId: "mock-user-id",
      name: "Mock User",
      email: "mock@example.com",
      loginMethod: "mock",
      lastSignedIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return mockUser;
  }
}

export const sdk = new SDKServer();