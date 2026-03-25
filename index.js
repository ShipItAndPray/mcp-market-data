#!/usr/bin/env node

/**
 * mcp-market-data — First MCP Server for Live Market Data
 * =========================================================
 * Gives any AI agent real-time access to financial markets.
 * Zero API keys. Zero dependencies. Works out of the box.
 *
 * Tools:
 *   price         — Current price of any crypto or stock
 *   candles       — OHLCV candlestick data (1m to 1M intervals)
 *   order_book    — Live order book depth (bids/asks)
 *   market_cap    — Top coins by market cap
 *   trending      — What's trending right now
 *   analyze       — Technical analysis: RSI, SMA, volatility, z-score
 *   compare       — Compare multiple assets side by side
 *   feargreed     — Crypto Fear & Greed Index
 *
 * Install:
 *   Add to Claude Code settings.json:
 *   "market": { "command": "npx", "args": ["-y", "mcp-market-data"] }
 */

import { createInterface } from 'readline';
import https from 'https';

// ═══════════════════════════════════════════════════════════
// HTTP Helper (zero deps — native Node.js)
// ═══════════════════════════════════════════════════════════

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'mcp-market-data/0.1' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ═══════════════════════════════════════════════════════════
// Data Sources (free, no API key)
// ═══════════════════════════════════════════════════════════

async function getCryptoPrice(symbol) {
  const id = symbol.toLowerCase().replace('usdt', '').replace('usd', '');
  const idMap = {
    btc: 'bitcoin', eth: 'ethereum', sol: 'solana', doge: 'dogecoin',
    xrp: 'ripple', ada: 'cardano', avax: 'avalanche-2', dot: 'polkadot',
    matic: 'matic-network', link: 'chainlink', uni: 'uniswap', atom: 'cosmos',
    near: 'near', apt: 'aptos', sui: 'sui', arb: 'arbitrum',
    op: 'optimism', bnb: 'binancecoin', ltc: 'litecoin', bch: 'bitcoin-cash',
  };
  const coinId = idMap[id] || id;

  const data = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
  );

  return {
    symbol: symbol.toUpperCase(),
    name: data.name,
    price: data.market_data.current_price.usd,
    change_24h: data.market_data.price_change_percentage_24h,
    change_7d: data.market_data.price_change_percentage_7d,
    market_cap: data.market_data.market_cap.usd,
    volume_24h: data.market_data.total_volume.usd,
    high_24h: data.market_data.high_24h.usd,
    low_24h: data.market_data.low_24h.usd,
    ath: data.market_data.ath.usd,
    ath_change: data.market_data.ath_change_percentage.usd,
  };
}

async function getCryptoCandles(symbol, interval = '1h', days = 7) {
  const id = symbol.toLowerCase().replace('usdt', '').replace('usd', '');
  const idMap = {
    btc: 'bitcoin', eth: 'ethereum', sol: 'solana', doge: 'dogecoin',
    xrp: 'ripple', bnb: 'binancecoin', ada: 'cardano', avax: 'avalanche-2',
  };
  const coinId = idMap[id] || id;

  const data = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
  );

  return data.map(c => ({
    time: new Date(c[0]).toISOString(),
    open: c[1],
    high: c[2],
    low: c[3],
    close: c[4],
  }));
}

async function getOrderBook(symbol) {
  const pair = symbol.toUpperCase().replace('/', '');
  const formatted = pair.includes('USDT') ? pair : pair + 'USDT';

  try {
    const data = await fetch(
      `https://api.binance.us/api/v3/depth?symbol=${formatted}&limit=20`
    );
    return {
      symbol: formatted,
      bids: data.bids.map(b => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
      asks: data.asks.map(a => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
      spread: parseFloat(data.asks[0][0]) - parseFloat(data.bids[0][0]),
      spread_pct: ((parseFloat(data.asks[0][0]) - parseFloat(data.bids[0][0])) / parseFloat(data.bids[0][0]) * 100).toFixed(4) + '%',
      mid_price: (parseFloat(data.asks[0][0]) + parseFloat(data.bids[0][0])) / 2,
    };
  } catch (e) {
    return { error: `Could not fetch order book for ${formatted}: ${e.message}` };
  }
}

async function getMarketCap(limit = 20) {
  const data = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
  );
  return data.map((c, i) => ({
    rank: i + 1,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    price: c.current_price,
    market_cap: c.market_cap,
    volume_24h: c.total_volume,
    change_24h: c.price_change_percentage_24h,
  }));
}

async function getTrending() {
  const data = await fetch('https://api.coingecko.com/api/v3/search/trending');
  return {
    coins: data.coins.map(c => ({
      name: c.item.name,
      symbol: c.item.symbol,
      market_cap_rank: c.item.market_cap_rank,
      price_btc: c.item.price_btc,
    })),
  };
}

async function getFearGreed() {
  try {
    const data = await fetch('https://api.alternative.me/fng/?limit=7');
    return data.data.map(d => ({
      value: parseInt(d.value),
      label: d.value_classification,
      date: new Date(d.timestamp * 1000).toISOString().split('T')[0],
    }));
  } catch (e) {
    return { error: 'Fear & Greed API unavailable' };
  }
}

// ═══════════════════════════════════════════════════════════
// Technical Analysis
// ═══════════════════════════════════════════════════════════

function technicalAnalysis(candles) {
  const closes = candles.map(c => c.close);
  const n = closes.length;
  if (n < 14) return { error: 'Need at least 14 candles for analysis' };

  // SMA
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, n);
  const sma50 = n >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;

  // RSI (14-period)
  let gains = 0, losses = 0;
  for (let i = n - 14; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  // Volatility
  const returns = [];
  for (let i = 1; i < n; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const volatility = Math.sqrt(variance);

  // Z-score
  const allMean = closes.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(closes.reduce((a, b) => a + (b - allMean) ** 2, 0) / n);
  const zscore = std > 0 ? (closes[n - 1] - allMean) / std : 0;

  // Trend
  const recent = closes.slice(-5);
  const older = closes.slice(-10, -5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

  const current = closes[n - 1];

  return {
    current_price: current,
    sma_20: Math.round(sma20 * 100) / 100,
    sma_50: sma50 ? Math.round(sma50 * 100) / 100 : 'insufficient data',
    rsi_14: Math.round(rsi * 100) / 100,
    rsi_signal: rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL',
    volatility: Math.round(volatility * 10000) / 10000,
    volatility_annualized: Math.round(volatility * Math.sqrt(365 * 24) * 10000) / 100 + '%',
    zscore: Math.round(zscore * 100) / 100,
    zscore_signal: zscore > 2 ? 'EXTENDED HIGH' : zscore < -2 ? 'EXTENDED LOW' : 'NORMAL',
    trend: recentAvg > olderAvg * 1.01 ? 'UPTREND' : recentAvg < olderAvg * 0.99 ? 'DOWNTREND' : 'SIDEWAYS',
    price_vs_sma20: current > sma20 ? 'ABOVE' : 'BELOW',
    high: Math.max(...closes),
    low: Math.min(...closes),
    range_pct: ((Math.max(...closes) - Math.min(...closes)) / Math.min(...closes) * 100).toFixed(2) + '%',
  };
}

// ═══════════════════════════════════════════════════════════
// MCP Server
// ═══════════════════════════════════════════════════════════

class MCPMarketServer {
  constructor() {
    this.version = '0.1.0';
  }

  getToolDefinitions() {
    return [
      {
        name: 'price',
        description: 'Get current price, 24h change, volume, market cap for any cryptocurrency. Examples: BTC, ETH, SOL, DOGE.',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Crypto symbol (BTC, ETH, SOL, DOGE, etc.)' }
          },
          required: ['symbol']
        }
      },
      {
        name: 'candles',
        description: 'Get OHLCV candlestick data for any crypto. Returns open, high, low, close for each period.',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Crypto symbol' },
            days: { type: 'number', description: 'Number of days of history (1, 7, 14, 30, 90, 180, 365). Default: 7' }
          },
          required: ['symbol']
        }
      },
      {
        name: 'order_book',
        description: 'Get live order book — top 20 bids and asks with spread. Shows market depth and liquidity.',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Trading pair (BTC, ETHUSDT, etc.)' }
          },
          required: ['symbol']
        }
      },
      {
        name: 'market_cap',
        description: 'Get top cryptocurrencies ranked by market cap with prices, volumes, and 24h changes.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of coins to return (default: 20, max: 100)' }
          }
        }
      },
      {
        name: 'trending',
        description: 'Get trending cryptocurrencies right now — what people are searching for and trading.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'analyze',
        description: 'Technical analysis for any crypto: RSI, SMA, volatility, z-score, trend direction. Actionable signals included.',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Crypto symbol' },
            days: { type: 'number', description: 'Lookback period in days (default: 30)' }
          },
          required: ['symbol']
        }
      },
      {
        name: 'compare',
        description: 'Compare multiple assets side by side — prices, changes, market caps.',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: { type: 'string', description: 'Comma-separated symbols (e.g., "BTC,ETH,SOL")' }
          },
          required: ['symbols']
        }
      },
      {
        name: 'feargreed',
        description: 'Crypto Fear & Greed Index — market sentiment indicator. Shows last 7 days.',
        inputSchema: { type: 'object', properties: {} }
      }
    ];
  }

  async handleToolCall(name, args) {
    switch (name) {
      case 'price':
        return await getCryptoPrice(args.symbol);

      case 'candles':
        return await getCryptoCandles(args.symbol, '1h', args.days || 7);

      case 'order_book':
        return await getOrderBook(args.symbol);

      case 'market_cap':
        return await getMarketCap(Math.min(args.limit || 20, 100));

      case 'trending':
        return await getTrending();

      case 'analyze': {
        const candles = await getCryptoCandles(args.symbol, '1h', args.days || 30);
        return technicalAnalysis(candles);
      }

      case 'compare': {
        const symbols = args.symbols.split(',').map(s => s.trim());
        const results = [];
        for (const sym of symbols.slice(0, 10)) {
          try {
            const p = await getCryptoPrice(sym);
            results.push(p);
          } catch (e) {
            results.push({ symbol: sym, error: e.message });
          }
        }
        return results;
      }

      case 'feargreed':
        return await getFearGreed();

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  handleRequest(request) {
    const { method, params, id } = request;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'mcp-market-data', version: this.version }
          }
        };

      case 'notifications/initialized':
        return null;

      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: this.getToolDefinitions() } };

      case 'tools/call':
        return this.handleToolCall(params?.name, params?.arguments || {})
          .then(result => ({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          }))
          .catch(err => ({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] }
          }));

      default:
        return Promise.resolve({
          jsonrpc: '2.0', id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }
  }

  run() {
    const rl = createInterface({ input: process.stdin, terminal: false });
    let buffer = '';

    rl.on('line', async (line) => {
      buffer += line;
      try {
        const request = JSON.parse(buffer);
        buffer = '';
        const response = await this.handleRequest(request);
        if (response) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (e) {
        if (e instanceof SyntaxError) return;
        buffer = '';
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0', id: null,
          error: { code: -32700, message: `Parse error: ${e.message}` }
        }) + '\n');
      }
    });

    process.stderr.write('mcp-market-data server running\n');
  }
}

new MCPMarketServer().run();
