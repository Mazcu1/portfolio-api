const express = require("express");
const cors = require("cors");
const yahooFinance = require("yahoo-finance2").default;

const app = express();
app.use(cors());

// Mapa de CEDEARs a tickers de Yahoo Finance
const CEDEAR_MAP = {
  AMZN: "AMZN",
  MSFT: "MSFT",
  LLY:  "LLY",
  NVDA: "NVDA",
  TSLA: "TSLA",
  BABA: "BABA",
  BRKB: "BRK-B",
  NU:   "NU",
  PBR:  "PBR",
  SPY:  "SPY",
  GOOGL:"GOOGL",
  VIST: "VIST",
  MELI: "MELI",
};

// Tickers locales y bonos (precio en ARS desde Ámbito)
const LOCAL_TICKERS = ["YPFD", "PAMP", "TGNO4", "BMA", "BHIP", "AL30", "GD30", "GD35"];

// Traer precio USD de Yahoo
async function getUSDPrices() {
  const results = {};
  for (const [cedear, yahoo] of Object.entries(CEDEAR_MAP)) {
    try {
      const quote = await yahooFinance.quote(yahoo);
      results[cedear] = quote.regularMarketPrice;
    } catch (e) {
      results[cedear] = null;
    }
  }
  return results;
}

// Traer precio ARS de Ámbito
async function getARSPrice(ticker) {
  try {
    const res = await fetch(`https://data.ambito.com/api/v1/cotizacion/panels/byPanel/PANEL_ACCIONES_LIDERES`);
    const data = await res.json();
    const item = data.find(d => d.simbolo === ticker);
    return item ? parseFloat(item.ultimo.replace(",", ".")) : null;
  } catch {
    return null;
  }
}

// Endpoint principal
app.get("/prices", async (req, res) => {
  try {
    // Precio CCL (usamos GD30 como referencia)
    const ccl = 1429; // TODO: traer dinámico

    const usdPrices = await getUSDPrices();

    const prices = {};

    // CEDEARs: precio USD × CCL
    for (const [ticker, usdPrice] of Object.entries(usdPrices)) {
      if (usdPrice) {
        prices[ticker] = Math.round(usdPrice * ccl);
      }
    }

    // Locales y bonos: precio ARS directo
    for (const ticker of LOCAL_TICKERS) {
      const arsPrice = await getARSPrice(ticker);
      if (arsPrice) prices[ticker] = arsPrice;
    }

    res.json({ prices, ccl, updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("Portfolio API running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
