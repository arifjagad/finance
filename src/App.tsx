import { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { AuthPage } from '@/pages/auth-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { TransactionsPage } from '@/pages/transactions-page';
import { GoalsPage } from '@/pages/goals-page';
import { CategoriesPage } from '@/pages/categories-page';
import { InvestmentsPage } from '@/pages/investments-page';
import { ReportsPage } from '@/pages/reports-page';
import { BudgetPage } from '@/pages/budget-page';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const router = createBrowserRouter([
    {
      path: '/',
      element: <Navigate to="/dashboard" replace />,
    },
    {
      path: '/login',
      element: <AuthPage />,
    },
    {
      path: '/dashboard',
      element: <DashboardPage />,
    },
    {
      path: '/transactions',
      element: <TransactionsPage />,
    },
    {
      path: '/goals',
      element: <GoalsPage />,
    },
    {
      path: '/categories',
      element: <CategoriesPage />,
    },
    {
      path: '/investments',
      element: <InvestmentsPage />,
    },
    {
      path: '/reports',
      element: <ReportsPage />,
    },
    {
      path: '/budget',
      element: <BudgetPage />,
    },
  ]);

  return (
    <ThemeProvider attribute="class" defaultTheme={theme} enableSystem>
      <AuthProvider>
        <main className="min-h-screen bg-background antialiased">
          <RouterProvider router={router} />
        </main>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;