import { NavLink, Outlet } from 'react-router-dom';
import { Store, Tags, Users } from 'lucide-react';
import { useAuth } from '../../features/auth/context/AuthContext';

function SettingsLayout() {
  const { shop } = useAuth();
  const settingsTabs = [
    { label: 'Categories', to: '/settings/categories', icon: Tags },
    { label: 'Shops & Branches', to: '/settings/shops', icon: Store },
    ...(shop?.role === 'OWNER' ? [{ label: 'Team members', to: '/settings/team', icon: Users }] : []),
  ];

  return (
    <div className="min-h-full bg-[#f8f9f6]">
      <div className="mx-auto max-w-[1200px] px-4 pt-6 sm:px-6 lg:px-8">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold text-[#252a29]">Settings</h1>
        </header>
        <nav aria-label="Settings sections" className="flex max-w-full gap-1 overflow-x-auto border-b border-[#e6e8e4]">
          {settingsTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `inline-flex min-h-12 shrink-0 items-center gap-2 rounded-t-md border-b-2 px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#6132DA]/20 ${isActive ? 'border-[#6132DA] bg-[#F1ECFC] text-[#6132DA]' : 'border-transparent text-[#59615e] hover:bg-[#f1f2ef] hover:text-[#414846]'}`}
            >
              <tab.icon size={16} aria-hidden="true" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

export default SettingsLayout;