// Script to diagnose court occupation issues
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnoseCourts() {
  try {
    console.log('=== COURT DIAGNOSIS ===\n');
    
    // 1. Check all courts
    const courts = await pool.query('SELECT id, name, is_available FROM courts ORDER BY name');
    console.log('1. ALL COURTS:');
    courts.rows.forEach(c => {
      console.log(`  ${c.name}: ${c.is_available ? '✅ Available' : '❌ Occupied'}`);
    });
    
    // 2. Check active matches
    console.log('\n2. ACTIVE MATCHES (playing):');
    const activeMatches = await pool.query(`
      SELECT m.id, c.name as court, m.status, m.created_at 
      FROM matches m 
      JOIN courts c ON m.court_id = c.id 
      WHERE m.status = 'playing' 
      ORDER BY m.created_at DESC
    `);
    if (activeMatches.rows.length === 0) {
      console.log('  No active matches');
    } else {
      activeMatches.rows.forEach(m => {
        console.log(`  ${m.court}: Match ${m.id.substring(0,8)}... (since ${m.created_at})`);
      });
    }
    
    // 3. Check scheduled matches with courts
    console.log('\n3. SCHEDULED MATCHES WITH COURTS (not completed/cancelled):');
    const scheduledMatches = await pool.query(`
      SELECT sm.id, c.name as court, sm.status, sm.match_id, sm.planned_time 
      FROM scheduled_matches sm 
      JOIN courts c ON sm.court_id = c.id 
      WHERE sm.status NOT IN ('completed', 'cancelled') 
      ORDER BY sm.day DESC, sm.planned_time DESC 
      LIMIT 10
    `);
    if (scheduledMatches.rows.length === 0) {
      console.log('  No scheduled matches with courts assigned');
    } else {
      scheduledMatches.rows.forEach(m => {
        console.log(`  ${m.court}: ${m.status} - ${m.planned_time || 'no time'} - match_id: ${m.match_id || 'none'}`);
      });
    }
    
    // 4. Find orphaned courts (occupied but no active match)
    console.log('\n4. ORPHANED COURTS (occupied but no active match):');
    const orphaned = await pool.query(`
      SELECT c.id, c.name 
      FROM courts c 
      WHERE c.is_available = false 
      AND NOT EXISTS (
        SELECT 1 FROM matches m 
        WHERE m.court_id = c.id AND m.status = 'playing'
      )
      AND NOT EXISTS (
        SELECT 1 FROM scheduled_matches sm 
        WHERE sm.court_id = c.id AND sm.status NOT IN ('completed', 'cancelled')
      )
    `);
    if (orphaned.rows.length === 0) {
      console.log('  No orphaned courts found');
    } else {
      orphaned.rows.forEach(c => {
        console.log(`  ⚠️ ${c.name} (${c.id})`);
      });
      
      console.log('\n🔧 FIX: Run this SQL to free orphaned courts:');
      orphaned.rows.forEach(c => {
        console.log(`  UPDATE courts SET is_available = true WHERE id = '${c.id}';`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

diagnoseCourts();
