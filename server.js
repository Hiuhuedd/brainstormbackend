require('dotenv').config(); // Add this at the top to load environment variables
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Enable CORS for all routes (add any specific options as necessary)
app.use(cors({
  origin: [
    'https://brainstorm-resource-upload.onrender.com', 
    'https://bstorm-upload.netlify.app' // Corrected comma here
  ],
  credentials: true, // Enable cookies or authorization headers if needed
  
}));app.use(bodyParser.json());
const options = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000
};
// MongoDB connection
mongoose.connect(process.env.MONGO_URI ,{
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


// GET endpoint to return all resources
app.get('/resources', async (req, res) => {
  try {
    // Fetch all resources from MongoDB
    const resources = await Resource.find();
    // Respond with the fetched resources
    res.status(200).json(resources);
  } catch (error) {
    // Log the error for debugging
    console.error('Error fetching resources:', error);
    // Respond with a 500 status and error message
    res.status(500).json({ error: 'Failed to retrieve resources' });
  }
});




const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  imgURL: { type: String, required: true },
  programCode: { type: String, required: true },
  yearOfStudy: { type: Number, required: true },
  semester: { type: Number, required: true },
  isPremium: { type: Boolean, default: false },
  premiumDate: { type: Date, default: null },
  premiumPlan: { type: Number, default: 0 },
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

// Route to handle user profile submission
app.post('/user-profile', async (req, res) => {
  const {
    userId,
    email,
    firstName,
    lastName,
    imgURL,
    programCode,
    yearOfStudy,
    semester,
    isPremium,
    premiumDate,
    premiumPlan,
  } = req.body;

  try {
    // Create a new UserProfile instance
    const newUserProfile = new UserProfile({
      userId,
      email,
      firstName,
      lastName,
      imgURL,
      programCode,
      yearOfStudy,
      semester,
      isPremium,
      premiumDate,
      premiumPlan,
    });

    // Save the profile to MongoDB
    await newUserProfile.save();

    // Return a success response
    res.status(201).json({ message: 'Profile saved successfully' });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});
// Start the server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
