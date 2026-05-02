const fs = require("fs");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    if (fs.existsSync("supabase.js")) {
        console.log("supabase.js already exists, keeping local file");
        process.exit(0);
    }

    console.warn("SUPABASE_URL/SUPABASE_KEY fehlen, supabase.js wird nicht erzeugt");
    process.exit(0);
}

const template = fs.readFileSync("supabase.template.js", "utf8");

const output = template
    .replace("__SUPABASE_URL__", process.env.SUPABASE_URL)
    .replace("__SUPABASE_KEY__", process.env.SUPABASE_KEY);

fs.writeFileSync("supabase.js", output);

console.log("✅ supabase.js generated");
