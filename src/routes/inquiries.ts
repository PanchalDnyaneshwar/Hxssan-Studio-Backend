import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: Submit new project inquiry or contact brief
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      whatsapp,
      company,
      location,
      projectType,
      contentType,
      videoCount,
      videoDuration,
      deadline,
      budget,
      referenceUrl,
      message,
      source = 'contact_form',
    } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required fields' });
      return;
    }

    const insertResult = await pool.query(
      `INSERT INTO inquiries (
        name, email, whatsapp, company, location,
        project_type, content_type, video_count, video_duration,
        deadline, budget, reference_url, message, source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'new')
      RETURNING *`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        whatsapp || null,
        company || null,
        location || null,
        projectType || 'Short Form',
        contentType || 'YouTube long-form video editing',
        videoCount || '2–4 Videos',
        videoDuration || 'Under 60 seconds (Short-Form)',
        deadline || 'Within 1 week',
        budget || null,
        referenceUrl || null,
        message || '',
        source,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Inquiry received successfully',
      inquiry: insertResult.rows[0],
    });
  } catch (err: any) {
    console.error('[Inquiry Submission Error]', err);
    res.status(500).json({ error: 'Failed to record inquiry' });
  }
});

// Admin: Get Inquiries Stats
router.get('/stats', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'new') as new,
        COUNT(*) FILTER (WHERE status = 'in_review') as in_review,
        COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
        COUNT(*) FILTER (WHERE status = 'quoted') as quoted,
        COUNT(*) FILTER (WHERE status = 'archived') as archived
      FROM inquiries
    `);

    res.json({ stats: statsResult.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve inquiry statistics' });
  }
});

// Admin: List Inquiries with filter & search
router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM inquiries WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(name) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex} OR LOWER(content_type) LIKE $${paramIndex})`;
      params.push(searchTerm);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);
    res.json({ inquiries: result.rows });
  } catch (err: any) {
    console.error('[Get Inquiries Error]', err);
    res.status(500).json({ error: 'Failed to retrieve inquiries' });
  }
});

// Admin: Update Inquiry Status or Notes
router.patch('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const current = await pool.query('SELECT * FROM inquiries WHERE id = $1', [id]);
    if (current.rowCount === 0) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }

    const newStatus = status !== undefined ? status : current.rows[0].status;
    const newNotes = notes !== undefined ? notes : current.rows[0].notes;

    const updateResult = await pool.query(
      `UPDATE inquiries 
       SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [newStatus, newNotes, id]
    );

    res.json({ inquiry: updateResult.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

// Admin: Delete Inquiry
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleteResult = await pool.query('DELETE FROM inquiries WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }

    res.json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

export default router;
