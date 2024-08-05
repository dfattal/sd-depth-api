//depth-guided-api.js
// To activate pre-built pytorch environment, run: 'source activate pytorch'

const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors()); // Use the cors middleware
app.use(express.static('public')); // For serving static files like HTML

// SSE endpoint for continuous updates
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE with the client

  // Store the response object to send updates later
  const clientId = Date.now();
  clients[clientId] = res;

  req.on('close', () => {
    delete clients[clientId];
  });
});

const clients = {}; // Store active clients

function sendEventToClients(message) {
  Object.values(clients).forEach((client) => {
    client.write(`data: ${message}\n\n`);
  });
}

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

  const pythonProcess = spawn('python3', ['process_image.py', depthImagePath]);

  pythonProcess.stdout.on('data', (data) => {
    const message = `stdout: ${data}`;
    console.log(message);
    sendEventToClients(message);
  });

  pythonProcess.stderr.on('data', (data) => {
    const message = `stderr: ${data}`;
    console.error(message);
    sendEventToClients(message);
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      const message = `Python script exited with code ${code}`;
      console.error(message);
      sendEventToClients(message);
      return res.status(500).send('Error processing image');
    }

    console.log('Python script executed successfully');

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
  const testFilePath = path.join(__dirname, 'test.jpg'); //test.jpg

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