import express from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

const productSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(3),
  description: z.string().min(10),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  imageUrl: z.string().url(),
  isActive: z.boolean().default(true)
});

router.get('/categories', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM categories ORDER BY name');
    res.json({ categories: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { search = '', category = '', limit = 24, offset = 0 } = req.query;
    const params = [`%${search}%`];
    let where = 'WHERE p.is_active = true AND (p.name ILIKE $1 OR p.description ILIKE $1)';
    if (category) {
      params.push(category);
      where += ` AND c.slug = $${params.length}`;
    }
    params.push(Number(limit), Number(offset));
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ products: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Product not found' });
    res.json({ product: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    const product = parsed.data;
    const { rows } = await query(
      `INSERT INTO products (category_id, name, description, price, stock, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [product.categoryId, product.name, product.description, product.price, product.stock, product.imageUrl, product.isActive]
    );
    res.status(201).json({ product: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    const product = parsed.data;
    const { rows } = await query(
      `UPDATE products
       SET category_id = $1, name = $2, description = $3, price = $4, stock = $5, image_url = $6, is_active = $7, updated_at = now()
       WHERE id = $8
       RETURNING *`,
      [product.categoryId, product.name, product.description, product.price, product.stock, product.imageUrl, product.isActive, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Product not found' });
    res.json({ product: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await query('UPDATE products SET is_active = false, updated_at = now() WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: 'Product not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
