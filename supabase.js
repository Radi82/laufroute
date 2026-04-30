/************************************************************
 * 🔐 SUPABASE INIT
 ************************************************************/

const SUPABASE_URL = "https://llkkzdgiyaugosemiodf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsa2t6ZGdpeWF1Z29zZW1pb2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzQxNDUsImV4cCI6MjA5MzE1MDE0NX0.4PcyFTAO21Ei6Jxy2SroleTeTE5RxmyX52RNqE5bieI";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);