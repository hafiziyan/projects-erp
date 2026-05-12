"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_1 = require("../utils/jwt");
function authMiddleware(req, res, next) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        req.authUser = {
            userId: decoded.userId,
        };
        next();
    }
    catch (error) {
        console.error('AuthMiddleware: Token verification failed:', error);
        return res.status(401).json({
            success: false,
            message: 'Token tidak valid atau expired',
        });
    }
}
