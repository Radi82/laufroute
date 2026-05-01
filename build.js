const fs = require("fs");

const template = fs.readFileSync("supabase.template.js", "utf8");

const output = template
    .replace("__SUPABASE_URL__", process.env.SUPABASE_URL)
    .replace("__SUPABASE_KEY__", process.env.SUPABASE_KEY);

fs.writeFileSync("supabase.js", output);

console.log("✅ supabase.js generated");