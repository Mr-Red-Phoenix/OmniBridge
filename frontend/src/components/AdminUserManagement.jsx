import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XClose as X,
  Users01 as Users,
  Check,
  RefreshCw01 as RefreshCw,
  ShieldTick as Shield,
  Trash01 as Trash,
  AlertTriangle,
} from '@untitledui/icons';
import { toast } from 'react-toastify';
import adminApi from '../api/adminApi';

const AVAILABLE_ROLES = ['STAFF', 'SECURITY', 'COORDINATOR'];
const PRIMARY_ADMIN_EMAIL = 'admin@omnibridge.org';

export default function AdminUserManagement({ isOpen, onClose }) {
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listStaffUsers();
      setStaffUsers(res.data || []);
    } catch (err) {
      toast.error('Failed to load venue staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleApproveUser = async (userId, userEmail) => {
    setApprovingId(userId);
    try {
      await adminApi.approveStaffUser(userId);
      toast.success(`Access granted for ${userEmail}! User can now log in.`);
      setStaffUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'APPROVED' } : u))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve staff user');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRoleChange = async (userId, userEmail, newRole) => {
    if (userEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      toast.warning('The primary Admin role cannot be modified.');
      return;
    }

    setUpdatingId(userId);
    try {
      await adminApi.updateStaffRole(userId, newRole);
      toast.success('Staff role updated successfully');
      setStaffUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      toast.error('The primary Admin account cannot be removed.');
      return;
    }

    setDeletingId(user.id);
    try {
      await adminApi.deleteStaffUser(user.id);
      toast.success(`User ${user.email} removed from portal`);
      setStaffUsers((prev) => prev.filter((u) => u.id !== user.id));
      setConfirmDeleteUser(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove user');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card"
        style={{
          width: '100%',
          maxWidth: '740px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <Users size={22} />
            Staff Access & Role Administration
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white cursor-pointer"
              title="Refresh staff list"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Informational Subtitle */}
        <div className="pt-3 pb-1 text-xs text-slate-600 dark:text-slate-400">
          Sole System Administrator: <span className="text-blue-600 dark:text-blue-400 font-mono font-semibold">{PRIMARY_ADMIN_EMAIL}</span> (Role immutable). Review registration approvals and assign roles below.
        </div>

        <div style={{ overflowY: 'auto', flex: 1, marginTop: '0.75rem', paddingRight: '0.5rem' }}>
          {loading ? (
            <p className="text-center py-12 text-slate-500 dark:text-gray-400">Loading staff members...</p>
          ) : staffUsers.length === 0 ? (
            <p className="text-center py-12 text-slate-500 dark:text-gray-500 italic">No registered staff found.</p>
          ) : (
            <div className="space-y-3">
              {staffUsers.map((member) => {
                const isPrimaryAdmin = member.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                const isPending = member.status === 'PENDING';

                return (
                  <div
                    key={member.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                      isPrimaryAdmin
                        ? 'bg-blue-50/70 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
                        : isPending
                        ? 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-300/80 dark:border-amber-500/30'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Shield size={14} className={isPrimaryAdmin ? 'text-blue-600 dark:text-blue-400' : isPending ? 'text-amber-500' : 'text-primary'} />
                          {member.name}
                        </h5>
                        {isPrimaryAdmin && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-500/30">
                            Sole Admin
                          </span>
                        )}
                        {!isPrimaryAdmin && isPending && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-300 dark:border-amber-500/30 animate-pulse">
                            Pending Approval
                          </span>
                        )}
                        {!isPrimaryAdmin && !isPending && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
                            Approved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5">{member.email}</p>
                      <span className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">
                        Venue: {member.venueName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                      {isPrimaryAdmin ? (
                        <span className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold font-mono">
                          ADMIN
                        </span>
                      ) : (
                        <>
                          {isPending && (
                            <button
                              onClick={() => handleApproveUser(member.id, member.email)}
                              disabled={approvingId === member.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 cursor-pointer transition-all disabled:opacity-50"
                              title="Approve staff registration to grant login access"
                            >
                              <Check size={14} />
                              {approvingId === member.id ? 'Approving...' : 'Approve Access'}
                            </button>
                          )}

                          <select
                            value={member.role}
                            disabled={updatingId === member.id || deletingId === member.id || approvingId === member.id}
                            onChange={(e) => handleRoleChange(member.id, member.email, e.target.value)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              width: 'auto',
                              minWidth: '135px',
                            }}
                            className="rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer shadow-xs"
                          >
                            {AVAILABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r === 'COORDINATOR' ? 'COORDINATOR (Doctor)' : r === 'STAFF' ? 'STAFF (Nurse)' : r}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => setConfirmDeleteUser(member)}
                            disabled={deletingId === member.id || approvingId === member.id}
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Remove user from portal"
                          >
                            <Trash size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmDeleteUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-2xl"
            >
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/40 max-w-md w-full shadow-2xl text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={24} />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Revoke User Access?</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">{confirmDeleteUser.email}</span> ({confirmDeleteUser.name})? Their active sessions and tokens will be permanently revoked.
                </p>
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={() => setConfirmDeleteUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteUser(confirmDeleteUser)}
                    disabled={deletingId === confirmDeleteUser.id}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 cursor-pointer"
                  >
                    {deletingId === confirmDeleteUser.id ? 'Removing...' : 'Confirm Remove'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
