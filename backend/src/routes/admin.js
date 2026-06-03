import express from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [sales, users, products, orders, daily] = await Promise.all([
      query("SELECT COALESCE(SUM(total_amount),0)::numeric(12,2) AS total_sales FROM orders WHERE status != 'cancelled'"),
      query("SELECT COUNT(*)::int AS total_users FROM users WHERE role='customer'"),
      query('SELECT COUNT(*)::int AS total_products FROM products'),
      query('SELECT COUNT(*)::int AS total_orders FROM orders'),
      query(
        `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, SUM(total_amount)::numeric(12,2) AS sales
         FROM orders GROUP BY created_at::date ORDER BY day DESC LIMIT 7`
      )
    ]);
    res.json({
      stats: {
        totalSales: sales.rows[0].total_sales,
        totalUsers: users.rows[0].total_users,
        totalProducts: products.rows[0].total_products,
        totalOrders: orders.rows[0].total_orders,
        dailySales: daily.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT id, full_name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ users: rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const schema = z.object({ isActive: z.boolean(), role: z.enum(['customer', 'admin']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    const { rows } = await query(
      'UPDATE users SET is_active=$1, role=$2, updated_at=now() WHERE id=$3 RETURNING id, full_name, email, phone, role, is_active, created_at',
      [parsed.data.isActive, parsed.data.role, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT o.*, u.full_name, u.email, a.city, a.recipient_name
       FROM orders o
       JOIN users u ON u.id=o.user_id
       JOIN addresses a ON a.id=o.address_id
       ORDER BY o.created_at DESC`
    );
    res.json({ orders: rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id', async (req, res, next) => {
  try {
    const schema = z.object({ status: z.enum(['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    const { rows } = await query('UPDATE orders SET status=$1, updated_at=now() WHERE id=$2 RETURNING *', [parsed.data.status, req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Order not found' });
    res.json({ order: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM categories ORDER BY name');
    res.json({ categories: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const schema = z.object({ name: z.string().min(2), slug: z.string().min(2), description: z.string().min(3) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    const { rows } = await query('INSERT INTO categories (name, slug, description) VALUES ($1,$2,$3) RETURNING *', [parsed.data.name, parsed.data.slug, parsed.data.description]);
    res.status(201).json({ category: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const schema = z.object({ name: z.string().min(2), slug: z.string().min(2), description: z.string().min(3) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    const { rows } = await query('UPDATE categories SET name=$1, slug=$2, description=$3, updated_at=now() WHERE id=$4 RETURNING *', [parsed.data.name, parsed.data.slug, parsed.data.description, req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Category not found' });
    res.json({ category: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: 'Category not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
