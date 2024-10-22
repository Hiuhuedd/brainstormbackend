require('dotenv').config(); // Add this at the top to load environment variables
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Enable CORS for all routes (add any specific options as necessary)
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// MongoDB schema for Resource
const ResourceSchema = new mongoose.Schema({
  fileURI: String,
  programCode: String,
  isCommonUnit: Boolean,
  unitCode: String,
  unitName: String,
  semester: Number,
  year: Number,
  resourceDate: Date,
  isProfessorEndorsed: Boolean,
  isExam: Boolean,
  isNotes: Boolean,
  unitProfessor: String,
});

const Resource = mongoose.model('Resource', ResourceSchema);

// Set up AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,  // Use the region from the env file
});

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST endpoint for file upload and saving resource data// POST endpoint for file upload and saving resource data
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const resourceData = JSON.parse(req.body.resourceData);

    // Validate resource data (add your own validations as needed)
    if (!resourceData.programCode || !resourceData.unitCode || !resourceData.unitName) {
      return res.status(400).json({ error: 'Program code, unit code, and unit name are required' });
    }

    // Upload PDF to S3
    const params = {
      Bucket: process.env.AWS_S3_BUCKET, // Use the bucket name from env file
      Key: `${Date.now()}_${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const data = await s3.upload(params).promise(); // Using promise to handle async/await

    // Save the file URI and resource data to MongoDB
    const newResource = new Resource({
      ...resourceData,
      fileURI: data.Location,
    });

    await newResource.save();
    res.status(200).json(newResource);
  } catch (err) {
    console.error(err); // Log the error for server-side debugging
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});


// Start the server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
