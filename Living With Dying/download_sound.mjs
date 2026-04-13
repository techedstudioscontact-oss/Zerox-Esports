import fs from 'fs';
import https from 'https';
import path from 'path';

const fileUrl = "https://github.com/kgun/netflix-intro/raw/master/src/assets/netflix-intro.mp3";
const outputPath = path.join(process.cwd(), 'public', 'netflix-intro.mp3');

console.log(`Downloading ${fileUrl} to ${outputPath}...`);

const file = fs.createWriteStream(outputPath);

https.get(fileUrl, (response) => {
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log("Download completed.");
    });
}).on('error', (err) => {
    fs.unlink(outputPath, () => { }); // Delete the file async. (But we don't check for error)
    console.error("Error downloading file:", err.message);
});
