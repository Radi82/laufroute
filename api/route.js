const MAX_COORDINATES = 50;
const MAX_BODY_BYTES = 20_000;
const ALLOWED_ORIGINS = new Set([
  "https://laufroutev12.vercel.app",
  "https://laufroutev12-radi82s-projects.vercel.app",
  "capacitor://localhost",
  "http://localhost"
]);

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST, OPTIONS");
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.ORS_KEY) {
      return res.status(500).json({ error: "Routing service not configured" });
    }

    const bodySize = Number(req.headers["content-length"] || 0);
    if (bodySize > MAX_BODY_BYTES) {
      return res.status(413).json({ error: "Request too large" });
    }

    const body = parseBody(req.body);
    const validationError = validateRouteBody(body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/foot-walking",
      {
        method: "POST",
        headers: {
          Authorization: process.env.ORS_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coordinates: body.coordinates,
          instructions: false
        })
      }
    );

    const text = await response.text();

    if (!response.ok) {
      console.error("ORS ERROR:", text);
      return res.status(response.status).json({ error: "Routing failed" });
    }

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error("FUNCTION ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://laufroutev12.vercel.app";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

function parseBody(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return JSON.parse(raw);
  return raw;
}

function validateRouteBody(body) {
  if (!body || !Array.isArray(body.coordinates)) {
    return "Invalid coordinates";
  }

  if (body.coordinates.length < 2) {
    return "At least two coordinates are required";
  }

  if (body.coordinates.length > MAX_COORDINATES) {
    return `Too many coordinates. Maximum is ${MAX_COORDINATES}`;
  }

  for (const coordinate of body.coordinates) {
    if (!Array.isArray(coordinate) || coordinate.length !== 2) {
      return "Each coordinate must be [lng, lat]";
    }

    const [lng, lat] = coordinate;

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return "Coordinates must be numbers";
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return "Coordinates out of range";
    }
  }

  return null;
}
