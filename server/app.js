const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { sequelize, User } = require('./models');
const { fail } = require('./utils/response');

const authRoutes = require('./routes/auth');
const goodsRoutes = require('./routes/goods');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');

const app = express();
const port = Number(process.env.PORT || 3000);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_, res) => {
  res.json({ code: 0, message: 'success', data: { status: 'ok' } });
});

app.use('/api', authRoutes);
app.use('/api/goods', goodsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err, req, res, next) => {
  if (err && err.message) {
    return res.status(500).json(fail(500, err.message));
  }
  return next();
});

app.use((req, res) => {
  res.status(404).json(fail(404, '接口不存在'));
});

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    const adminPhone = process.env.ADMIN_PHONE || '18800000000';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminExists = await User.findOne({ where: { phone: adminPhone } });
    if (!adminExists) {
      const hash = await bcrypt.hash(adminPass, 10);
      await User.create({
        nickname: '系统管理员',
        phone: adminPhone,
        password: hash,
        role: 'admin',
        student_id: 'A000000',
        college: '信息工程学院',
        avatar: ''
      });
      console.log(`Default admin created: ${adminPhone}`);
    }

    app.listen(port, () => {
      console.log(`Server running at http://127.0.0.1:${port}`);
    });
  } catch (error) {
    console.error('Server start failed:', error.message);
    process.exit(1);
  }
}

start();
