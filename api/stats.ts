import mongoose from 'mongoose';

export default async function handler(req: any, res: any) {
  // 1. Connect to the database
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI as string);
    } catch (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }

  // 2. Access the Order database
  const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

  try {
    // 3. Fetch all orders to calculate the totals
    const orders = await Order.find();
    
    const totalOrders = orders.length;
    const totalDeliveryCharges = orders.reduce((sum, order) => sum + (Number(order.deliveryCharges) || 0), 0);
    const totalOutsourceCharges = orders.reduce((sum, order) => sum + (Number(order.outsourceCharges) || 0), 0);
    const profit = totalDeliveryCharges - totalOutsourceCharges;

    // 4. Send the calculated totals back to the dashboard
    return res.status(200).json({
      totalOrders,
      totalDeliveryCharges,
      totalOutsourceCharges,
      profit
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to calculate stats' });
  }
}