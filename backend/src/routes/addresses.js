import express from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const addressSchema = z.object({
  recipientName: z.string().min(3),
  recipientPhone: z.string().min(8),
  province: z.string().min(2),
  city: z.string().min(2),
  district: z.string().min(2),
  postalCode: z.string().min(4),
  fullAddress: z.string().min(10),
  isDefault: z.boolean().default(false)
});

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user.id]);
    res.json({ addresses: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    if (parsed.data.isDefault) await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    const { rows } = await query(
      `INSERT INTO addresses (user_id, recipient_name, recipient_phone, province, city, district, postal_code, full_address, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, parsed.data.recipientName, parsed.data.recipientPhone, parsed.data.province, parsed.data.city, parsed.data.district, parsed.data.postalCode, parsed.data.fullAddress, parsed.data.isDefault]
    );
    res.status(201).json({ address: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    if (parsed.data.isDefault) await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    const { rows } = await query(
      `UPDATE addresses SET recipient_name=$1, recipient_phone=$2, province=$3, city=$4, district=$5,
       postal_code=$6, full_address=$7, is_default=$8, updated_at=now()
       WHERE id=$9 AND user_id=$10 RETURNING *`,
      [parsed.data.recipientName, parsed.data.recipientPhone, parsed.data.province, parsed.data.city, parsed.data.district, parsed.data.postalCode, parsed.data.fullAddress, parsed.data.isDefault, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Address not found' });
    res.json({ address: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM addresses WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ message: 'Address not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
