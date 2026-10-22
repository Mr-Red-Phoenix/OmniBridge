import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import authApi from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function MagicLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithJwtResponse } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No magic login token provided.');
      return;
    }

    const verify = async () => {
      try {
        const res = await authApi.loginWithOtt(token);
        loginWithJwtResponse(res.data);
        toast.success('Magic link authenticated successfully!');

        // If this tab was opened from clicking the link in the terminal while the user was on the auth page:
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.focus();
            window.close();
            return;
          } catch {
            // ignore
          }
        }

        navigate('/staff', { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || 'The magic link has expired or is invalid.');
      }
    };

    verify();
  }, [searchParams, loginWithJwtResponse, navigate]);

  return (
    <div className="card mx-auto max-w-md text-center py-16">
      {error ? (
        <div>
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-3" />
          <h2 className="text-xl font-bold mb-2">Authentication Failed</h2>
          <p className="text-sm text-gray-400 mb-6">{error}</p>
          <button onClick={() => navigate('/auth')} className="btn-primary">
            Back to Sign In
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <ShieldCheck size={52} className="mx-auto text-primary mb-4 animate-bounce" />
          <h2 className="text-xl font-extrabold mb-1">Authenticating Magic Link...</h2>
          <p className="text-sm text-gray-400">Verifying one-time security token with Incident Command</p>
        </motion.div>
      )}
    </div>
  );
}
