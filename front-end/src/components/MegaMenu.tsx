'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MegaMenuGroup } from '@/lib/navigationConfig';

interface MegaMenuProps {
  group: MegaMenuGroup;
  className?: string;
}

export function MegaMenu({ group, className }: MegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pathname = usePathname();
  const Icon = group.icon;

  // Check if any item in the group is active
  const isGroupActive = group.items.some(item => pathname.startsWith(item.href));

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        className={cn(
          'group flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out',
          'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'transform hover:scale-[1.02]',
          isGroupActive || isOpen
            ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-sm border border-blue-200/50'
            : 'text-gray-700 hover:text-blue-700 border border-transparent hover:border-blue-100/50'
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon className={cn(
          'w-4 h-4 transition-all duration-200',
          'group-hover:scale-110',
          isGroupActive || isOpen ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'
        )} />
        <span>{group.label}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Content */}
          <div className={cn(
            'absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}>
            <div className="p-2">
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive = pathname.startsWith(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-start space-x-3 p-3 rounded-lg transition-all duration-200',
                      'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                      isActive && 'bg-blue-50/50'
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
                      'group-hover:scale-110',
                      isActive
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                        : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                    )}>
                      <ItemIcon className={cn(
                        'w-5 h-5',
                        isActive ? 'text-white' : 'text-blue-600'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className={cn(
                          'text-sm font-medium transition-colors duration-200',
                          isActive
                            ? 'text-blue-700'
                            : 'text-gray-900 group-hover:text-blue-700'
                        )}>
                          {item.label}
                        </div>
                        {item.badge && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
