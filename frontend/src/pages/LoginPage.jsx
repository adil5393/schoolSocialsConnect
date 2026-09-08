import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/auth.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
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
          <img
            src="/app-icon.png"
            alt="SchoolSocialsConnect"
            className="w-11 h-11 rounded-xl shadow-md object-contain shrink-0"
          />
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary leading-tight">SchoolSocials</h1>
            <p className="font-label-md text-label-md text-on-surface-variant">Social Media Manager</p>
          </div>
        </div>

        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-1">Welcome back</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Log in to manage your school's social channels.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Email</label>
            <input
              type="text"
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
            {submitting ? 'Please wait…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 font-label-md text-label-md text-on-surface-variant/70 text-center">
          Don't have an account? Ask an admin to create one for you.
        </p>

        <div className="mt-4 pt-4 border-t border-outline-variant/10 text-center">
          <Link to="/smart-class/login" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface">
            Looking for Smart Class Library instead?
          </Link>
        </div>
      </div>
    </div>
  );
}
