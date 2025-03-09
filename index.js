const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const winston = require("winston");
const { createSnapshot } = require("./snapshot");
const { restoreSnapshot } = require("./restore");
const { listSnapshots } = require("./list");
const { pruneSnapshot } = require("./prune");
const { checkDatabase } = require("./check");

// Configure Logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [new winston.transports.Console()],
});

// CLI Configuration
yargs(hideBin(process.argv))
  .command(
    "snapshot <directory>",
    "Take a snapshot of the directory",
    (yargs) => yargs.positional("directory", { describe: "Directory to snapshot", type: "string" }),
    async (argv) => {
      try {
        await createSnapshot(argv.directory, logger);
      } catch (err) {
        logger.error(`Snapshot failed: ${err.message}`);
      }
    }
  )
  .command(
    "restore <snapshotId> <outputDir>",
    "Restore a snapshot to a directory",
    (yargs) => yargs
      .positional("snapshotId", { describe: "Snapshot number", type: "number" })
      .positional("outputDir", { describe: "Output directory", type: "string" }),
    async (argv) => {
      try {
        await restoreSnapshot(argv.snapshotId, argv.outputDir, logger);
      } catch (err) {
        logger.error(`Restore failed: ${err.message}`);
      }
    }
  )
  .command("list", "List all snapshots", {}, async () => {
    try {
      await listSnapshots(logger);
    } catch (err) {
      logger.error(`List operation failed: ${err.message}`);
    }
  })
  .command(
    "prune <snapshotId>",
    "Remove a snapshot and clean up unreferenced data",
    (yargs) => yargs.positional("snapshotId", { describe: "Snapshot number", type: "number" }),
    async (argv) => {
      try {
        await pruneSnapshot(argv.snapshotId, logger);
      } catch (err) {
        logger.error(`Prune failed: ${err.message}`);
      }
    }
  )
  .command("check", "Check database integrity", {}, async () => {
    try {
      await checkDatabase(logger);
    } catch (err) {
      logger.error(`Check operation failed: ${err.message}`);
    }
  })
  .demandCommand()
  .help()
  .argv;
