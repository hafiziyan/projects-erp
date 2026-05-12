"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const merchant_routes_1 = __importDefault(require("./routes/merchant.routes"));
const user_management_routes_1 = __importDefault(require("./routes/user-management.routes"));
const master_data_routes_1 = __importDefault(require("./routes/master-data.routes"));
const stock_routes_1 = __importDefault(require("./routes/stock.routes"));
const sale_routes_1 = __importDefault(require("./routes/sale.routes"));
const purchase_routes_1 = __importDefault(require("./routes/purchase.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Backend ERP berjalan',
    });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/merchants', merchant_routes_1.default);
app.use('/api/merchant-users', user_management_routes_1.default);
app.use('/api/master', master_data_routes_1.default);
app.use('/api/stocks', stock_routes_1.default);
app.use('/api/sales', sale_routes_1.default);
app.use('/api/purchases', purchase_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
