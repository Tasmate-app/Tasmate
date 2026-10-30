import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** 描画時の例外で画面全体が白画面になるのを防ぐ */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] 画面の描画に失敗しました', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="notice notice--provisional" role="alert">
          <strong>画面の表示中にエラーが発生しました。</strong>
          <p>保存データを読み込み直すため、ページを再読み込みしてください。</p>
          <Button onClick={() => window.location.reload()}>再読み込み</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
