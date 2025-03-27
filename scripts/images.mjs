import { promises as fs } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACESHIP_ROOT = path.join(__dirname, "Arknight-Images");

const tasks =  [{
    sourceDir: path.join(ACESHIP_ROOT,"items"),
    destDir: path.join("public","img","items"),
    filter: (filename) => filename.endsWith(".png") && ["MTL_","EXP_","mod_","GOLD","EXGG_SHD","exp_"].some(word => filename.includes(word)),
  }
];

const upload = async (existingFilePaths, task) => {
  let uploadCount = 0;
  const { sourceDir, destDir, replace: replaceFn, filter: filterFn } = task;
  const dirEntries = await fs.readdir(sourceDir, {
    withFileTypes: true,
  });
  const filenames = dirEntries
    .filter((dirent) => dirent.isFile() && (filterFn == null || filterFn(dirent.name)))
    .map((dirent) => dirent.name);
  await fs.mkdir(destDir, { recursive: true });

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
        await fs.copyFile(sourceFilePath, targetFilePath);
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
          await fs.mkdir(task.destDir, { recursive: true });

          // first iterate through all images in the image directory
          const rawFileNames = await fs.readdir(task.destDir, { withFileTypes: true });
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

  uploadAllImages();