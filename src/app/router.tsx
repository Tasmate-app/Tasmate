import { Navigate, createBrowserRouter } from 'react-router-dom';
import { GameShell } from '../components/game/GameShell';
import { HomePage } from '../features/home/HomePage';
import { WeeklyCalendarPage } from '../features/calendar/WeeklyCalendarPage';
import { BasePage } from '../features/base/BasePage';
import { CompanionsPage } from '../features/companions/CompanionsPage';
import { FacilitiesPage } from '../features/facilities/FacilitiesPage';
import { ShopPage } from '../features/shop/ShopPage';
import { StoragePage } from '../features/storage/StoragePage';
import { SynthesisPage } from '../features/synthesis/SynthesisPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { PrivacyPolicyPage } from '../features/privacy/PrivacyPolicyPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GameShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'plan', element: <WeeklyCalendarPage /> },
      { path: 'base', element: <BasePage /> },
      { path: 'character', element: <CompanionsPage /> },
      { path: 'facilities', element: <FacilitiesPage /> },
      { path: 'inventory', element: <StoragePage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'synthesis', element: <SynthesisPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      {
        path: 'settings/licenses',
        lazy: async () => {
          const { LicensesPage } = await import('../features/settings/LicensesPage');
          return { Component: LicensesPage };
        },
      },
      { path: 'privacy', element: <PrivacyPolicyPage /> },
      // 旧URLの互換用
      { path: 'sortie', element: <Navigate to="/" replace /> },
      { path: 'calendar', element: <Navigate to="/plan" replace /> },
      { path: 'companions', element: <Navigate to="/character" replace /> },
      { path: 'storage', element: <Navigate to="/inventory" replace /> },
      { path: 'house', element: <Navigate to="/base" replace /> },
    ],
  },
]);
