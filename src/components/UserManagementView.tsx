import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { userService } from '../services/userService';
import { AuthUser, UserRole, AccountStatus } from '../types';
import LoadingPanel from './common/LoadingPanel';
import ErrorPanel from './common/ErrorPanel';
import EmptyState from './common/EmptyState';
import { useToast } from './common/ToastProvider';
import { motion } from 'motion/react';
import { Shield, Mail, Landmark, ToggleLeft, ToggleRight, Settings, Users } from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Editing State
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('Read Only Viewer');
  const [selectedStatus, setSelectedStatus] = useState<AccountStatus>('Active');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.listUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to synchronize administrative user listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (user: AuthUser) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedStatus(user.account_status);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      setIsSaving(true);
      const updated = await userService.updateUser(editingUser.user_id, {
        role: selectedRole,
        account_status: selectedStatus
      });
      
      setUsers(prev => prev.map(u => u.user_id === updated.user_id ? updated : u));
      setEditingUser(null);
      showToast(`Security permissions updated for ${updated.email}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Fails to update operator privileges.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <LoadingPanel message="LOADING SECURE COMMAND ROSTER..." />;
  if (error) return <ErrorPanel message={error} onRetry={fetchUsers} />;

  return (
    <div className="space-y-6">
      
      {/* View Header Info */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-cyan-950/40 border border-cyan-800/40 rounded-xl flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-mono tracking-wider uppercase">User Directory & IAM Roster</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Verify platform accounts details, upgrade operator security classification, or revoke credentials clearances from a centralized terminal.
            </p>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-925">
          <h4 className="text-xs font-semibold text-slate-350 tracking-wider font-mono">ACTIVE SECURITY OFFICIALS ({users.length})</h4>
        </div>

        {users.length === 0 ? (
          <EmptyState title="Roster Empty" description="No registered officers populate system lists." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950/40">
                  <th className="py-4 px-6">Officer details</th>
                  <th className="py-4 px-6">Organization</th>
                  <th className="py-4 px-6">Assigned clearance role</th>
                  <th className="py-4 px-3">State</th>
                  {hasPermission('users.manage') && <th className="py-4 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {users.map((item) => (
                  <tr key={item.user_id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{item.full_name}</span>
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                          <Mail className="w-3 h-3 block shrink-0" /> {item.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      <span className="flex items-center gap-1.5 font-mono text-[10px]">
                        <Landmark className="w-3 h-3 text-slate-600 block" />
                        {item.organization || 'Not Assigned'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-950 border border-slate-850 text-cyan-400">
                        <Shield className="w-3 h-3" />
                        {item.role}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.account_status === 'Active' 
                          ? 'bg-emerald-950/40 text-emerald-400' 
                          : 'bg-red-950/40 text-red-400'
                      }`}>
                        {item.account_status === 'Active' ? 'ACTIVE' : item.account_status.toUpperCase()}
                      </span>
                    </td>
                    {hasPermission('users.manage') && (
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-slate-700 font-mono text-[10px] uppercase transition cursor-pointer min-h-[44px]"
                        >
                          ELEVATE_PERM
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editing Dialog Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
              <Settings className="w-4 h-4 text-cyan-400 animate-spin-slow" />
              <h4 className="text-xs font-semibold font-mono tracking-wider text-slate-100 uppercase">
                MODIFY ACCESS: {editingUser.full_name}
              </h4>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Assigned Duty Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:border-cyan-500/50 outline-none"
                >
                  <option value="System Administrator">System Administrator</option>
                  <option value="Watch Commander">Watch Commander</option>
                  <option value="Intelligence Analyst">Intelligence Analyst</option>
                  <option value="Alert Officer">Alert Officer</option>
                  <option value="Read Only Viewer">Read Only Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Account Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as AccountStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:border-cyan-500/50 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setEditingUser(null)}
                disabled={isSaving}
                className="px-4 py-2 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 rounded font-mono text-xs transition cursor-pointer min-h-[44px]"
              >
                CANCEL
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={isSaving}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase rounded transition cursor-pointer min-h-[44px]"
              >
                {isSaving ? 'PERSISTING...' : 'SAVE_ROSTER_DECREE'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default UserManagementView;
