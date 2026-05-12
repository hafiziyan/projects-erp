"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
router.get('/summary', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Kasir', 'Gudang']), dashboard_controller_1.getDashboardSummary);
exports.default = router;
