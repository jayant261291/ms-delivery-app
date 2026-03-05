import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Table as TableIcon, 
  User, 
  LogOut, 
  Package,
  TrendingUp,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  MapPin,
  Phone,
  Calendar,
  Search,
  Filter,
  Download,
  Menu,
  X,
  ChevronRight,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { format, startOfDay, endOfDay, startOfMonth, subMonths, startOfYear } from 'date-fns';
import * as XLSX from 'xlsx';
import { cn, formatCurrency } from './lib/utils';
import { Order, Stats, Profile, FilterPeriod } from './types';

// --- Components ---

const MetricCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass p-6 rounded-2xl card-hover flex flex-col gap-4"
  >
    <div className="flex justify-between items-start">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-semibold px-2 py-1 rounded-full",
          trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1">{value}</h3>
    </div>
  </motion.div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
        : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-white" : "group-hover:text-indigo-600")} />
    <span className="font-medium">{label}</span>
    {active && <ChevronRight className="w-4 h-4 ml-auto" />}
  </button>
);

// --- Main App ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'profile'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ total_orders: 0, total_delivery: 0, total_outsource: 0, total_profit: 0 });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState<FilterPeriod>('this_month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ items: Order[] } | null>(null);

  // Auth State
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  useEffect(() => {
    const savedAuth = localStorage.getItem('ms_auth');
    if (savedAuth === 'true') setIsLoggedIn(true);
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      fetchRecent();
    }
  }, [isLoggedIn, filter, customRange]);

  const fetchData = async () => {
    let url = '/api/orders';
    let statsUrl = '/api/stats';
    
    const range = getRangeDates(filter);
    if (range) {
      const query = `?start=${range.start}&end=${range.end}`;
      url += query;
      statsUrl += query;
    }

    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch(url),
        fetch(statsUrl)
      ]);
      const ordersData = await ordersRes.json();
      const statsData = await statsRes.json();
      setOrders(ordersData);
      setStats(statsData);
    } catch (err) {
      toast.error("Failed to load data");
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/orders/recent');
      const data = await res.json();
      setRecentOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getRangeDates = (period: FilterPeriod) => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: format(startOfDay(now), 'yyyy-MM-dd'), end: format(endOfDay(now), 'yyyy-MM-dd') };
      case 'this_month':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'last_3_months':
        return { start: format(subMonths(now, 3), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'last_6_months':
        return { start: format(subMonths(now, 6), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'yearly':
        return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'custom':
        return customRange.start && customRange.end ? customRange : null;
      default:
        return null;
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.username === 'Admin' && loginData.password === 'Admin@123') {
      setIsLoggedIn(true);
      localStorage.setItem('ms_auth', 'true');
      toast.success("Welcome back, Admin!");
    } else {
      toast.error("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('ms_auth');
  };

  const exportToExcel = () => {
    const dataToExport = orders.map(o => ({
      'Order #': o.order_number,
      'Date': o.order_date,
      'Customer': o.customer_name,
      'Contact': o.customer_contact,
      'Delivery (AED)': o.delivery_charges,
      'Outsource (AED)': o.outsource_charges,
      'Profit (AED)': o.profit,
      'Address': o.customer_address,
      'Map Link': o.map_pin
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `MS_Orders_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Excel file downloaded");
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-950 p-4 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass p-8 rounded-3xl z-10"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">MS Delivery</h1>
            <p className="text-slate-500 mt-2">Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Admin"
                value={loginData.username}
                onChange={e => setLoginData({...loginData, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({...loginData, password: e.target.value})}
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
        </motion.div>
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed lg:relative z-50 w-72 h-screen bg-white border-r border-slate-200 flex flex-col p-6"
          >
            <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">MS Delivery</span>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              <SidebarItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
              <SidebarItem 
                icon={TableIcon} 
                label="Orders Table" 
                active={activeTab === 'orders'} 
                onClick={() => setActiveTab('orders')} 
              />
              <SidebarItem 
                icon={User} 
                label="Profile Settings" 
                active={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')} 
              />
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-4 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg mr-2">
                  <Menu className="w-6 h-6 text-slate-600" />
                </button>
              )}
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 capitalize">
                {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
              </h2>
            </div>
            <p className="text-slate-500 mt-1">Manage your delivery operations with precision.</p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden">
              {profile?.company_logo ? (
                <img src={profile.company_logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="hidden sm:block pr-4">
              <p className="text-sm font-bold text-slate-900">{profile?.company_name || 'Admin'}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <DashboardView 
            stats={stats} 
            recentOrders={recentOrders} 
            onOrderAdded={() => { fetchData(); fetchRecent(); }}
            filter={filter}
            setFilter={setFilter}
            customRange={customRange}
            setCustomRange={setCustomRange}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTableView 
            orders={orders} 
            filter={filter}
            setFilter={setFilter}
            customRange={customRange}
            setCustomRange={setCustomRange}
            onExport={exportToExcel}
            onEdit={(order: Order) => {
              setEditingOrder(order);
              setIsOrderModalOpen(true);
            }}
            onDelete={(items: Order[]) => {
              setDeleteConfirmation({ items });
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView profile={profile} onUpdate={fetchProfile} />
        )}

        {/* Floating Action Button */}
        {activeTab === 'dashboard' && (
          <button
            onClick={() => {
              setEditingOrder(null);
              setIsOrderModalOpen(true);
            }}
            className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all z-40 group"
          >
            <PlusCircle className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}

        {/* Order Registration Modal */}
        <AnimatePresence>
          {isOrderModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOrderModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      {editingOrder ? <Edit className="w-5 h-5 text-indigo-600" /> : <PlusCircle className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <h3 className="text-xl font-bold">{editingOrder ? 'Edit Order' : 'Register New Order'}</h3>
                  </div>
                  <button 
                    onClick={() => setIsOrderModalOpen(false)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="p-8 max-h-[80vh] overflow-y-auto">
                  <OrderForm 
                    initialData={editingOrder}
                    onSuccess={() => {
                      setIsOrderModalOpen(false);
                      setEditingOrder(null);
                      fetchData();
                      fetchRecent();
                    }} 
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmation && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmation(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center"
              >
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10 text-rose-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Confirm Delete</h3>
                <p className="text-slate-500 mb-8">
                  {deleteConfirmation.items.length > 1 
                    ? `Are you sure you want to delete ${deleteConfirmation.items.length} selected orders?` 
                    : `Are you sure you want to delete Order [${deleteConfirmation.items[0].order_number}]?`}
                  <br />
                  <span className="text-rose-500 font-medium text-sm">This action cannot be undone.</span>
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const items = deleteConfirmation.items;
                      const ids = items.map(i => i.id);
                      try {
                        const res = await fetch('/api/orders', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids })
                        });
                        if (res.ok) {
                          toast.success(items.length > 1 ? "Orders have been deleted" : `Order ${items[0].order_number} has been deleted`);
                          setDeleteConfirmation(null);
                          fetchData();
                          fetchRecent();
                        }
                      } catch (err) {
                        toast.error("Failed to delete orders");
                      }
                    }}
                    className="flex-1 px-6 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- View Components ---

function OrderForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: Order | null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    order_number: initialData?.order_number || '',
    order_date: initialData?.order_date || format(new Date(), 'yyyy-MM-dd'),
    customer_name: initialData?.customer_name || '',
    customer_contact: initialData?.customer_contact || '',
    delivery_charges: initialData?.delivery_charges?.toString() || '',
    outsource_charges: initialData?.outsource_charges?.toString() || '',
    customer_address: initialData?.customer_address || '',
    map_pin: initialData?.map_pin || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = initialData ? `/api/orders/${initialData.id}` : '/api/orders';
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          delivery_charges: parseFloat(formData.delivery_charges),
          outsource_charges: parseFloat(formData.outsource_charges)
        })
      });
      if (res.ok) {
        toast.success(initialData ? `Order updated successfully!` : `Order ${formData.order_number} registered!`);
        onSuccess();
      }
    } catch (err) {
      toast.error(initialData ? "Failed to update order" : "Failed to register order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Order Number</label>
        <input 
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="ORD-001"
          value={formData.order_number}
          onChange={e => setFormData({...formData, order_number: e.target.value})}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Order Date</label>
        <input 
          type="date"
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          value={formData.order_date}
          onChange={e => setFormData({...formData, order_date: e.target.value})}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Customer Name</label>
        <input 
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="John Doe"
          value={formData.customer_name}
          onChange={e => setFormData({...formData, customer_name: e.target.value})}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Contact Number</label>
        <input 
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="+1 234 567 890"
          value={formData.customer_contact}
          onChange={e => setFormData({...formData, customer_contact: e.target.value})}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Delivery Charges (AED)</label>
        <input 
          type="number"
          step="0.01"
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="0.00"
          value={formData.delivery_charges}
          onChange={e => setFormData({...formData, delivery_charges: e.target.value})}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Outsource Charges (AED)</label>
        <input 
          type="number"
          step="0.01"
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="0.00"
          value={formData.outsource_charges}
          onChange={e => setFormData({...formData, outsource_charges: e.target.value})}
        />
      </div>
      <div className="md:col-span-2 space-y-2">
        <label className="text-sm font-semibold text-slate-700">Customer Address</label>
        <textarea 
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter full delivery address..."
          value={formData.customer_address}
          onChange={e => setFormData({...formData, customer_address: e.target.value})}
        />
      </div>
      <div className="md:col-span-2 space-y-2">
        <label className="text-sm font-semibold text-slate-700">Map Pin URL</label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="https://maps.google.com/..."
            value={formData.map_pin}
            onChange={e => setFormData({...formData, map_pin: e.target.value})}
          />
        </div>
      </div>
      <div className="md:col-span-2 pt-4">
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
        >
          {isSubmitting ? 'Registering...' : 'Register Order'}
        </button>
      </div>
    </form>
  );
}

function DashboardView({ stats, recentOrders, filter, setFilter, customRange, setCustomRange }: any) {
  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="this_month">This Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {filter === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
            <input 
              type="date" 
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
              value={customRange.start}
              onChange={e => setCustomRange({...customRange, start: e.target.value})}
            />
            <span className="text-slate-400">to</span>
            <input 
              type="date" 
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none"
              value={customRange.end}
              onChange={e => setCustomRange({...customRange, end: e.target.value})}
            />
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Orders" 
          value={stats.total_orders} 
          icon={Package} 
          color="bg-indigo-500"
        />
        <MetricCard 
          title="Delivery Charges" 
          value={formatCurrency(stats.total_delivery || 0)} 
          icon={ArrowUpCircle} 
          color="bg-emerald-500"
        />
        <MetricCard 
          title="Outsource Charges" 
          value={formatCurrency(stats.total_outsource || 0)} 
          icon={ArrowDownCircle} 
          color="bg-rose-500"
        />
        <MetricCard 
          title="Net Profit" 
          value={formatCurrency(stats.total_profit || 0)} 
          icon={TrendingUp} 
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Recent Orders - Full Width */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-3xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold">Recent Orders</h3>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Last 15</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentOrders.length === 0 ? (
              <div className="col-span-full text-center py-20 text-slate-400">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No orders registered yet</p>
                <p className="text-sm">Click the + button to add your first order.</p>
              </div>
            ) : (
              recentOrders.map((order: Order) => (
                <div key={order.id} className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{order.order_number}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md">{format(new Date(order.order_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <p className="text-base font-semibold text-slate-800 truncate mb-1">{order.customer_name}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{order.customer_contact}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{formatCurrency(order.delivery_charges)}</span>
                    </div>
                    {order.map_pin && (
                      <a 
                        href={order.map_pin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        <MapPin className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function OrdersTableView({ orders, filter, setFilter, customRange, setCustomRange, onExport, onEdit, onDelete }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filteredOrders = orders.filter((o: Order) => 
    o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_contact.includes(searchTerm)
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((o: Order) => o.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  useEffect(() => {
    // Clear selection when orders change (e.g. after delete)
    setSelectedIds([]);
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by order #, name or phone..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {selectedIds.length > 0 && (
            <button 
              onClick={() => {
                const selectedItems = filteredOrders.filter((o: Order) => selectedIds.includes(o.id));
                onDelete(selectedItems);
              }}
              className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2.5 rounded-2xl font-bold hover:bg-rose-100 transition-all border border-rose-100"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.length})
            </button>
          )}

          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="this_month">This Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <button 
            onClick={onExport}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {filter === 'custom' && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 bg-white p-4 rounded-2xl border border-slate-200 w-fit">
          <Calendar className="w-4 h-4 text-indigo-600 mr-2" />
          <input 
            type="date" 
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm outline-none"
            value={customRange.start}
            onChange={e => setCustomRange({...customRange, start: e.target.value})}
          />
          <span className="text-slate-400">to</span>
          <input 
            type="date" 
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm outline-none"
            value={customRange.end}
            onChange={e => setCustomRange({...customRange, end: e.target.value})}
          />
        </div>
      )}

      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-bottom border-slate-100">
                <th className="px-6 py-5 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    {selectedIds.length === filteredOrders.length && filteredOrders.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Outsource</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No orders found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: Order) => (
                  <tr key={order.id} className={cn(
                    "hover:bg-slate-50/50 transition-colors group",
                    selectedIds.includes(order.id) && "bg-indigo-50/30"
                  )}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(order.id)} className={cn(
                        "transition-colors",
                        selectedIds.includes(order.id) ? "text-indigo-600" : "text-slate-300 hover:text-slate-400"
                      )}>
                        {selectedIds.includes(order.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{order.order_number}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {format(new Date(order.order_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{order.customer_name}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {order.customer_contact}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(order.delivery_charges)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500">
                      {formatCurrency(order.outsource_charges)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        (order.profit || 0) >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {formatCurrency(order.profit || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEdit(order)}
                          className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                          title="Edit Order"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete([order])}
                          className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {order.map_pin && (
                          <a 
                            href={order.map_pin} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                            title="View Location"
                          >
                            <MapPin className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ profile, onUpdate }: any) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    company_name: profile?.company_name || '',
    company_email: profile?.company_email || '',
    company_phone: profile?.company_phone || '',
    company_logo: profile?.company_logo || ''
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, company_logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("Profile updated successfully!");
        onUpdate();
      }
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="glass p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-10">
          <User className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-bold">Company Settings</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-100">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
                {formData.company_logo ? (
                  <img src={formData.company_logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package className="w-12 h-12" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg cursor-pointer hover:bg-indigo-700 transition-all">
                <Download className="w-4 h-4 rotate-180" />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-lg font-bold text-slate-900">Company Logo</h4>
              <p className="text-slate-500 text-sm mt-1">Upload your business logo. Recommended size: 512x512px.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Company Name</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.company_name}
                onChange={e => setFormData({...formData, company_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Support Email</label>
              <input 
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.company_email}
                onChange={e => setFormData({...formData, company_email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Contact Phone</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.company_phone}
                onChange={e => setFormData({...formData, company_phone: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              disabled={isUpdating}
              className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {isUpdating ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
