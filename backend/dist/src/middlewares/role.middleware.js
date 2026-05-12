"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const prisma_1 = require("../lib/prisma");
function requireRole(allowedRoles) {
    return async function (req, res, next) {
        try {
            const authUser = req.authUser;
            const merchantIdHeader = req.headers['x-merchant-id'];
            if (!authUser) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }
            if (!merchantIdHeader) {
                return res.status(400).json({
                    success: false,
                    message: 'Header x-merchant-id wajib dikirim',
                });
            }
            const merchantIdValue = Array.isArray(merchantIdHeader)
                ? merchantIdHeader[0]
                : merchantIdHeader;
            if (!merchantIdValue) {
                return res.status(400).json({
                    success: false,
                    message: 'Header x-merchant-id tidak valid',
                });
            }
            if (!/^\d+$/.test(merchantIdValue)) {
                return res.status(400).json({
                    success: false,
                    message: 'x-merchant-id harus berupa angka',
                });
            }
            const merchantId = BigInt(merchantIdValue);
            const userId = BigInt(authUser.userId);
            const membership = await prisma_1.prisma.merchantUser.findFirst({
                where: {
                    merchantId,
                    userId,
                    status: 'active',
                },
                include: {
                    role: true,
                },
            });
            if (!membership) {
                return res.status(403).json({
                    success: false,
                    message: 'Anda tidak memiliki akses ke merchant ini',
                });
            }
            if (!allowedRoles.includes(membership.role.name)) {
                return res.status(403).json({
                    success: false,
                    message: 'Role Anda tidak memiliki izin',
                });
            }
            next();
        }
        catch (error) {
            console.error('requireRole error:', error);
            return res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server',
            });
        }
    };
}
