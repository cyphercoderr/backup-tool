const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");

const DB_FILE = "backup.db";
const db = new sqlite3.Database(DB_FILE);
const run = promisify(db.run.bind(db));
const get = promisify(db.get.bind(db));
const all = promisify(db.all.bind(db));

async function pruneSnapshot(snapshotId, logger) {
  try {
    logger.info(`Starting prune operation for snapshot ${snapshotId}...`);

    // Check if snapshot exists
    const snapshot = await get("SELECT id FROM snapshots WHERE id = ?", [snapshotId]);
    if (!snapshot) {
      logger.warn(`Snapshot ${snapshotId} not found.`);
      return;
    }

    // Begin transaction
    await run("BEGIN TRANSACTION");

    // Delete snapshot
    await run("DELETE FROM snapshots WHERE id = ?", [snapshotId]);

    // Remove orphaned files (files no longer linked to any snapshot)
    const orphanedFiles = await all(`
      SELECT f.id, f.path FROM files f
      LEFT JOIN snapshot_files sf ON f.id = sf.file_id
      WHERE sf.file_id IS NULL
    `);

    for (const file of orphanedFiles) {
      try {
        fs.unlinkSync(file.path);
        logger.info(`Deleted orphaned file: ${file.path}`);
      } catch (err) {
        logger.warn(`Could not delete file ${file.path}: ${err.message}`);
      }
      await run("DELETE FROM files WHERE id = ?", [file.id]);
    }

    // Commit transaction
    await run("COMMIT");
    logger.info(`Snapshot ${snapshotId} pruned successfully.`);
  } catch (error) {
    await run("ROLLBACK");
    logger.error(`Prune failed: ${error.message}`);
  }
}

module.exports = { pruneSnapshot };
