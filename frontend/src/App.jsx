import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AlertCircle, CheckCircle, ShieldAlert, Activity, User, LogOut, ChevronRight, Moon, Sun, Lock, Phone, MapPin, Building, Building2, Landmark, Check, Stethoscope, HeartPulse, SquareActivity, Bed, Syringe } from 'lucide-react';
import api from './api';
import './index.css';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [jwt, setJwt] = useState(() => localStorage.getItem('jwt') || null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleAuthChange = () => {
      setJwt(localStorage.getItem('jwt') || null);
    };
    const handleJwtExpired = () => {
      setJwt(null);
      toast.error('Session expired. Please sign in again.');
    };
    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('jwt_expired', handleJwtExpired);
    return () => {
      window.removeEventListener('auth_changed', handleAuthChange);
      window.removeEventListener('jwt_expired', handleJwtExpired);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setJwt(null);
    window.dispatchEvent(new Event('auth_changed'));
    toast.success('Logged out successfully');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <Router>
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <img src="/favicon.ico" alt="Omnibridge Logo" width="32" height="32" style={{ borderRadius: '40px', objectFit: 'cover' }} />
          Omnibridge
        </Link>
        <div className="nav-links">
          <Link to="/" className="nav-btn">Report Incident</Link>
          {jwt ? (
            <button 
              onClick={handleLogout} 
              className="nav-btn sign-in-btn" 
              style={{ cursor: 'pointer', background: 'transparent' }}
            >
              Logout
              <LogOut size={18} />
            </button>
          ) : (
            <Link to="/auth" className="nav-btn sign-in-btn">
              Sign In/Up
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.3163 19.4384C5.92462 18.0052 7.34492 17 9 17H15C16.6551 17 18.0754 18.0052 18.6837 19.4384M16 9.5C16 11.7091 14.2091 13.5 12 13.5C9.79086 13.5 8 11.7091 8 9.5C8 7.29086 9.79086 5.5 12 5.5C14.2091 5.5 16 7.29086 16 9.5ZM22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          )}
        </div>
      </nav>

      <main className="main-content">
        <div className="container w-full">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<PublicPortal />} />
              <Route path="/auth" element={<SignInSignUp jwt={jwt} setJwt={setJwt} />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>

      <button className="theme-toggle floating-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
      </button>
      
      <ToastContainer position="bottom-right" theme={theme} />
    </Router>
  );
}

function PublicPortal() {
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  
  // Incident Form State
  const [type, setType] = useState('OTHER');
  const [severity, setSeverity] = useState('LOW');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Premium Mock Venues fallback (Hospital specific)
    const fallbackVenues = [
      { slug: 'er-ward', name: 'Emergency Room', type: 'emergency' },
      { slug: 'icu-ward', name: 'Intensive Care Unit (ICU)', type: 'icu' },
      { slug: 'maternity-ward', name: 'Maternity Ward', type: 'maternity' },
      { slug: 'outpatient-clinic', name: 'Outpatient Clinic', type: 'clinic' },
      { slug: 'surgery-wing', name: 'Surgery Wing', type: 'surgery' },
      { slug: 'pediatrics-ward', name: 'Pediatrics', type: 'pediatrics' },
      { slug: 'other-ward', name: 'Other', type: 'other' }
    ];

    // Always use these hospital venues for the UI demo instead of waiting for the API
    setVenues(fallbackVenues);
  }, []);

  const getVenueIcon = (type, slug) => {
    if (slug.includes('er') || type === 'emergency') return <Activity size={24} className="opacity-70 group-hover:text-primary transition-colors" />;
    if (slug.includes('icu') || type === 'icu') return <HeartPulse size={24} className="opacity-70 group-hover:text-primary transition-colors" />;
    if (slug.includes('clinic') || type === 'clinic') return <Stethoscope size={24} className="opacity-70 group-hover:text-primary transition-colors" />;
    if (slug.includes('surgery') || type === 'surgery') return <Syringe size={24} className="opacity-70 group-hover:text-primary transition-colors" />;
    if (slug.includes('ward') || type === 'maternity' || type === 'pediatrics') return <Bed size={24} className="opacity-70 group-hover:text-primary transition-colors" />;
    return <Building size={24} className="opacity-70 group-hover:text-primary transition-colors" />;
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!selectedVenue || !description || !location) {
      toast.warning('Please fill in all required fields.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post(`/report/${selectedVenue}`, { 
        type, severity, location, description,
        reporterName: reporterName || undefined,
        reporterPhone: reporterPhone || undefined
      });
      
      toast.success('Report submitted successfully! Authorities have been notified.');
      setDescription('');
      setLocation('');
      setReporterName('');
      setReporterPhone('');
      setSelectedVenue('');
      setType('OTHER');
      setSeverity('LOW');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="card mx-auto" 
      style={{ maxWidth: '700px' }}
    >
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        Public Incident Report
      </h2>
      
      <form onSubmit={submitReport} className="space-y-6">
        <div className="form-group">
          <label className="text-lg font-bold mb-3 flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            Select Venue *
          </label>
          <div className="venue-grid">
            {venues.map(v => (
              <div 
                key={v.slug} 
                className={`venue-card group ${selectedVenue === v.slug ? 'selected' : ''}`}
                onClick={() => setSelectedVenue(v.slug)}
              >
                <div className="venue-icon">
                  {getVenueIcon(v.type, v.slug)}
                </div>
                <div className="venue-info">
                  <span className="venue-name">{v.name}</span>
                </div>
                {selectedVenue === v.slug && (
                  <div className="venue-check">
                    <Check size={16} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {venues.length === 0 && (
            <p className="text-gray-400 text-sm mt-2">Loading venues...</p>
          )}
        </div>

        <div className="row mt-6">
          <div className="form-group">
            <label className="text-sm font-semibold mb-2">Incident Type *</label>
            <div className="flex flex-wrap gap-2">
              {['MEDICAL', 'FIRE', 'SECURITY', 'FACILITY', 'OTHER'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`pill-btn ${type === t ? 'selected' : ''}`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="text-sm font-semibold mb-2">Severity *</label>
            <div className="flex flex-wrap gap-2">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`pill-btn severity-${s} ${severity === s ? 'selected' : ''}`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Specific Location (e.g. Floor 2, Room 204) *</label>
          <input 
            type="text" 
            placeholder="Where exactly did this happen?" 
            value={location} 
            onChange={e => setLocation(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea 
            rows="4" 
            placeholder="Provide details about the incident..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="row">
          <div className="form-group">
            <label>Your Name (Optional)</label>
            <input type="text" placeholder="Name" value={reporterName} onChange={e => setReporterName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Your Phone (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. 1234567890" 
              value={reporterPhone} 
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setReporterPhone(val);
              }} 
            />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </motion.section>
  );
}

function SignInSignUp({ jwt: propJwt, setJwt: propSetJwt }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'magic'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const jwt = propJwt !== undefined ? propJwt : (localStorage.getItem('jwt') || null);
  const setJwt = propSetJwt || (() => {});
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (jwt) {
      fetchIncidents();
    }
  }, [jwt]);

  const sendMagicLink = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await api.post(`/ott/sent?email=${encodeURIComponent(email)}`);
      toast.success('Magic link sent to your email!');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to send magic link';
      toast.error(typeof msg === 'string' ? msg : 'Failed to send magic link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    if (isSignUp) {
        toast.info('Sign up action triggered! (Mock implementation)');
    } else {
        setIsSubmitting(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            const token = res.data.accessToken;
            localStorage.setItem('jwt', token);
            setJwt(token);
            window.dispatchEvent(new Event('auth_changed'));
            toast.success('Logged in successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid email or password.');
        } finally {
            setIsSubmitting(false);
        }
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    setJwt(null);
    setIncidents([]);
    window.dispatchEvent(new Event('auth_changed'));
    toast.success('Logged out successfully');
  };

  const fetchIncidents = async () => {
    try {
      const res = await api.get('/staff/incidents');
      setIncidents(res.data);
    } catch (err) {
      // 401/403 is handled by interceptor
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Failed to fetch incidents');
      }
    }
  };

  const updateIncidentStatus = async (id, status) => {
    try {
      await api.post(`/staff/incidents/${id}/status`, { status });
      toast.success(`Incident marked as ${status}`);
      fetchIncidents();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getSeverityClass = (sev) => {
    switch(sev) {
      case 'LOW': return 'badge-low';
      case 'MEDIUM': return 'badge-medium';
      case 'HIGH': return 'badge-high';
      case 'CRITICAL': return 'badge-critical';
      default: return 'badge-low';
    }
  };

  if (jwt) {
    return (
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card mx-auto" style={{ maxWidth: '900px' }}
      >
        <div>
          <div className="flex justify-between items-center mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
            <span className="flex items-center gap-2 text-primary font-semibold">
              <User size={20} />
              Staff Dashboard
            </span>
            <div className="flex gap-3">
              <button onClick={() => fetchIncidents()} className="btn-outline text-sm py-2 px-4">
                Refresh
              </button>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-4">Active Incidents Dashboard</h3>
          
          {incidents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/10">
              <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-green-500" />
              <p>No open incidents currently assigned to your venue.</p>
              <p className="text-sm mt-2 opacity-60">Everything is clear!</p>
            </div>
          ) : (
            <ul className="grid gap-4 mt-4">
              <AnimatePresence>
                {incidents.map(inc => (
                  <motion.li 
                    key={inc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="incident-item group"
                  >
                    <div className="incident-header">
                      <span className="font-bold text-lg">{inc.type}</span>
                      <span className={`incident-badge ${getSeverityClass(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </div>
                    <div className="incident-desc text-gray-300">{inc.description}</div>
                    <div className="incident-meta flex flex-wrap gap-4 text-sm mt-3 opacity-80">
                      <span>📍 {inc.location}</span>
                      <span>⏱ {new Date(inc.createdAt).toLocaleString()}</span>
                      <span className="text-primary font-semibold ml-auto flex items-center gap-1">
                        <Activity size={14} /> Status: {inc.status}
                      </span>
                    </div>
                    
                    <div className="incident-actions flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
                      {inc.status === 'REPORTED' && (
                        <button onClick={() => updateIncidentStatus(inc.id, 'ACKNOWLEDGED')} className="btn-primary text-sm py-2 px-4 flex-1">
                          Acknowledge
                        </button>
                      )}
                      {inc.status === 'ACKNOWLEDGED' && (
                        <button onClick={() => updateIncidentStatus(inc.id, 'RESPONDING')} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-semibold rounded-lg py-2 px-4 flex-1 transition-colors">
                          Mark Responding
                        </button>
                      )}
                      {inc.status === 'RESPONDING' && (
                        <button onClick={() => updateIncidentStatus(inc.id, 'RESOLVED')} className="bg-green-500/20 text-green-400 hover:bg-green-500/30 font-semibold rounded-lg py-2 px-4 flex-1 transition-colors">
                          Mark Resolved
                        </button>
                      )}
                      {inc.status === 'RESOLVED' && (
                        <button onClick={() => updateIncidentStatus(inc.id, 'CLOSED')} className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 font-semibold rounded-lg py-2 px-4 flex-1 transition-colors">
                          Close Incident
                        </button>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="staff-auth-box card"
    >
      <h2 className="auth-header-title">{isSignUp ? 'Create Account' : 'Staff Portal'}</h2>
      
      {!isSignUp && (
        <div className="auth-tabs">
          <div 
            className={`auth-tab ${loginMethod === 'password' ? 'active' : ''}`}
            onClick={() => setLoginMethod('password')}
          >
            <User size={16} /> Password Login
          </div>
          <div 
            className={`auth-tab ${loginMethod === 'magic' ? 'active' : ''}`}
            onClick={() => setLoginMethod('magic')}
          >
            <ShieldAlert size={16} /> Magic Link
          </div>
        </div>
      )}

      {isSignUp ? (
        <form onSubmit={handleAction} className="space-y-4">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="text" placeholder="10 digit mobile number" value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-accent w-full mt-2">Sign Up</button>
        </form>
      ) : (
        loginMethod === 'password' ? (
          <form onSubmit={handleAction} className="space-y-4">
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="e.g. rg2822045@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="e.g. dummy" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-accent w-full mt-2">
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <div className="form-group">
              <label>Staff Email Address</label>
              <input type="email" placeholder="Enter your registered email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-accent w-full mt-2">
              {isSubmitting ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )
      )}



      <div className="auth-footer text-center mt-6 text-sm opacity-80">
        {isSignUp ? (
          <span>Already have an account? <a onClick={() => setIsSignUp(false)} className="text-primary hover:underline cursor-pointer font-semibold">Sign In</a></span>
        ) : (
          <span>Don't have an account? <a onClick={() => setIsSignUp(true)} className="text-primary hover:underline cursor-pointer font-semibold">Sign Up</a></span>
        )}
      </div>
    </motion.div>
  );
}

export default App;
