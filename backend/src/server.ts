import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path'; // Tambahkan import path
import authRoutes from './routes/auth.routes';
import merchantRoutes from './routes/merchant.routes';
import userManagementRoutes from './routes/user-management.routes';
import masterDataRoutes from './routes/master-data.routes';
import stockRoutes from './routes/stock.routes';
import saleRoutes from './routes/sale.routes';
import purchaseRoutes from './routes/purchase.routes';
import dashboardRoutes from './routes/dashboard.routes';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend ERP berjalan',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/merchant-users', userManagementRoutes);
app.use('/api/master', masterDataRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});