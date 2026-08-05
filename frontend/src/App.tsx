import React from 'react';
import HomePage from './pages/HomePage';

const REPO_URL = 'https://github.com/bozemanpass/example-todo-list';
const STACK_URL = 'https://github.com/bozemanpass/stack';

const GitHubIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
      0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
      1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
      0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68
      0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82
      2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0
      .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const LogoMark: React.FC = () => (
  <svg
    className="appbar-logo"
    width="28"
    height="28"
    viewBox="0 0 28 28"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="26" height="26" rx="6" fill="#e8f0fe" stroke="#1a73e8" strokeWidth="1.5" />
    <path
      d="M8 14.2l3.6 3.6L20 9.4"
      fill="none"
      stroke="#1a73e8"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar-brand">
          <LogoMark />
          <h1 className="appbar-title">
            Todo List <span className="appbar-title-sub">&middot; example app</span>
          </h1>
        </div>
        <div className="appbar-spacer" />
        <nav className="appbar-actions">
          <a
            className="link-button"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="View this application's source on GitHub"
          >
            <GitHubIcon />
            <span>Source on GitHub</span>
          </a>
        </nav>
      </header>

      <main className="app-main">
        <HomePage />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span>Built and deployed with</span>
          <a href={STACK_URL} target="_blank" rel="noopener noreferrer">
            stack
          </a>
          <span>&middot;</span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            example-todo-list
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
