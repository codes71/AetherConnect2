import type { Response } from "express";

export const setAuthCookie = (
  res: Response,
  name: string,
  value: string,
  maxAge: number
) => {
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    partitioned: process.env.NODE_ENV === "production",
    maxAge: maxAge,
    path: "/",
  };

  // Only set domain if it's defined (production environment)
  if (process.env.NODE_ENV === "production") {
    cookieOptions.domain = ".vercel.app";
  }

  res.cookie(name, value, cookieOptions);
};

export const clearAuthCookie = (res: Response, name: string) => {
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    partitioned: process.env.NODE_ENV === "production",
    path: "/",
  };

  // Only set domain if it's defined (production environment)
  if (process.env.NODE_ENV === "production") {
    cookieOptions.domain = ".onrender.com";
  }

  res.clearCookie(name, cookieOptions);
};
