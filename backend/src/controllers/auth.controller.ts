import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { signToken } from '../utils/jwt';
import nodemailer from 'nodemailer';

type UserWithMerchantUsers = Prisma.UserGetPayload<{
  include: {
    merchantUsers: {
      include: {
        merchant: true;
        role: true;
      };
    };
  };
}>;

// --- VALIDASI SCHEMAS ---

// VALIDASI REGISTER (Dengan Konfirmasi Password)
const registerSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung minimal satu huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung minimal satu huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung minimal satu angka'),
  confirmPassword: z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"], 
});

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email tidak valid'),
});

// VALIDASI RESET PASSWORD (Dengan Konfirmasi Password)
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token tidak valid'),
  newPassword: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

// --- EMAIL CONFIG ---
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --- CONTROLLER FUNCTIONS ---

export async function registerOwner(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validasi gagal',
      });
    }

    const { name, email, password } = parsed.data;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, status: 'active' },
    });

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: { id: user.id.toString(), name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('registerOwner error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });
    }
    const { email, password } = parsed.data;
    const user: UserWithMerchantUsers | null = await prisma.user.findUnique({
      where: { email },
      include: {
        merchantUsers: {
          where: { status: 'active' },
          include: { merchant: true, role: true },
        },
      },
    });

    if (!user) return res.status(401).json({ success: false, message: 'Email atau password salah' });
    if (user.status !== 'active') return res.status(403).json({ success: false, message: 'User tidak aktif' });

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) return res.status(401).json({ success: false, message: 'Email atau password salah' });

    const token = signToken({ userId: user.id.toString() });
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: { id: user.id.toString(), name: user.name, email: user.email },
        merchants: user.merchantUsers.map((item: any) => ({
          merchantUserId: item.id.toString(),
          merchantId: item.merchant.id.toString(),
          merchantName: item.merchant.name,
          role: item.role.name,
          membershipStatus: item.status,
        })),
      },
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function logout(_req: Request, res: Response) {
  try {
    res.clearCookie('token');
    return res.status(200).json({ success: true, message: 'Logout berhasil' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user: UserWithMerchantUsers | null = await prisma.user.findUnique({
      where: { id: BigInt(authUser.userId) },
      include: {
        merchantUsers: {
          where: { status: 'active' },
          include: { merchant: true, role: true },
        },
      },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    return res.status(200).json({
      success: true,
      data: {
        user: { id: user.id.toString(), name: user.name, email: user.email, status: user.status },
        merchants: user.merchantUsers.map((item: any) => ({
          merchantUserId: item.id.toString(),
          merchantId: item.merchant.id.toString(),
          merchantName: item.merchant.name,
          role: item.role.name,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Email tidak valid' });

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(200).json({ success: true, message: 'Jika email terdaftar, instruksi reset telah dikirim.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });

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
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengirim email reset' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });

    const { token, newPassword } = parsed.data;
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) return res.status(400).json({ success: false, message: 'Token tidak valid atau kadaluarsa' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    return res.status(200).json({ success: true, message: 'Password berhasil diubah.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}