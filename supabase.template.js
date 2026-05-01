/************************************************************
 * 🔐 SUPABASE TEMPLATE
 * Wird beim Build zu supabase.js ersetzt
 ************************************************************/

const SUPABASE_URL = "__SUPABASE_URL__";
const SUPABASE_KEY = "__SUPABASE_KEY__";

window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);