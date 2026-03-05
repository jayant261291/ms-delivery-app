import mongoose from 'mongoose';

export default async function handler(req, res) {
  // Connect to the database
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }

  // Create a flexible Profile model
  const Profile = mongoose.models.Profile || mongoose.model('Profile', new mongoose.Schema({}, { strict: false }));

  // Handle loading the profile data
  if (req.method === 'GET') {
    try {
      // Find the profile, or return a default one if it doesn't exist yet
      const profile = await Profile.findOne() || { companyName: 'MS Delivery Services', logo: '' };
      return res.status(200).json(profile);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  // Handle saving/updating the profile data
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      // Update the first profile document found, or create one if it doesn't exist (upsert)
      const updatedProfile = await Profile.findOneAndUpdate({}, req.body, { new: true, upsert: true });
      return res.status(200).json({ message: 'Profile updated successfully', profile: updatedProfile });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}