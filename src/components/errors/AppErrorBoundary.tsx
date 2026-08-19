import React from 'react';

interface State { failed: boolean }

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="flex min-h-screen items-center justify-center bg-surface-50 p-6 text-surface-950 dark:bg-surface-950 dark:text-white">
      <section className="w-full max-w-lg rounded-3xl border border-surface-200 bg-white p-8 text-center shadow-sm dark:border-surface-700 dark:bg-surface-900" role="alert">
        <span className="text-4xl" aria-hidden="true">🛠️</span>
        <h1 className="mt-4 text-2xl font-black">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-surface-600 dark:text-surface-300">The page could not finish loading. Your payment or account status has not been changed by this screen.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white hover:bg-primary-700">Reload page</button>
      </section>
    </main>;
  }
}
