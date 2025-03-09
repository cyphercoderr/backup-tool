const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");
const crypto = require("crypto");

const DB_FILE = "backup.db";
const db = new sqlite3.Database(DB_FILE);
const run = promisify(db.run.bind(db));
const get = promisify(db.get.bind(db));
const all = promisify(db.all.bind(db));

async function createSnapshot(directory, logger) {
  try {
    logger.info(`Starting snapshot for directory: ${directory}`);

    await run("BEGIN TRANSACTION");

    await run("INSERT INTO snapshots DEFAULT VALUES");
    const snapshot = await get("SELECT last_insert_rowid() AS id");
    const snapshotId = snapshot.id;

    async function processFile(filePath) {
      const hash = await computeHash(filePath);

      await run("INSERT OR IGNORE INTO files (hash, path) VALUES (?, ?)", [hash, filePath]);
      const file = await get("SELECT id FROM files WHERE hash = ?", [hash]);

      await run("INSERT INTO snapshot_files (snapshot_id, file_id) VALUES (?, ?)", [snapshotId, file.id]);
    }

    async function processDirectory(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          await processDirectory(fullPath);
        } else {
          await processFile(fullPath);
        }
      }
    }

    await processDirectory(directory);

    await run("COMMIT");

    logger.info(`Snapshot ${snapshotId} created successfully.`);
  } catch (error) {
    await run("ROLLBACK");
    logger.error(`Snapshot failed: ${error.message}`);
  }
}

async function computeHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

module.exports = { createSnapshot };
