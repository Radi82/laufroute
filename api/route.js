export default async function handler(req, res) {
  try {
    // 🔥 Request Body sicher holen
    const raw = req.body || await req.json?.();

    const body = typeof raw === "string"
      ? JSON.parse(raw)
      : raw;

    console.log("📦 Incoming body:", body);

    // 🔴 Validierung
    if (!body || !Array.isArray(body.coordinates) || body.coordinates.length < 2) {
      return res.status(400).json({
        error: "Invalid coordinates",
        received: body
      });
    }

    // 🌍 ORS Request
    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/foot-walking",
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

    // 💥 ORS Fehler sauber zurückgeben
    if (!response.ok) {
      console.error("❌ ORS ERROR:", text);

      return res.status(500).json({
        error: "ORS failed",
        details: text
      });
    }

    // ✅ Erfolgsfall
    const data = JSON.parse(text);

    return res.status(200).json(data);

  } catch (err) {
    console.error("🔥 FUNCTION ERROR:", err);

    return res.status(500).json({
      error: err.message
    });
  }
}
