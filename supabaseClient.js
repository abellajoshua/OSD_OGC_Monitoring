import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://axmuxanqmhuvxefhazot.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bXV4YW5xbWh1dnhlZmhhem90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc5NjgsImV4cCI6MjA4NTgwMzk2OH0.u4O0TXfrpAL9Tt7b-Yv5KEU9OFV5fhtRMf74KFohKJw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
