import React from 'react';
import { useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../components/layout/SmartClassTopBar';
import UserManagementPanel from '../components/admin/UserManagementPanel';
import { apiFetch, ApiError } from '../lib/smartClassAuth.jsx';

export default function SmartClassAdminUsersPage() {
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <SmartClassTopBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />
      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg">
          <UserManagementPanel apiFetch={apiFetch} ApiError={ApiError} />
        </div>
      </main>
    </div>
  );
}
