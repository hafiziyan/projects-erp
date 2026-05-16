"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const upload_1 = require("../middleware/upload");
const master_data_controller_1 = require("../controllers/master-data.controller");
const router = (0, express_1.Router)();
/* CATEGORY */
router.post('/categories', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.createCategory);
router.get('/categories', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang', 'Kasir']), master_data_controller_1.getCategories);
router.patch('/categories/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.updateCategory);
router.delete('/categories/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.deleteCategory);
/* UNIT */
router.post('/units', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.createUnit);
router.get('/units', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang', 'Kasir']), master_data_controller_1.getUnits);
router.patch('/units/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.updateUnit);
router.delete('/units/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.deleteUnit);
/* PRODUCT */
router.post('/products', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.createProduct);
router.get('/products', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang', 'Kasir']), master_data_controller_1.getProducts);
router.get('/products/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.getProductDetail);
// Specific routes MUST come before general :id routes for correct matching
router.post('/products/:id/upload-image', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), upload_1.uploadProductImage.single('image'), master_data_controller_1.uploadProductImageHandler);
router.patch('/products/:id/deactivate', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.deactivateProduct);
router.patch('/products/:id/activate', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.activateProduct);
router.patch('/products/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(['Owner', 'Gudang']), master_data_controller_1.updateProduct);
exports.default = router;
