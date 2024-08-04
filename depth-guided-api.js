//depth-guided-api.js

const express = require('express');
const multer = require('multer');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.listen(5001, () => console.log("API is running on port 5001"));

app.get('/', (req, res) => {
  console.log("Hello, from the root endpoint!");
  res.send("Hello, from the root endpoint!");
});

app.post('/process', upload.single('depthImage'), (req, res) => {
  const depthImagePath = req.file.path;
  const outputPath = path.join(__dirname, 'output.jpg');

  console.log('Received POST request');
  console.log(`Depth image uploaded to: ${depthImagePath}`);

  execFile('python3', ['process_image.py', depthImagePath], (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      console.error(`stderr: ${stderr}`);
      return res.status(500).send('Error processing image');
    }

    console.log('Python script executed successfully');
    console.log(`stdout: ${stdout}`);

    fs.access(outputPath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`File not found: ${outputPath}`);
        return res.status(500).send('Processed image not found');
      }

      console.log(`Processed image found: ${outputPath}`);

      // Ensure the file is completely written before sending
      fs.readFile(outputPath, (readErr, data) => {
        if (readErr) {
          console.error(`Error reading file: ${readErr}`);
          return res.status(500).send('Error reading image file');
        }

        console.log(`File size: ${data.length} bytes`);

        res.sendFile(outputPath, (err) => {
          if (err) {
            console.error(`sendFile error: ${err}`);
            return res.status(500).send('Error sending image');
          }

          console.log('Image sent successfully');

          // Cleanup files
          fs.unlink(depthImagePath, (unlinkErr) => {
            if (unlinkErr) console.error(`Error deleting temp depth image: ${unlinkErr}`);
          });
          fs.unlink(outputPath, (unlinkErr) => {
            if (unlinkErr) console.error(`Error deleting output image: ${unlinkErr}`);
          });
        });
      });
    });
  });
});

app.get('/test', (req, res) => {
  const testFilePath = path.join(__dirname, 'test.jpg');

  // Create a dummy test file if it doesn't exist
  if (!fs.existsSync(testFilePath)) {
    fs.writeFileSync(testFilePath, 'dummy content');
  }

  res.sendFile(testFilePath, (err) => {
    if (err) {
      console.error(`sendFile error: ${err}`);
      return res.status(500).send('Error sending image');
    }

    console.log('Test file sent successfully');

    // Cleanup test file
    fs.unlink(testFilePath, (unlinkErr) => {
      if (unlinkErr) console.error(`Error deleting test file: ${unlinkErr}`);
    });
  });
});