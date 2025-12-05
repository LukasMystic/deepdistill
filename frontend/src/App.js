import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Upload, Zap, Activity, AlertCircle, CheckCircle2, 
  Image as ImageIcon, BarChart3, LayoutDashboard, 
  History, Settings, ChevronRight, TrendingUp, Cpu,
  LineChart as LineChartIcon, Users, GraduationCap,
  ArrowRight, Database, LogOut, User, Lock, Mail, Camera, ShieldAlert, Key, Menu, X, Github, FileText, MonitorPlay
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

// --- API UTILS ---

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// --- DATA CONSTANTS ---

const TRAINING_DATA = [
  { epoch: 1, baseline_val: 23.16, distill_val: 20.78, baseline_train: 12.46, distill_train: 10.72 },
  { epoch: 2, baseline_val: 37.44, distill_val: 36.66, baseline_train: 28.91, distill_train: 27.00 },
  { epoch: 3, baseline_val: 44.98, distill_val: 48.18, baseline_train: 40.59, distill_train: 40.69 },
  { epoch: 4, baseline_val: 50.36, distill_val: 53.28, baseline_train: 48.89, distill_train: 50.68 },
  { epoch: 5, baseline_val: 53.08, distill_val: 56.40, baseline_train: 55.16, distill_train: 58.01 },
  { epoch: 6, baseline_val: 55.68, distill_val: 59.08, baseline_train: 61.13, distill_train: 64.62 },
  { epoch: 7, baseline_val: 55.80, distill_val: 60.50, baseline_train: 66.91, distill_train: 70.42 },
  { epoch: 8, baseline_val: 57.26, distill_val: 61.06, baseline_train: 72.32, distill_train: 75.42 },
  { epoch: 9, baseline_val: 56.12, distill_val: 60.52, baseline_train: 77.42, distill_train: 80.47 },
  { epoch: 10, baseline_val: 56.54, distill_val: 62.02, baseline_train: 82.22, distill_train: 84.51 },
  { epoch: 11, baseline_val: 56.68, distill_val: 62.02, baseline_train: 85.82, distill_train: 88.20 },
  { epoch: 12, baseline_val: 55.46, distill_val: 62.50, baseline_train: 87.90, distill_train: 90.49 },
  { epoch: 13, baseline_val: 56.86, distill_val: 62.54, baseline_train: 90.15, distill_train: 92.58 },
  { epoch: 14, baseline_val: 55.98, distill_val: 61.42, baseline_train: 91.60, distill_train: 94.09 },
  { epoch: 15, baseline_val: 56.48, distill_val: 62.32, baseline_train: 92.65, distill_train: 95.25 },
  { epoch: 16, baseline_val: 54.96, distill_val: 61.78, baseline_train: 93.55, distill_train: 96.07 },
  { epoch: 17, baseline_val: null, distill_val: 62.60, baseline_train: null, distill_train: 96.71 },
  { epoch: 18, baseline_val: null, distill_val: 62.30, baseline_train: null, distill_train: 97.27 },
  { epoch: 19, baseline_val: null, distill_val: 62.00, baseline_train: null, distill_train: 97.64 },
  { epoch: 20, baseline_val: null, distill_val: 62.98, baseline_train: null, distill_train: 98.00 },
];

const TEAM_MEMBERS = [
  { name: "Stanley Pratama Teguh", nim: "2702311566", role: "Full Stack Dev", image: "/stanley.jpg" },
  { name: "Owen Limantoro", nim: "2702262330", role: "Researcher", image: "/owen.jpg" },
  { name: "Gading Aditya Perdana", nim: "2702268725", role: "AI Engineer", image: "/gading.jpg" },
];

// --- ANIMATION VARIANTS ---

const fadeVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
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
      <button onClick={onBack} className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors">
        <ArrowRight className="rotate-180" size={20} />
      </button>
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
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain invert brightness-0 filter" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden xs:block">DeepDistill</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={onLogin} className="text-slate-400 hover:text-white font-medium transition-colors px-4 py-2">
              Login
            </button>
            <button onClick={onRegister} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-600/40 hover:-translate-y-0.5">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-slate-900 border-b border-slate-800 overflow-hidden"
            >
              <div className="p-6 space-y-4 flex flex-col">
                <button onClick={onLogin} className="w-full text-left text-slate-300 py-2">Login</button>
                <button onClick={onRegister} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Get Started</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-28 pb-10 overflow-hidden px-4 md:px-0">
        <motion.div style={{ y: y1 }} className="absolute top-20 right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-indigo-600/20 rounded-full blur-[80px] md:blur-[120px]" />
        <motion.div style={{ y: y2 }} className="absolute bottom-[-10%] left-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px]" />
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Zap size={12} className="fill-current" /> Next-Gen AI Optimization
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-500">
              Distill Knowledge. <br/> Amplify Speed.
            </h1>
            <p className="text-base md:text-lg text-slate-400 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Compare baseline heavyweight models against optimized student networks in real-time. 
              Unlock faster inference without sacrificing accuracy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button onClick={onRegister} className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-xl shadow-white/5 flex items-center justify-center gap-2">
                Start Experimenting <ArrowRight size={20} />
              </button>
              <button onClick={onLogin} className="px-8 py-4 rounded-2xl font-bold text-lg text-white border border-slate-800 hover:bg-slate-900 transition-colors flex items-center justify-center gap-2">
                View Demo
              </button>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden md:block"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl blur-2xl opacity-20 transform rotate-6" />
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="text-xs text-slate-500 font-mono">Live Comparison v2.4.0</div>
              </div>
              
              <div className="space-y-4">
                 <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400 text-sm">Baseline Model (B2)</span>
                      <span className="text-slate-500 text-xs">57.7% Acc</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: "57%" }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-slate-500" />
                    </div>
                 </div>
                 <div className="bg-blue-900/10 rounded-xl p-4 border border-blue-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-300 text-sm font-bold flex items-center gap-2"><Zap size={14}/> Distilled Model (B0)</span>
                      <span className="text-blue-400 text-xs font-mono">62.9% Acc</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: "63%" }} transition={{ duration: 1.5, delay: 0.7 }} className="h-full bg-blue-500" />
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900/50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Why DeepDistill?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Comprehensive tools to analyze and benchmark model performance.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Zap, title: "Live Inference", desc: "Upload images and get instant classification results." },
              { icon: LineChartIcon, title: "Deep Analytics", desc: "Visualize training epochs, accuracy curves, and loss metrics." },
              { icon: Database, title: "Cloud History", desc: "Securely store your experiment results in MongoDB Atlas." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-slate-950 border border-slate-800 p-6 md:p-8 rounded-3xl"
              >
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 text-blue-500">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Presentation Section */}
      <section className="py-20 bg-slate-950 relative border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              <GraduationCap size={12} /> College Final Project
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Project Presentation</h2>
            
            <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl aspect-[16/9] md:aspect-video flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-purple-900/10" />
                <div className="relative z-10 flex flex-col items-center p-6">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl">
                      <MonitorPlay size={40} className="text-slate-400 group-hover:text-blue-500 transition-colors ml-1" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Presentation Coming Soon</h3>
                    <p className="text-slate-400 font-medium max-w-md mx-auto mb-6">
                      The official defense presentation and slide deck for this final year project will be uploaded here shortly.
                    </p>
                    <div className="text-sm text-slate-600 font-mono border border-slate-800 rounded-lg px-4 py-2">
                        CS_FINAL_YEAR_PROJECT_2025.ppt
                    </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-30" />
            </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 relative overflow-hidden bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 text-center">
           <h2 className="text-3xl md:text-5xl font-bold mb-16">Meet the Minds</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {TEAM_MEMBERS.map((member, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="bg-slate-950 rounded-[22px] p-8 h-full border border-slate-800 relative group overflow-hidden hover:border-slate-700 transition-all"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  
                  {/* Team Photo Placeholder */}
                  <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-slate-900 border-2 border-slate-800 border-dashed flex items-center justify-center group-hover:border-blue-500/50 transition-all relative overflow-hidden">
                     {/* Image Layer - Hides on Error */}
                     <img 
                        src={member.image} 
                        alt={member.name}
                        className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                     />
                     
                     {/* Placeholder Layer */}
                     <div className="flex flex-col items-center justify-center z-0 opacity-50">
                        <User size={40} className="text-slate-400 mb-1" />
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Photo</div>
                     </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                  <p className="text-sm text-slate-500 font-mono mb-4">{member.nim}</p>
                  <span className="inline-block px-4 py-1.5 rounded-full bg-blue-900/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                    {member.role}
                  </span>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-2 opacity-50 justify-center md:justify-start">
             <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-4 h-4 object-contain invert brightness-0 filter" />
            </div>
            <span className="font-bold">DeepDistill</span>
          </div>
          <p className="text-slate-600 text-sm">© 2025 DeepDistill. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

// --- MAIN COMPONENTS (DASHBOARD) ---

const Sidebar = ({ activeTab, setActiveTab, user, onLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'inference', label: 'Live Inference', icon: Zap },
    { id: 'analytics', label: 'Training Analytics', icon: LineChartIcon },
    { id: 'history', label: 'Session History', icon: Database },
    { id: 'specs', label: 'Model Specs', icon: Cpu },
    { id: 'team', label: 'Project Team', icon: Users },
  ];

  return (
    <>
      {/* Sidebar Backdrop (Mobile) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <div className={`
        w-64 bg-slate-950 border-r border-slate-900 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
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
              onClick={() => { setActiveTab(item.id); onClose(); }}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                ${activeTab === item.id 
                  ? 'text-white shadow-md shadow-blue-900/10' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'}
              `}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="active-bg"
                  className="absolute inset-0 bg-blue-600 rounded-xl z-0"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon size={20} className={`z-10 relative ${activeTab === item.id ? 'text-white' : ''}`} />
              <span className="font-medium z-10 relative">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-900">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-900 transition-colors mb-2 ${activeTab === 'profile' ? 'bg-slate-900' : ''}`}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-9 h-9 rounded-full object-cover border border-slate-700" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <User size={16} />
              </div>
            )}
            <div className="text-left overflow-hidden">
              <div className="text-sm font-medium text-white truncate">{user?.full_name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium"
          >
            <LogOut size={16} /> Logout
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
      const res = await fetch('/user/avatar', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => ({ ...prev, avatar_url: data.avatar_url }));
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="max-w-2xl mx-auto py-8">
      <h2 className="text-3xl font-bold text-white mb-8">Profile Settings</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/20 to-transparent" />
        <div className="relative group cursor-pointer z-10" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-800 bg-slate-950 relative shadow-2xl">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <User size={48} />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-4 border-slate-900 group-hover:bg-blue-500 transition-colors">
            <Camera size={16} className="text-white" />
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarUpload} accept="image/*" />
        
        <h3 className="text-xl font-bold text-white mt-4 flex items-center gap-2">
          {user?.full_name} 
          {user?.is_verified && <CheckCircle2 size={16} className="text-blue-500" />}
        </h3>
        <p className="text-slate-400">{user?.email}</p>
        
        {!user?.is_verified && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3 text-yellow-200 text-sm max-w-sm">
            <ShieldAlert size={20} />
            <div>
              <p className="font-bold">Account Unverified</p>
              <p className="opacity-80">Verify your email within 24 hours.</p>
            </div>
          </div>
        )}
      </div>
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
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setPrediction(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      if (!res.ok) throw new Error("Inference failed");
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      setError("Failed to run inference. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500 py-4">
      <div className="mb-8 md:mb-10 text-center px-4">
        <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400 mb-3 tracking-tight">
          Visual Recognition Lab
        </h1>
        <p className="text-slate-400 text-sm md:text-lg">Comparing Student-Teacher Distillation Efficacy</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2 md:px-0">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <ImageIcon className="text-blue-500" size={20} /> Input Source
              </h2>
              {preview && <button onClick={() => {setFile(null); setPreview(null); setPrediction(null);}} className="text-xs text-red-400 hover:text-red-300">Reset</button>}
            </div>

            <label className={`relative flex flex-col items-center justify-center w-full h-64 md:h-72 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${preview ? 'border-slate-800 bg-slate-950' : 'border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/30'}`}>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-6">
                  <Upload className="mx-auto text-slate-400 mb-4" size={32} />
                  <p className="font-bold text-slate-300">Click to Upload</p>
                  <p className="text-xs text-slate-500 mt-2">JPEG, PNG supported</p>
                </div>
              )}
            </label>

            <button onClick={handleUpload} disabled={!file || loading} className={`w-full mt-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${!file ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : loading ? 'bg-blue-600/80 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
              {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Zap size={20} fill="currentColor" />}
              {loading ? 'Processing...' : 'Run Inference'}
            </button>
            {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-sm text-center">{error}</div>}
          </div>
        </div>

        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!prediction ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full min-h-[300px] md:min-h-[400px] bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
                <BarChart3 size={64} className="mb-6 opacity-20" />
                <p className="text-lg font-medium">Ready for Analysis</p>
                <p className="text-sm opacity-60">Upload an image to compare models</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResultCard title="Baseline B0" data={prediction.baseline} type="baseline" isWinner={prediction.baseline[0].probability > prediction.distilled[0].probability} />
                <ResultCard title="Distilled B0" data={prediction.distilled} type="distilled" isWinner={prediction.distilled[0].probability > prediction.baseline[0].probability} />
                
                <div className="md:col-span-2 bg-slate-900/80 rounded-2xl p-6 border border-slate-800 mt-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Activity size={16} className="text-blue-500" /> AI Analysis
                  </h4>
                  <div className="text-sm text-slate-300 leading-relaxed">
                    {prediction.distilled[0].class_id === prediction.baseline[0].class_id ? (
                        <p>Both models agree on <strong className="text-white bg-slate-800 px-2 py-0.5 rounded">{prediction.distilled[0].class_name}</strong>. The Distilled model is <strong className="text-blue-400">{Math.abs(prediction.distilled[0].probability - prediction.baseline[0].probability).toFixed(1)}%</strong> {prediction.distilled[0].probability > prediction.baseline[0].probability ? 'more' : 'less'} confident.</p>
                    ) : (
                        <p>Models disagree! Distilled predicts <strong className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{prediction.distilled[0].class_name}</strong> while Baseline sees <strong className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{prediction.baseline[0].class_name}</strong>.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ResultCard = ({ title, data, type, isWinner }) => {
  const isDistilled = type === 'distilled';
  const baseColor = isDistilled ? 'blue' : 'slate';
  const borderColor = isDistilled ? 'border-blue-500' : 'border-slate-700';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-slate-900/80 p-5 shadow-2xl ${isWinner ? 'ring-1 ring-green-500/30' : ''}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${baseColor}-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none`} />
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className={`text-${baseColor}-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2`}>
            {type === 'baseline' ? <Activity size={12}/> : <Zap size={12}/>} {title}
          </div>
          <div className="text-xl md:text-2xl font-bold text-white truncate max-w-[150px] md:max-w-[200px]" title={data[0].class_name}>{data[0].class_name}</div>
        </div>
        <div className={`px-2 py-1 rounded-lg text-[10px] font-mono border uppercase tracking-wide ${isDistilled ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          {isDistilled ? 'Student' : 'Baseline'}
        </div>
      </div>
      <div className="space-y-2">
        {data.slice(0, 3).map((pred, i) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between text-xs mb-1 font-medium text-slate-400"><span>{pred.class_name}</span><span>{pred.probability}%</span></div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pred.probability}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className={`h-full ${isDistilled ? 'bg-blue-500' : 'bg-slate-500'} rounded-full`} />
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
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="flex justify-center p-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3"><Database className="text-blue-500" /> Session History</h2>
          <p className="text-slate-400">Records saved to MongoDB Atlas</p>
        </div>
        <span className="hidden md:block bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-400 font-mono text-sm">{history.length} Records</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.length === 0 ? (
          <div className="text-center p-12 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 text-slate-500">
            No history found. Run some inferences first!
          </div>
        ) : history.map((item) => (
          <div key={item.id} className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row gap-6 items-center hover:bg-slate-900 transition-colors">
            <img src={item.image_url || "https://via.placeholder.com/150?text=No+Image"} alt="History" className="w-full md:w-24 h-48 md:h-24 object-cover rounded-xl bg-slate-950 border border-slate-800" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Baseline</div>
                <div className="text-slate-300 font-bold text-lg">{item.result.baseline[0].class_name}</div>
                <div className="text-slate-500 text-xs">{item.result.baseline[0].probability}%</div>
              </div>
              <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-500/10">
                <div className="text-[10px] text-blue-400 uppercase font-bold mb-1">Distilled</div>
                <div className="text-blue-100 font-bold text-lg">{item.result.distilled[0].class_name}</div>
                <div className="text-blue-400 text-xs">{item.result.distilled[0].probability}%</div>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 w-full md:w-auto text-center">{item.timestamp}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsView = () => (
  <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: "Best Top-1 Acc (Distilled)", value: "62.97%", change: "+5.25%", positive: true },
        { label: "Best Top-1 Acc (Baseline)", value: "57.72%", change: "Reference", positive: false },
        { label: "Inference Time", value: "~12ms", change: "+0.8ms", positive: false },
        { label: "Model Size", value: "4.1M Params", change: "Identical", positive: true },
      ].map((stat, i) => (
        <div key={i} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="text-slate-400 text-xs uppercase font-bold mb-1 tracking-wider">{stat.label}</div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-2">
            {stat.value}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.positive ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>{stat.change}</span>
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl h-[300px]">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500"/> Val Accuracy</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TRAINING_DATA}>
            <defs>
              <linearGradient id="colorDistill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="epoch" stroke="#64748b" axisLine={false} tickLine={false} />
            <YAxis stroke="#64748b" domain={[0, 80]} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }} />
            <Area type="monotone" dataKey="distill_val" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDistill)" />
            <Area type="monotone" dataKey="baseline_val" stroke="#64748b" strokeWidth={2} fillOpacity={0} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl h-[300px]">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Activity size={20} className="text-purple-500"/> Training Accuracy</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={TRAINING_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="epoch" stroke="#64748b" axisLine={false} tickLine={false} />
            <YAxis stroke="#64748b" domain={[0, 100]} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }} />
            <Line type="monotone" dataKey="distill_train" stroke="#60a5fa" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="baseline_train" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const SpecsView = () => (
  <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
    <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3"><Cpu className="text-blue-500" /> Training Specifications</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
        <h3 className="text-blue-400 font-bold mb-6 flex items-center gap-2 text-lg"><Settings size={20} /> Distillation Config</h3>
        <div className="space-y-5">
          {[{ label: "Teacher", value: "EfficientNet-B2" }, { label: "Student", value: "EfficientNet-B0" }, { label: "Temperature", value: "4.0" }, { label: "Alpha", value: "0.7" }].map((item, i) => (
            <div key={i} className="flex justify-between border-b border-slate-800 pb-3 last:border-0"><span className="text-slate-400">{item.label}</span><span className="text-white font-mono font-bold">{item.value}</span></div>
          ))}
        </div>
      </div>
      <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
        <h3 className="text-green-400 font-bold mb-6 flex items-center gap-2 text-lg"><Activity size={20} /> Hyperparameters</h3>
        <div className="space-y-5">
          {[{ label: "Optimizer", value: "AdamW" }, { label: "Learning Rate", value: "1e-3" }, { label: "Scheduler", value: "Cosine" }, { label: "Epochs", value: "50" }].map((item, i) => (
            <div key={i} className="flex justify-between border-b border-slate-800 pb-3 last:border-0"><span className="text-slate-400">{item.label}</span><span className="text-white font-mono font-bold bg-slate-950 px-2 py-1 rounded">{item.value}</span></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TeamView = () => (
  <div className="p-4 md:p-8 max-w-4xl mx-auto text-center h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4">
    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-8"><GraduationCap size={48} className="text-white" /></div>
    <h2 className="text-5xl font-bold text-white mb-4">The Team</h2>
    <p className="text-slate-400 text-xl max-w-xl mx-auto mb-12">Deep Learning Final Project - Computer Science Department</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {TEAM_MEMBERS.map((member, i) => (
        <div key={i} className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl hover:border-blue-500/50 transition-colors group shadow-xl relative overflow-hidden">
          <div className="w-24 h-24 bg-slate-950 rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-slate-800 border-dashed group-hover:border-blue-500 transition-all relative overflow-hidden">
             {/* Image Layer - Hides on Error */}
             <img 
                src={member.image} 
                alt={member.name}
                className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
             />
             
             {/* Placeholder Layer */}
             <div className="flex flex-col items-center justify-center z-0 opacity-50">
                <User size={32} className="text-slate-500 mb-1" />
                <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Photo</div>
             </div>
          </div>
          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400">{member.name}</h3>
          <div className="text-sm text-slate-500 font-mono mb-3">{member.nim}</div>
          <div className="text-xs text-blue-500/80 uppercase tracking-widest font-bold bg-blue-500/10 py-1 px-3 rounded-full inline-block">{member.role}</div>
        </div>
      ))}
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

function App() {
  const [activeTab, setActiveTab] = useState('inference');
  const [view, setView] = useState('landing'); // landing, auth, dashboard
  const [authMode, setAuthMode] = useState('login'); // login, register, forgot
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar state moved to App level
  
  // Auth Form State
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;

    // Check for special routes that don't need user check immediately or need to handle logic differently
    if (path === '/verify' || path === '/reset-password') {
       setLoadingUser(false);
       return;
    }

    if (token) {
      fetch('/user/me', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(userData => {
          setUser(userData);
          setView('dashboard');
        })
        .catch(() => {
          localStorage.removeItem('token');
          setView('landing');
        })
        .finally(() => setLoadingUser(false));
    } else {
      setView('landing');
      setLoadingUser(false);
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    let url = '/auth/login';
    let body; 
    let headers = {};
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
      } else {
        url = '/auth/forgot-password';
        const formDataBody = new URLSearchParams();
        formDataBody.append('email', formData.email);
        body = formDataBody;
      }
      const res = await fetch(url, { method: 'POST', headers, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      if (authMode === 'forgot') {
        setAuthSuccess("If that email exists, we sent a password reset link.");
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

  const handleLogout = () => { 
    localStorage.removeItem('token'); 
    setUser(null); 
    setView('landing'); 
    setActiveTab('inference');
  };

  // --- RENDER LOGIC ---

  if (loadingUser) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  if (view === 'landing') {
    return (
      <LandingPage 
        onLogin={() => { setAuthMode('login'); setView('auth'); }} 
        onRegister={() => { setAuthMode('register'); setView('auth'); }} 
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthLayout 
        title={authMode === 'login' ? 'Welcome Back' : authMode === 'register' ? 'Create Account' : 'Reset Password'} 
        subtitle={authMode === 'login' ? 'Enter credentials to access dashboard' : authMode === 'register' ? 'Join DeepDistill today' : 'Enter email to receive reset link'}
        onBack={() => setView('landing')}
      >
        <form onSubmit={handleAuth}>
          {authMode === 'register' && <InputField icon={User} placeholder="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />}
          <InputField icon={Mail} type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          {authMode !== 'forgot' && <InputField icon={Lock} type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />}
          
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 mb-4 hover:scale-[1.02]">
            {authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Sign Up' : 'Send Link'}
          </button>
          
          {authError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg text-sm text-center mb-4">{authError}</div>}
          {authSuccess && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-200 rounded-lg text-sm text-center mb-4">{authSuccess}</div>}
          
          <div className="flex justify-center gap-4 text-sm text-slate-400">
            {authMode === 'login' ? (
              <>
                <button type="button" onClick={() => {setAuthMode('register'); setAuthError(null);}} className="hover:text-white transition-colors">Create Account</button>
                <button type="button" onClick={() => {setAuthMode('forgot'); setAuthError(null);}} className="hover:text-white transition-colors">Forgot Password?</button>
              </>
            ) : (
              <button type="button" onClick={() => {setAuthMode('login'); setAuthError(null);}} className="hover:text-white transition-colors">Back to Login</button>
            )}
          </div>
        </form>
      </AuthLayout>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="md:pl-64 transition-all duration-300 min-h-screen flex flex-col">
        {/* Dashboard Header - Optimized for Mobile */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
             {/* Mobile Menu Button - Integrated directly into header */}
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
             >
                <Menu size={24} />
             </button>

             {/* Breadcrumbs */}
             <div className="flex items-center gap-2 text-slate-400 text-sm">
                <span className="opacity-50 hidden sm:inline">Dashboard</span>
                <ChevronRight size={14} className="hidden sm:inline" />
                <span className="text-white font-bold capitalize text-lg md:text-base tracking-tight">{activeTab}</span>
             </div>
          </div>

          {/* User Info - Compact on mobile */}
          <div className="flex items-center gap-3">
             <div className="text-sm text-right hidden sm:block">
                 <div className="text-slate-400 text-xs">Welcome back</div>
                 <div className="text-white font-medium">{user?.full_name || 'User'}</div>
             </div>
             
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold ring-2 ring-slate-900">
                {user?.avatar_url ? (
                   <img src={user.avatar_url} alt="User" className="w-full h-full object-cover rounded-full" />
                ) : (
                   <span>{user?.full_name?.charAt(0) || 'U'}</span>
                )}
             </div>
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