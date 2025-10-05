
import type { Response } from "express";

export const setAuthCookie = (
  res: Response,
  name: string,
  value: string,
  maxAge: number
) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    partitioned: process.env.NODE_ENV === "production",
    maxAge: maxAge,
    path: "/",
  });
};

export const clearAuthCookie = (
  res: Response,
  name: string
) => {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    partitioned: process.env.NODE_ENV === "production",
    path: "/",
  });
};
