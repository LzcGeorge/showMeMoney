// api/scan.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const WEBHOOK = process.env.FEISHU_WEBHOOK!;     // 飞书机器人
const SYMBOLS = (process.env.SYMBOLS || "ETHUSDT").split(",");
const TIMEFRAME = process.env.TIMEFRAME || "15m"; // 例：1m,5m,15m,1h
const LOOKBACK = 300;

// binance REST，例：/api/v3/klines?symbol=ETHUSDT&interval=15m&limit=300
const interval = (tf: string) => tf; // 直接透传给 binance

async function fetchKlines(symbol: string, tf: string, limit: number) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval(tf)}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`klines fail: ${res.status}`);
  // kline: [openTime,open,high,low,close,volume,closeTime,...]
  const arr = (await res.json()) as any[];
  return arr.map(k => ({
    openTime: k[0] as number,
    high: parseFloat(k[2]),
    close: parseFloat(k[4]),
    closeTime: k[6] as number,
  }));
}

// rolling HHV & SMA
function hhv(values: number[], n: number) {
  const out = new Array(values.length).fill(NaN);
  let dq: number[] = []; // 单调队列存索引
  for (let i = 0; i < values.length; i++) {
    while (dq.length && values[dq[dq.length - 1]] <= values[i]) dq.pop();
    dq.push(i);
    const left = i - n + 1;
    while (dq.length && dq[0] < left) dq.shift();
    if (left >= 0) out[i] = values[dq[0]];
  }
  return out;
}
function sma(values: number[], n: number) {
  const out = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

async function notifyFeishu(text: string) {
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg_type: "text", content: { text } }),
  });
}

export default async function handler(req: Request) {
  try {
    for (const sym of SYMBOLS) {
      const kl = await fetchKlines(sym, TIMEFRAME, LOOKBACK + 5);
      if (kl.length < 210) continue;

      // 只用“已收盘”的最后两根：倒数第2 和 倒数第3
      const last = kl[kl.length - 2];
      const prev = kl[kl.length - 3];

      const highs = kl.map(k => k.high);
      const closes = kl.map(k => k.close);

      const redSeries   = hhv(highs, 50).map((v, i) => v - closes[i]);      // HHV(50)-Close
      const sma200      = sma(closes, 200);
      const greenSeries = closes.map((c, i) => c - sma200[i]);               // Close - SMA200

      const r0 = redSeries[kl.length - 2], r1 = redSeries[kl.length - 3];
      const g0 = greenSeries[kl.length - 2], g1 = greenSeries[kl.length - 3];

      const crossUp   = Number.isFinite(r1)&&Number.isFinite(g1)&& r1 <= g1 && r0 > g0;
      const crossDown = Number.isFinite(r1)&&Number.isFinite(g1)&& r1 >= g1 && r0 < g0;

      const key = `rvc010:${sym}:${TIMEFRAME}:lastTs`;
      const lastSentTs = await redis.get<number>(key);

      if ((crossUp || crossDown) && lastSentTs !== last.closeTime) {
        const px = last.close.toFixed(4);
        const dir = crossUp ? "UP" : "DOWN";
        await notifyFeishu(`[RVC010] ${dir} ${sym} @ ${px} TF=${TIMEFRAME}`);
        await redis.set(key, last.closeTime);
      }
    }
    return new Response("ok");
  } catch (e:any) {
    return new Response(e?.message || "err", { status: 500 });
  }
}