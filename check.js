async function checkDatabase() {
    await initDB();
  
    const files = await all(`SELECT id, hash, path FROM files`);
  
    console.log("Checking database integrity...");
  
    let missingFiles = 0;
    let corruptedFiles = 0;
  
    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        console.log(`Missing file: ${file.path}`);
        missingFiles++;
        continue;
      }
  
      const currentHash = await computeHash(file.path);
      if (currentHash !== file.hash) {
        console.log(`⚠️  Corrupted file: ${file.path}`);
        corruptedFiles++;
      }
    }
  
    console.log(`\nIntegrity check completed.`);
    console.log(`Total files checked: ${files.length}`);
    console.log(`Missing files: ${missingFiles}`);
    console.log(`Corrupted files: ${corruptedFiles}`);
  }
  