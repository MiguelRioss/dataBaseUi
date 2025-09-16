import axios from "axios";

const API = "https://api.aftership.com/v4";
const KEY = process.env.AFTERSHIP_API_KEY; // defina no ambiente

// 1) Registar um tracking (idempotente; seguro repetir)
async function registerTracking(trackingNumber) {
  const res = await axios.post(
    `${API}/trackings`,
    { tracking: { slug: "portugal-ctt", tracking_number: trackingNumber } },
    { headers: { "aftership-api-key": KEY, "Content-Type": "application/json" } }
  );
  return res.data;
}

// 2) Obter estado atual
async function getTracking(trackingNumber) {
  const res = await axios.get(
    `${API}/trackings/portugal-ctt/${encodeURIComponent(trackingNumber)}`,
    { headers: { "aftership-api-key": KEY } }
  );
  return res.data;
}

// Exemplo de uso
(async () => {
  const code = "RD123456789PT";
  await registerTracking(code);
  const data = await getTracking(code);
  console.log({
    status: data.data.tracking.tag,          // e.g., Delivered, InTransit
    checkpoints: data.data.tracking.checkpoints?.slice(-5) // últimos eventos
  });
})();
