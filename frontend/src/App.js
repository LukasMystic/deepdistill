import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, LayoutGroup } from 'framer-motion';
import { 
  Upload, Zap, Activity, AlertCircle, CheckCircle2, 
  Image as ImageIcon, BarChart3, LayoutDashboard, 
  History, Settings, ChevronRight, TrendingUp, Cpu,
  LineChart as LineChartIcon, Users, GraduationCap,
  ArrowRight, Database, LogOut, User, Lock, Mail, Camera, ShieldAlert, Key, Menu, X, Github, FileText, MonitorPlay,
  BrainCircuit, Layers, Clock, Award, MousePointerClick, Smartphone, ChevronDown, ListFilter
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';

// --- API UTILS ---

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// --- DATA CONSTANTS ---

// Merged Training Data (50 Epochs)
const TRAINING_DATA = [
  { epoch: 1, baseline: 51.03, vanilla: 43.97, aktp: 50.56 },
  { epoch: 2, baseline: 54.37, vanilla: 47.88, aktp: 54.58 },
  { epoch: 3, baseline: 54.59, vanilla: 50.68, aktp: 56.06 },
  { epoch: 4, baseline: 55.45, vanilla: 52.63, aktp: 57.58 },
  { epoch: 5, baseline: 55.67, vanilla: 53.54, aktp: 57.46 },
  { epoch: 6, baseline: 55.44, vanilla: 54.30, aktp: 58.13 },
  { epoch: 7, baseline: 55.98, vanilla: 54.45, aktp: 58.39 },
  { epoch: 8, baseline: 55.72, vanilla: 54.56, aktp: 59.32 },
  { epoch: 9, baseline: 55.84, vanilla: 55.71, aktp: 59.14 },
  { epoch: 10, baseline: 55.58, vanilla: 55.85, aktp: 58.85 },
  { epoch: 11, baseline: 55.44, vanilla: 56.37, aktp: 58.61 },
  { epoch: 12, baseline: 55.45, vanilla: 56.76, aktp: 58.91 },
  { epoch: 13, baseline: null, vanilla: 56.90, aktp: 59.37 },
  { epoch: 14, baseline: null, vanilla: 57.05, aktp: 59.41 },
  { epoch: 15, baseline: null, vanilla: 57.40, aktp: 59.61 },
  { epoch: 16, baseline: null, vanilla: 58.32, aktp: 59.04 },
  { epoch: 17, baseline: null, vanilla: 58.69, aktp: 59.97 },
  { epoch: 18, baseline: null, vanilla: 58.06, aktp: 59.17 },
  { epoch: 19, baseline: null, vanilla: 58.20, aktp: 59.79 },
  { epoch: 20, baseline: null, vanilla: 59.48, aktp: 59.39 },
  { epoch: 21, baseline: null, vanilla: 59.25, aktp: 59.44 },
  { epoch: 22, baseline: null, vanilla: 58.93, aktp: 59.84 },
  { epoch: 23, baseline: null, vanilla: 58.95, aktp: 59.77 },
  { epoch: 24, baseline: null, vanilla: 59.50, aktp: 60.38 },
  { epoch: 25, baseline: null, vanilla: 60.05, aktp: 60.54 },
  { epoch: 26, baseline: null, vanilla: 59.78, aktp: 60.72 },
  { epoch: 27, baseline: null, vanilla: 59.57, aktp: 60.17 },
  { epoch: 28, baseline: null, vanilla: 59.87, aktp: 61.07 },
  { epoch: 29, baseline: null, vanilla: 59.57, aktp: 60.91 },
  { epoch: 30, baseline: null, vanilla: 59.71, aktp: 61.45 },
  { epoch: 31, baseline: null, vanilla: 60.18, aktp: 61.04 },
  { epoch: 32, baseline: null, vanilla: 60.35, aktp: 61.43 },
  { epoch: 33, baseline: null, vanilla: 60.62, aktp: 61.50 },
  { epoch: 34, baseline: null, vanilla: 60.71, aktp: 61.75 },
  { epoch: 35, baseline: null, vanilla: 60.74, aktp: 61.78 },
  { epoch: 36, baseline: null, vanilla: 60.68, aktp: 61.78 },
  { epoch: 37, baseline: null, vanilla: 60.94, aktp: 61.90 },
  { epoch: 38, baseline: null, vanilla: 61.16, aktp: 62.20 },
  { epoch: 39, baseline: null, vanilla: 60.88, aktp: 62.55 },
  { epoch: 40, baseline: null, vanilla: 61.40, aktp: 62.67 },
  { epoch: 41, baseline: null, vanilla: 61.32, aktp: 62.55 },
  { epoch: 42, baseline: null, vanilla: 61.50, aktp: 62.61 },
  { epoch: 43, baseline: null, vanilla: 61.17, aktp: 62.73 },
  { epoch: 44, baseline: null, vanilla: 61.55, aktp: 62.69 },
  { epoch: 45, baseline: null, vanilla: 61.23, aktp: 62.57 },
  { epoch: 46, baseline: null, vanilla: 61.30, aktp: 62.80 },
  { epoch: 47, baseline: null, vanilla: 61.45, aktp: 62.95 },
  { epoch: 48, baseline: null, vanilla: 61.59, aktp: 63.03 },
  { epoch: 49, baseline: null, vanilla: 61.29, aktp: 63.10 },
  { epoch: 50, baseline: null, vanilla: 61.50, aktp: 63.20 },
];

// Based on evaluation_allmodels.txt
// Fixed: Explicitly showing all 5 models with full Top-1 and Top-5 data
const COMPARISON_RESULTS = [
  { name: "AKTP Student (B0)", top1: 63.20, top5: 82.31, f1: 63.14, time: 10.34, params: "4.2M", color: "#22c55e", highlight: true },
  { name: "Vanilla Distill (B0)", top1: 61.58, top5: 83.87, f1: 61.21, time: 11.09, params: "4.2M", color: "#64748b" },
  { name: "Teacher EffNet-B2", top1: 61.08, top5: 82.70, f1: 60.92, time: 15.32, params: "7.9M", color: "#a855f7" },
  { name: "Baseline B0", top1: 55.98, top5: 79.54, f1: 55.88, time: 10.67, params: "4.2M", color: "#ef4444" },
  { name: "Teacher ResNet18", top1: 52.21, top5: 74.99, f1: 52.14, time: 3.21, params: "11.2M", color: "#6366f1" },
];

const MODEL_DISPLAY_CONFIG = [
  { key: 'b0_aktp_tiny', label: 'AKTP Student', sub: 'Ours', color: 'green', icon: BrainCircuit },
  { key: 'distilled_b0', label: 'Vanilla Distill', sub: 'Standard', color: 'slate', icon: Zap },
  { key: 'baseline_b0_tiny', label: 'Baseline B0', sub: 'Reference', color: 'red', icon: Activity },
  { key: 'teacher_b2_tiny', label: 'Teacher B2', sub: 'Teacher 1', color: 'purple', icon: GraduationCap },
  { key: 'teacher_r18_tiny', label: 'Teacher R18', sub: 'Teacher 2', color: 'indigo', icon: GraduationCap },
];

const TEAM_MEMBERS = [
  { name: "Stanley Pratama Teguh", nim: "2702311566", role: "Full Stack Dev", image: "/stanley.jpg" },
  { name: "Owen Limantoro", nim: "2702262330", role: "Researcher", image: "/owen.jpg" },
  { name: "Gading Aditya Perdana", nim: "2702268725", role: "AI Engineer", image: "/gading.jpg" },
];

// --- ANIMATION VARIANTS ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 12 } }
};

// --- AUTH COMPONENTS ---

const AuthLayout = ({ children, title, subtitle, onBack }) => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-[-20%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/20 rounded-full blur-[80px] md:blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-indigo-600/20 rounded-full blur-[80px] md:blur-[100px] animate-pulse delay-1000" />
    </div>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10"
    >
      {onBack && (
        <button onClick={onBack} className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors">
          <ArrowRight className="rotate-180" size={20} />
        </button>
      )}
      <div className="text-center mb-8 mt-2">
        <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain invert brightness-0 filter" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-slate-400">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  </div>
);

const InputField = ({ icon: Icon, ...props }) => (
  <div className="relative mb-4 group">
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
      <Icon size={18} />
    </div>
    <input 
      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
      {...props}
    />
  </div>
);

// --- LANDING PAGE ---

const LandingPage = ({ onLogin, onRegister }) => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-blue-500/30">
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain invert brightness-0 filter" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden xs:block">DeepDistill</span>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <button onClick={onLogin} className="text-slate-400 hover:text-white font-medium transition-colors px-4 py-2">Login</button>
            <button onClick={onRegister} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-600/40 hover:-translate-y-0.5">Get Started</button>
          </div>

          <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden bg-slate-900 border-b border-slate-800 overflow-hidden">
              <div className="p-6 space-y-4 flex flex-col">
                <button onClick={onLogin} className="w-full text-left text-slate-300 py-2">Login</button>
                <button onClick={onRegister} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Get Started</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <section className="relative min-h-[90vh] flex items-center justify-center pt-28 pb-10 overflow-hidden px-4 md:px-0">
        <motion.div style={{ y: y1 }} className="absolute top-20 right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-indigo-600/20 rounded-full blur-[80px] md:blur-[120px]" />
        <motion.div style={{ y: y2 }} className="absolute bottom-[-10%] left-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px]" />
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Zap size={12} className="fill-current" /> Next-Gen AI Optimization
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-500">
              Distill Knowledge. <br/> Amplify Speed.
            </h1>
            <p className="text-base md:text-lg text-slate-400 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Deploy AKTP (Adaptive Knowledge Transfer) to compress TinyImageNet models. 
              Achieve <strong>63.2%</strong> accuracy with <strong>4.2M</strong> parameters.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button onClick={onRegister} className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-xl shadow-white/5 flex items-center justify-center gap-2">
                Start Experimenting <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl blur-2xl opacity-20 transform rotate-6" />
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="text-xs text-slate-500 font-mono">TinyImageNet Benchmark</div>
              </div>
              
              <div className="space-y-4">
                 <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400 text-sm">Baseline B0 (Student)</span>
                      <span className="text-slate-500 text-xs">55.98% Acc</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: "55.98%" }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-slate-500" />
                    </div>
                 </div>
                 <div className="bg-blue-900/10 rounded-xl p-4 border border-blue-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-300 text-sm font-bold flex items-center gap-2"><Zap size={14}/> AKTP Distilled B0</span>
                      <span className="text-blue-400 text-xs font-mono">63.20% Acc</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: "63.2%" }} transition={{ duration: 1.5, delay: 0.7 }} className="h-full bg-blue-500" />
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- NEW PRESENTATION SECTION --- */}
      <section className="relative py-20 bg-slate-950 border-t border-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            className="text-center mb-12"
          >
             <h2 className="text-3xl md:text-4xl font-bold mb-4">Project Resources</h2>
             <p className="text-slate-400 max-w-2xl mx-auto">
               Explore the methodology and results through our video presentation and interactive slide deck.
             </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Video Placeholder */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                className="w-full aspect-video bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-colors shadow-2xl"
              >
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 to-slate-800 group-hover:scale-105 transition-transform duration-700">
                   <div className="w-16 h-16 bg-blue-600/20 rounded-full backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors shadow-lg border border-blue-500/30">
                      <MonitorPlay size={32} className="text-blue-400 group-hover:text-white fill-current ml-1 transition-colors" />
                   </div>
                   <span className="text-slate-300 font-bold text-lg group-hover:text-white transition-colors">Watch Presentation</span>
                   <span className="text-slate-500 text-sm mt-1">Video Walkthrough</span>
                 </div>
              </motion.div>

              {/* Slides Placeholder */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                className="w-full aspect-video bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-colors shadow-2xl"
              >
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-bl from-slate-900 to-slate-800 group-hover:scale-105 transition-transform duration-700">
                   <div className="w-16 h-16 bg-purple-600/20 rounded-full backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors shadow-lg border border-purple-500/30">
                      <FileText size={32} className="text-purple-400 group-hover:text-white transition-colors" />
                   </div>
                   <span className="text-slate-300 font-bold text-lg group-hover:text-white transition-colors">View Deck</span>
                   <span className="text-slate-500 text-sm mt-1">Interactive Slides</span>
                 </div>
              </motion.div>
          </div>
        </div>
      </section>
      {/* --- END PRESENTATION SECTION --- */}
    </div>
  );
};

// --- DASHBOARD COMPONENTS ---

const Navigation = ({ activeTab, setActiveTab, user, onLogout }) => {
  const menuItems = [
    { id: 'inference', label: 'Inference', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: LineChartIcon },
    { id: 'history', label: 'History', icon: Database },
    { id: 'specs', label: 'Specs', icon: Cpu },
    { id: 'team', label: 'Team', icon: Users },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-950 border-r border-slate-900 flex-col h-screen fixed left-0 top-0 z-50">
        <div className="p-6 flex items-center gap-3 border-b border-slate-900 h-16">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
             <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain invert brightness-0 filter" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">DeepDistill</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${activeTab === item.id ? 'text-white shadow-md shadow-blue-900/10' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              {activeTab === item.id && (
                <motion.div layoutId="desktop-nav-bg" className="absolute inset-0 bg-blue-600 rounded-xl z-0" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
              <item.icon size={20} className={`z-10 relative ${activeTab === item.id ? 'text-white' : ''}`} />
              <span className="font-medium z-10 relative">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-900">
          <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-900 transition-colors mb-2 ${activeTab === 'profile' ? 'bg-slate-900' : ''}`}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-9 h-9 rounded-full object-cover border border-slate-700" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><User size={16} /></div>
            )}
            <div className="text-left overflow-hidden">
              <div className="text-sm font-medium text-white truncate">{user?.full_name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </button>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-900 z-50 px-4 py-2 safe-area-bottom">
        <div className="flex justify-around items-center">
          {menuItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl relative ${activeTab === item.id ? 'text-blue-500' : 'text-slate-500'}`}
            >
              <item.icon size={20} className="relative z-10" strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-medium relative z-10">{item.label}</span>
              {activeTab === item.id && (
                <motion.div layoutId="mobile-nav-indicator" className="absolute -top-2 w-8 h-1 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'profile' ? 'text-blue-500' : 'text-slate-500'}`}>
             {user?.avatar_url ? <img src={user.avatar_url} className="w-6 h-6 rounded-full border border-current" /> : <User size={20} />}
             <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </>
  );
};

// --- VIEWS ---

const ProfileView = ({ user, setUser }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/user/avatar', { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => ({ ...prev, avatar_url: data.avatar_url }));
      }
    } catch (err) { console.error("Avatar upload error:", err); } finally { setUploading(false); }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-2xl mx-auto py-8">
      <motion.h2 variants={itemVariants} className="text-3xl font-bold text-white mb-8">Profile Settings</motion.h2>
      <motion.div variants={itemVariants} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/20 to-transparent" />
        <div className="relative group cursor-pointer z-10" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-800 bg-slate-950 relative shadow-2xl">
            {user?.avatar_url ? <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-600"><User size={48} /></div>}
            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}
          </div>
          <div className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-4 border-slate-900 group-hover:bg-blue-500 transition-colors"><Camera size={16} className="text-white" /></div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarUpload} accept="image/*" />
        <h3 className="text-xl font-bold text-white mt-4 flex items-center gap-2">{user?.full_name} {user?.is_verified && <CheckCircle2 size={16} className="text-blue-500" />}</h3>
        <p className="text-slate-400">{user?.email}</p>
      </motion.div>
    </motion.div>
  );
};

const InferenceView = ({ user }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    
    if (selected) {
      // 1. Reset previous errors
      setError(null);

      // 2. Validate File Type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(selected.type)) {
        setError("Invalid file type. Please upload a JPG, JPEG, or PNG.");
        return;
      }

      // 3. Validate File Size (5MB = 5 * 1024 * 1024 bytes)
      const maxSize = 5 * 1024 * 1024;
      if (selected.size > maxSize) {
        setError("File size exceeds the 5MB limit.");
        return;
      }

      // 4. Set File if valid
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setPrediction(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch('/api/predict', { method: 'POST', headers: getAuthHeaders(), body: formData });
      if (!res.ok) throw new Error("Inference failed");
      const data = await res.json();
      setPrediction(data);
    } catch (err) { setError("Failed to run inference. Please check backend connection."); } finally { setLoading(false); }
  };

  const winner = prediction ? (prediction.b0_aktp_tiny?.[0]?.probability > prediction.baseline_b0_tiny?.[0]?.probability ? 'aktp' : 'baseline') : null;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500 py-4 pb-24 md:pb-4">
      <div className="mb-8 text-center px-4">
        <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400 mb-3 tracking-tight">
          Visual Recognition Lab
        </h1>
        <p className="text-slate-400 text-sm md:text-lg">Real-time Distillation Benchmark (TinyImageNet)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white"><ImageIcon className="text-blue-500" size={20} /> Input Source</h2>
              {preview && <button onClick={() => {setFile(null); setPreview(null); setPrediction(null);}} className="text-xs text-red-400 hover:text-red-300">Reset</button>}
            </div>

            <label className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${preview ? 'border-slate-800 bg-slate-950' : 'border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/30'}`}>
              <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileChange} className="hidden" />
              {preview ? <img src={preview} alt="Preview" className="w-full h-full object-contain" /> : <div className="text-center p-6"><Upload className="mx-auto text-slate-400 mb-4" size={32} /><p className="font-bold text-slate-300">Tap to Upload</p><p className="text-xs text-slate-500 mt-2">JPEG, PNG (Max 5MB)</p></div>}
            </label>

            <button onClick={handleUpload} disabled={!file || loading} className={`w-full mt-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-lg ${!file ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : loading ? 'bg-blue-600/80 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.98]'}`}>
              {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Zap size={20} fill="currentColor" />}
              {loading ? 'Processing...' : 'Run Inference'}
            </button>
            {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-sm text-center">{error}</div>}
          </div>
        </div>

        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!prediction ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full min-h-[300px] bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                <BarChart3 size={64} className="mb-6 opacity-20" />
                <p className="text-lg font-medium">Ready for Analysis</p>
                <p className="text-sm opacity-60">Upload an image to compare all 5 models</p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 backdrop-blur-sm">
                  <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Activity size={16} className="text-blue-500" /> AI Consensus Analysis</h4>
                  <div className="text-sm text-slate-300 leading-relaxed">
                    The <strong>AKTP Student</strong> predicted <strong className="text-green-400">{prediction.b0_aktp_tiny?.[0]?.class_name}</strong> with <strong>{prediction.b0_aktp_tiny?.[0]?.probability}%</strong> confidence. 
                    Compared to the baseline, it is <strong className={winner === 'aktp' ? 'text-green-400' : 'text-red-400'}>
                      {Math.abs((prediction.b0_aktp_tiny?.[0]?.probability || 0) - (prediction.baseline_b0_tiny?.[0]?.probability || 0)).toFixed(1)}% {winner === 'aktp' ? 'more' : 'less'} confident
                    </strong>.
                  </div>
                </motion.div>

                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                  {MODEL_DISPLAY_CONFIG.map((config) => {
                    if (!prediction[config.key]) return null;
                    return (
                      <ResultCard 
                        key={config.key} 
                        title={config.label} 
                        sub={config.sub}
                        data={prediction[config.key]} 
                        color={config.color}
                        Icon={config.icon}
                        isWinner={winner === 'aktp' && config.key === 'b0_aktp_tiny'}
                      />
                    );
                  })}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ResultCard = ({ title, sub, data, color, Icon, isWinner }) => {
  const colorMap = {
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', bar: 'bg-red-500' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', bar: 'bg-green-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', bar: 'bg-indigo-500' },
    slate: { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-400', bar: 'bg-slate-500' },
  };
  const theme = colorMap[color] || colorMap.slate;

  return (
    <motion.div variants={itemVariants} className={`relative overflow-hidden rounded-2xl border ${isWinner ? 'border-green-500 ring-1 ring-green-500/50' : theme.border} bg-slate-900/80 p-5 shadow-lg`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className={`${theme.text} text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2`}>
            {Icon && <Icon size={12}/>} {title}
          </div>
          <div className="text-lg font-bold text-white truncate max-w-[150px]" title={data[0].class_name}>{data[0].class_name}</div>
        </div>
        <div className={`px-2 py-1 rounded-lg text-[10px] font-mono border uppercase tracking-wide ${theme.bg} ${theme.border} ${theme.text} opacity-80`}>
          {sub}
        </div>
      </div>
      <div className="space-y-2">
        {data.slice(0, 5).map((pred, i) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between text-xs mb-1 font-medium text-slate-400"><span>{pred.class_name}</span><span>{pred.probability}%</span></div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pred.probability}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className={`h-full ${theme.bar} rounded-full`} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const HistoryView = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) { console.error("Failed to fetch history:", err); } finally { setLoading(false); }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="flex justify-center p-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3"><Database className="text-blue-500" /> Session History</h2>
          <p className="text-slate-400">Past predictions from all models</p>
        </div>
        <span className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-400 font-mono text-sm self-start md:self-auto">{history.length} Records</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.length === 0 ? <div className="text-center p-12 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 text-slate-500">No history found. Run some inferences first!</div> : history.map((item) => (
          <div key={item.id} className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row gap-6 items-start hover:bg-slate-900 transition-colors">
            <img src={item.image_url || "https://via.placeholder.com/150?text=No+Image"} alt="History" className="w-full md:w-32 h-48 md:h-32 object-cover rounded-xl bg-slate-950 border border-slate-800 shrink-0" />
            
            <div className="flex-1 w-full">
              <div className="flex justify-between items-center mb-4">
                 <div className="text-xs text-slate-500 font-mono flex items-center gap-2"><Clock size={12}/> {item.timestamp}</div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                 {/* Dynamically render chips for available model results */}
                 {MODEL_DISPLAY_CONFIG.map(config => {
                    const res = item.result[config.key];
                    if (!res) return null;
                    return (
                        <div key={config.key} className={`p-3 rounded-xl border ${config.key === 'b0_aktp_tiny' ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-950/50 border-slate-800'}`}>
                           <div className={`text-[10px] uppercase font-bold mb-2 truncate ${config.key === 'b0_aktp_tiny' ? 'text-green-400' : 'text-slate-500'}`}>{config.label}</div>
                           
                           <div className="space-y-1.5">
                             {res.slice(0, 5).map((pred, idx) => (
                               <div key={idx} className="flex justify-between items-center text-xs">
                                 <span className={`truncate max-w-[70%] ${idx === 0 ? 'text-white font-medium' : 'text-slate-500'}`}>{pred.class_name}</span>
                                 <span className={`font-mono ${idx === 0 && config.key === 'b0_aktp_tiny' ? 'text-green-500' : 'text-slate-600'}`}>{pred.probability}%</span>
                               </div>
                             ))}
                           </div>
                        </div>
                    );
                 })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsView = () => {
  const [metric, setMetric] = useState('top1'); // 'top1' or 'top5'

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-8">
      
      {/* Metric Toggle */}
      <div className="flex justify-end">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex">
          <button onClick={() => setMetric('top1')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${metric === 'top1' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Top-1 Acc</button>
          <button onClick={() => setMetric('top5')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${metric === 'top5' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Top-5 Acc</button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {COMPARISON_RESULTS.map((stat, i) => (
          <div key={i} className={`bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between ${stat.highlight ? "ring-1 ring-green-500/40 bg-green-500/5" : ""}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider truncate max-w-[80%]" style={{color: stat.color}}>
                {stat.name}
              </div>
              {stat.highlight && <Award size={14} className="text-green-400" />}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{stat[metric].toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500 uppercase">{metric}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-slate-500">F1: {stat.f1.toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/50">
               <div className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} /> {stat.time.toFixed(1)}ms</div>
               <div className="text-[10px] font-mono bg-slate-950/50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">{stat.params}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Learning Curve */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl h-[450px] flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-500"/> Validation Progress (50 Epochs)
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TRAINING_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAKTP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="epoch" stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis stroke="#64748b" domain={[40, 70]} axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area name="AKTP Student" type="monotone" dataKey="aktp" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorAKTP)" />
                <Area name="Vanilla Distill" type="monotone" dataKey="vanilla" stroke="#94a3b8" strokeWidth={2} fillOpacity={0} strokeDasharray="5 5" />
                <Area name="Baseline B0" type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Benchmark Bar Chart - Dynamic Metric */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl h-[450px] flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-500"/> Model Comparison ({metric === 'top1' ? 'Top-1' : 'Top-5'})
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COMPARISON_RESULTS} layout="vertical" margin={{ left: 0, right: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  width={140} 
                  tick={{fontSize: 11, fill: '#94a3b8'}} 
                  interval={0} 
                />
                <RechartsTooltip 
                  cursor={{fill: '#1e293b'}} 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }} 
                />
                <Bar dataKey={metric} radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#fff', fontSize: 12, formatter: (val) => `${val}%` }}>
                    {COMPARISON_RESULTS.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const SpecsView = () => (
  <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-8">
    <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3"><Cpu className="text-blue-500" /> Technical Specifications</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Distillation Config */}
      <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800">
        <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2 text-lg"><BrainCircuit size={20} /> AKTP Strategy</h3>
        <div className="space-y-3">
           {[{l:"Method", v:"Adaptive Knowledge Transfer"}, {l:"Temperature", v:"6.0"}, {l:"Gamma (Cal)", v:"0.1"}, {l:"Teacher Weight", v:"0.6"}, {l:"Alpha", v:"Dynamic"}].map((x,i) => (
             <div key={i} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0 gap-4">
                <span className="text-slate-400 text-sm">{x.l}</span>
                <span className="text-white font-mono text-sm text-right">{x.v}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Model Architecture */}
      <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800">
        <h3 className="text-purple-400 font-bold mb-4 flex items-center gap-2 text-lg"><GraduationCap size={20} /> Model Zoo</h3>
        <div className="space-y-3">
           {[{l:"Student", v:"EfficientNet-B0"}, {l:"Teacher 1", v:"EfficientNet-B2"}, {l:"Teacher 2", v:"ResNet18"}, {l:"Pretrained", v:"ImageNet-1k"}].map((x,i) => (
             <div key={i} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0 gap-4">
                <span className="text-slate-400 text-sm">{x.l}</span>
                <span className="text-white font-mono text-sm text-right">{x.v}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Training Hyperparams */}
      <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800">
        <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2 text-lg"><Settings size={20} /> Hyperparameters</h3>
        <div className="space-y-3">
           {[{l:"Epochs", v:"50"}, {l:"Batch Size", v:"256"}, {l:"Learning Rate", v:"1e-3"}, {l:"Scheduler", v:"Cosine Annealing"}, {l:"Optimizer", v:"AdamW"}].map((x,i) => (
             <div key={i} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0 gap-4">
                <span className="text-slate-400 text-sm">{x.l}</span>
                <span className="text-white font-mono text-sm text-right">{x.v}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Dataset & Env */}
      <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
         <div>
            <h4 className="text-slate-300 font-bold mb-3 flex items-center gap-2"><Database size={16} /> Dataset</h4>
            <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Name</span> <span className="text-white">TinyImageNet</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Classes</span> <span className="text-white font-mono">200</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Resolution</span> <span className="text-white font-mono">64x64</span></div>
            </div>
         </div>
         <div>
            <h4 className="text-slate-300 font-bold mb-3 flex items-center gap-2"><Layers size={16} /> Augmentation</h4>
            <div className="flex flex-wrap gap-2">
                {["Random Crop", "Horizontal Flip", "Color Jitter", "Rotation (15°)", "Normalize"].map(tag => (
                    <span key={tag} className="px-2 py-1 bg-slate-800 rounded-md text-xs text-slate-400 border border-slate-700">{tag}</span>
                ))}
            </div>
         </div>
         <div>
            <h4 className="text-slate-300 font-bold mb-3 flex items-center gap-2"><Activity size={16} /> Environment</h4>
            <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Framework</span> <span className="text-white">PyTorch</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Accelerator</span> <span className="text-white">CUDA (NVIDIA)</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Precision</span> <span className="text-white">FP32</span></div>
            </div>
         </div>
      </div>
    </div>
  </div>
);

const TeamView = () => (
  <div className="p-4 md:p-8 max-w-4xl mx-auto text-center h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-8">
    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-8"><GraduationCap size={48} className="text-white" /></div>
    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">The Team</h2>
    <p className="text-slate-400 text-lg max-w-xl mx-auto mb-12">Deep Learning Final Project - Computer Science Department</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {TEAM_MEMBERS.map((member, i) => (
        <motion.div whileHover={{ y: -5 }} key={i} className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl hover:border-blue-500/50 transition-colors group shadow-xl relative overflow-hidden">
          <div className="w-24 h-24 bg-slate-950 rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-slate-800 border-dashed group-hover:border-blue-500 transition-all relative overflow-hidden">
             <img src={member.image} alt={member.name} className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
             <div className="flex flex-col items-center justify-center z-0 opacity-50"><User size={32} className="text-slate-500 mb-1" /><div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Photo</div></div>
          </div>
          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400">{member.name}</h3>
          <div className="text-sm text-slate-500 font-mono mb-3">{member.nim}</div>
          <div className="text-xs text-blue-500/80 uppercase tracking-widest font-bold bg-blue-500/10 py-1 px-3 rounded-full inline-block">{member.role}</div>
        </motion.div>
      ))}
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

function App() {
  const [activeTab, setActiveTab] = useState('inference');
  const [view, setView] = useState('landing'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [resetToken, setResetToken] = useState(null); // Store token for reset password
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    
    // Check if we are on the reset password page
    if (path === '/reset-password') {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      if (tokenParam) {
        setResetToken(tokenParam);
        setAuthMode('reset');
        setView('auth');
        setLoadingUser(false);
        return;
      }
    }

    if (path === '/verify') { setLoadingUser(false); return; }

    if (token) {
      fetch('/user/me', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(userData => { setUser(userData); setView('dashboard'); })
        .catch(() => { localStorage.removeItem('token'); setView('landing'); })
        .finally(() => setLoadingUser(false));
    } else { setView('landing'); setLoadingUser(false); }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null); setAuthSuccess(null);
    let url = '/auth/login'; let body; let headers = {};
    try {
      if (authMode === 'login') {
        const formDataBody = new URLSearchParams(); 
        formDataBody.append('username', formData.email); 
        formDataBody.append('password', formData.password); 
        body = formDataBody;
      } else if (authMode === 'register') {
        url = '/auth/register'; 
        headers = {'Content-Type': 'application/json'}; 
        body = JSON.stringify(formData);
      } else if (authMode === 'forgot') {
        url = '/auth/forgot-password'; 
        const formDataBody = new URLSearchParams(); 
        formDataBody.append('email', formData.email); 
        body = formDataBody;
      } else if (authMode === 'reset') {
        url = '/auth/reset-password';
        const formDataBody = new URLSearchParams();
        formDataBody.append('token', resetToken);
        formDataBody.append('new_password', formData.password);
        body = formDataBody;
      }

      const res = await fetch(url, { method: 'POST', headers, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      if (authMode === 'forgot') { 
        setAuthSuccess("If that email exists, we sent a password reset link."); 
      } else if (authMode === 'reset') {
        setAuthSuccess("Password updated successfully! Redirecting to login...");
        setTimeout(() => {
          setAuthMode('login');
          setAuthSuccess(null);
          setFormData({ ...formData, password: '' });
        }, 2000);
      } else if (authMode === 'register') { 
        setAuthSuccess("Account created! Please check your email to verify."); 
        localStorage.setItem('token', data.access_token); 
        setUser(data.user); 
        setTimeout(() => setView('dashboard'), 2000); 
      } else { 
        localStorage.setItem('token', data.access_token); 
        setUser(data.user); 
        setView('dashboard'); 
      }
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); setUser(null); setView('landing'); setActiveTab('inference'); };

  if (loadingUser) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  if (view === 'landing') return <LandingPage onLogin={() => { setAuthMode('login'); setView('auth'); }} onRegister={() => { setAuthMode('register'); setView('auth'); }} />;

  if (view === 'auth') {
    let title, subtitle;
    if (authMode === 'login') { title = 'Welcome Back'; subtitle = 'Enter credentials to access dashboard'; }
    else if (authMode === 'register') { title = 'Create Account'; subtitle = 'Join DeepDistill today'; }
    else if (authMode === 'forgot') { title = 'Reset Password'; subtitle = 'Enter email to receive reset link'; }
    else if (authMode === 'reset') { title = 'Set New Password'; subtitle = 'Enter your new password below'; }

    return (
      <AuthLayout title={title} subtitle={subtitle} onBack={authMode === 'reset' ? null : () => setView('landing')}>
        <form onSubmit={handleAuth}>
          {authMode === 'register' && <InputField icon={User} placeholder="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />}
          
          {/* Email field - Hidden for Reset Password mode */}
          {authMode !== 'reset' && (
            <InputField icon={Mail} type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          )}
          
          {/* Password field - Hidden for Forgot Password request mode */}
          {authMode !== 'forgot' && (
            <InputField icon={Lock} type="password" placeholder={authMode === 'reset' ? "New Password" : "Password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
          )}
          
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 mb-4 hover:scale-[1.02]">
            {authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Sign Up' : authMode === 'reset' ? 'Update Password' : 'Send Link'}
          </button>
          
          {authError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg text-sm text-center mb-4">{authError}</div>}
          {authSuccess && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-200 rounded-lg text-sm text-center mb-4">{authSuccess}</div>}
          
          <div className="flex justify-center gap-4 text-sm text-slate-400">
            {authMode === 'login' ? (
              <>
                <button type="button" onClick={() => {setAuthMode('register'); setAuthError(null);}} className="hover:text-white transition-colors">Create Account</button>
                <button type="button" onClick={() => {setAuthMode('forgot'); setAuthError(null);}} className="hover:text-white transition-colors">Forgot Password?</button>
              </>
            ) : authMode !== 'reset' ? (
              <button type="button" onClick={() => {setAuthMode('login'); setAuthError(null);}} className="hover:text-white transition-colors">Back to Login</button>
            ) : null}
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="md:pl-64 transition-all duration-300 min-h-screen flex flex-col">
        <header className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 text-slate-400 text-sm"><span className="opacity-50 hidden sm:inline">Dashboard</span><ChevronRight size={14} className="hidden sm:inline" /><span className="text-white font-bold capitalize text-lg md:text-base tracking-tight">{activeTab}</span></div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-sm text-right hidden sm:block"><div className="text-slate-400 text-xs">Welcome back</div><div className="text-white font-medium">{user?.full_name || 'User'}</div></div>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold ring-2 ring-slate-900">{user?.avatar_url ? <img src={user.avatar_url} alt="User" className="w-full h-full object-cover rounded-full" /> : <span>{user?.full_name?.charAt(0) || 'U'}</span>}</div>
          </div>
        </header>
        <div className="p-0 md:p-4 lg:p-6 flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'inference' && <motion.div key="inf" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><InferenceView user={user} /></motion.div>}
            {activeTab === 'analytics' && <motion.div key="ana" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><AnalyticsView /></motion.div>}
            {activeTab === 'history' && <motion.div key="hist" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><HistoryView /></motion.div>}
            {activeTab === 'profile' && <motion.div key="prof" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><ProfileView user={user} setUser={setUser} /></motion.div>}
            {activeTab === 'specs' && <motion.div key="spec" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><SpecsView /></motion.div>}
            {activeTab === 'team' && <motion.div key="team" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><TeamView /></motion.div>}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;