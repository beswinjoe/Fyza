import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

/* ================================================================
   Native Browser Path Router
   
   Provides lightweight client-side routing using window.location and
   History API (pushState/replaceState/popstate) without external router
   dependencies, maintaining fast loads and zero bundle overhead.
   ================================================================ */

export interface RouterContextType {
  path: string;
  search: string;
  query: Record<string, string>;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

function parseQuery(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!search || search.length <= 1) return params;
  const sp = new URLSearchParams(search);
  sp.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '') return '/';
  // Strip trailing slashes unless it's just '/'
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [locationState, setLocationState] = useState(() => {
    if (typeof window === 'undefined') {
      return { path: '/', search: '' };
    }
    return {
      path: normalizePath(window.location.pathname),
      search: window.location.search,
    };
  });

  useEffect(() => {
    const handlePopState = () => {
      setLocationState({
        path: normalizePath(window.location.pathname),
        search: window.location.search,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;

    // Handle hash anchors (e.g. #features, #faq) on the current page
    if (to.startsWith('#')) {
      const el = document.querySelector(to);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    const [newPath, newSearch = ''] = to.split('?');
    const normalized = normalizePath(newPath);
    const searchString = newSearch ? `?${newSearch}` : '';
    const fullUrl = `${normalized}${searchString}`;

    if (options?.replace) {
      window.history.replaceState({}, '', fullUrl);
    } else {
      window.history.pushState({}, '', fullUrl);
    }

    setLocationState({
      path: normalized,
      search: searchString,
    });

    // If navigating to a page, scroll back to top unless it's an in-page anchor
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const query = useMemo(() => parseQuery(locationState.search), [locationState.search]);

  const value = useMemo<RouterContextType>(() => ({
    path: locationState.path,
    search: locationState.search,
    query,
    navigate,
  }), [locationState.path, locationState.search, query, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextType {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return ctx;
}

export function Link({
  href,
  children,
  className,
  title,
  onClick,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow default browser handling for special clicks (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    if (onClick) onClick(e);
    if (!e.defaultPrevented) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <a href={href} className={className} title={title} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
