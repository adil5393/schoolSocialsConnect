import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../../components/layout/SmartClassTopBar';
import { apiFetch, ApiError } from '../../../lib/smartClassAuth';

export default function AdminTeachersPage() {
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clsData, subData, usersData] = await Promise.all([
          apiFetch('/library/classes'),
          apiFetch('/library/subjects'),
          apiFetch('/admin/users').catch(() => []),
        ]);
        setClasses(clsData);
        setSubjects(subData);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load teacher data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[{ label: 'Administration' }, { label: 'Teachers & Subjects' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold mb-2">
              <span className="material-symbols-outlined text-[14px]">badge</span>
              <span>Faculty Assignment</span>
            </div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
              Teachers & Subjects Directory
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Review faculty members and their subject curriculum assignments across grades.
            </p>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span>Loading faculty directory...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm">
                        {(u.full_name || u.email || 'T')[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-sm font-bold text-on-surface">{u.full_name}</h3>
                        <p className="text-xs text-on-surface-variant">{u.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-outline-variant/10 text-xs">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase">Role & Access:</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary font-bold uppercase text-[10px]">
                          {u.role}
                        </span>
                        {u.has_smart_class_access && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[10px]">
                            Smart Class Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between text-xs text-on-surface-variant">
                    <span>{classes.length} Grades Available</span>
                    <span>{subjects.length} Subjects</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
