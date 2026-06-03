import express from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

async function getOrCreateCart(client, userId) {
  const existing = await client.query('SELECT id FROM carts WHERE user_id=$1', [userId]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
  return created.rows[0].id;
}

async function cartPayload(userId) {
  const { rows } = await query(
    `SELECT ci.id, ci.quantity, p.id AS product_id, p.name, p.price, p.stock, p.image_url,
            (ci.quantity * p.price)::numeric(12,2) AS subtotal
     FROM carts c
     JOIN cart_items ci ON ci.cart_id = c.id
     JOIN products p ON p.id = ci.product_id
     WHERE c.user_id = $1
     ORDER BY ci.created_at DESC`,
    [userId]
  );
  const total = rows.reduce((sum, item) => sum + Number(item.subtotal), 0);
  return { items: rows, total };
}

router.get('/', async (req, res, next) => {
  try {
    res.json({ cart: await cartPayload(req.user.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/items', async (req, res, next) => {
  try {
    const schema = z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).default(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    await transaction(async (client) => {
      const cartId = await getOrCreateCart(client, req.user.id);
      await client.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = now()`,
        [cartId, parsed.data.productId, parsed.data.quantity]
      );
    });
    res.status(201).json({ cart: await cartPayload(req.user.id) });
  } catch (error) {
    next(error);
  }
});

router.put('/items/:id', async (req, res, next) => {
  try {
    const schema = z.object({ quantity: z.number().int().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    await query(
      `UPDATE cart_items SET quantity=$1, updated_at=now()
       WHERE id=$2 AND cart_id IN (SELECT id FROM carts WHERE user_id=$3)`,
      [parsed.data.quantity, req.params.id, req.user.id]
    );
    res.json({ cart: await cartPayload(req.user.id) });
  } catch (error) {
    next(error);
  }
});

router.delete('/items/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM cart_items WHERE id=$1 AND cart_id IN (SELECT id FROM carts WHERE user_id=$2)', [req.params.id, req.user.id]);
    res.json({ cart: await cartPayload(req.user.id) });
  } catch (error) {
    next(error);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    await query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id=$1)', [req.user.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
