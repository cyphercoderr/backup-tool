const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");

const DB_FILE = "backup.db";
const db = new sqlite3.Database(DB_FILE);
const all = promisify(db.all.bind(db));

async function listSnapshots(logger) {
  try {
    logger.info("Fetching list of snapshots...");

    const snapshots = await all(`
      SELECT s.id, s.timestamp, 
        (SELECT SUM(LENGTH(f.path)) FROM snapshot_files sf 
        JOIN files f ON sf.file_id = f.id WHERE sf.snapshot_id = s.id) AS snapshot_size
      FROM snapshots s ORDER BY s.id ASC
    `);

    if (snapshots.length === 0) {
      logger.info("No snapshots found.");
      return;
    }

    console.log("SNAPSHOT  TIMESTAMP            SNAPSHOT SIZE (KB)");
    console.log("--------- -------------------  ------------------");

    let totalSize = 0;
    snapshots.forEach((snap) => {
      const snapshotSizeKB = snap.snapshot_size ? (snap.snapshot_size / 1024).toFixed(2) : "N/A";
      console.log(`${snap.id.toString().padEnd(9)} ${snap.timestamp.padEnd(20)} ${snapshotSizeKB.padStart(16)} KB`);
      totalSize += parseFloat(snapshotSizeKB) || 0;
    });

    const dbSizeKB = (fs.statSync(DB_FILE).size / 1024).toFixed(2);
    console.log(`\nTotal Database Size: ${dbSizeKB} KB`);
    logger.info(`Displayed ${snapshots.length} snapshots.`);
  } catch (error) {
    logger.error(`Failed to list snapshots: ${error.message}`);
  }
}

module.exports = { listSnapshots };
