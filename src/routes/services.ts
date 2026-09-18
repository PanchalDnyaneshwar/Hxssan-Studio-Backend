import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: Get all services
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY display_order ASC, created_at ASC');
    res.json({ services: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
});

// Admin: Create service
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      tier = 'Standard',
      subtitle = '',
      price = '₹25,000',
      priceUnit = '/ project',
      description = '',
      deliverables = [],
      specs = [],
      idealFor = '',
      turnaround = '3–5 Days',
      highlighted = false,
      badge = '',
      displayOrder = 0,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const insertResult = await pool.query(
      `INSERT INTO services (
        title, tier, subtitle, price, price_unit, description,
        deliverables, specs, ideal_for, turnaround, highlighted, badge, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        title.trim(),
        tier,
        subtitle,
        price,
        priceUnit,
        description,
        JSON.stringify(deliverables),
        JSON.stringify(specs),
        idealFor,
        turnaround,
        highlighted,
        badge,
        displayOrder,
      ]
    );

    res.status(201).json({ service: insertResult.rows[0] });
  } catch (err: any) {
    console.error('[Create Service Error]', err);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Admin: Update service
router.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      tier,
      subtitle,
      price,
      priceUnit,
      description,
      deliverables,
      specs,
      idealFor,
      turnaround,
      highlighted,
      badge,
      displayOrder,
    } = req.body;

    const existing = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    const current = existing.rows[0];

    const updateResult = await pool.query(
      `UPDATE services SET
        title = $1, tier = $2, subtitle = $3, price = $4, price_unit = $5,
        description = $6, deliverables = $7, specs = $8, ideal_for = $9,
        turnaround = $10, highlighted = $11, badge = $12, display_order = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14 RETURNING *`,
      [
        title || current.title,
        tier || current.tier,
        subtitle !== undefined ? subtitle : current.subtitle,
        price || current.price,
        priceUnit !== undefined ? priceUnit : current.price_unit,
        description !== undefined ? description : current.description,
        deliverables ? JSON.stringify(deliverables) : current.deliverables,
        specs ? JSON.stringify(specs) : current.specs,
        idealFor !== undefined ? idealFor : current.ideal_for,
        turnaround || current.turnaround,
        highlighted !== undefined ? highlighted : current.highlighted,
        badge !== undefined ? badge : current.badge,
        displayOrder !== undefined ? displayOrder : current.display_order,
        id,
      ]
    );

    res.json({ service: updateResult.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Admin: Delete service
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleteResult = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    res.json({ success: true, message: 'Service deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

export default router;
