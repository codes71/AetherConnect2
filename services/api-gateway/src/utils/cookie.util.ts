import type { Response } from "express";
import { partition } from "rxjs";

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


  res.clearCookie(name, cookieOptions);
};
