export default async function handler(req, res) {
  try {
    // 🔥 BODY SAFE PARSE
    const body = req.body || await req.json?.();

    if (!body || !body.coordinates) {
      return res.status(400).json({
        error: "No coordinates received"
      });
    }

    const response = await fetch(
      "https://api.heigit.org/v2/directions/foot-walking",
      {
        method: "POST",
        headers: {
          "Authorization": process.env.ORS_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const text = await response.text();

    // 🔥 DEBUG FALLBACK (wichtig!)
    if (!response.ok) {
      console.log("ORS ERROR:", text);
      return res.status(500).json({
        error: "ORS failed",
        details: text
      });
    }

    const data = JSON.parse(text);

    return res.status(200).json(data);

  } catch (err) {
    console.error("FUNCTION ERROR:", err);

    return res.status(500).json({
      error: err.message
    });
  }
}
