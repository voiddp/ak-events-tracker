import fs from 'fs';
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACESHIP_ROOT = path.join(__dirname, "..", "..", "Arknight-Images");

const tasks = [{
  sourceDir: path.join(ACESHIP_ROOT, "items"),
  destDir: path.join("public", "img", "items"),
  filter: (filename) => filename.endsWith(".png") && ["MTL_", "EXP_", "mod_", "GOLD", "EXGG_SHD", "exp_"].some(word => filename.includes(word)),
}
];

function refreshRepository(targetPath) {
  //const repoUrl = "https://github.com/PuppiizSunniiz/Arknight-Images";
  const folderToKeep = "items";
  const zipUrl = "https://github.com/PuppiizSunniiz/Arknight-Images/archive/refs/heads/main.zip";
  const tempZip = path.join(targetPath, "repo.zip");
  const folderPath = path.join(targetPath, folderToKeep);

  try {
    // 1. Clean and Create Directory
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
    fs.mkdirSync(folderPath, { recursive: true });

    // 2. Download the ZIP via curl
    console.log("Downloading Arknight-Images repository ZIP...");
    execSync(`curl -L ${zipUrl} -o "${tempZip}"`, { stdio: 'inherit' });

    // 3. Extract ONLY the targeted folder
    // "Arknight-Images-main/items/*": The path inside the zip
    console.log("Extracting /items folder...");
    execSync(`unzip -q "${tempZip}" "Arknight-Images-main/${folderToKeep}/*" -d "${targetPath}"`, { stdio: 'inherit' });

    // 4. Move files up and Clean up
    // Unzip creates targetPath/Arknight-Images-main/items.
    const extractedPath = path.join(targetPath, "Arknight-Images-main", folderToKeep);

    // Move all files from extractedPath to folderPath
    const files = fs.readdirSync(extractedPath);
    for (const file of files) {
      fs.renameSync(path.join(extractedPath, file), path.join(folderPath, file));
    }

    //clean up temp folder and zip
    fs.rmSync(path.join(targetPath, "Arknight-Images-main"), { recursive: true, force: true });
    fs.rmSync(tempZip);

    console.log("Successfully prepared Arknight-Images/items");

  } catch (error) {
    console.error("Operation failed:", error.message);
  }
}

function deleteTempRepository(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log("Temp image download folder deleted.");
    }
  } catch (error) {
    console.error("Operation failed:", error.message);
  }
}

const upload = async (existingFilePaths, task) => {
  let uploadCount = 0;
  const { sourceDir, destDir, replace: replaceFn, filter: filterFn } = task;
  const dirEntries = await fs.promises.readdir(sourceDir, {
    withFileTypes: true,
  });
  const filenames = dirEntries
    .filter((dirent) => dirent.isFile() && (filterFn == null || filterFn(dirent.name)))
    .map((dirent) => dirent.name);
  await fs.promises.mkdir(destDir, { recursive: true });

  //const filename = filenames[0]
  //console.table({sourceDir, destDir, filename})
  await Promise.all(
    filenames.map(async (filename) => {
      const _filename = replaceFn ? replaceFn(filename) : filename;
      const targetFilePath = path.join(destDir, _filename);
      if (targetFilePath && !existingFilePaths.has(_filename)) {
        console.log(`images: "${targetFilePath}" not found in storage, saving...`);
        const sourceFilePath = path.join(sourceDir, filename);
        //console.table({sourceFilePath, targetFilePath});
        await fs.promises.copyFile(sourceFilePath, targetFilePath);
        uploadCount += 1;
      }
    })
  );
  return uploadCount;
};

const uploadAllImages = async () => {
  try {
    const uploadCounts = await Promise.all(
      tasks.map(async (task) => {
        // Ensure the destination directory exists
        await fs.promises.mkdir(task.destDir, { recursive: true });

        // first iterate through all images in the image directory
        const rawFileNames = await fs.promises.readdir(task.destDir, { withFileTypes: true });
        const existingImageIDs = new Set();
        rawFileNames.forEach((value) => existingImageIDs.add(value.name));

        console.log(`images: found ${existingImageIDs.size} existing images in ${task.destDir}.`);

        upload(existingImageIDs, task);
      })
    );
    const totalUploadCount = uploadCounts.reduce((acc, cur) => acc + cur, 0);
    console.log(`images: uploaded ${totalUploadCount || 0} new files, done.`);
  } catch (e) {
    console.error(e);
  }
};

export default uploadAllImages;
refreshRepository(ACESHIP_ROOT);
uploadAllImages();
deleteTempRepository(ACESHIP_ROOT);