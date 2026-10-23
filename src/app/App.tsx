import { RouterProvider } from 'react-router-dom';
import { router } from './router';

/** アプリのエントリ（ルーティング） */
export function App() {
  return <RouterProvider router={router} />;
}
