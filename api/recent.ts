import mongoose from 'mongoose';

export default async function handler(req: any, res: any) {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI as string);
    } catch (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }

  const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

  try {
    // Fetch the 15 newest orders and sort them by date created
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(15);
    return res.status(200).json(recentOrders);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
}