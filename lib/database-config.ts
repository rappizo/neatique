export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? "";
}

export function hasValidPostgresDatabaseUrl() {
  const databaseUrl = getDatabaseUrl();
  return databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://");
}
