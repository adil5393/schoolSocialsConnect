import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/auth.jsx';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface-container-low rounded-2xl p-8 card-border">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary-container">school</span>
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary leading-tight">SchoolSocials</h1>
            <p className="font-label-md text-label-md text-on-surface-variant">Institutional Innovation</p>
          </div>
        </div>

        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
          {mode === 'login' ? "Log in to manage your school's social channels." : 'Set up an admin account.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-error font-body-sm text-body-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-gradient text-white font-label-md text-label-md py-2.5 rounded-lg font-semibold disabled:opacity-50 mt-2"
          >
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 text-primary font-label-md text-label-md hover:underline w-full text-center cursor-pointer"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
