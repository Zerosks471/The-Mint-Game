import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Account details state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMessage, setAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preferences state
  const [soundEnabled, setSoundEnabled] = useState(user?.soundEnabled ?? true);
  const [musicEnabled, setMusicEnabled] = useState(user?.musicEnabled ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveAccountDetails = async () => {
    setSavingAccount(true);
    setAccountMessage(null);
    try {
      const response = await authApi.updateSettings({ displayName });
      if (response.success && response.data) {
        setUser({ ...user!, displayName: response.data.displayName });
        setAccountMessage({ type: 'success', text: 'Account details updated successfully' });
      } else {
        setAccountMessage({ type: 'error', text: response.error?.message || 'Failed to update account details' });
      }
    } catch {
      setAccountMessage({ type: 'error', text: 'Failed to update account details' });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      const response = await authApi.changePassword({ currentPassword, newPassword });
      if (response.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: response.error?.message || 'Failed to change password' });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    setPreferencesMessage(null);
    try {
      const response = await authApi.updateSettings({
        soundEnabled,
        musicEnabled,
        notificationsEnabled,
      });
      if (response.success && response.data) {
        setUser({
          ...user!,
          soundEnabled: response.data.soundEnabled,
          musicEnabled: response.data.musicEnabled,
          notificationsEnabled: response.data.notificationsEnabled,
        });
        setPreferencesMessage({ type: 'success', text: 'Preferences saved successfully' });
      } else {
        setPreferencesMessage({ type: 'error', text: response.error?.message || 'Failed to save preferences' });
      }
    } catch {
      setPreferencesMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteMessage({ type: 'error', text: 'Please enter your password to confirm' });
      return;
    }

    setDeleting(true);
    setDeleteMessage(null);
    try {
      const response = await authApi.deleteAccount(deletePassword);
      if (response.success) {
        setDeleteMessage({ type: 'success', text: 'Account scheduled for deletion. You have 30 days to recover it.' });
        setTimeout(() => {
          useAuthStore.getState().logout();
        }, 3000);
      } else {
        setDeleteMessage({ type: 'error', text: response.error?.message || 'Failed to delete account' });
      }
    } catch {
      setDeleteMessage({ type: 'error', text: 'Failed to delete account' });
    } finally {
      setDeleting(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 bg-dark-input border border-dark-border rounded-xl text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-mint/50 focus:border-mint transition-all";
  const disabledInputClasses = "w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-zinc-500 cursor-not-allowed";
  const buttonClasses = "px-4 py-2.5 bg-mint hover:bg-mint-600 text-dark-base font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>

      {/* Account Details */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Account Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className={disabledInputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className={disabledInputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClasses}
              placeholder="Enter display name"
            />
          </div>
          {accountMessage && (
            <p className={`text-sm ${accountMessage.type === 'success' ? 'text-mint' : 'text-red-400'}`}>
              {accountMessage.text}
            </p>
          )}
          <button
            onClick={handleSaveAccountDetails}
            disabled={savingAccount}
            className={buttonClasses}
          >
            {savingAccount ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Security</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClasses}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClasses}
            />
          </div>
          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-mint' : 'text-red-400'}`}>
              {passwordMessage.text}
            </p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            className={buttonClasses}
          >
            {savingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-zinc-100 font-medium">Sound Effects</p>
              <p className="text-sm text-zinc-500">Play sounds for game actions</p>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                soundEnabled ? 'bg-mint' : 'bg-dark-border'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-zinc-100 font-medium">Music</p>
              <p className="text-sm text-zinc-500">Play background music</p>
            </div>
            <button
              onClick={() => setMusicEnabled(!musicEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                musicEnabled ? 'bg-mint' : 'bg-dark-border'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                  musicEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-zinc-100 font-medium">Notifications</p>
              <p className="text-sm text-zinc-500">Show browser notifications</p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-mint' : 'bg-dark-border'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferencesMessage && (
            <p className={`text-sm ${preferencesMessage.type === 'success' ? 'text-mint' : 'text-red-400'}`}>
              {preferencesMessage.text}
            </p>
          )}
          <button
            onClick={handleSavePreferences}
            disabled={savingPreferences}
            className={buttonClasses}
          >
            {savingPreferences ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">About</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-zinc-400">Version</span>
            <span className="text-zinc-100 font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-zinc-400">Created by</span>
            <span className="text-mint font-medium">Qips</span>
          </div>
          <div className="pt-2 border-t border-dark-border text-center">
            <p className="text-xs text-zinc-500">The Mint - Build Your Financial Empire</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-dark-card border-2 border-red-500/30 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-100 font-medium">Delete Account</p>
              <p className="text-sm text-zinc-500">
                Permanently delete your account and all data
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-colors"
            >
              Delete Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 font-medium">Are you sure?</p>
              <p className="text-sm text-red-400/70 mt-1">
                Your account will be scheduled for deletion. You have 30 days to log back in and recover
                your account. After 30 days, all your data will be permanently deleted.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Enter your password to confirm
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-3 bg-dark-input border border-red-500/30 rounded-xl text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
            </div>
            {deleteMessage && (
              <p className={`text-sm ${deleteMessage.type === 'success' ? 'text-mint' : 'text-red-400'}`}>
                {deleteMessage.text}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setDeleteMessage(null);
                }}
                className="px-4 py-2.5 bg-dark-elevated border border-dark-border text-zinc-300 font-medium rounded-xl hover:bg-dark-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="px-4 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
