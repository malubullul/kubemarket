import express from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT o.*, a.recipient_name, a.city
       FROM orders o
       JOIN addresses a ON a.id = o.address_id
       WHERE o.user_id=$1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    let q = `SELECT o.*, a.recipient_name, a.recipient_phone, a.province, a.city, a.district, a.postal_code, a.full_address
             FROM orders o JOIN addresses a ON a.id=o.address_id
             WHERE o.id=$1`;
    const params = [req.params.id];
    if (req.user.role !== 'admin') {
      q += ' AND o.user_id=$2';
      params.push(req.user.id);
    }
    const orderResult = await query(q, params);
    if (!orderResult.rows[0]) return res.status(404).json({ message: 'Order not found' });
    const items = await query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [req.params.id]);
    res.json({ order: { ...orderResult.rows[0], items: items.rows } });
  } catch (error) {
    next(error);
  }
});

router.post('/checkout', async (req, res, next) => {
  try {
    const schema = z.object({ addressId: z.number().int().positive() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });

    const order = await transaction(async (client) => {
      const address = await client.query('SELECT id FROM addresses WHERE id=$1 AND user_id=$2', [parsed.data.addressId, req.user.id]);
      if (!address.rows[0]) {
        const error = new Error('Address required for checkout');
        error.status = 400;
        throw error;
      }

      const cart = await client.query('SELECT id FROM carts WHERE user_id=$1', [req.user.id]);
      if (!cart.rows[0]) {
        const error = new Error('Cart is empty');
        error.status = 400;
        throw error;
      }

      const items = await client.query(
        `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock
         FROM cart_items ci JOIN products p ON p.id=ci.product_id
         WHERE ci.cart_id=$1 FOR UPDATE OF p`,
        [cart.rows[0].id]
      );
      if (!items.rows.length) {
        const error = new Error('Cart is empty');
        error.status = 400;
        throw error;
      }

      for (const item of items.rows) {
        if (item.stock < item.quantity) {
          const error = new Error(`${item.name} does not have enough stock`);
          error.status = 409;
          throw error;
        }
      }

      const total = items.rows.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const created = await client.query(
        `INSERT INTO orders (user_id, address_id, status, total_amount)
         VALUES ($1, $2, 'pending', $3) RETURNING *`,
        [req.user.id, parsed.data.addressId, total]
      );

      for (const item of items.rows) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [created.rows[0].id, item.product_id, item.name, item.quantity, item.price, Number(item.price) * item.quantity]
        );
        await client.query('UPDATE products SET stock = stock - $1 WHERE id=$2', [item.quantity, item.product_id]);
      }

      await client.query('DELETE FROM cart_items WHERE cart_id=$1', [cart.rows[0].id]);
      return created.rows[0];
    });

    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pay', async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING *",
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Order not found or not in pending status' });
    res.json({ order: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const order = await transaction(async (client) => {
      const orderResult = await client.query(
        "UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING *",
        [req.params.id, req.user.id]
      );
      if (!orderResult.rows[0]) {
        const error = new Error('Order not found or not in pending status');
        error.status = 404;
        throw error;
      }

      const itemsResult = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [req.params.id]);
      for (const item of itemsResult.rows) {
        await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
      return orderResult.rows[0];
    });
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE orders SET status = 'completed', updated_at = now() WHERE id = $1 AND user_id = $2 AND status = 'shipped' RETURNING *",
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Order not found or not in shipped status' });
    res.json({ order: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
