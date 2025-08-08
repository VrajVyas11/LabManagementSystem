import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../auth/useAuth";
import {
  BookOpenCheck,
  Home,
  LayoutDashboard,
  LogOut,
  User,
  LogIn,
  UserPlus,
  Menu,
  X,
  Clock,
  ChevronDown,
  Bell,
  Settings
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications] = useState(3); // Example notification count

  // useEffect(() => {
  //   const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  //   return () => clearInterval(timer);
  // }, []);

  function handleLogout() {
    logout();
    nav("/login");
    setShowUserMenu(false);
  }

  const NavLink = ({ to, children, className = "" }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 
          ${isActive 
            ? "text-blue-600 bg-blue-50 font-medium" 
            : "text-gray-700 hover:text-blue-600 hover:bg-blue-50/50"
          } ${className}`}
        onClick={() => setIsMenuOpen(false)}
      >
        {children}
      </Link>
    );
  };

  const UserMenu = () => (
    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="font-medium text-gray-900">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
      <div className="py-2">
        <Link 
          to="/profile"
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          <User size={16} />
          <span>Profile</span>
        </Link>
        <Link 
          to="/settings"
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          <Settings size={16} />
          <span>Settings</span>
        </Link>
      </div>
      <div className="border-t border-gray-100 pt-2 mt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  const navContent = (
    <>
      <NavLink to="/labs">
        <BookOpenCheck size={18} />
        <span>Labs</span>
      </NavLink>

      {user ? (
        <>
          <NavLink to="/dashboard">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
        </>
      ) : (
        <>
          <NavLink to="/login">
            <LogIn size={18} />
            <span>Login</span>
          </NavLink>
          <NavLink to="/register" className="text-blue-600 hover:text-blue-700">
            <UserPlus size={18} />
            <span>Sign up</span>
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50">
      {/* UTC Time Banner */}
      {/* <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>
              {currentTime.toISOString().slice(0, 19).replace("T", " ")} UTC
            </span>
          </div>
          {user && (
            <span className="font-medium">
              Welcome back, {user.name}
            </span>
          )}
        </div>
      </div> */}

      {/* Main Navbar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <Link 
              to="/" 
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">LabManager</div>
                <div className="text-xs text-gray-500">MSU FoTE · MCA</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3">
              {navContent}
              
              {user && (
                <div className="flex items-center gap-4 ml-4 border-l pl-4">
                  {/* Notifications */}
                  <button className="relative p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Bell size={18} />
                    {notifications > 0 && (
                      <span className="absolute top-0 right-0 -mt-1 -mr-1 px-1.5 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                        {notifications}
                      </span>
                    )}
                  </button>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <ChevronDown size={16} className="text-gray-500" />
                    </button>
                    {showUserMenu && <UserMenu />}
                  </div>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <nav className="flex flex-col gap-2">
                {navContent}
                {user && (
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <Link 
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <User size={18} />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}