// tests/setup.ts
// Global Setup untuk Vitest Minja Cloud Server
// Mencegah kebocoran egress Supabase selama pengujian otomatis

const dbUrl = process.env.DATABASE_URL || '';

if (dbUrl.includes('supabase.com') || dbUrl.includes('pooler.supabase.com')) {
  throw new Error(
    `[CRITICAL SECURITY GUARD] Automated test DILARANG KERAS menembak database live Supabase (${dbUrl})! ` +
    `Gunakan PostgreSQL lokal (postgresql://postgres:postgres@localhost:5432/minjaphotobooth) untuk mencegah kuota egress bulanan Supabase habis.`
  );
}

