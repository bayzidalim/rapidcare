'use client';

import React from 'react';
import Link from 'next/link';
import { User, LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/lib/types';

interface UserMenuProps {
  user: UserType;
  onLogout: () => void;
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, className }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get user role display name
  const getRoleDisplayName = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'Administrator';
      case 'hospital-authority':
        return 'Hospital Authority';
      case 'user':
        return 'Patient';
      default:
        return 'User';
    }
  };

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative h-9 w-9 rounded-full transition-all duration-200 ease-in-out",
            "hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50",
            "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "transform hover:scale-105 active:scale-95",
            isOpen && "bg-blue-50 scale-105",
            className
          )}
          aria-label={`User menu for ${user.name}`}
        >
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-medium shadow-md transition-all duration-200",
            "hover:shadow-lg hover:from-blue-700 hover:to-indigo-700",
            isOpen && "shadow-lg ring-2 ring-blue-200 ring-offset-2"
          )}>
            {getInitials(user.name)}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 animate-in slide-in-from-top-2 duration-200" 
        align="end" 
        forceMount
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {getRoleDisplayName(user.userType)}
            </p>
          </div>
        </DropdownMenuLabel>
        
        {/* Balance Display for regular users */}
        {user.userType === 'user' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-center justify-between bg-green-50 p-2 rounded-md">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs text-green-600">৳</span>
                  </div>
                  <span className="text-xs text-gray-600">Balance</span>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  ৳{user.balance?.toLocaleString() || '10,000'}
                </span>
              </div>
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link 
            href="/profile" 
            className="flex items-center cursor-pointer transition-all duration-150 hover:bg-blue-50 focus:bg-blue-50"
          >
            <User className="mr-2 h-4 w-4 transition-transform duration-150 group-hover:scale-110" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        {user.userType === 'hospital-authority' && (
          <DropdownMenuItem asChild>
            <Link 
              href="/hospitals/manage" 
              className="flex items-center cursor-pointer transition-all duration-150 hover:bg-blue-50 focus:bg-blue-50"
            >
              <Settings className="mr-2 h-4 w-4 transition-transform duration-150 group-hover:rotate-90" />
              <span>Hospital Settings</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer transition-all duration-150 hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4 transition-transform duration-150 hover:scale-110" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;