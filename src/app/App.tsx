import { RouterProvider } from 'react-router-dom';
import { useWeeklyEvaluation } from '../hooks/useWeeklyEvaluation';
import { router } from './router';

/** アプリのエントリ（ルーティング） */
export function App() {
  useWeeklyEvaluation();
  return <RouterProvider router={router} />;
}
