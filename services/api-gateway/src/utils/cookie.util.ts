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
    maxAge: maxAge,
    path: "/",
  };

  console.log(`Setting cookie '${name}':`, {
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    domain: cookieOptions.domain,
    httpOnly: cookieOptions.httpOnly,
    path: cookieOptions.path,
    maxAge: cookieOptions.maxAge,
    NODE_ENV: process.env.NODE_ENV,
  });

  res.cookie(name, value, cookieOptions);
};

export const clearAuthCookie = (res: Response, name: string) => {
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };

  console.log(`Clearing cookie '${name}':`, {
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    domain: cookieOptions.domain,
    httpOnly: cookieOptions.httpOnly,
    path: cookieOptions.path,
    NODE_ENV: process.env.NODE_ENV,
  });

  res.clearCookie(name, cookieOptions);
};
