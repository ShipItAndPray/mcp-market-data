# mcp-market-data

First MCP server for live market data. Gives any AI agent real-time crypto prices, candlestick charts, order books, technical analysis, and market sentiment.

**Zero API keys. Zero dependencies. Works out of the box.**

[![mcp-market-data MCP server](https://glama.ai/mcp/servers/ShipItAndPray/mcp-market-data/badges/card.svg)](https://glama.ai/mcp/servers/ShipItAndPray/mcp-market-data)

## In Action (live data, March 25 2026)

```
BTC: $70,741  24h: +2.3%  Vol: $39.8B  MCap: $1.42T
ETH: $2,162   24h: +2.5%  Vol: $17.5B
SOL: $91.70   24h: +3.2%  Vol: $3.9B

Technical Analysis (BTC 30-day):
  RSI(14): 64.85 → NEUTRAL
  SMA(20): $69,884
  Trend: SIDEWAYS
  Z-score: 0.57 → NORMAL
  Volatility: 101.62% annualized

Order Book (BTC/USDT):
  Spread: $15.17 (0.021%)
  Best bid: $70,750.15
  Best ask: $70,765.32

Fear & Greed Index:
  2026-03-25: 14 (Extreme Fear)
  2026-03-24: 11 (Extreme Fear)

Trending: TAO, PENGU, SIREN, HYPE, BP
```

## Install

Add to Claude Code `settings.json`:

```json
"mcpServers": {
  "market": {
    "command": "npx",
    "args": ["-y", "mcp-market-data"]
  }
}
```

## Tools

8 tools for any AI agent:

| Tool | What it does |
|------|-------------|
| `price` | Current price, 24h change, volume, market cap, ATH for any crypto |
| `candles` | OHLCV candlestick data — 1 day to 1 year of history |
| `order_book` | Live order book depth — top 20 bids/asks, spread, mid price |
| `market_cap` | Top 100 cryptos ranked by market cap |
| `trending` | What's trending right now on the market |
| `analyze` | Technical analysis: RSI, SMA(20/50), volatility, z-score, trend signals |
| `compare` | Compare up to 10 assets side by side |
| `feargreed` | Crypto Fear & Greed Index — 7-day sentiment history |

## Examples

**"What's BTC at?"**
```
price(symbol: "BTC")
→ { price: 71234.56, change_24h: +2.3%, volume_24h: $28B, market_cap: $1.4T }
```

**"Is ETH overbought?"**
```
analyze(symbol: "ETH")
→ { rsi_14: 72.3, rsi_signal: "OVERBOUGHT", trend: "UPTREND", zscore: 1.8 }
```

**"Show me the order book for SOL"**
```
order_book(symbol: "SOL")
→ { bids: [...], asks: [...], spread: $0.02, spread_pct: "0.01%" }
```

**"What's trending?"**
```
trending()
→ { coins: [{ name: "Pepe", symbol: "PEPE", rank: 28 }, ...] }
```

**"Compare BTC vs ETH vs SOL"**
```
compare(symbols: "BTC,ETH,SOL")
→ [{ symbol: "BTC", price: 71234, change_24h: +2.3% }, ...]
```

**"What's the market mood?"**
```
feargreed()
→ [{ value: 73, label: "Greed", date: "2026-03-25" }, ...]
```

## Data Sources

- **CoinGecko** — prices, market cap, trending, candles (free, no key)
- **Binance.US** — order book depth (free, no key)
- **Alternative.me** — Fear & Greed Index (free, no key)

## Test Results

```
12/12 evals passing on live data:
  ✓ Initialize returns version
  ✓ Lists all 8 tools
  ✓ Price returns BTC with real data
  ✓ Price returns ETH
  ✓ Candles returns OHLC array
  ✓ Order book returns bids and asks
  ✓ Market cap returns ranked list
  ✓ Trending returns coins
  ✓ Analyze returns RSI + signals
  ✓ Compare returns multiple assets
  ✓ Fear & Greed returns index
  ✓ Handles bad symbol gracefully
```

## Why

- AI agents discussing markets can't check live prices. Now they can.
- No API keys to configure. No accounts to create. Just install and go.
- Technical analysis built in — agents get actionable signals, not just numbers.
- First MCP server purpose-built for financial data.

## License

MIT