import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, FileText, Utensils, Home } from 'lucide-react';

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}

const NavLink = ({ to, icon: Icon, label, active }: NavLinkProps) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
      active
        ? 'bg-indigo-100 text-indigo-800'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    <Icon className="h-5 w-5 mr-2" />
    <span>{label}</span>
  </Link>
);

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">Medical AI Assistant</span>
          </div>
          
          {currentUser && (
            <nav className="flex items-center space-x-4">
              <NavLink 
                to="/" 
                icon={Home} 
                label="Dashboard" 
                active={location.pathname === '/'} 
              />
              <NavLink 
                to="/diet-plan" 
                icon={Utensils} 
                label="Diet Plan" 
                active={location.pathname === '/diet-plan'} 
              />
              <div className="h-8 border-l border-gray-200 mx-2"></div>
              <button
                onClick={async () => await logout()}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;