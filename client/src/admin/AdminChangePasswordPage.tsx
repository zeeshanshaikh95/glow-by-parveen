import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { adminApi } from '@/api/endpoints';
import { useAdminAuth } from './AdminAuthContext';
import { LOGO_TRANSPARENT } from '@/lib/brand';

/**
 * Forced first-login password rotation for the bootstrap admin.
 * Uses the same rules as the Settings page (min 8 chars, must differ),
 * clears mustChangePassword on success, then opens the panel.
 */
export function AdminChangePasswordPage() {
  const { token, ready, admin, completePasswordChange } = useAdminAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return <div className="min-h-screen bg-stone-100" />;
  if (!token) return <Navigate to="/admin/login" replace />;

  const email = admin?.email ?? '';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const res = await adminApi.changePassword(currentPassword, newPassword);
      completePasswordChange(res.admin);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <img
            src={LOGO_TRANSPARENT}
            alt="Glow by Parveen"
            width={1080}
            height={1080}
            className="mx-auto h-28 w-auto object-contain"
          />
          <h1 className="mt-3 font-display text-xl font-bold text-ink">Set a new password</h1>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            {email ? `Signed in as ${email}. ` : ''}
            For security, the initial password must be changed before the admin panel can be
            used.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="cur-pw" className="label">Current password</label>
            <input
              id="cur-pw"
              type="password"
              autoComplete="current-password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="new-pw" className="label">New password (min 8 chars)</label>
            <input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="confirm-pw" className="label">Confirm new password</label>
            <input
              id="confirm-pw"
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !currentPassword || newPassword.length < 8 || confirmPassword.length < 8}
            className="btn-primary w-full"
          >
            {busy ? 'Updating…' : 'Save new password'}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-soft">
          Passwords are stored only as bcrypt hashes. Choose something unique — don't reuse the
          initial password.
        </p>
      </div>
    </div>
  );
}
