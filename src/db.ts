import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool, Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/hxssan_studio';

// Helper to ensure target database exists
async function ensureDatabaseExists() {
  try {
    const url = new URL(connectionString);
    const dbName = url.pathname.replace(/^\//, '');
    
    // Connect to default 'postgres' database to check/create target database
    const adminUrl = new URL(connectionString);
    adminUrl.pathname = '/postgres';

    const client = new Client({ connectionString: adminUrl.toString() });
    await client.connect();
    
    const checkRes = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkRes.rowCount === 0) {
      console.log(`[Database] Database '${dbName}' does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[Database] Database '${dbName}' created successfully.`);
    }

    await client.end();
  } catch (err: any) {
    console.warn(`[Database] Note on database check: ${err.message}`);
  }
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function initDB() {
  await ensureDatabaseExists();

  const client = await pool.connect();
  try {
    console.log('[Database] Connected to PostgreSQL. Initializing schema...');

    // 1. Admin Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Inquiries Table (for Contact Form & Project Modal)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(100),
        company VARCHAR(255),
        location VARCHAR(255),
        project_type VARCHAR(100),
        content_type VARCHAR(255),
        video_count VARCHAR(100),
        video_duration VARCHAR(100),
        deadline VARCHAR(100),
        budget VARCHAR(100),
        reference_url TEXT,
        message TEXT,
        status VARCHAR(50) DEFAULT 'new', -- 'new', 'in_review', 'contacted', 'quoted', 'archived'
        source VARCHAR(50) DEFAULT 'contact_form', -- 'contact_form', 'project_modal', 'contact_page'
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Projects Table (Portfolio)
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        client VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        year VARCHAR(20) NOT NULL,
        role VARCHAR(255) NOT NULL,
        short_description TEXT,
        thumbnail TEXT,
        hero_media TEXT,
        media_type VARCHAR(50) DEFAULT 'video',
        video_url TEXT,
        metrics JSONB DEFAULT '{}',
        tags JSONB DEFAULT '[]',
        featured BOOLEAN DEFAULT false,
        published BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Reels Table (Short-Form)
    await client.query(`
      CREATE TABLE IF NOT EXISTS reels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        platform VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        duration VARCHAR(50),
        video_url TEXT NOT NULL,
        thumbnail TEXT,
        completion_rate VARCHAR(50),
        reach VARCHAR(50),
        tags JSONB DEFAULT '[]',
        description TEXT,
        featured BOOLEAN DEFAULT false,
        published BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Services Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        tier VARCHAR(100),
        subtitle VARCHAR(255),
        price VARCHAR(100),
        price_unit VARCHAR(50),
        description TEXT,
        deliverables JSONB DEFAULT '[]',
        specs JSONB DEFAULT '[]',
        ideal_for VARCHAR(255),
        turnaround VARCHAR(100),
        highlighted BOOLEAN DEFAULT false,
        badge VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Site Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default admin user if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hxssanstudios.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existingAdmin = await client.query('SELECT id FROM admin_users WHERE email = $1', [adminEmail]);

    if (existingAdmin.rowCount === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await client.query(`
        INSERT INTO admin_users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
      `, [adminEmail, passwordHash, 'Hxssan Lead Admin', 'superadmin']);
      console.log(`[Database] Seeded initial admin account: ${adminEmail}`);
    }

    // Seed sample inquiries if empty for instant testability
    const inquiryCount = await client.query('SELECT COUNT(*) FROM inquiries');
    if (parseInt(inquiryCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO inquiries (name, email, whatsapp, project_type, content_type, video_count, video_duration, deadline, reference_url, message, status, source)
        VALUES 
          ('Marcus Thorne', 'marcus@apexmotion.com', '+1 555 342 1290', 'Long Form', 'YouTube long-form video editing', '2–4 Videos', '10–20 minutes', 'Within 1 week', 'https://youtube.com/watch?v=sample1', 'Looking for high-retention cinematic pacing and sound design for our tech documentary channel.', 'new', 'contact_form'),
          ('Elena Rossi', 'elena@veloce.it', '+39 02 884 921', 'Short Form', 'Instagram Reel editing', '5–10 Videos', 'Under 60 seconds (Short-Form)', 'Express (< 48 hours)', 'https://instagram.com/reels', 'Need 8 luxury vertical cuts delivered weekly for an upcoming Milan commercial campaign.', 'in_review', 'contact_form'),
          ('Devon Vance', 'devon@creatorhub.co', '+1 310 994 2011', 'Both / Retainer', 'Professional color grading', '10+ Videos / Monthly Retainer', '3–10 minutes', 'Flexible / Ongoing', 'https://frame.io/sample', 'Seeking ongoing colorist and finish passes in ACES / DaVinci Resolve.', 'contacted', 'project_modal')
      `);
      console.log('[Database] Seeded initial sample client inquiries.');
    }

    // Seed initial projects if empty
    const projectCount = await client.query('SELECT COUNT(*) FROM projects');
    if (parseInt(projectCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO projects (slug, title, client, category, year, role, short_description, thumbnail, hero_media, video_url, metrics, tags, featured, display_order)
        VALUES
          ('aura-hypercar-launch', 'Aura Hypercar Global Reveal', 'Apex Automotive', 'commercial', '2025', 'Lead Editor & Colorist', 'High-energy commercial launch cut featuring dynamic speed-ramps and cinematic engine sound design.', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1200', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1200', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', '{"views": "4.2M", "completionRate": "88%"}', '["Commercial", "Sound Design", "Automotive"]', true, 1),
          ('echoes-of-reykjavik', 'Echoes of Reykjavik', 'Nordic Cinema Collective', 'narrative', '2024', 'Online Editor & Colorist', 'Tribeca Documentary Selection exploring Nordic electronic composers in sub-zero acoustic spaces.', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', '{"views": "1.8M", "completionRate": "92%"}', '["Documentary", "ACES Color", "Tribeca"]', true, 2)
      `);
      console.log('[Database] Seeded initial portfolio projects.');
    }

    // Seed initial reels if empty
    const reelCount = await client.query('SELECT COUNT(*) FROM reels');
    if (parseInt(reelCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO reels (slug, title, platform, category, duration, video_url, thumbnail, completion_rate, reach, tags, featured, display_order)
        VALUES
          ('cyberpunk-tokyo-grade', 'Tokyo Midnight Luminescence', 'Instagram Reels', 'brand', '0:34', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=800', '94.2%', '1.2M', '["Color Grading", "9:16", "Cyberpunk"]', true, 1),
          ('kinetic-sound-hook', 'Kinetic Sound Rhythm Edit', 'YouTube Shorts', 'tech', '0:48', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800', '91.8%', '850K', '["Shorts", "Kinetic", "Audio Sync"]', true, 2)
      `);
      console.log('[Database] Seeded initial reels.');
    }

    // Seed services if empty
    const serviceCount = await client.query('SELECT COUNT(*) FROM services');
    if (parseInt(serviceCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO services (title, tier, subtitle, price, price_unit, description, deliverables, specs, turnaround, highlighted, display_order)
        VALUES
          ('Short-Form Growth Engine', 'Starter / Growth', 'Reels & Shorts Package', '₹35,000', '/ month', 'Batch editing designed for high retention, kinetic captions, and rapid audience growth.', '["8–12 Edited Reels/Shorts", "Subtitles & Kinetic Captions", "Sound FX & Audio Mixing", "Platform Optimized 9:16"]', '["ProRes / H.265 Master", "48–72h Turnaround"]', '48–72 Hours', true, 1),
          ('YouTube Long-Form Master', 'Pro Channel', 'High-Retention Editorial', '₹55,000', '/ month', 'Full YouTube production editorial including hook restructuring, B-roll integration, and DaVinci color grading.', '["4 Full YouTube Videos (10–20min)", "Thumbnail Design Concepts", "Advanced Pacing & Sound Design", "2 Rounds of Revisions"]', '["4K UHD 16:9", "Split Stems (Music, VO, SFX)"]', '4–6 Days', false, 2)
      `);
      console.log('[Database] Seeded initial services.');
    }

    console.log('[Database] Database initialization complete.');
  } catch (err) {
    console.error('[Database] Initialization error:', err);
    throw err;
  } finally {
    client.release();
  }
}
