import { useState, useEffect } from "react";
import axios from "axios";
import { ShoppingCart, DollarSign, TrendingUp, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { formatCurrency } from "../lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface Order {
  _id: string;
  orderNumber: string;
  orderDate: string;
  deliveryCharges: number;
  outsourceCharges: number;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("/api/orders");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalOrders: orders.length,
    totalDelivery: orders.reduce((sum, o) => sum + o.deliveryCharges, 0),
    totalOutsource: orders.reduce((sum, o) => sum + o.outsourceCharges, 0),
    totalProfit: orders.reduce((sum, o) => sum + (o.deliveryCharges - o.outsourceCharges), 0),
  };

  // Prepare chart data (last 6 months)
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthOrders = orders.filter(o => {
      const d = new Date(o.orderDate);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });

    return {
      name: format(date, "MMM"),
      revenue: monthOrders.reduce((sum, o) => sum + o.deliveryCharges, 0),
      profit: monthOrders.reduce((sum, o) => sum + (o.deliveryCharges - o.outsourceCharges), 0),
    };
  });

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl", color)}>
          <Icon size={24} className="text-white" />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg", trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">
        {typeof value === "number" && title !== "Total Orders" ? formatCurrency(value) : value}
      </h3>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, here's what's happening today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Orders" value={stats.totalOrders} icon={Package} color="bg-indigo-600" trend={12} />
        <StatCard title="Total Revenue" value={stats.totalDelivery} icon={DollarSign} color="bg-blue-600" trend={8} />
        <StatCard title="Outsource Costs" value={stats.totalOutsource} icon={ShoppingCart} color="bg-orange-500" trend={-3} />
        <StatCard title="Total Profit" value={stats.totalProfit} icon={TrendingUp} color="bg-emerald-600" trend={15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue vs Profit</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Monthly Orders</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#F8F9FA' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
