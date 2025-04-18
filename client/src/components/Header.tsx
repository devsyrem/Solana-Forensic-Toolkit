import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Header() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    staleTime: 60000, // 1 minute
    retry: false,
    refetchOnWindowFocus: true,
  });

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-solana-dark border-b border-solana-dark-light">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0 flex items-center">
            <svg className="h-10 w-10 text-solana-secondary" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 96H96C96 104.837 88.837 112 80 112H32C23.163 112 16 104.837 16 96C16 87.163 23.163 80 32 80H80C88.837 80 96 72.837 96 64C96 55.163 88.837 48 80 48H32C23.163 48 16 40.837 16 32C16 23.163 23.163 16 32 16H80C88.837 16 96 23.163 96 32H32C23.163 32 16 39.163 16 48C16 56.837 23.163 64 32 64H80C88.837 64 96 71.163 96 80C96 88.837 88.837 96 80 96H32Z" fill="currentColor"/>
            </svg>
            <Link href="/">
              <a className="ml-3 text-xl font-bold text-white">SolFlow</a>
            </Link>
          </div>
          <nav className="hidden md:ml-8 md:flex md:space-x-8">
            <Link href="/visualization">
              <a className={`${location === '/visualization' ? 'text-solana-secondary' : 'text-gray-300 hover:text-white hover:bg-solana-dark-light'} font-medium px-3 py-2 rounded-md`}>
                Visualize
              </a>
            </Link>
            <Link href="/analytics">
              <a className={`${location === '/analytics' ? 'text-solana-secondary' : 'text-gray-300 hover:text-white hover:bg-solana-dark-light'} font-medium px-3 py-2 rounded-md`}>
                Analytics
              </a>
            </Link>
            <Link href="/help">
              <a className={`${location === '/help' ? 'text-solana-secondary' : 'text-gray-300 hover:text-white hover:bg-solana-dark-light'} font-medium px-3 py-2 rounded-md`}>
                Help
              </a>
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="bg-solana-dark-light hover:bg-solana-dark-lighter p-2 rounded-full"
            aria-label="Notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button 
            className="bg-solana-dark-light hover:bg-solana-dark-lighter p-2 rounded-full"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {user ? (
            <div className="relative">
              <button 
                className="bg-solana-dark-light rounded-full p-1 flex items-center"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div className="h-8 w-8 rounded-full bg-solana-primary flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-solana-dark-light ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <a 
                      href="#" 
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-solana-dark-lighter"
                      onClick={handleLogout}
                    >
                      Sign out
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <a className="bg-solana-primary text-white px-4 py-2 rounded-md text-sm hover:bg-opacity-90 transition">
                Sign In
              </a>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
