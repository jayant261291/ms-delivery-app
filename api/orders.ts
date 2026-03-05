import mongoose from 'mongoose';

// 1. Define the Order Database Schema
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  orderDate: String,
  customerName: String,
  customerContactNumber: String,
  deliveryCharges: Number,
  outsourceCharges: Number,
  customerAddress: String,
  addressMapPin: String,
  profit: Number
}, { timestamps: true });

// Prevent mongoose from recreating the model every time the button is clicked
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// 2. Handle the Frontend Requests
export default async function handler(req, res) {
  // Connect to MongoDB using your Vercel Environment Variable
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }

  // Handle saving a new order (POST request)
  if (req.method === 'POST') {
    try {
      const newOrder = new Order(req.body);
      await newOrder.save();
      return res.status(201).json({ message: 'Order created successfully', order: newOrder });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create order' });
    }
  } 

  // Handle loading the dashboard list (GET request)
  if (req.method === 'GET') {
    try {
      const orders = await Order.find().sort({ createdAt: -1 }).limit(15);
      return res.status(200).json(orders);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  // If the frontend tries to do anything else, reject it
  return res.status(405).json({ message: 'Method not allowed' });
}