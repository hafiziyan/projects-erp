"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const purchase_controller_1 = require("../controllers/purchase.controller");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/purchases
 * @desc    Membuat transaksi pembelian baru (Restok)
 * @access  Private (Owner, Gudang)
 */
router.post('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), purchase_controller_1.createPurchase);
/**
 * @route   GET /api/purchases
 * @desc    Mengambil semua daftar transaksi pembelian
 * @access  Private (Owner, Gudang)
 */
router.get('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), purchase_controller_1.getPurchases);
/**
 * @route   GET /api/purchases/:id
 * @desc    Mengambil detail transaksi pembelian berdasarkan ID
 * @access  Private (Owner, Gudang)
 */
router.get('/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), purchase_controller_1.getPurchaseDetail);
exports.default = router;
