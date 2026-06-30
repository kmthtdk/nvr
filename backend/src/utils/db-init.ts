/**
 * Standalone script to initialize the database.
 * Run with: npx tsx src/utils/db-init.ts
 */
import { initializeDatabase } from '../models/database.js';
import { AuthService } from '../services/auth.service.js';
import { logger } from '../config/logger.js';

async function main() {
  initializeDatabase();
  await AuthService.ensureAdminExists();
  logger.info('Database initialization complete');
}

main().catch((err) => {
  logger.fatal({ err }, 'Database initialization failed');
  process.exit(1);
});
