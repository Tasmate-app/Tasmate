import { Navigate, createBrowserRouter } from 'react-router-dom';
import { GameShell } from '../components/game/GameShell';
import { HomePage } from '../features/home/HomePage';
import { WeeklyCalendarPage } from '../features/calendar/WeeklyCalendarPage';
import { SortiePage } from '../features/sortie/SortiePage';
import { CompanionsPage } from '../features/companions/CompanionsPage';
import { FacilitiesPage } from '../features/facilities/FacilitiesPage';
import { ShopPage } from '../features/shop/ShopPage';
import { StoragePage } from '../features/storage/StoragePage';
import { HistoryPage } from '../features/history/HistoryPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GameShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'sortie', element: <SortiePage /> },
      { path: 'calendar', element: <WeeklyCalendarPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'companions', element: <CompanionsPage /> },
      { path: 'facilities', element: <FacilitiesPage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'storage', element: <StoragePage /> },
      // 旧シェアハウスURLの互換用
      { path: 'house', element: <Navigate to="/" replace /> },
    ],
  },
]);
