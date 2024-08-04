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

// POST endpoint to handle image processing
app.post('/process', upload.single('depthImage'), (req, res) => {
  const depthImagePath = req.file.path;

  // Use the Python interpreter from the virtual environment
  const pythonInterpreter = path.join(__dirname, 'myenv/bin/python');

  execFile(pythonInterpreter, ['process_image.py', depthImagePath], (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      console.error(`stderr: ${stderr}`);
      return res.status(500).send('Error processing image');
    }

    console.log(`stdout: ${stdout}`);

    const outputPath = path.join(__dirname, 'output.jpg');
    res.sendFile(outputPath, {}, (err) => {
      if (err) {
        console.error(`sendFile error: ${err}`);
        res.status(500).send('Error sending image');
      }
      fs.unlinkSync(depthImagePath); // Cleanup uploaded depth image
      fs.unlinkSync(outputPath); // Cleanup generated output image
    });
  });
});