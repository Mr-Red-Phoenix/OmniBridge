import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Phone,
  Mail,
  User,
  KeyRound,
  Lock,
  Building,
  CheckCircle2,
  Send,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'react-toastify';
import authApi from '../api/authApi';
import venueApi from '../api/venueApi';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithJwtResponse, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/staff');
    }
  }, [isAuthenticated, navigate]);

  // Auth Modes: 'magic' | 'otp' | 'register'
  const [authMode, setAuthMode] = useState('magic');

  // Unified 2FA State for Sign In
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('0000000000');
  const [authOtp, setAuthOtp] = useState('');
  const [activeStep, setActiveStep] = useState(1); // 1: OTP, 2: Magic Link
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [dispatchingMagic, setDispatchingMagic] = useState(false);

  // Listen for storage events (e.g., if user clicked the magic link in terminal which opened in another tab/window)
  const navigatedRef = useRef(false);
  useEffect(() => {
    const handleAuthUpdated = () => {
      if (navigatedRef.current) return;
      const token = localStorage.getItem('jwt');
      if (token) {
        navigatedRef.current = true;
        toast.success('Authenticated from Magic Link!', { toastId: 'magic-link-auth' });
        navigate('/staff');
      }
    };
    window.addEventListener('storage', handleAuthUpdated);
    window.addEventListener('auth_changed', handleAuthUpdated);
    return () => {
      window.removeEventListener('storage', handleAuthUpdated);
      window.removeEventListener('auth_changed', handleAuthUpdated);
    };
  }, [navigate]);

  // Step 1: Send OTP
  const handleSendLoginOtp = async (e) => {
    e?.preventDefault();
    if (!authEmail.trim()) {
      toast.warning('Please enter your staff email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authEmail.trim())) {
      toast.error('Please enter a valid, complete email address (e.g. admin@omnibridge.org).');
      return;
    }
    setRequestingOtp(true);
    try {
      await authApi.sendOtp({
        email: authEmail.trim().toLowerCase(),
        phone: (authPhone && authPhone.length === 10) ? authPhone : '0000000000',
      });
      setOtpSent(true);
      toast.success('Verification code dispatched to your registered address.', { toastId: 'otp-sent' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch verification code', {
        toastId: 'otp-error',
      });
    } finally {
      setRequestingOtp(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyLoginOtp = async (e) => {
    e?.preventDefault();
    if (!authOtp.trim() || authOtp.trim().length !== 6) {
      toast.warning('Please enter the 6-digit verification code.');
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await authApi.verifyOtp({
        email: authEmail.trim().toLowerCase(),
        phone: (authPhone && authPhone.length === 10) ? authPhone : '0000000000',
        otp: authOtp.trim(),
      });

      if (res.data?.success || res.data?.verified) {
        setOtpVerified(true);
        setActiveStep(2);
        toast.success('Passcode verified! Dispatching Magic Link...');
        try {
          await authApi.sendMagicLink(authEmail.trim().toLowerCase());
          toast.info('Secure Magic Link dispatched to your email.');
        } catch {
          // ignore error if link already dispatched
        }
      } else {
        toast.error('Invalid OTP passcode. Please try again.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Dispatch / Re-dispatch Magic Link
  const handleRequestMagicLink = async () => {
    if (!authEmail.trim()) return;
    setDispatchingMagic(true);
    try {
      await authApi.sendMagicLink(authEmail.trim().toLowerCase());
      toast.success('Secure Magic Link re-sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch magic link');
    } finally {
      setDispatchingMagic(false);
    }
  };

  // Registration State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regVenueSlug, setRegVenueSlug] = useState('metro-general-hospital');
  const [regRole, setRegRole] = useState('STAFF');
  const [regAdminKey, setRegAdminKey] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [venues, setVenues] = useState([]);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    venueApi.getVenues().then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setVenues(res.data);
        setRegVenueSlug(res.data[0].slug);
      }
    }).catch(() => {});
  }, []);

  // Handle URL token if user clicked a link
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      handleVerifyOttToken(urlToken);
    }
  }, [searchParams]);

  const verifyingTokenRef = useRef(false);
  const handleVerifyOttToken = async (token) => {
    if (verifyingTokenRef.current) return;
    verifyingTokenRef.current = true;
    try {
      const res = await authApi.loginWithOtt(token);
      loginWithJwtResponse(res.data);
      toast.success('Magic link verified! Welcome to Command.', { toastId: 'magic-link-auth' });
      navigate('/staff');
    } catch (err) {
      verifyingTokenRef.current = false;
      toast.error(err.response?.data?.message || 'Invalid or expired magic link token.', {
        toastId: 'magic-link-error',
      });
    }
  };

  // Magic Link handler
  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    if (!magicEmail.trim()) return;
    setSendingMagic(true);
    try {
      await authApi.sendMagicLink(magicEmail.trim());
      toast.success('Magic link sent! Check your email inbox or paste the token below.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch magic link');
    } finally {
      setSendingMagic(false);
    }
  };

  // Send Phone OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!otpPhone.trim() || !otpEmail.trim()) return;
    setOtpSending(true);
    try {
      await authApi.sendOtp({
        phone: otpPhone.trim(),
        email: otpEmail.trim(),
      });
      setOtpSent(true);
      toast.success('6-digit passcode sent to your phone!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length !== 6) {
      toast.warning('Please enter the 6-digit OTP passcode.');
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await authApi.verifyOtp({
        phone: otpPhone.trim(),
        email: otpEmail.trim(),
        otp: otpCode.trim(),
      });

      if (res.data?.success || res.data?.verified) {
        toast.success('Phone 2FA verified successfully!');
        // Now requesting magic link login or me verification
        await handleVerifyOttToken(otpCode);
      } else {
        toast.error('Invalid OTP passcode');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Send Registration OTP
  const handleSendRegOtp = async () => {
    if (!regEmail.trim() || !regPhone.trim()) {
      toast.warning('Enter your email and phone first to request OTP.');
      return;
    }
    try {
      await authApi.sendRegistrationOtp({
        email: regEmail.trim(),
        phone: regPhone.trim(),
      });
      setRegOtpSent(true);
      toast.success('Registration OTP dispatched to your email & phone!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send registration OTP');
    }
  };

  // Complete Staff Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regOtp.trim() || regOtp.length !== 6) {
      toast.warning('Please provide the 6-digit verification OTP.');
      return;
    }
    setRegistering(true);
    try {
      const payload = {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        venueSlug: regVenueSlug,
        role: regRole,
        adminKey: regRole === 'ADMIN' ? regAdminKey.trim() : undefined,
        otp: regOtp.trim(),
      };
      const res = await authApi.register(payload);
      if (res.data?.accessToken) {
        loginWithJwtResponse(res.data);
        toast.success('Staff account registered successfully!');
        navigate('/staff');
      } else {
        toast.success(
          res.data?.message ||
            'Registration submitted successfully! Your account is pending Administrator approval. You will receive access once approved by your facility Admin.',
          { autoClose: 9000 }
        );
        // Reset registration fields and switch to login tab
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegOtp('');
        setRegOtpSent(false);
        setMode('login');
        setAuthEmail(payload.email);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/40 dark:shadow-none relative"
      >
        {/* Brand Icon Header (exact same icon as navbar and favicon) */}
        <div className="flex justify-center mb-6">
          <img
            src="/omnibridge-logo.png"
            alt="OmniBridge"
            className="w-12 h-12 object-contain"
          />
        </div>

        {/* Heading & Subtitle */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight">
            {authMode === 'register' ? 'Create Staff Account' : 'Sign in to OmniBridge'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-normal">
            {authMode === 'register'
              ? 'Join as a verified clinical staff member'
              : 'Secure Multi-Factor Staff Authentication'}
          </p>
        </div>

        {/* 2 Step Blocks: OTP & Magic Link (refined modern pill cards) */}
        {authMode !== 'register' && (
          <div className="grid grid-cols-2 gap-3 mb-6 p-1.5 bg-slate-100/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`p-3 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                activeStep === 1
                  ? 'bg-white dark:bg-slate-900 border border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-sm'
                  : otpVerified
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-transparent'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                {otpVerified ? (
                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                    activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    1
                  </span>
                )}
                <span className="text-xs font-bold tracking-tight">OTP Passcode</span>
              </div>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1 pl-7 font-medium">
                {otpVerified ? 'Verified' : otpSent ? 'Code Dispatched' : 'Email / SMS OTP'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                if (otpVerified) setActiveStep(2);
                else toast.info('Please verify OTP first');
              }}
              className={`p-3 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                activeStep === 2
                  ? 'bg-white dark:bg-slate-900 border border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                  activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  2
                </span>
                <span className="text-xs font-bold tracking-tight">Magic Link</span>
              </div>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1 pl-7 font-medium">
                {otpVerified ? 'Active & Sent' : 'Locked (Pending 1)'}
              </p>
            </button>
          </div>
        )}

        {/* Auth Mode: 2FA Sign In Flow */}
        {authMode !== 'register' && (
          <div className="space-y-4">
            {/* Step 1 Form: Email & Pop-up OTP under Email */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Staff Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. admin@omnibridge.org"
                    value={authEmail}
                    onChange={(e) => {
                      setAuthEmail(e.target.value);
                      if (otpSent) setOtpSent(false);
                    }}
                    disabled={otpVerified}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                    required
                  />
                </div>

                {/* Pop-up OTP Option under Email after clicking Send */}
                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Lock size={13} className="text-blue-600" /> Enter 6-Digit Passcode
                      </label>
                      <button
                        type="button"
                        onClick={handleSendLoginOtp}
                        disabled={requestingOtp}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        Resend Code
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      value={authOtp}
                      onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-2.5 text-sm tracking-widest text-center font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      required
                      autoFocus
                    />

                    <button
                      type="button"
                      onClick={handleVerifyLoginOtp}
                      disabled={verifyingOtp || authOtp.length !== 6}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <ArrowRight size={15} />
                      {verifyingOtp ? 'Verifying OTP...' : 'Verify Passcode & Unlock Magic Link'}
                    </button>
                  </motion.div>
                )}

                {/* Initial button to Send OTP if not yet sent */}
                {!otpSent && (
                  <button
                    type="button"
                    onClick={handleSendLoginOtp}
                    disabled={requestingOtp || !authEmail.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <KeyRound size={15} />
                    {requestingOtp ? 'Generating Code...' : 'Send Verification Code'}
                  </button>
                )}
              </div>
            )}

            {/* Step 2 Form: Magic Link Authentication */}
            {activeStep === 2 && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">OTP Verified! Complete sign in with Magic Link</span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualToken.trim()) handleVerifyOttToken(manualToken.trim());
                  }}
                  className="space-y-2.5"
                >
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Paste Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste token here..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      required
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-sm"
                    >
                      Login
                    </button>
                  </div>
                </form>

                <div className="flex justify-between items-center pt-2 text-xs">
                  <button
                    type="button"
                    onClick={handleRequestMagicLink}
                    disabled={dispatchingMagic}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    {dispatchingMagic ? 'Re-sending...' : 'Re-send Magic Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveStep(1); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Back to Step 1
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode 3: Staff Registration */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Enter name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="name@hospital.org"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  placeholder="10 digit phone"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Venue *
                </label>
                <div className="relative">
                  <select
                    value={regVenueSlug}
                    onChange={(e) => setRegVenueSlug(e.target.value)}
                    className="w-full appearance-none pl-3.5 pr-8 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer shadow-sm truncate"
                    required
                  >
                    {venues.map((v) => (
                      <option key={v.slug} value={v.slug} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2">
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role *
                </label>
                <div className="relative">
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full appearance-none pl-3.5 pr-8 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer shadow-sm"
                  >
                    <option value="STAFF" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">STAFF (Nurse / Triage)</option>
                    <option value="COORDINATOR" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">COORDINATOR (Doctor)</option>
                    <option value="SECURITY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">SECURITY</option>
                    <option value="ADMIN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">ADMIN</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {regRole === 'ADMIN' && (
              <div>
                <label className="block text-xs font-semibold text-amber-500 mb-1">
                  Admin Authorization Key *
                </label>
                <input
                  type="password"
                  placeholder="Enter facility admin signup key"
                  value={regAdminKey}
                  onChange={(e) => setRegAdminKey(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-500/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  required
                />
              </div>
            )}

            {/* Verification OTP */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Registration OTP *
                </label>
                <button
                  type="button"
                  onClick={handleSendRegOtp}
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  {regOtpSent ? 'Resend Code' : 'Send Code'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={regOtp}
                onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={registering}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {registering ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}

        {/* Footer: Bottom Sign Up / Sign In switch matching reference design */}
        <div className="mt-8 pt-4 text-center border-t border-slate-100 dark:border-slate-800/80">
          {authMode === 'register' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('magic')}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
