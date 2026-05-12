"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const stock_controller_1 = require("../controllers/stock.controller");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), stock_controller_1.getStocks);
// PENTING: Route history HARUS berada di atas route detail (/:productId)
router.get('/:productId/history', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), stock_controller_1.getStockHistory);
router.get('/:productId', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), stock_controller_1.getStockDetail);
router.patch('/:productId/adjust', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), stock_controller_1.adjustStock);
exports.default = router;
