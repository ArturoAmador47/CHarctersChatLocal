/** Turns a Supabase/PostgREST failure into something a user can act on. */
export function describeDbError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes('schema cache') || message.includes('does not exist')) {
    return 'The Supabase tables are missing. Run supabase/schema.sql in your project.';
  }
  if (message.toLowerCase().includes('row-level security')) {
    return 'Supabase rejected the write (row level security). Check the table policies.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return "Couldn't reach Supabase. Check your internet connection.";
  }
  if (message.includes('JWT') || message.includes('API key')) {
    return 'Supabase rejected the credentials. Check VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.';
  }
  return message;
}
