const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");

const DB_FILE = "backup.db";
const db = new sqlite3.Database(DB_FILE);
const get = promisify(db.get.bind(db));
const all = promisify(db.all.bind(db));

async function restoreSnapshot(snapshotId, outputDir, logger) {
  try {
    logger.info(`Starting restore for snapshot: ${snapshotId} to ${outputDir}`);

    const snapshot = await get("SELECT id FROM snapshots WHERE id = ?", [snapshotId]);
    if (!snapshot) {
      logger.error(`Snapshot ${snapshotId} does not exist.`);
      return;
    }

    const files = await all(`
      SELECT f.path FROM files f
      JOIN snapshot_files sf ON sf.file_id = f.id
      WHERE sf.snapshot_id = ?
    `, [snapshotId]);

    if (files.length === 0) {
      logger.warn(`No files found for snapshot ${snapshotId}.`);
      return;
    }

    for (const file of files) {
      const relativePath = path.relative(process.cwd(), file.path);
      const restorePath = path.join(outputDir, relativePath);

      fs.mkdirSync(path.dirname(restorePath), { recursive: true });
      fs.copyFileSync(file.path, restorePath);
    }

    logger.info(`Snapshot ${snapshotId} restored successfully.`);
  } catch (error) {
    logger.error(`Restore failed: ${error.message}`);
  }
}

module.exports = { restoreSnapshot };
