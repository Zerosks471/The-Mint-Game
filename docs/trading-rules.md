# Stock Market Trading Rules & Anti-Exploit Measures

This document outlines all trading rules and safeguards implemented to prevent exploits and maintain market integrity.

## 🛡️ Anti-Exploit Rules

### 1. **Self-Trading Prevention**
- **Rule**: Players cannot buy shares of their own company stock
- **Purpose**: Prevents price manipulation through self-trading
- **Implementation**: Checks if `userId` matches the stock owner before allowing buy orders

### 2. **Rate Limiting**
- **Max Trades per Minute**: 10 trades
- **Max Trades per Hour**: 50 trades
- **Minimum Time Between Trades**: 3 seconds
- **Purpose**: Prevents spam trading and API abuse
- **Error**: Returns 429 (Too Many Requests) when exceeded

### 3. **Position Size Limits**
- **Maximum Ownership**: 25% of any single stock
- **Purpose**: Prevents market manipulation through concentrated ownership
- **Calculation**: Based on total shares outstanding

### 4. **Trade Size Limits**
- **Maximum Shares per Trade**: 100,000 shares
- **Purpose**: Prevents single massive trades that could crash or pump prices
- **Error**: Clear message showing maximum allowed

### 5. **Minimum Holding Period**
- **Required Hold Time**: 60 seconds
- **Purpose**: Prevents day trading exploits and wash trading
- **Error**: Shows countdown timer for remaining wait time

### 6. **Wash Trading Detection**
- **Detection Window**: 5 minutes (300 seconds)
- **Trigger**: 3+ rapid buy/sell cycles on the same stock
- **Purpose**: Prevents artificial volume inflation
- **Error**: Blocks further trades on that stock temporarily

### 7. **Price Impact Limits**
- **Maximum Price Impact**: 5% per trade
- **Calculation**: Trade value as percentage of market cap
- **Purpose**: Prevents single trades from moving prices too dramatically
- **Error**: Suggests splitting into smaller trades

### 8. **IPO Listing Validation**

#### Market Cap Limits
- **Minimum Market Cap**: $10,000
- **Maximum Market Cap**: 100x player's net worth
- **Purpose**: Prevents unrealistic valuations and market manipulation

#### Share Price Limits
- **Minimum**: $0.01 per share
- **Maximum**: $10,000 per share
- **Purpose**: Keeps prices in reasonable ranges

#### Share Count Limits
- **Minimum Total Shares**: 1,000 shares
- **Maximum Total Shares**: 1 billion shares
- **Purpose**: Prevents extreme share structures

### 9. **Float Percentage Validation**
- **Allowed Range**: 10% - 90%
- **Default**: 50%
- **Purpose**: Ensures reasonable public float for trading

## 📊 Market Integrity Features

### Price Discovery
- Prices update based on:
  - Net worth changes (for player stocks)
  - Mean reversion algorithms
  - Random volatility
  - Market trends (bullish/bearish/neutral)

### Volume Tracking
- All trades increment 24h volume
- Volume affects market perception
- High volume can indicate interest

### Order History
- All trades are logged permanently
- Includes timestamp, price, shares, and user
- Used for audit trails and pattern detection

## 🔍 Detection & Enforcement

### Automated Checks
All rules are enforced server-side before trades execute:
1. Validation runs before database transactions
2. Errors return clear, actionable messages
3. Failed validations don't affect game state

### Error Messages
- Clear, user-friendly error messages
- Include specific limits and wait times
- Suggest alternatives when applicable

## 🎮 Player Experience

### Transparent Limits
- Players see limits before attempting trades
- Error messages explain why trades are blocked
- Countdown timers for cooldowns

### Fair Trading
- Rules apply equally to all players
- No special privileges or bypasses
- Market operates on supply and demand

## 📈 Future Enhancements

Potential additional safeguards:
- [ ] Circuit breakers for extreme price movements
- [ ] Suspicious activity alerts
- [ ] Trading pattern analysis
- [ ] Market maker incentives
- [ ] Short selling restrictions
- [ ] Margin trading limits (if added)

## 🔧 Configuration

All limits are configurable in `tradingRules.service.ts`:
- Rate limits can be adjusted
- Position limits can be changed
- Holding periods can be modified
- Price impact thresholds can be tuned

---

**Last Updated**: 2025-01-XX
**Version**: 1.0

