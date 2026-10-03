export function allowedOrigins(): string[] {
  const value = process.env.ALLOWED_ORIGINS ?? 'http://localhost:4200';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
