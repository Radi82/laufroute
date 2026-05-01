/************************************************************
 * 🔐 SUPABASE INIT EXAMPLE
 * Kopiere diese Datei zu supabase.js und trage deine Werte ein.
 ************************************************************/

const SUPABASE_URL = "https://DEIN-PROJEKT.supabase.co";
const SUPABASE_KEY = "DEIN-PUBLISHABLE-KEY";

window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);