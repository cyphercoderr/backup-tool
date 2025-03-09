const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const crypto = require("crypto");

const TEST_DIR = path.join(__dirname, "test_data");
const RESTORE_DIR = path.join(__dirname, "restore_data");

function computeHash(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

beforeAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  fs.rmSync(RESTORE_DIR, { recursive: true, force: true });
  fs.mkdirSync(RESTORE_DIR, { recursive: true });

  fs.writeFileSync(path.join(TEST_DIR, "file1.txt"), "Hello, World!");
  fs.writeFileSync(path.join(TEST_DIR, "file2.bin"), crypto.randomBytes(256)); // Random binary file
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.rmSync(RESTORE_DIR, { recursive: true, force: true });
});

test("1️⃣ Snapshot and restore should preserve all files", () => {
  execSync(`node backupTool.js snapshot ${TEST_DIR}`);
  execSync(`node backupTool.js restore 1 ${RESTORE_DIR}`);

  const originalFiles = fs.readdirSync(TEST_DIR);
  const restoredFiles = fs.readdirSync(RESTORE_DIR);

  expect(restoredFiles).toEqual(originalFiles);

  for (const file of originalFiles) {
    const originalHash = computeHash(path.join(TEST_DIR, file));
    const restoredHash = computeHash(path.join(RESTORE_DIR, file));
    expect(originalHash).toBe(restoredHash);
  }
});

test("2️⃣ Pruning a snapshot does not affect another snapshot", () => {
  execSync(`node backupTool.js snapshot ${TEST_DIR}`);
  execSync(`node backupTool.js prune 1`);

  execSync(`node backupTool.js restore 2 ${RESTORE_DIR}`);
  const restoredFiles = fs.readdirSync(RESTORE_DIR);
  expect(restoredFiles).toEqual(fs.readdirSync(TEST_DIR));
});

test("3️⃣ Supports binary files", () => {
  const binFile = path.join(TEST_DIR, "file2.bin");
  const originalHash = computeHash(binFile);

  execSync(`node backupTool.js snapshot ${TEST_DIR}`);
  execSync(`node backupTool.js restore 3 ${RESTORE_DIR}`);

  const restoredHash = computeHash(path.join(RESTORE_DIR, "file2.bin"));
  expect(restoredHash).toBe(originalHash);
});

test("4️⃣ Handles relative and absolute paths", () => {
  execSync(`node backupTool.js snapshot ./test_data`);
  execSync(`node backupTool.js snapshot ${path.resolve(TEST_DIR)}`);
});

test("5️⃣ Incremental snapshot avoids duplicates", () => {
  execSync(`node backupTool.js snapshot ${TEST_DIR}`);
  const before = execSync(`sqlite3 backup.db "SELECT COUNT(*) FROM files"`).toString().trim();

  execSync(`node backupTool.js snapshot ${TEST_DIR}`);
  const after = execSync(`sqlite3 backup.db "SELECT COUNT(*) FROM files"`).toString().trim();

  expect(before).toBe(after);
});
