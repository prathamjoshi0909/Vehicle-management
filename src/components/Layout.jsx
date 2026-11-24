import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="container animate-fade-in" style={{ minHeight: 'calc(100vh - 160px)' }}>
        {children}
      </main>
      <footer style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 'auto' }}>
        &copy; {new Date().getFullYear()} Vehicle Logger. Made with ❤️ by Pratham Joshi.
      </footer>
    </>
  );
}
