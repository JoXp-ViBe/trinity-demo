/**
 * TRINITY DEMO — Mock Data Interceptor
 * =====================================
 * Monkey-patches window.fetch and WebSocket to return realistic but FAKE data.
 * NO real strategy information is exposed. All names, indicators, and data are generic.
 *
 * Usage: <script src="mock-data.js"></script> (before dashboard code)
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const NOW = Date.now();
  const ISO_NOW = new Date(NOW).toISOString();
  const DAY_MS = 86400000;
  const HOUR_MS = 3600000;

  function isoAgo(ms) { return new Date(NOW - ms).toISOString(); }
  function isoAt(ts) { return new Date(ts).toISOString(); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function round4(n) { return Math.round(n * 10000) / 10000; }
  function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTS — GENERIC NAMES ONLY (no real strategy info)
  // ═══════════════════════════════════════════════════════════════════════════

  const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'DOGE', 'SUI', 'LINK', 'SEI'];
  const STOCK_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'META', 'GOOG'];
  const SIDES = ['LONG', 'SHORT'];
  const SETUP_TYPES = ['Breakout', 'Reversal', 'Continuation', 'Mean Reversion'];
  const REGIMES = ['Growth', 'Expansion', 'Neutral', 'Contraction', 'Recession'];
  const ENTRY_REASONS = [
    'Multi-factor confluence detected',
    'Strong momentum breakout confirmed',
    'Mean reversion signal at key level',
    'Trend continuation after pullback',
    'Volume surge with price confirmation',
    'Key support bounce with divergence',
    'Resistance break with follow-through',
    'Oversold bounce in uptrend context'
  ];

  const CRYPTO_PRICES = {
    BTC: 97250.00, ETH: 3420.50, SOL: 198.30, DOGE: 0.3245,
    SUI: 4.12, LINK: 24.80, SEI: 0.7850
  };

  const STOCK_PRICES = {
    AAPL: 245.30, TSLA: 412.80, NVDA: 890.50, MSFT: 478.20,
    AMZN: 225.60, META: 612.40, GOOG: 192.70
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TRADE GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════

  function generateTrades(symbols, priceMap, leverage, count, prefix) {
    const trades = [];
    const openCount = prefix === 'C' ? 3 : 2; // 3 open crypto, 2 open hip3

    for (let i = 0; i < count; i++) {
      const isOpen = i < openCount;
      const sym = isOpen ? symbols[i % symbols.length] : pick(symbols);
      const side = pick(SIDES);
      const basePrice = priceMap[sym];
      const volatility = sym === 'BTC' ? 0.04 : sym === 'ETH' ? 0.06 : sym === 'DOGE' ? 0.12 : 0.08;

      const entryOffset = rand(-volatility, volatility);
      const entryPrice = round4(basePrice * (1 + entryOffset));

      // R-multiple distribution: mostly small wins/losses, occasional big win
      let rMult;
      const rRoll = Math.random();
      if (rRoll < 0.35) rMult = -1.0; // stopped out
      else if (rRoll < 0.55) rMult = round2(rand(0.5, 1.5));
      else if (rRoll < 0.75) rMult = round2(rand(1.5, 2.5));
      else if (rRoll < 0.90) rMult = round2(rand(2.5, 3.5));
      else rMult = round2(rand(3.5, 5.0)); // big winner

      const riskPercent = 0.01; // 1% risk
      const slDistance = basePrice * riskPercent * (leverage >= 10 ? 1 : 2);
      const slPrice = side === 'LONG'
        ? round4(entryPrice - slDistance)
        : round4(entryPrice + slDistance);
      const tpDistance = slDistance * rand(2.0, 4.0);
      const tpPrice = side === 'LONG'
        ? round4(entryPrice + tpDistance)
        : round4(entryPrice - tpDistance);

      const pnlPercent = rMult * riskPercent * leverage * 100;
      const notional = rand(2000, 5000);
      const quantity = round4(notional / entryPrice);
      const pnlUsd = round2(notional * pnlPercent / 100);
      const feeUsd = round2(notional * 0.00035 * 2); // round trip taker ~0.07%

      let exitPrice;
      if (!isOpen) {
        if (side === 'LONG') {
          exitPrice = round4(entryPrice * (1 + rMult * riskPercent));
        } else {
          exitPrice = round4(entryPrice * (1 - rMult * riskPercent));
        }
      }

      // Time: spread across Jan-Feb 2026
      const entryTs = NOW - randInt(1, 45) * DAY_MS - randInt(0, 23) * HOUR_MS;
      const exitTs = isOpen ? null : entryTs + randInt(1, 48) * HOUR_MS;

      // Current price for open trades
      const currentPrice = isOpen
        ? round4(entryPrice * (1 + rand(-0.02, 0.03) * (side === 'LONG' ? 1 : -1)))
        : exitPrice;

      const currentPnl = isOpen
        ? round2((side === 'LONG' ? (currentPrice - entryPrice) : (entryPrice - currentPrice)) * quantity * leverage)
        : pnlUsd;

      trades.push({
        id: `${prefix}-${String(i + 1).padStart(4, '0')}`,
        symbol: sym,
        side: side,
        entry_price: entryPrice,
        exit_price: isOpen ? null : exitPrice,
        current_price: currentPrice,
        pnl_usd: isOpen ? currentPnl : pnlUsd,
        pnl_percent: isOpen ? round2(currentPnl / notional * 100) : round2(pnlPercent),
        r_multiple: isOpen ? round2(currentPnl / (notional * riskPercent)) : rMult,
        entry_time: isoAt(entryTs),
        exit_time: isOpen ? null : isoAt(exitTs),
        status: isOpen ? 'open' : 'closed',
        quantity: quantity,
        leverage: leverage,
        stop_loss: slPrice,
        take_profit: tpPrice,
        fee_usd: isOpen ? round2(feeUsd / 2) : feeUsd,
        regime: pick(REGIMES),
        trinity_score: randInt(60, 95),
        setup_type: pick(SETUP_TYPES),
        confidence: round2(rand(0.60, 0.95)),
        entry_reason: pick(ENTRY_REASONS)
      });
    }

    // Sort by entry_time descending (newest first)
    trades.sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));
    return trades;
  }

  const CRYPTO_TRADES = generateTrades(CRYPTO_SYMBOLS, CRYPTO_PRICES, 15, 55, 'C');
  const HIP3_TRADES = generateTrades(STOCK_SYMBOLS, STOCK_PRICES, 3, 40, 'H');

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITIONS (from open trades)
  // ═══════════════════════════════════════════════════════════════════════════

  function tradesAsPositions(trades) {
    return trades
      .filter(t => t.status === 'open')
      .map(t => ({
        symbol: t.symbol,
        side: t.side,
        size: t.quantity,
        notional: round2(t.quantity * t.entry_price),
        entry_price: t.entry_price,
        current_price: t.current_price,
        liquidation_price: t.side === 'LONG'
          ? round4(t.entry_price * (1 - 0.9 / t.leverage))
          : round4(t.entry_price * (1 + 0.9 / t.leverage)),
        unrealized_pnl: t.pnl_usd,
        unrealized_pnl_percent: t.pnl_percent,
        leverage: t.leverage,
        margin_used: round2(t.quantity * t.entry_price / t.leverage),
        stop_loss: t.stop_loss,
        take_profit: t.take_profit,
        entry_time: t.entry_time,
        r_multiple: t.r_multiple,
        regime: t.regime,
        setup_type: t.setup_type
      }));
  }

  const CRYPTO_POSITIONS = tradesAsPositions(CRYPTO_TRADES);
  const HIP3_POSITIONS = tradesAsPositions(HIP3_TRADES);

  // ═══════════════════════════════════════════════════════════════════════════
  // CANDLE GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════

  function generateCandles(basePrice, count, intervalMs) {
    const candles = [];
    let price = basePrice * rand(0.85, 0.95); // start lower
    const trend = 0.0002; // slight uptrend
    const vol = basePrice > 1000 ? 0.008 : basePrice > 10 ? 0.012 : 0.02;

    for (let i = 0; i < count; i++) {
      const time = NOW - (count - i) * intervalMs;
      const open = price;
      const change = (Math.random() - 0.48 + trend) * vol * price;
      const close = round4(open + change);
      const high = round4(Math.max(open, close) + Math.abs(change) * rand(0.1, 1.5));
      const low = round4(Math.min(open, close) - Math.abs(change) * rand(0.1, 1.5));
      const volume = round2(rand(100, 50000) * (basePrice > 1000 ? 0.1 : basePrice > 10 ? 10 : 1000));

      candles.push({
        time: Math.floor(time / 1000),
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume
      });

      price = close;
    }
    return candles;
  }

  // Cache candles per symbol so repeated requests get same data
  const _candleCache = {};
  function getCandlesForSymbol(symbol) {
    if (_candleCache[symbol]) return _candleCache[symbol];
    const base = CRYPTO_PRICES[symbol] || STOCK_PRICES[symbol] || 100;
    _candleCache[symbol] = generateCandles(base, 500, 5 * 60 * 1000); // 5m candles
    return _candleCache[symbol];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EQUITY CURVE GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════

  function generateEquityCurve(startBalance, days, dailyReturn, volatility) {
    const curve = [];
    let bal = startBalance;
    for (let d = 0; d < days; d++) {
      const date = isoAt(NOW - (days - d) * DAY_MS);
      bal = round2(bal * (1 + dailyReturn + rand(-volatility, volatility)));
      curve.push({ date: date.split('T')[0], equity: bal });
    }
    return curve;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ALERT / ERROR GENERATORS
  // ═══════════════════════════════════════════════════════════════════════════

  function generateAlerts(count) {
    const alerts = [];
    const msgs = [
      { level: 'info', msg: 'Scheduled scan completed successfully' },
      { level: 'info', msg: 'Position BTC LONG trailing stop updated' },
      { level: 'info', msg: 'Heartbeat check passed — all systems nominal' },
      { level: 'info', msg: 'Daily P&L report generated: +$312.40' },
      { level: 'info', msg: 'New signal evaluated for ETH — confidence below threshold' },
      { level: 'warning', msg: 'API latency elevated: 230ms (threshold: 200ms)' },
      { level: 'warning', msg: 'Memory usage at 78% — monitoring closely' },
      { level: 'info', msg: 'Risk guardian check passed — all positions within limits' },
      { level: 'warning', msg: 'Drawdown approaching soft limit: 4.5% (threshold: 5.0%)' },
      { level: 'info', msg: 'Candle cache refreshed for 7 symbols' },
      { level: 'info', msg: 'Database connection pool healthy: 3/10 active' },
      { level: 'info', msg: 'On-chain regime updated: Growth (score 72)' },
      { level: 'warning', msg: 'Rate limit warning: 45/50 requests in window' },
      { level: 'info', msg: 'Stop loss adjusted for SOL LONG — trailing +1.2R' }
    ];

    for (let i = 0; i < count; i++) {
      const m = pick(msgs);
      alerts.push({
        id: uuid(),
        timestamp: isoAgo(randInt(0, 24) * HOUR_MS + randInt(0, 59) * 60000),
        level: m.level,
        message: m.msg,
        source: pick(['crypto-bot', 'hip3-bot', 'monitor', 'system']),
        acknowledged: i > 5
      });
    }
    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return alerts;
  }

  function generateErrors(count) {
    const errors = [];
    const msgs = [
      { msg: 'Temporary connection timeout to price feed', resolved: true },
      { msg: 'Order rejected: insufficient margin (auto-recovered)', resolved: true },
      { msg: 'WebSocket reconnection after brief disconnect', resolved: true },
      { msg: 'Rate limit hit — backed off 2s and retried', resolved: true },
      { msg: 'Stale candle data detected — refreshed cache', resolved: true },
      { msg: 'Database pool exhausted briefly — expanded pool', resolved: true },
      { msg: 'DNS resolution delay for API endpoint', resolved: true }
    ];

    for (let i = 0; i < count; i++) {
      const m = pick(msgs);
      errors.push({
        id: uuid(),
        timestamp: isoAgo(randInt(2, 72) * HOUR_MS),
        message: m.msg,
        resolved: m.resolved,
        source: pick(['crypto-bot', 'hip3-bot', 'system']),
        stack: null
      });
    }
    errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return errors;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COIN SCANNER (FAKE altcoin data)
  // ═══════════════════════════════════════════════════════════════════════════

  function generateCoinScanner() {
    const coins = [
      { symbol: 'RENDER', name: 'Render', sector: 'AI/GPU' },
      { symbol: 'FET', name: 'Fetch.ai', sector: 'AI' },
      { symbol: 'INJ', name: 'Injective', sector: 'DeFi' },
      { symbol: 'TIA', name: 'Celestia', sector: 'Modular' },
      { symbol: 'PYTH', name: 'Pyth Network', sector: 'Oracle' },
      { symbol: 'JUP', name: 'Jupiter', sector: 'DEX' },
      { symbol: 'WIF', name: 'dogwifhat', sector: 'Meme' },
      { symbol: 'ONDO', name: 'Ondo Finance', sector: 'RWA' },
      { symbol: 'STRK', name: 'Starknet', sector: 'L2' },
      { symbol: 'APT', name: 'Aptos', sector: 'L1' },
      { symbol: 'ARB', name: 'Arbitrum', sector: 'L2' },
      { symbol: 'OP', name: 'Optimism', sector: 'L2' },
      { symbol: 'NEAR', name: 'NEAR Protocol', sector: 'L1' },
      { symbol: 'AVAX', name: 'Avalanche', sector: 'L1' },
      { symbol: 'ATOM', name: 'Cosmos', sector: 'Interop' },
      { symbol: 'DOT', name: 'Polkadot', sector: 'Interop' },
      { symbol: 'AAVE', name: 'Aave', sector: 'DeFi' },
      { symbol: 'MKR', name: 'Maker', sector: 'DeFi' },
      { symbol: 'PENDLE', name: 'Pendle', sector: 'DeFi' },
      { symbol: 'TAO', name: 'Bittensor', sector: 'AI' }
    ];

    return coins.map(c => ({
      symbol: c.symbol,
      name: c.name,
      sector: c.sector,
      price: round4(rand(0.5, 500)),
      change_24h: round2(rand(-8, 15)),
      change_7d: round2(rand(-15, 30)),
      volume_24h: round2(rand(10, 500) * 1000000),
      market_cap: round2(rand(100, 5000) * 1000000),
      momentum_score: randInt(20, 95),
      signal: pick(['strong_buy', 'buy', 'neutral', 'sell']),
      relative_strength: round2(rand(30, 95)),
      breakout_proximity: round2(rand(0, 100))
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  function generateSessions() {
    return {
      sessions: [
        { name: 'Asian', start: '00:00', end: '08:00', trades: 42, win_rate: 58.3, avg_r: 0.95, total_r: 39.9, best_setup: 'Breakout' },
        { name: 'European', start: '08:00', end: '14:00', trades: 68, win_rate: 64.7, avg_r: 1.35, total_r: 91.8, best_setup: 'Continuation' },
        { name: 'American', start: '14:00', end: '21:00', trades: 55, win_rate: 63.6, avg_r: 1.22, total_r: 67.1, best_setup: 'Reversal' },
        { name: 'Late Night', start: '21:00', end: '00:00', trades: 22, win_rate: 59.1, avg_r: 1.05, total_r: 23.1, best_setup: 'Mean Reversion' }
      ],
      best_session: 'European',
      worst_session: 'Late Night',
      by_day: [
        { day: 'Monday', trades: 32, win_rate: 62.5, avg_r: 1.18 },
        { day: 'Tuesday', trades: 29, win_rate: 65.5, avg_r: 1.42 },
        { day: 'Wednesday', trades: 31, win_rate: 58.1, avg_r: 0.98 },
        { day: 'Thursday', trades: 28, win_rate: 64.3, avg_r: 1.31 },
        { day: 'Friday', trades: 26, win_rate: 61.5, avg_r: 1.15 },
        { day: 'Saturday', trades: 22, win_rate: 63.6, avg_r: 1.25 },
        { day: 'Sunday', trades: 19, win_rate: 57.9, avg_r: 0.89 }
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EQUITY PER SYMBOL
  // ═══════════════════════════════════════════════════════════════════════════

  function generateEquitySymbols(symbols) {
    const result = {};
    for (const sym of symbols) {
      result[sym] = generateEquityCurve(0, 45, rand(0.005, 0.02), 0.015);
    }
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK ROUTE DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Each route is: { pattern, method, handler }
   * pattern: string or RegExp matched against the URL pathname
   * handler: function(url, options) => response body (object/array)
   */

  // --- Crypto bot (:9100) responses ---

  const CRYPTO_STATUS = {
    running: true,
    mode: 'live',
    regime: 'bullish',
    onchain_regime: 'Growth',
    onchain_score: 72,
    onchain_enabled: true,
    apiWeight: 23,
    cpu_percent: 12.5,
    memory_percent: 45.2,
    memory_used: '1.2GB',
    memory_total: '4.0GB',
    disk_percent: 35,
    uptime: '12d 5h 32m',
    uptime_seconds: 1063920,
    version: 'v2.3',
    bot_version: 'v2.3',
    balance: 15420.50,
    wallet_address: '0xDEMO...1234',
    market_open: true,
    strategy: 'Adaptive Strategy',
    active_positions: CRYPTO_POSITIONS.length,
    max_positions: 8,
    guardian_status: 'OK',
    soft_drawdown: 5.0,
    hard_drawdown: 8.0,
    current_drawdown: 1.2
  };

  const HIP3_STATUS = {
    running: true,
    mode: 'live',
    regime: 'bullish',
    onchain_regime: 'Expansion',
    onchain_score: 68,
    onchain_enabled: true,
    apiWeight: 15,
    cpu_percent: 8.3,
    memory_percent: 38.5,
    memory_used: '0.8GB',
    memory_total: '4.0GB',
    disk_percent: 35,
    uptime: '10d 14h 18m',
    uptime_seconds: 916680,
    version: 'v2.3',
    bot_version: 'v2.3',
    balance: 12850.30,
    wallet_address: '0xDEMO...5678',
    market_open: true,
    strategy: 'Trend Following',
    active_positions: HIP3_POSITIONS.length,
    max_positions: 4,
    guardian_status: 'OK',
    soft_drawdown: 5.0,
    hard_drawdown: 6.5,
    current_drawdown: 0.8
  };

  const CRYPTO_STATS = {
    balance: 15420.50,
    initial_balance: 10000,
    total_pnl: 5420.50,
    total_pnl_percent: 54.2,
    win_rate: 62.5,
    total_trades: 187,
    wins: 117,
    losses: 70,
    profit_factor: 2.35,
    max_drawdown: 6.8,
    current_drawdown: 1.2,
    total_r: 234.5,
    avg_r: 1.25,
    r_per_week: 8.3,
    r_today: 2.1,
    r_week: 15.4,
    r_month: 42.8,
    current_streak: 3,
    best_streak: 11,
    worst_streak: -4,
    expectancy: 1.25,
    sharpe_ratio: 2.1,
    recovery_factor: 7.8,
    pnl_today: 312.40,
    trades_today: 3,
    total_fees: -187.30,
    avg_trade_duration: '6h 24m',
    longest_trade: '2d 18h',
    shortest_trade: '12m',
    setup_breakdown: {
      'Breakout': { trades: 62, wins: 42, losses: 20, r: 98.5, win_rate: 67.7, avg_r: 1.59 },
      'Reversal': { trades: 55, wins: 31, losses: 24, r: 72.3, win_rate: 56.4, avg_r: 1.31 },
      'Continuation': { trades: 45, wins: 30, losses: 15, r: 45.2, win_rate: 66.7, avg_r: 1.00 },
      'Mean Reversion': { trades: 25, wins: 14, losses: 11, r: 18.5, win_rate: 56.0, avg_r: 0.74 }
    }
  };

  const HIP3_STATS = {
    balance: 12850.30,
    initial_balance: 10000,
    total_pnl: 2850.30,
    total_pnl_percent: 28.5,
    win_rate: 59.8,
    total_trades: 132,
    wins: 79,
    losses: 53,
    profit_factor: 2.05,
    max_drawdown: 5.1,
    current_drawdown: 0.8,
    total_r: 168.2,
    avg_r: 1.27,
    r_per_week: 6.4,
    r_today: 1.5,
    r_week: 11.2,
    r_month: 31.5,
    current_streak: 2,
    best_streak: 8,
    worst_streak: -3,
    expectancy: 1.12,
    sharpe_ratio: 1.85,
    recovery_factor: 5.6,
    pnl_today: 187.20,
    trades_today: 2,
    total_fees: -98.40,
    avg_trade_duration: '8h 45m',
    longest_trade: '3d 6h',
    shortest_trade: '25m',
    setup_breakdown: {
      'Breakout': { trades: 38, wins: 24, losses: 14, r: 52.1, win_rate: 63.2, avg_r: 1.37 },
      'Reversal': { trades: 35, wins: 19, losses: 16, r: 38.8, win_rate: 54.3, avg_r: 1.11 },
      'Continuation': { trades: 37, wins: 24, losses: 13, r: 55.3, win_rate: 64.9, avg_r: 1.49 },
      'Mean Reversion': { trades: 22, wins: 12, losses: 10, r: 22.0, win_rate: 54.5, avg_r: 1.00 }
    }
  };

  const CRYPTO_CAPITAL_EVENTS = {
    capital_events: {
      total_deposits: 10000,
      total_withdrawals: 2000,
      net_cash_flow: 8000,
      events: [
        { timestamp: '2026-01-01T10:00:00Z', type: 'deposit', amount: 10000, note: 'Initial capital' },
        { timestamp: '2026-01-15T10:00:00Z', type: 'deposit', amount: 2000, note: 'Additional capital' },
        { timestamp: '2026-02-01T14:00:00Z', type: 'withdrawal', amount: 2000, note: 'Profit withdrawal' }
      ]
    },
    normalized_stats: {
      trading_pnl: 7420.50,
      trading_roi: 74.2,
      initial_balance: 10000
    }
  };

  const HIP3_CAPITAL_EVENTS = {
    capital_events: {
      total_deposits: 10000,
      total_withdrawals: 0,
      net_cash_flow: 10000,
      events: [
        { timestamp: '2026-01-05T09:00:00Z', type: 'deposit', amount: 10000, note: 'Initial capital' }
      ]
    },
    normalized_stats: {
      trading_pnl: 2850.30,
      trading_roi: 28.5,
      initial_balance: 10000
    }
  };

  const SERVICES = {
    postgres: { status: 'connected', latency: 2, version: '15.4' },
    redis: { status: 'connected', latency: 1, version: '7.2' },
    exchange: { status: 'connected', latency: 45, last_request: isoAgo(30000) }
  };

  const ANALYTICS_COMPARISON = {
    btc_performance: 12.5,
    eth_performance: 8.3,
    spy_performance: 5.2,
    trinity_performance: 54.2,
    trinity_crypto: 54.2,
    trinity_hip3: 28.5,
    period: '45d',
    data: generateEquityCurve(100, 45, 0.005, 0.01).map((p, i) => ({
      date: p.date,
      trinity: p.equity,
      btc: round2(100 + (i * 12.5 / 45) + rand(-1, 1)),
      eth: round2(100 + (i * 8.3 / 45) + rand(-1.5, 1.5)),
      spy: round2(100 + (i * 5.2 / 45) + rand(-0.5, 0.5))
    }))
  };

  // --- Monitor (:9200) ---

  const MONITOR_STATUS = {
    status: 'healthy',
    version: 'v1.6',
    uptime: '12d 5h',
    cycle_time: 3.2,
    last_check: ISO_NOW,
    checks: [
      { name: 'Crypto Bot', status: 'ok', latency: 45, last_check: ISO_NOW },
      { name: 'HIP-3 Bot', status: 'ok', latency: 38, last_check: ISO_NOW },
      { name: 'Database', status: 'ok', latency: 2, last_check: ISO_NOW },
      { name: 'Redis', status: 'ok', latency: 1, last_check: ISO_NOW },
      { name: 'Monitor', status: 'ok', latency: 0, last_check: ISO_NOW },
      { name: 'Funding Harvester', status: 'ok', latency: 22, last_check: ISO_NOW },
      { name: 'Disk Space', status: 'ok', value: '35%', last_check: ISO_NOW },
      { name: 'Memory', status: 'ok', value: '45%', last_check: ISO_NOW },
      { name: 'Risk Guardian Crypto', status: 'ok', last_check: ISO_NOW },
      { name: 'Risk Guardian HIP-3', status: 'ok', last_check: ISO_NOW },
      { name: 'Watchdog', status: 'ok', last_check: ISO_NOW }
    ]
  };

  const ALTSEASON_DATA = {
    phase: 'PHASE_3',
    score: 55,
    confidence: 0.72,
    last_update: ISO_NOW,
    indicators: [
      { name: 'Market Breadth', value: 62, weight: 0.15, signal: 'bullish', description: 'Percentage of alts above 200-day MA' },
      { name: 'Volume Ratio', value: 45, weight: 0.12, signal: 'neutral', description: 'Alt volume relative to BTC' },
      { name: 'Momentum Score', value: 58, weight: 0.14, signal: 'bullish', description: 'Aggregate momentum across top 50' },
      { name: 'Correlation Index', value: 71, weight: 0.10, signal: 'bullish', description: 'Cross-asset correlation measure' },
      { name: 'Liquidity Flow', value: 38, weight: 0.11, signal: 'bearish', description: 'Capital flow direction indicator' },
      { name: 'Sentiment Gauge', value: 55, weight: 0.08, signal: 'neutral', description: 'Aggregated social sentiment' },
      { name: 'Cycle Position', value: 67, weight: 0.10, signal: 'bullish', description: 'Market cycle phase estimator' },
      { name: 'Risk Appetite', value: 52, weight: 0.10, signal: 'neutral', description: 'Risk-on vs risk-off measure' },
      { name: 'Macro Alignment', value: 60, weight: 0.10, signal: 'bullish', description: 'Global macro conditions alignment' }
    ],
    btc_dominance: 52.3,
    btc_trend: 'bullish',
    btc_price: 97250,
    eth_btc: 0.0352,
    phase_history: [
      { date: '2025-03-01', phase: 'PHASE_1', score: 15 },
      { date: '2025-06-01', phase: 'PHASE_1', score: 22 },
      { date: '2025-09-01', phase: 'PHASE_2', score: 35 },
      { date: '2025-11-01', phase: 'PHASE_2', score: 42 },
      { date: '2025-12-01', phase: 'PHASE_3', score: 48 },
      { date: '2026-01-01', phase: 'PHASE_3', score: 52 },
      { date: '2026-02-01', phase: 'PHASE_3', score: 55 }
    ],
    phase_descriptions: {
      'PHASE_1': 'Defensive positioning. Low risk appetite.',
      'PHASE_2': 'Major assets leading. Selective opportunities.',
      'PHASE_3': 'Early rotation signals detected.',
      'PHASE_4': 'Rotation accelerating. Broader participation.',
      'PHASE_5': 'Wide participation across sectors.',
      'PHASE_6': 'Extended conditions. Caution advised.'
    }
  };

  // --- Funding Harvester (:9400) ---

  const FUNDING_STATUS = {
    running: true,
    mode: 'monitoring',
    asset: 'ETH',
    current_rate: 0.0145,
    annualized_rate: 12.7,
    next_funding: isoAt(Math.ceil(NOW / HOUR_MS) * HOUR_MS + 120000), // next hour + 2min
    position_active: false,
    session: 'market_hours',
    reserve_ratio: 0.60,
    min_rate_threshold: 0.0013,
    profitability_gate: 'active',
    last_scan: isoAgo(58 * 60000) // ~1h ago
  };

  const FUNDING_STATS = {
    total_collected: 45.30,
    total_fees: 12.50,
    net_profit: 32.80,
    total_rounds: 15,
    avg_rate: 0.0132,
    best_rate: 0.0312,
    worst_rate: 0.0058,
    total_hours_active: 127,
    avg_duration_hours: 8.5,
    roi_annualized: 11.2,
    history: Array.from({ length: 15 }, (_, i) => ({
      timestamp: isoAgo((15 - i) * 3 * DAY_MS),
      rate: round4(rand(0.005, 0.035)),
      duration_hours: round2(rand(4, 24)),
      funding_collected: round2(rand(1, 8)),
      fees_paid: round2(rand(0.5, 2)),
      net: round2(rand(0.5, 6))
    }))
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOG MESSAGES for WebSocket simulation
  // ═══════════════════════════════════════════════════════════════════════════

  const LOG_MESSAGES = [
    { level: 'INFO', msg: 'Scanning market conditions...' },
    { level: 'INFO', msg: 'Analyzing BTC setup — evaluating confluence factors' },
    { level: 'INFO', msg: 'Risk check passed for all active positions' },
    { level: 'INFO', msg: 'Position monitoring active — 3 open positions' },
    { level: 'INFO', msg: 'Signal evaluated for ETH: no entry — insufficient confidence (0.52)' },
    { level: 'INFO', msg: 'Heartbeat OK — all systems nominal' },
    { level: 'INFO', msg: 'Trailing stop updated for SOL LONG: +1.8R' },
    { level: 'INFO', msg: 'Candle data refreshed — 7 symbols updated' },
    { level: 'INFO', msg: 'Guardian check: drawdown 1.2% — within limits' },
    { level: 'DEBUG', msg: 'On-chain regime check: Growth (score 72, next refresh 2h)' },
    { level: 'INFO', msg: 'Order filled: BTC LONG entry at $97,245.00' },
    { level: 'INFO', msg: 'Stop loss placed: BTC LONG SL at $96,280.00' },
    { level: 'INFO', msg: 'Take profit placed: BTC LONG TP at $99,150.00' },
    { level: 'INFO', msg: 'Scan complete — duration: 3.1s' },
    { level: 'INFO', msg: 'Price feed latency: 42ms — nominal' },
    { level: 'DEBUG', msg: 'Redis cache hit ratio: 94.2%' },
    { level: 'INFO', msg: 'Signal evaluated for DOGE: no entry — regime filter' },
    { level: 'INFO', msg: 'Balance check: $15,420.50 — margin available: $12,180.30' },
    { level: 'INFO', msg: 'SUI breakout detected — confidence 0.78, evaluating...' },
    { level: 'INFO', msg: 'SUI entry skipped — max positions reached (3/3 open)' },
    { level: 'DEBUG', msg: 'API weight: 23/1200 — well within limits' },
    { level: 'INFO', msg: 'Position SOL LONG P&L: +$142.30 (+2.1R)' },
    { level: 'INFO', msg: 'Database vacuum completed — 0 dead tuples' },
    { level: 'INFO', msg: 'Funding rate check: ETH at 0.0145% — monitoring' }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTE MATCHING & RESPONSE BUILDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Determines which bot context (crypto or hip3) based on URL port or prefix.
   * Crypto = :9100, HIP-3 = :9300
   */
  function isCrypto(url) {
    return url.includes(':9100') || url.includes('/crypto/') || (!url.includes(':9300') && !url.includes(':9200') && !url.includes(':9400') && !url.includes('/hip3/'));
  }

  function isHip3(url) {
    return url.includes(':9300') || url.includes('/hip3/');
  }

  function isMonitor(url) {
    return url.includes(':9200') || url.includes('/monitor/');
  }

  function isFunding(url) {
    return url.includes(':9400') || url.includes('/funding/');
  }

  /**
   * Main route table: array of { match, handler }
   * match: function(pathname, url) => boolean
   * handler: function(url, options) => response body
   */
  const MOCK_ROUTES = [
    // ─── STATUS ───
    {
      match: (p, u) => p === '/status',
      handler: (url) => isHip3(url) ? HIP3_STATUS : CRYPTO_STATUS
    },

    // ─── STATS ───
    {
      match: (p) => p === '/api/stats' || p === '/api/stats/accurate',
      handler: (url) => {
        const base = isHip3(url) ? { ...HIP3_STATS } : { ...CRYPTO_STATS };
        // Add slight jitter for /accurate
        if (url.includes('accurate')) {
          base.balance = round2(base.balance + rand(-5, 5));
          base.pnl_today = round2(base.pnl_today + rand(-2, 2));
        }
        return base;
      }
    },

    // ─── TRADES ───
    {
      match: (p) => p === '/api/trades',
      handler: (url) => isHip3(url) ? HIP3_TRADES : CRYPTO_TRADES
    },

    // ─── POSITIONS ───
    {
      match: (p) => p === '/api/positions',
      handler: (url) => isHip3(url) ? HIP3_POSITIONS : CRYPTO_POSITIONS
    },

    // ─── CAPITAL EVENTS ───
    {
      match: (p) => p === '/api/capital-events',
      handler: (url) => isHip3(url) ? HIP3_CAPITAL_EVENTS : CRYPTO_CAPITAL_EVENTS
    },

    // ─── CANDLES ───
    {
      match: (p) => p.startsWith('/api/candles/'),
      handler: (url) => {
        const parts = url.split('/');
        const symbol = parts[parts.length - 1].split('?')[0].toUpperCase();
        return getCandlesForSymbol(symbol);
      }
    },

    // ─── DASHBOARD SETTINGS ───
    {
      match: (p) => p === '/api/dashboard/settings',
      handler: (_url, opts) => {
        if (opts && opts.method === 'POST') return { success: true };
        return {
          success: true,
          settings: {
            theme: 'matrix',
            language: 'en',
            refresh_interval: 30,
            notifications_enabled: true,
            sound_enabled: false
          }
        };
      }
    },

    // ─── SERVICES ───
    {
      match: (p) => p === '/api/services',
      handler: () => SERVICES
    },

    // ─── LAST SCAN ───
    {
      match: (p) => p === '/api/last_scan',
      handler: () => ({
        timestamp: isoAgo(30000),
        duration: 3.2,
        symbols_scanned: 7,
        signals_found: 1,
        status: 'ok'
      })
    },

    // ─── LATENCY ───
    {
      match: (p) => p === '/api/latency',
      handler: () => ({ latency: randInt(35, 65) })
    },

    // ─── ANALYTICS COMPARISON ───
    {
      match: (p) => p === '/api/analytics/comparison',
      handler: () => ANALYTICS_COMPARISON
    },

    // ─── EQUITY SYMBOLS ───
    {
      match: (p) => p === '/api/analytics/equity-symbols',
      handler: (url) => {
        const symbols = isHip3(url) ? STOCK_SYMBOLS : CRYPTO_SYMBOLS;
        return generateEquitySymbols(symbols);
      }
    },

    // ─── SESSIONS ───
    {
      match: (p) => p === '/api/analytics/sessions',
      handler: () => generateSessions()
    },

    // ─── PRICES (HIP-3 stocks) ───
    {
      match: (p) => p === '/api/prices',
      handler: () => ({
        prices: Object.fromEntries(
          Object.entries(STOCK_PRICES).map(([k, v]) => [k, round2(v + rand(-2, 2))])
        ),
        last_update: ISO_NOW
      })
    },

    // ─── MONITOR STATUS ───
    {
      match: (p) => p === '/api/monitor/status',
      handler: () => MONITOR_STATUS
    },

    // ─── MONITOR ALERTS ───
    {
      match: (p) => p.startsWith('/api/monitor/alerts'),
      handler: (url) => {
        const limit = parseInt(new URL(url, 'http://localhost').searchParams.get('limit') || '20');
        return { alerts: generateAlerts(Math.min(limit, 20)) };
      }
    },

    // ─── MONITOR ERRORS ───
    {
      match: (p) => p.startsWith('/api/monitor/errors'),
      handler: (url) => {
        const limit = parseInt(new URL(url, 'http://localhost').searchParams.get('limit') || '30');
        return { errors: generateErrors(Math.min(limit, 7)) };
      }
    },

    // ─── DRIFT ───
    {
      match: (p) => p.includes('/drift'),
      handler: () => ({
        drift_detected: false,
        positions: [],
        last_check: ISO_NOW,
        threshold: 0.05
      })
    },

    // ─── KILL SWITCH (GET) ───
    {
      match: (p) => p.includes('/kill-switch') || p.includes('/kill_switch'),
      handler: () => ({
        active: false,
        activated_at: null,
        reason: null
      })
    },

    // ─── ALTSEASON ───
    {
      match: (p) => p === '/api/monitor/altseason' || p === '/api/altseason',
      handler: () => ALTSEASON_DATA
    },

    // ─── COIN SCANNER ───
    {
      match: (p) => p === '/api/monitor/coin-scanner' || p === '/api/coin-scanner',
      handler: () => ({
        coins: generateCoinScanner(),
        last_update: ISO_NOW,
        total_scanned: 200,
        btc_dominance: 52.3
      })
    },

    // ─── FUNDING STATUS ───
    {
      match: (p) => p === '/api/funding/status',
      handler: () => FUNDING_STATUS
    },

    // ─── FUNDING STATS ───
    {
      match: (p) => p === '/api/funding/stats',
      handler: () => FUNDING_STATS
    },

    // ─── FUNDING POSITION ───
    {
      match: (p) => p === '/api/funding/position',
      handler: () => null
    },

    // ─── ON-CHAIN REGIME ───
    {
      match: (p) => p === '/api/regime' || p === '/api/onchain/regime',
      handler: () => ({
        regime: 'Growth',
        score: 72,
        confidence: 0.81,
        last_update: ISO_NOW,
        next_update: isoAt(NOW + 6 * HOUR_MS),
        metrics: {
          'Net Capital Flow': { value: 62, signal: 'bullish' },
          'Active Addresses': { value: 58, signal: 'bullish' },
          'Transaction Volume': { value: 71, signal: 'bullish' },
          'DEX Activity': { value: 45, signal: 'neutral' },
          'Gas Usage': { value: 55, signal: 'neutral' }
        },
        effects: {
          tp_multiplier: 1.15,
          confidence_bonus: 0.05,
          max_positions_modifier: 0
        }
      })
    }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMO NOTIFICATION HELPER
  // ═══════════════════════════════════════════════════════════════════════════

  function showDemoToast(message) {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('demo-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'demo-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:99999;
      background:rgba(255,165,0,0.95); color:#000; padding:12px 20px;
      border-radius:8px; font-family:'Share Tech Mono',monospace; font-size:13px;
      box-shadow:0 4px 20px rgba(255,165,0,0.3); pointer-events:none;
      animation: demoToastIn 0.3s ease, demoToastOut 0.3s ease 2.7s forwards;
    `;

    if (!document.getElementById('demo-toast-style')) {
      const style = document.createElement('style');
      style.id = 'demo-toast-style';
      style.textContent = `
        @keyframes demoToastIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes demoToastOut { from { opacity:1; } to { opacity:0; transform:translateY(20px); } }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH INTERCEPTOR
  // ═══════════════════════════════════════════════════════════════════════════

  const _originalFetch = window.fetch;

  window.fetch = async function (input, options) {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    let pathname;

    try {
      // Handle relative and absolute URLs
      const parsed = new URL(url, window.location.origin);
      pathname = parsed.pathname;
    } catch {
      pathname = url.split('?')[0];
    }

    // Allow Binance and CoinGecko through (public APIs, nice for live prices)
    if (url.includes('binance.com') || url.includes('coingecko.com') || url.includes('coinmarketcap.com')) {
      return _originalFetch.call(window, input, options);
    }

    // Allow CDN/font/asset requests through
    if (url.includes('cdn.') || url.includes('fonts.') || url.includes('googleapis.com') || url.includes('jsdelivr.net')) {
      return _originalFetch.call(window, input, options);
    }

    // Check for POST requests — return success but show demo toast
    const method = (options && options.method) || 'GET';
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      // Check if it's a settings endpoint (allow those silently)
      if (pathname === '/api/dashboard/settings') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // For control/action endpoints, show demo toast
      showDemoToast('DEMO MODE \u2014 This action is disabled in demo');
      return new Response(JSON.stringify({ success: true, demo: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Try to match a mock route
    for (const route of MOCK_ROUTES) {
      if (route.match(pathname, url)) {
        const body = route.handler(url, options);

        // Simulate slight network delay (20-80ms)
        await new Promise(r => setTimeout(r, randInt(20, 80)));

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Demo-Mode': 'true'
          }
        });
      }
    }

    // For any unmatched API call, return a safe empty response
    if (pathname.startsWith('/api/') || pathname === '/status') {
      console.warn('[DEMO] Unmatched API route:', pathname);
      return new Response(JSON.stringify({ success: true, data: null, demo: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Non-API requests pass through (HTML, CSS, JS, images)
    return _originalFetch.call(window, input, options);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBSOCKET INTERCEPTOR
  // ═══════════════════════════════════════════════════════════════════════════

  const _OriginalWebSocket = window.WebSocket;

  class MockWebSocket {
    constructor(url, protocols) {
      this.url = url;
      this.readyState = 0; // CONNECTING
      this.onopen = null;
      this.onclose = null;
      this.onmessage = null;
      this.onerror = null;
      this._listeners = {};
      this._interval = null;

      // Simulate connection opening after brief delay
      setTimeout(() => {
        this.readyState = 1; // OPEN
        const openEvent = new Event('open');
        if (this.onopen) this.onopen(openEvent);
        this._dispatch('open', openEvent);

        // Send initial connection message
        this._sendMock({
          type: 'LOG',
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'WebSocket connected — live feed active'
        });

        // Start sending periodic mock messages
        this._startPeriodicMessages();
      }, 300);
    }

    _startPeriodicMessages() {
      let msgIndex = 0;

      this._interval = setInterval(() => {
        if (this.readyState !== 1) return;

        // Cycle through log messages
        const logMsg = LOG_MESSAGES[msgIndex % LOG_MESSAGES.length];
        msgIndex++;

        this._sendMock({
          type: 'LOG',
          timestamp: new Date().toISOString(),
          level: logMsg.level,
          message: logMsg.msg
        });

        // Occasionally emit a TRADE event (1 in 8 chance)
        if (Math.random() < 0.125) {
          const sym = pick(CRYPTO_SYMBOLS);
          const side = pick(SIDES);
          this._sendMock({
            type: 'TRADE',
            timestamp: new Date().toISOString(),
            symbol: sym,
            side: side,
            action: pick(['entry', 'exit', 'sl_update', 'tp_update']),
            price: CRYPTO_PRICES[sym],
            message: `${sym} ${side} — position updated`
          });
        }

        // Occasionally emit a STATUS event (1 in 12 chance)
        if (Math.random() < 0.083) {
          this._sendMock({
            type: 'STATUS',
            timestamp: new Date().toISOString(),
            positions: CRYPTO_POSITIONS.length,
            balance: round2(CRYPTO_STATUS.balance + rand(-10, 10)),
            drawdown: round2(CRYPTO_STATUS.current_drawdown + rand(-0.1, 0.1))
          });
        }

      }, randInt(5000, 10000)); // every 5-10 seconds
    }

    _sendMock(data) {
      if (this.readyState !== 1) return;
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      });
      if (this.onmessage) this.onmessage(event);
      this._dispatch('message', event);
    }

    _dispatch(type, event) {
      const listeners = this._listeners[type];
      if (listeners) {
        listeners.forEach(fn => fn(event));
      }
    }

    addEventListener(type, fn) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(fn);
    }

    removeEventListener(type, fn) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(f => f !== fn);
    }

    send(data) {
      // Acknowledge any client messages silently (demo ignores)
      console.debug('[DEMO WS] Client sent:', data);
    }

    close(code, reason) {
      if (this._interval) clearInterval(this._interval);
      this.readyState = 3; // CLOSED
      const closeEvent = new CloseEvent('close', { code: code || 1000, reason: reason || 'Demo closed', wasClean: true });
      if (this.onclose) this.onclose(closeEvent);
      this._dispatch('close', closeEvent);
    }

    // Static properties to match WebSocket API
    static get CONNECTING() { return 0; }
    static get OPEN() { return 1; }
    static get CLOSING() { return 2; }
    static get CLOSED() { return 3; }
    get CONNECTING() { return 0; }
    get OPEN() { return 1; }
    get CLOSING() { return 2; }
    get CLOSED() { return 3; }
  }

  // Replace WebSocket globally
  window.WebSocket = function (url, protocols) {
    // Intercept WS connections to our bot ports
    if (url.includes(':9100') || url.includes(':9300') || url.includes(':9200') ||
        url.includes(':9400') || url.includes('localhost')) {
      console.log('[DEMO] Intercepted WebSocket:', url);
      return new MockWebSocket(url, protocols);
    }
    // Let external WebSockets through (Binance streams, etc.)
    return new _OriginalWebSocket(url, protocols);
  };
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;

  // ═══════════════════════════════════════════════════════════════════════════
  // EventSource INTERCEPTOR (in case SSE is used)
  // ═══════════════════════════════════════════════════════════════════════════

  const _OriginalEventSource = window.EventSource;

  if (_OriginalEventSource) {
    window.EventSource = function (url, options) {
      if (url.includes(':9100') || url.includes(':9300') || url.includes(':9200') || url.includes(':9400') || url.includes('localhost')) {
        console.log('[DEMO] Intercepted EventSource:', url);
        const fake = {
          url: url,
          readyState: 0,
          onopen: null,
          onmessage: null,
          onerror: null,
          _listeners: {},
          addEventListener(type, fn) {
            if (!this._listeners[type]) this._listeners[type] = [];
            this._listeners[type].push(fn);
          },
          removeEventListener(type, fn) {
            if (!this._listeners[type]) return;
            this._listeners[type] = this._listeners[type].filter(f => f !== fn);
          },
          close() { this.readyState = 2; }
        };
        setTimeout(() => {
          fake.readyState = 1;
          if (fake.onopen) fake.onopen(new Event('open'));
        }, 200);
        return fake;
      }
      return new _OriginalEventSource(url, options);
    };
    window.EventSource.CONNECTING = 0;
    window.EventSource.OPEN = 1;
    window.EventSource.CLOSED = 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // XMLHttpRequest INTERCEPTOR (fallback, some dashboards use XHR)
  // ═══════════════════════════════════════════════════════════════════════════

  const _OriginalXHR = window.XMLHttpRequest;

  class MockXHR {
    constructor() {
      this._xhr = new _OriginalXHR();
      this._intercepted = false;
      this._url = '';
      this._method = 'GET';
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.responseText = '';
      this.response = '';
      this.responseType = '';
      this.onreadystatechange = null;
      this.onload = null;
      this.onerror = null;
    }

    open(method, url, async, user, pass) {
      this._url = url;
      this._method = method;

      // Determine if we should intercept
      const shouldIntercept = (
        !url.includes('binance.com') &&
        !url.includes('coingecko.com') &&
        !url.includes('cdn.') &&
        !url.includes('fonts.') &&
        (url.includes('/api/') || url.includes('/status'))
      );

      if (shouldIntercept) {
        this._intercepted = true;
        this.readyState = 1;
      } else {
        this._xhr.open(method, url, async !== false, user, pass);
        // Proxy events
        this._xhr.onreadystatechange = () => {
          this.readyState = this._xhr.readyState;
          this.status = this._xhr.status;
          this.statusText = this._xhr.statusText;
          this.responseText = this._xhr.responseText;
          this.response = this._xhr.response;
          if (this.onreadystatechange) this.onreadystatechange();
        };
        this._xhr.onload = (e) => { if (this.onload) this.onload(e); };
        this._xhr.onerror = (e) => { if (this.onerror) this.onerror(e); };
      }
    }

    send(data) {
      if (!this._intercepted) {
        this._xhr.send(data);
        return;
      }

      // Simulate async response for intercepted requests
      setTimeout(() => {
        // Use fetch interceptor logic to get response body
        let pathname;
        try {
          const parsed = new URL(this._url, window.location.origin);
          pathname = parsed.pathname;
        } catch {
          pathname = this._url.split('?')[0];
        }

        let body = { success: true, data: null, demo: true };

        for (const route of MOCK_ROUTES) {
          if (route.match(pathname, this._url)) {
            body = route.handler(this._url, { method: this._method });
            break;
          }
        }

        this.readyState = 4;
        this.status = 200;
        this.statusText = 'OK';
        this.responseText = JSON.stringify(body);
        this.response = this.responseType === 'json' ? body : this.responseText;

        if (this.onreadystatechange) this.onreadystatechange();
        if (this.onload) this.onload(new Event('load'));
      }, randInt(20, 80));
    }

    setRequestHeader(name, value) {
      if (!this._intercepted) {
        this._xhr.setRequestHeader(name, value);
      }
    }

    getResponseHeader(name) {
      if (!this._intercepted) return this._xhr.getResponseHeader(name);
      if (name.toLowerCase() === 'content-type') return 'application/json';
      return null;
    }

    getAllResponseHeaders() {
      if (!this._intercepted) return this._xhr.getAllResponseHeaders();
      return 'content-type: application/json\r\n';
    }

    abort() {
      if (!this._intercepted) this._xhr.abort();
    }

    addEventListener(type, fn) {
      if (!this._intercepted) {
        this._xhr.addEventListener(type, fn);
      }
    }

    removeEventListener(type, fn) {
      if (!this._intercepted) {
        this._xhr.removeEventListener(type, fn);
      }
    }
  }

  window.XMLHttpRequest = MockXHR;

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMO MODE BADGE
  // ═══════════════════════════════════════════════════════════════════════════

  function addDemoBadge() {
    if (typeof document === 'undefined') return;

    // Wait for DOM ready
    const inject = () => {
      if (document.getElementById('demo-badge')) return;

      const badge = document.createElement('div');
      badge.id = 'demo-badge';
      badge.innerHTML = 'DEMO MODE';
      badge.style.cssText = `
        position:fixed; top:12px; left:50%; transform:translateX(-50%); z-index:99999;
        background:rgba(255,165,0,0.15); color:#FFA500; border:1px solid rgba(255,165,0,0.3);
        padding:4px 16px; border-radius:4px; font-family:'Share Tech Mono',monospace;
        font-size:11px; letter-spacing:2px; text-transform:uppercase;
        pointer-events:none; backdrop-filter:blur(4px);
        text-shadow:0 0 8px rgba(255,165,0,0.5);
        animation: demoPulse 3s ease-in-out infinite;
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes demoPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(badge);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      // Small delay to not interfere with other setup
      setTimeout(inject, 1000);
    }
  }

  addDemoBadge();

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLE ANNOUNCEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  console.log(
    '%c TRINITY DEMO MODE ',
    'background:#FFA500;color:#000;font-size:14px;font-weight:bold;padding:4px 12px;border-radius:4px;'
  );
  console.log(
    '%cAll API calls are intercepted and return mock data.\n' +
    'Binance/CoinGecko public APIs are passed through for live prices.\n' +
    'POST actions are disabled and will show a notification.',
    'color:#FFA500;font-size:12px;'
  );

})();
