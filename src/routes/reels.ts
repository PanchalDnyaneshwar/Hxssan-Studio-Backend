import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: List reels
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { all } = req.query;
    let query = 'SELECT * FROM reels';
    if (all !== 'true') {
      query += ' WHERE published = true';
    }
    query += ' ORDER BY display_order ASC, created_at DESC';

    const result = await pool.query(query);
    res.json({ reels: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve reels' });
  }
});

// Admin: Create reel
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      slug,
      platform = 'Instagram Reels',
      category = 'brand',
      duration = '0:30',
      videoUrl,
      thumbnail = '',
      completionRate = '90%',
      reach = '',
      tags = [],
      description = '',
      featured = false,
      published = true,
      displayOrder = 0,
    } = req.body;

    if (!title || !videoUrl) {
      res.status(400).json({ error: 'Title and videoUrl are required' });
      return;
    }

    const safeSlug = (slug || title).toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const insertResult = await pool.query(
      `INSERT INTO reels (
        slug, title, platform, category, duration, video_url,
        thumbnail, completion_rate, reach, tags, description,
        featured, published, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        safeSlug,
        title.trim(),
        platform,
        category,
        duration,
        videoUrl,
        thumbnail,
        completionRate,
        reach,
        JSON.stringify(tags),
        description,
        featured,
        published,
        displayOrder,
      ]
    );

    res.status(201).json({ reel: insertResult.rows[0] });
  } catch (err: any) {
    console.error('[Create Reel Error]', err);
    res.status(500).json({ error: 'Failed to create reel' });
  }
});

// Admin: Update reel
router.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      platform,
      category,
      duration,
      videoUrl,
      thumbnail,
      completionRate,
      reach,
      tags,
      description,
      featured,
      published,
      displayOrder,
    } = req.body;

    const existing = await pool.query('SELECT * FROM reels WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      res.status(404).json({ error: 'Reel not found' });
      return;
    }

    const current = existing.rows[0];

    const updateResult = await pool.query(
      `UPDATE reels SET
        slug = $1, title = $2, platform = $3, category = $4, duration = $5,
        video_url = $6, thumbnail = $7, completion_rate = $8, reach = $9,
        tags = $10, description = $11, featured = $12, published = $13,
        display_order = $14, updated_at = CURRENT_TIMESTAMP
      WHERE id = $15 RETURNING *`,
      [
        slug || current.slug,
        title || current.title,
        platform || current.platform,
        category || current.category,
        duration !== undefined ? duration : current.duration,
        videoUrl || current.video_url,
        thumbnail || current.thumbnail,
        completionRate !== undefined ? completionRate : current.completion_rate,
        reach !== undefined ? reach : current.reach,
        tags ? JSON.stringify(tags) : current.tags,
        description !== undefined ? description : current.description,
        featured !== undefined ? featured : current.featured,
        published !== undefined ? published : current.published,
        displayOrder !== undefined ? displayOrder : current.display_order,
        id,
      ]
    );

    res.json({ reel: updateResult.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update reel' });
  }
});

// Admin: Delete reel
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleteResult = await pool.query('DELETE FROM reels WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      res.status(404).json({ error: 'Reel not found' });
      return;
    }

    res.json({ success: true, message: 'Reel deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete reel' });
  }
});

export default router;
