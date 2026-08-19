import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';
import AppErrorBoundary from '@/components/errors/AppErrorBoundary';

function App() {
  return <AppErrorBoundary><CustomerAuthProvider><RouterProvider router={router} /></CustomerAuthProvider></AppErrorBoundary>;
}

export default App;
