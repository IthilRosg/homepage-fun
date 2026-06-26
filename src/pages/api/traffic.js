export default async function handler(req, res) {
  try {
    const response = await fetch("http://10.90.0.4:5000/api/traffic");
    if (!response.ok) {
      throw new Error(`Traffic API responded with status: ${response.status}`);
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
