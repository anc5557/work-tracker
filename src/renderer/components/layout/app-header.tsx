import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Home, 
  Calendar, 
  BarChart3, 
  Settings, 
  Bell,
  HelpCircle,
  User 
} from 'lucide-react';

export function AppHeader() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 로고 */}
        <div className="flex items-center space-x-2">
          <div className="text-white">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-white text-lg font-semibold">Work Tracker</span>
        </div>
        
        {/* 네비게이션 메뉴 */}
        <nav className="flex items-center space-x-8">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(path)
                  ? 'text-white bg-gray-800'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        
        {/* 우측 메뉴 */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white relative">
            <Bell className="w-4 h-4" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-blue-600">
              2
            </Badge>
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
} 