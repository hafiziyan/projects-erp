"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchant_controller_1 = require("../controllers/merchant.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authMiddleware, merchant_controller_1.createMerchant);
router.get('/my', auth_middleware_1.authMiddleware, merchant_controller_1.getMyMerchants);
router.get('/:id', auth_middleware_1.authMiddleware, merchant_controller_1.getMerchantDetail);
router.put('/:id', auth_middleware_1.authMiddleware, merchant_controller_1.updateMerchant);
// --- Rute Baru Untuk Toggle Status ---
router.patch('/:id/status', auth_middleware_1.authMiddleware, merchant_controller_1.toggleMerchantStatus);
router.delete('/:id', auth_middleware_1.authMiddleware, merchant_controller_1.deleteMerchant);
exports.default = router;
