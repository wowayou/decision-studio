import { defineConfig, type Plugin } from 'vite';

// The production page has no reason to contact any origin, including its own server
// after load: everything is evaluated in the browser. The policy turns that promise
// into a browser-enforced boundary. Dev builds skip it so Vite's HMR socket keeps working.
// `frame-ancestors` cannot be set from a meta tag; set it as a header if this is ever hosted.
export const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

function securityHeaders(): Plugin {
  return {
    name: 'decision-studio-security-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: html => html.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">`),
    },
  };
}

export default defineConfig({ plugins: [securityHeaders()] });
