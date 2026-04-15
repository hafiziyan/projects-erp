export interface AuthUser {
  userId: string;
  merchantId?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}