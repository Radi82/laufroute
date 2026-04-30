export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.heigit.org/v2/directions/foot-walking",
      {
        method: "POST",
        headers: {
          "Authorization": process.env.ORS_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
