/**
 * API index. Deliberately plain text, not a designed page: the consumer UI is
 * a separate application.
 */
export default function ApiIndex() {
  const endpoints = [
    'GET  /api/health',
    'GET  /api/cities',
    'GET  /api/categories',
    'GET  /api/venues?city=bhavnagar&q=',
    'GET  /api/organisers?city=bhavnagar',
    'GET  /api/feed?city=bhavnagar&range=today',
    'GET  /api/feed?range=weekend&lang=gu',
    'GET  /api/listings/:id',
  ];
  return (
    <main style={{ fontFamily: 'ui-monospace, monospace', padding: 24, lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 18 }}>Aaje Su? — backend API</h1>
      <p>Pilot city: Bhavnagar. All times stored in UTC, rendered in IST.</p>
      <pre>{endpoints.join('\n')}</pre>
    </main>
  );
}
