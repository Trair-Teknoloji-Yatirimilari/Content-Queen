/**
 * Simple in-memory rate limiter.
 * Production'da Redis kullanılabilir ama tek sunucu için yeterli.
 */
import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Her 5 dakikada eski kayıtları temizle
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

function getClientIP(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.headers["x-real-ip"] as string
    || req.ip
    || "unknown";
}

export function rateLimit(options: { windowMs: number; max: number; keyPrefix?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const key = `${options.keyPrefix || "rl"}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    if (entry.count > options.max) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    next();
  };
}

// Preset rate limiters
export const otpRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5, keyPrefix: "otp" }); // 5 OTP per minute
export const apiRateLimit = rateLimit({ windowMs: 60 * 1000, max: 300, keyPrefix: "api" }); // 300 req per minute
export const uploadRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: "upload" }); // 20 uploads per minute
