import logoImg from '../assets/images.jpg';

const SOCIAL_LINKS = [
  {
    id: 'youtube',
    href: 'https://www.youtube.com/@AIGEONAVIGATORS/videos',
    label: 'AI Geo Navigators on YouTube',
    className: 'social-youtube',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.6 15.5V8.5L15.8 12l-6.2 3.5Z"
        />
      </svg>
    ),
  },
  {
    id: 'x',
    href: 'https://x.com/AiGeoNavigators',
    label: 'AI Geo Navigators on X',
    className: 'social-x',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M18.9 2.25h3.68l-8.04 9.19L24 21.75h-7.41l-5.8-7.58-6.63 7.58H.96l8.6-9.83L0 2.25h7.59l5.24 6.93 6.07-6.93Zm-1.29 17.52h2.04L6.49 4.41H4.3l13.31 15.36Z"
        />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    href: 'https://www.linkedin.com/company/geo-ai-navigators/?originalSubdomain=pk',
    label: 'AI Geo Navigators on LinkedIn',
    className: 'social-linkedin',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.43v6.31ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"
        />
      </svg>
    ),
  },
  {
    id: 'instagram',
    href: 'https://www.instagram.com/aigeonavigators/?hl=en',
    label: 'AI Geo Navigators on Instagram',
    className: 'social-instagram',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.22.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.05.41 2.22.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.22a3.73 3.73 0 0 1-.9 1.38 3.73 3.73 0 0 1-1.38.9c-.42.16-1.05.36-2.22.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.22-.41a3.73 3.73 0 0 1-1.38-.9 3.73 3.73 0 0 1-.9-1.38c-.16-.42-.36-1.05-.41-2.22-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.22.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.05-.36 2.22-.41 1.27-.06 1.65-.07 4.85-.07Zm0-2.16C8.74 0 8.33.01 7.05.07 5.78.13 4.9.34 4.15.64a5.5 5.5 0 0 0-2 1.3 5.5 5.5 0 0 0-1.3 2C.34 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.27 2.15.57 2.9a5.5 5.5 0 0 0 1.3 2 5.5 5.5 0 0 0 2 1.3c.75.3 1.63.51 2.9.57 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.27 2.9-.57a5.5 5.5 0 0 0 2-1.3 5.5 5.5 0 0 0 1.3-2c.3-.75.51-1.63.57-2.9.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.27-2.15-.57-2.9a5.5 5.5 0 0 0-1.3-2 5.5 5.5 0 0 0-2-1.3c-.75-.3-1.63-.51-2.9-.57C15.67.01 15.26 0 12 0Z"
        />
        <path
          fill="currentColor"
          d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm6.41-11.85a1.44 1.44 0 1 0-1.44 1.44 1.44 1.44 0 0 0 1.44-1.44Z"
        />
      </svg>
    ),
  },
  {
    id: 'facebook',
    href: 'https://www.facebook.com/aigeonavigators/',
    label: 'AI Geo Navigators on Facebook',
    className: 'social-facebook',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.02 10.13 11.91v-8.41H7.08v-3.5h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.5h-2.79v8.41C19.61 23.09 24 18.09 24 12.07Z"
        />
      </svg>
    ),
  },
] as const;

export function TopBar() {
  return (
    <header className="topbar glass-panel">
      <div className="brand">
        <div className="logo" aria-label="AI Geo Navigators">
          <img className="logo-img" src={logoImg} alt="AI Geo Navigators" />
        </div>
        <div className="divider" />
        <div className="product">
          <span className="code">Pakistan Flood-Risk Dashboard</span>
        </div>
      </div>
      <div className="spacer" />
      <nav className="social-links" aria-label="AI Geo Navigators social media">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`social-link ${link.className}`}
            aria-label={link.label}
            title={link.label}
          >
            {link.icon}
          </a>
        ))}
      </nav>
      <div className="freshness">
        <span className="pulse" aria-hidden />
        <span>Live network</span>
      </div>
    </header>
  );
}
