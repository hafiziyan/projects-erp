"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOwner = registerOwner;
exports.login = login;
exports.logout = logout;
exports.me = me;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../utils/jwt");
const nodemailer_1 = __importDefault(require("nodemailer"));
// --- VALIDASI SCHEMAS ---
// VALIDASI REGISTER (Dengan Konfirmasi Password)
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, 'Nama minimal 3 karakter'),
    email: zod_1.z.string().email('Email tidak valid'),
    password: zod_1.z
        .string()
        .min(8, 'Password minimal 8 karakter')
        .regex(/[A-Z]/, 'Password harus mengandung minimal satu huruf besar')
        .regex(/[a-z]/, 'Password harus mengandung minimal satu huruf kecil')
        .regex(/[0-9]/, 'Password harus mengandung minimal satu angka'),
    confirmPassword: zod_1.z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email tidak valid'),
    password: zod_1.z.string().min(6, 'Password minimal 6 karakter'),
});
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email tidak valid'),
});
// VALIDASI RESET PASSWORD (Dengan Konfirmasi Password)
const resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token tidak valid'),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password minimal 8 karakter')
        .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
        .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
        .regex(/[0-9]/, 'Password harus mengandung angka'),
    confirmPassword: zod_1.z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
});
// --- EMAIL CONFIG ---
const transporter = nodemailer_1.default.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// --- CONTROLLER FUNCTIONS ---
async function registerOwner(req, res) {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.issues[0]?.message || 'Validasi gagal',
            });
        }
        const { name, email, password } = parsed.data;
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { name, email, password: hashedPassword, status: 'active' },
        });
        return res.status(201).json({
            success: true,
            message: 'Registrasi berhasil',
            data: { id: user.id.toString(), name: user.name, email: user.email },
        });
    }
    catch (error) {
        console.error('registerOwner error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function login(req, res) {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });
        }
        const { email, password } = parsed.data;
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: {
                merchantUsers: {
                    where: { status: 'active' },
                    include: { merchant: true, role: true },
                },
            },
        });
        if (!user)
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        if (user.status !== 'active')
            return res.status(403).json({ success: false, message: 'User tidak aktif' });
        const isPasswordMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordMatch)
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        const token = (0, jwt_1.signToken)({ userId: user.id.toString() });
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        return res.status(200).json({
            success: true,
            message: 'Login berhasil',
            data: {
                user: { id: user.id.toString(), name: user.name, email: user.email },
                merchants: user.merchantUsers.map((item) => ({
                    merchantUserId: item.id.toString(),
                    merchantId: item.merchant.id.toString(),
                    merchantName: item.merchant.name,
                    role: item.role.name,
                    membershipStatus: item.status,
                })),
            },
        });
    }
    catch (error) {
        console.error('login error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function logout(_req, res) {
    try {
        res.clearCookie('token');
        return res.status(200).json({ success: true, message: 'Logout berhasil' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function me(req, res) {
    try {
        const authUser = req.authUser;
        if (!authUser)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: BigInt(authUser.userId) },
            include: {
                merchantUsers: {
                    where: { status: 'active' },
                    include: { merchant: true, role: true },
                },
            },
        });
        if (!user)
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        return res.status(200).json({
            success: true,
            data: {
                user: { id: user.id.toString(), name: user.name, email: user.email, status: user.status },
                merchants: user.merchantUsers.map((item) => ({
                    merchantUserId: item.id.toString(),
                    merchantId: item.merchant.id.toString(),
                    merchantName: item.merchant.name,
                    role: item.role.name,
                })),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function forgotPassword(req, res) {
    try {
        const parsed = forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ success: false, message: 'Email tidak valid' });
        const { email } = parsed.data;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(200).json({ success: true, message: 'Jika email terdaftar, instruksi reset telah dikirim.' });
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000);
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: `"ERP Support" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Reset Password - ERP System',
            html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Halo, ${user.name}</h2>
          <p>Klik tombol di bawah untuk reset password:</p>
          <a href="${resetLink}" target="erp_reset_tab" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>`,
        };
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Instruksi reset telah dikirim.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal mengirim email reset' });
    }
}
async function resetPassword(req, res) {
    try {
        const parsed = resetPasswordSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });
        const { token, newPassword } = parsed.data;
        const user = await prisma_1.prisma.user.findFirst({
            where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
        });
        if (!user)
            return res.status(400).json({ success: false, message: 'Token tidak valid atau kadaluarsa' });
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
        });
        return res.status(200).json({ success: true, message: 'Password berhasil diubah.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
