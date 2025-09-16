declare namespace Express {
  interface Request {
    user?: { userId: string; email: string; /* Add other properties from your JWT payload if needed */ };
  }
}