import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: Get all published projects
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, all } = req.query;
    let query = 'SELECT * FROM projects';
    const params: any[] = [];

    if (all !== 'true') {
      query += ' WHERE published = true';
    } else {
      query += ' WHERE 1=1';
    }

    if (category && category !== 'all') {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ' ORDER BY display_order ASC, created_at DESC';

    const result = await pool.query(query, params);
    res.json({ projects: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

// Public: Get project by slug
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const result = await pool.query('SELECT * FROM projects WHERE slug = $1', [slug]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve project' });
  }
});

// Admin: Create new project
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      slug,
      client,
      category,
      year = '2025',
      role = 'Lead Video Editor',
      shortDescription = '',
      thumbnail = '',
      heroMedia = '',
      videoUrl = '',
      metrics = {},
      tags = [],
      featured = false,
      published = true,
      displayOrder = 0,
    } = req.body;

    if (!title || !slug) {
      res.status(400).json({ error: 'Title and slug are required' });
      return;
    }

    const insertResult = await pool.query(
      `INSERT INTO projects (
        slug, title, client, category, year, role,
        short_description, thumbnail, hero_media, video_url,
        metrics, tags, featured, published, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        title.trim(),
        client || 'Client',
        category || 'commercial',
        year,
        role,
        shortDescription,
        thumbnail,
        heroMedia || thumbnail,
        videoUrl,
        JSON.stringify(metrics),
        JSON.stringify(tags),
        featured,
        published,
        displayOrder,
      ]
    );

    res.status(201).json({ project: insertResult.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'A project with this slug already exists' });
      return;
    }
    console.error('[Create Project Error]', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Admin: Update project
router.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      client,
      category,
      year,
      role,
      shortDescription,
      thumbnail,
      heroMedia,
      videoUrl,
      metrics,
      tags,
      featured,
      published,
      displayOrder,
    } = req.body;

    const existing = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const current = existing.rows[0];

    const updateResult = await pool.query(
      `UPDATE projects SET
        slug = $1, title = $2, client = $3, category = $4, year = $5, role = $6,
        short_description = $7, thumbnail = $8, hero_media = $9, video_url = $10,
        metrics = $11, tags = $12, featured = $13, published = $14, display_order = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16 RETURNING *`,
      [
        slug || current.slug,
        title || current.title,
        client || current.client,
        category || current.category,
        year || current.year,
        role || current.role,
        shortDescription !== undefined ? shortDescription : current.short_description,
        thumbnail || current.thumbnail,
        heroMedia || current.hero_media,
        videoUrl !== undefined ? videoUrl : current.video_url,
        metrics ? JSON.stringify(metrics) : current.metrics,
        tags ? JSON.stringify(tags) : current.tags,
        featured !== undefined ? featured : current.featured,
        published !== undefined ? published : current.published,
        displayOrder !== undefined ? displayOrder : current.display_order,
        id,
      ]
    );

    res.json({ project: updateResult.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Admin: Delete project
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleteResult = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
