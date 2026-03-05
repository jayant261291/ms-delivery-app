import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { 
  Plus, Search, Filter, Download, ExternalLink, Edit2, Trash2, 
  ChevronLeft, ChevronRight, Calendar, MapPin, Phone, User, DollarSign 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, isToday, isThisMonth, subMonths, isWithinInterval, startOfYear, endOfYear } from "date-fns";
import * as XLSX from "xlsx";
import { formatCurrency, cn } from "../lib/utils";

interface Order {
  _id: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerContact: string;
  deliveryCharges: number;
  outsourceCharges: number;
  customerAddress: string;
  mapPinUrl: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("All");
  const [exportRange, setExportRange] = useState({ start: "", end: "" });

  // Form State
  const [formData, setFormData] = useState({
    orderNumber: "",
    orderDate: format(new Date(), "yyyy-MM-dd"),
    customerName: "",
    customerContact: "",
    deliveryCharges: 0,
    outsourceCharges: 0,
    customerAddress: "",
    mapPinUrl: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrder) {
        await axios.put(`/api/orders/${editingOrder._id}`, formData);
      } else {
        await axios.post("/api/orders", formData);
      }
      fetchOrders();
      setShowForm(false);
      setEditingOrder(null);
      resetForm();
    } catch (err) {
      alert("Error saving order. Check if order number is unique.");
    }
  };

  const resetForm = () => {
    setFormData({
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      orderDate: format(new Date(), "yyyy-MM-dd"),
      customerName: "",
      customerContact: "",
      deliveryCharges: 0,
      outsourceCharges: 0,
      customerAddress: "",
      mapPinUrl: "",
    });
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      ...order,
      orderDate: format(new Date(order.orderDate), "yyyy-MM-dd"),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      await axios.delete(`/api/orders/${id}`);
      fetchOrders();
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const date = new Date(order.orderDate);
      let matchesTime = true;

      if (timeFilter === "Today") matchesTime = isToday(date);
      else if (timeFilter === "This Month") matchesTime = isThisMonth(date);
      else if (timeFilter === "Last 3 Months") matchesTime = date >= subMonths(new Date(), 3);
      else if (timeFilter === "Last 6 Months") matchesTime = date >= subMonths(new Date(), 6);
      else if (timeFilter === "Yearly") matchesTime = isWithinInterval(date, { start: startOfYear(new Date()), end: endOfYear(new Date()) });

      return matchesSearch && matchesTime;
    });
  }, [orders, searchTerm, timeFilter]);

  const exportToExcel = () => {
    const dataToExport = filteredOrders.map(o => ({
      "Order #": o.orderNumber,
      "Date": format(new Date(o.orderDate), "MMM dd, yyyy"),
      "Customer": o.customerName,
      "Contact": o.customerContact,
      "Delivery Charges": o.deliveryCharges,
      "Outsource Charges": o.outsourceCharges,
      "Profit": o.deliveryCharges - o.outsourceCharges,
      "Address": o.customerAddress,
      "Map Link": o.mapPinUrl
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `MS_Orders_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 mt-1">Manage and track all delivery registrations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            <span>New Order</span>
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by order # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option>All</option>
            <option>Today</option>
            <option>This Month</option>
            <option>Last 3 Months</option>
            <option>Last 6 Months</option>
            <option>Yearly</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-bottom border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Financials</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{order.orderNumber}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar size={12} />
                        {format(new Date(order.orderDate), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{order.customerName}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Phone size={12} />
                        {order.customerContact}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Delivery:</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(order.deliveryCharges)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Outsource:</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(order.outsourceCharges)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      (order.deliveryCharges - order.outsourceCharges) >= 0 
                        ? "bg-emerald-50 text-emerald-600" 
                        : "bg-rose-50 text-rose-600"
                    )}>
                      {formatCurrency(order.deliveryCharges - order.outsourceCharges)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.mapPinUrl && (
                        <a href={order.mapPinUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                          <MapPin size={18} />
                        </a>
                      )}
                      <button onClick={() => handleEdit(order)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(order._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">{editingOrder ? "Edit Order" : "New Order Registration"}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Order Number</label>
                    <input
                      type="text"
                      required
                      value={formData.orderNumber}
                      onChange={(e) => setFormData({...formData, orderNumber: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Order Date</label>
                    <input
                      type="date"
                      required
                      value={formData.orderDate}
                      onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Contact Number</label>
                    <input
                      type="text"
                      required
                      value={formData.customerContact}
                      onChange={(e) => setFormData({...formData, customerContact: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Delivery Charges ($)</label>
                    <input
                      type="number"
                      required
                      value={formData.deliveryCharges}
                      onChange={(e) => setFormData({...formData, deliveryCharges: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Outsource Charges ($)</label>
                    <input
                      type="number"
                      required
                      value={formData.outsourceCharges}
                      onChange={(e) => setFormData({...formData, outsourceCharges: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Customer Address</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Map Pin URL</label>
                  <input
                    type="url"
                    value={formData.mapPinUrl}
                    onChange={(e) => setFormData({...formData, mapPinUrl: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="https://maps.google.com/..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-3.5 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    {editingOrder ? "Update Order" : "Register Order"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
