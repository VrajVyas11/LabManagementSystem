// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
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
  Settings,
  Calendar,
  Timer,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus
} from "lucide-react";
import { api } from "../api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const notificationTimer = setInterval(fetchNotifications, 120000);
      return () => clearInterval(notificationTimer);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      const normalized = (data || []).map((n) => ({
        id: n.id || n._id,
        entityType: n.entityType,
        entityId: n.entityId,
        type: n.entityType === "lab" ? "lab_starting" : "generic",
        title: n.title,
        message: n.message,
        time: n.createdAt ? new Date(n.createdAt) : new Date(n.createdAt ?? n.CreatedAt ?? Date.now()),
        read: !!n.read,
        priority: (n.priority || "Low").toString().toLowerCase()
      }));
      setNotifications(normalized);
      setUnreadCount(normalized.filter((x) => !x.read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  function handleLogout() {
    logout();
    nav("/login");
    setShowUserMenu(false);
  }

  const markAsRead = async (notificationId) => {
    try {
      await api.markNotificationRead(notificationId);
    } catch (err) {
      console.warn("Failed to mark notification via API:", err);
    }
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      console.warn("Failed to mark all read via API:", err);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "lab_starting":
        return <Timer className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const NavLink = ({ to, children, className = "" }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 
          ${isActive ? "text-blue-600 bg-blue-50 font-medium shadow-sm" : "text-gray-700 hover:text-blue-600 hover:bg-blue-50/70"} ${className}`}
        onClick={() => setIsMenuOpen(false)}
      >
        {children}
      </Link>
    );
  };

  const NotificationPanel = () => (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-96 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:text-blue-700">
            Mark all as read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-2 ${!notification.read ? "border-l-blue-500 bg-blue-50/30" : "border-l-transparent"}`}
              onClick={async () => {
                if (!notification.read) await markAsRead(notification.id);
                if (notification.entityType === "lab" && notification.entityId) {
                  nav(`/labs/${notification.entityId}`);
                } else if (notification.entityType === "submission" && notification.entityId) {
                  // navigate to grading view if teacher; else to submission view
                  if (user?.role === "teacher") {
                    nav(`/labs/${notification.entityId}/grading`);
                  } else {
                    nav(`/submissions/${notification.entityId}`);
                  }
                } else {
                  nav("/notifications");
                }
                setShowNotifications(false);
              }}
            >
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${!notification.read ? "text-gray-900" : "text-gray-700"}`}>{notification.title}</p>
                    {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTime(notification.time)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-gray-100 px-4 py-2">
        <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-1" onClick={() => nav("/notifications")}>
          View all notifications
        </button>
      </div>
    </div>
  );

  const UserMenu = () => (
    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="font-medium text-gray-900">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
          {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
        </span>
      </div>
      <div className="py-2">
        <Link to="/profile" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
          <User size={16} />
          <span>Profile Settings</span>
        </Link>
        <Link to="/settings" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
          <Settings size={16} />
          <span>Preferences</span>
        </Link>
        {user?.role === "teacher" && (
          <Link to="/labs/create" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
            <Plus size={16} />
            <span>Create Lab</span>
          </Link>
        )}
      </div>
      <div className="border-t border-gray-100 pt-2 mt-2">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors">
          <LogOut size={16} />
          <span>Sign Out</span>
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
          {user?.role === "teacher" && (
            <NavLink to="/labs/create">
              <Plus size={18} />
              <span>Create Lab</span>
            </NavLink>
          )}
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
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white text-xs py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-blue-300" />
              <span className="font-mono">{currentTime.toISOString().slice(0, 19).replace("T", " ")} UTC</span>
            </div>
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-slate-300">
                <Calendar size={14} />
                <span>{currentTime.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}</span>
              </div>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300">Online</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">LabManager</div>
                <div className="text-xs text-gray-500 font-medium">MSU FoTE • MCA</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              {navContent}

              {user && (
                <div className="flex items-center gap-3 ml-6 border-l border-gray-200 pl-6">
                  <div className="relative" ref={notificationRef}>
                    <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                      <Bell size={20} className="group-hover:scale-110 transition-transform" />
                      {unreadCount > 0 && <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[18px] text-center animate-pulse">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                    </button>
                    {showNotifications && <NotificationPanel />}
                  </div>

                  <div className="relative" ref={userMenuRef}>
                    <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md group-hover:shadow-lg transition-shadow">{user.name.charAt(0).toUpperCase()}</div>
                      <div className="hidden lg:block text-left">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.role}</div>
                      </div>
                      <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>
                    {showUserMenu && <UserMenu />}
                  </div>
                </div>
              )}
            </nav>

            <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <nav className="flex flex-col gap-2">
                {navContent}
                {user && (
                  <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{user.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                      <User size={18} />
                      <span>Profile</span>
                    </Link>
                    <div className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Bell size={18} />
                        <span>Notifications</span>
                      </div>
                      {unreadCount > 0 && <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">{unreadCount}</span>}
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <LogOut size={18} />
                      <span>Sign Out</span>
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