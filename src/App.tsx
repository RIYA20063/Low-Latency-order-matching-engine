import React, { useState, useEffect } from 'react';
import { Network, Download, X, Edit2, Check, Activity, Terminal, ShieldAlert, Cpu, Info, LogOut, LogIn, Sparkles, Send, Brain, RefreshCw } from 'lucide-react';
import { Side, Order, Trade, ExecutionReport, EngineState } from './types';
import { api } from './api/client';

function renderBold(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-white">{part}</strong>;
    }
    return part;
  });
}

function renderInlineCode(text: string) {
  const parts = text.split(/`([^`]+)`/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <code key={i} className="px-1 py-0.5 bg-[#1F1F22] border border-[#262628] rounded text-[#00FF41] font-mono text-[10px]">{part}</code>;
    }
    return renderBold(part);
  });
}

function renderMarkdown(text: string) {
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('###')) {
      return <h4 key={idx} className="text-[11px] font-bold text-amber-400 mt-3 mb-1 border-b border-[#262628] pb-1 uppercase tracking-wider">{trimmed.replace('###', '').trim()}</h4>;
    }
    if (trimmed.startsWith('##')) {
      return <h3 key={idx} className="text-xs font-bold text-[#00FF41] mt-4 mb-1 uppercase tracking-wider">{trimmed.replace('##', '').trim()}</h3>;
    }
    if (trimmed.startsWith('#')) {
      return <h2 key={idx} className="text-sm font-black text-white mt-4 mb-2 uppercase tracking-widest">{trimmed.replace('#', '').trim()}</h2>;
    }
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const bulletText = trimmed.substring(1).trim();
      return (
        <li key={idx} className="ml-4 list-disc text-[#A0A0A5] leading-relaxed my-1 text-[11px]">
          {renderInlineCode(bulletText)}
        </li>
      );
    }
    if (!trimmed) return <div key={idx} className="h-2"></div>;
    return <p key={idx} className="text-[#A0A0A5] leading-relaxed my-1 text-[11px]">{renderInlineCode(trimmed)}</p>;
  });
}

export default function App() {
  const [user, setUser] = useState<{uid: string; email: string; usdBalance: number; btcBalance: number} | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [tradeView, setTradeView] = useState<'PUBLIC' | 'MY_TRADES'>('PUBLIC');
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradesFetchError, setTradesFetchError] = useState<string | null>(null);

  const fetchUserTradesAsync = async (silent = false) => {
    if (!localStorage.getItem('auth_token')) return;
    if (!silent) setIsLoadingTrades(true);
    setTradesFetchError(null);
    try {
      const tradesData = await api.getTrades();
      setUserTrades(tradesData);
    } catch (err: any) {
      console.error("Failed to asynchronously fetch trader records:", err);
      setTradesFetchError(err.message || "Asynchronous trade synchronization failed.");
    } finally {
      if (!silent) setIsLoadingTrades(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          await fetchUserTradesAsync(false);
        } catch (e) {
          localStorage.removeItem('auth_token');
          setUser(null);
          setUserTrades([]);
        }
      }
      setAuthLoading(false);
    };
    initAuth();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      let res;
      if (isRegister) {
        res = await api.register(authEmail, authPassword);
      } else {
        res = await api.login(authEmail, authPassword);
      }
      localStorage.setItem('auth_token', res.token);
      setUser(res.user);
      setAuthEmail('');
      setAuthPassword('');
      await fetchUserTradesAsync(false);
    } catch (e: any) {
      setAuthError(e.message || "Authentication failed. Please verify credentials.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setUserTrades([]);
  };

  const [, forceRender] = useState({});
  const [formPrice, setFormPrice] = useState<string>('65000.0');
  const [formQty, setFormQty] = useState<string>('1.0');
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');
  const [activeTab, setActiveTab] = useState<'TRADER' | 'OPERATOR'>('TRADER');
  const [bookView, setBookView] = useState<'AGGREGATE' | 'DETAILED'>('AGGREGATE');
  const [engineState, setEngineState] = useState<EngineState | null>(null);

  // AI Co-Pilot states
  const [aiQuery, setAiQuery] = useState('');
  const [aiOutput, setAiOutput] = useState<string>(`=== L0-AI TRADING CO-PILOT TERMINAL v1.2 ===
[SYSTEM] Ready for market analysis. 
[INFO] Please login and click "Run Full Analysis" or enter a custom query to analyze order book depth, spread width, volume imbalances, and receive professional tactical trading advice.`);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Poll Engine State and User Profile/Balances to keep trading dashboard and assets fully synchronized in real-time
  useEffect(() => {
    const fetchState = async () => {
      try {
        const state = await api.getSnapshot();
        setEngineState(state);
        
        // Dynamically auto-fill the order form with market price if empty/default
        if (state && state.marketPrice && (formPrice === '65000.0' || !formPrice)) {
          setFormPrice(state.marketPrice.toFixed(1));
        }
      } catch (e) {
        console.error("Error fetching state", e);
      }
    };

    const fetchProfile = async () => {
      if (localStorage.getItem('auth_token')) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          await fetchUserTradesAsync(true);
        } catch (e) {
          localStorage.removeItem('auth_token');
          setUser(null);
          setUserTrades([]);
        }
      }
    };

    fetchState();
    fetchProfile();
    const intervalState = setInterval(fetchState, 200);
    const intervalProfile = setInterval(fetchProfile, 1500);
    return () => {
      clearInterval(intervalState);
      clearInterval(intervalProfile);
    };
  }, [formPrice]);

  const handleAiRequest = async (queryToSubmit?: string) => {
    if (!user) {
      setAiError("Authentication Required: Please login to enable AI Co-Pilot.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const q = queryToSubmit !== undefined ? queryToSubmit : aiQuery;
      const res = await api.analyzeMarket(q);
      setAiOutput(res.text);
      if (queryToSubmit === undefined) {
        setAiQuery('');
      }
    } catch (err: any) {
      setAiError(err.message || "An unexpected error occurred during AI analysis.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleManualOrder = async (side: Side) => {
    const p = parseFloat(formPrice);
    const q = parseFloat(formQty);
    if (isNaN(p) || isNaN(q) || p <= 0 || q <= 0) return;
    
    if (!user) {
      alert("Please login first to submit orders");
      return;
    }
    
    try {
      await api.createOrder(side, p, q);
    } catch (e) {
      console.error(e);
    }
  };

  const cancelOrder = async (orderId: string, isModify = false) => {
    try {
      await api.cancelOrder(orderId);
    } catch (e) {
      console.error(e);
    }
  };

  const modifyOrder = async (orderId: string, newPrice: number, newQty: number) => {
    try {
      await api.modifyOrder(orderId, newPrice, newQty);
    } catch (e) {
      console.error(e);
    }
  };

  const downloadTradesCSV = () => {
    if (!engineState) return;
    const csvContent = [
      ['Trade ID', 'Side', 'Price', 'Quantity', 'Timestamp'].join(','),
      ...engineState.trades.map(t => 
        [t.id, t.side, t.price, t.qty, new Date(t.timestamp).toISOString()].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="w-full min-h-screen bg-[#050506] flex items-center justify-center text-[#00FF41] font-mono text-xs tracking-widest uppercase">
         [SYSTEM] LOADING SECURE PORTAL CONNECTIONS...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-[#050506] text-[#E0E0E0] font-sans flex items-center justify-center p-4 md:p-6 select-none border-4 border-[#121214]">
        <div className="relative bg-[#0A0A0C] border border-[#262628] rounded-xl p-6 md:p-8 w-full max-w-sm shadow-2xl overflow-hidden">
          {/* Subtle decoration elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-[#00FF41] to-[#FF3366]"></div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2 font-mono">
              L0-MATCH-CORE
            </h1>
            <p className="text-[9px] text-[#88888E] uppercase tracking-[0.2em] mt-1.5">
              Institutional High-Frequency Matching Engine
            </p>
          </div>

          <div className="flex bg-[#121214] rounded overflow-hidden border border-[#262628] mb-6">
             <button 
               onClick={() => { setIsRegister(false); setAuthError(null); }}
               className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-wider cursor-pointer ${!isRegister ? 'bg-[#262628] text-[#00FF41] border-b-2 border-[#00FF41]' : 'text-[#88888E] hover:text-white'}`}
             >
               SIGN IN
             </button>
             <button 
               onClick={() => { setIsRegister(true); setAuthError(null); }}
               className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-wider cursor-pointer ${isRegister ? 'bg-[#262628] text-amber-400 border-b-2 border-amber-400' : 'text-[#88888E] hover:text-white'}`}
             >
               REGISTER
             </button>
          </div>

          {authError && (
            <div className="mb-4 text-xs font-mono text-[#FF3366] border border-[#FF3366]/30 bg-[#FF3366]/5 p-2 rounded text-left leading-normal">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[9px] text-[#88888E] uppercase tracking-wider mb-1 font-mono">Trader Email</label>
              <input 
                type="email" 
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="trader@exchange.l0"
                className="w-full bg-[#121214] border border-[#262628] focus:border-[#00FF41] rounded p-2 text-white font-mono text-xs focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] text-[#88888E] uppercase tracking-wider mb-1 font-mono">Password Key</label>
              <input 
                type="password" 
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#121214] border border-[#262628] focus:border-[#00FF41] rounded p-2 text-white font-mono text-xs focus:outline-none transition-colors"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-[#00FF41] text-black hover:bg-[#00DD39] active:scale-[0.99] transition-all py-2 rounded font-bold uppercase text-[10px] tracking-wider cursor-pointer"
            >
              {isRegister ? "PROVISION TRADER ID" : "ESTABLISH SESSION"}
            </button>
          </form>

          {/* Vibe telemetries */}
          <div className="mt-8 pt-4 border-t border-[#262628] text-[9px] font-mono text-[#66666B] flex flex-col gap-1.5 text-left">
            <div className="flex justify-between items-center">
              <span>SECURITY GATEWAY</span>
              <span className="text-[#00FF41]">● ACTIVE</span>
            </div>
            <div className="flex justify-between items-center">
              <span>INTEGRITY FEED</span>
              <span className="text-white">DPDK PACKET BYPASS</span>
            </div>
            <div className="flex justify-between items-center">
              <span>INITIAL LATENCY</span>
              <span className="text-amber-400">0.82μs</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!engineState) {
    return (
      <div className="w-full min-h-screen bg-[#050506] flex items-center justify-center text-white font-mono text-sm">
         INITIALIZING L0-MATCH-CORE...
      </div>
    );
  }

  const { bids, asks, trades, operatorLogs, executionReports, marketPrice, metrics, sequenceId } = engineState;
  
  // Aggregate order book (group by price)
  const aggregatedAsks = Array.from(
      asks.reduce((acc, order) => {
          acc.set(order.price, (acc.get(order.price) || 0) + order.qty);
          return acc;
      }, new Map<number, number>())
  ).sort((a, b) => a[0] - b[0]).slice(0, 15).reverse();

  const aggregatedBids = Array.from(
      bids.reduce((acc, order) => {
          acc.set(order.price, (acc.get(order.price) || 0) + order.qty);
          return acc;
      }, new Map<number, number>())
  ).sort((a, b) => b[0] - a[0]).slice(0, 15);

  const maxDepthQty = Math.max(
      ...aggregatedAsks.map(a => a[1]),
      ...aggregatedBids.map(b => b[1]),
      1
  );

  return (
    <div className="w-full min-h-screen bg-[#050506] text-[#E0E0E0] font-sans flex flex-col overflow-hidden p-4 sm:p-6 select-none border-4 border-[#121214]">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#262628] pb-4 mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              L0-MATCH-CORE
              <span className="text-[#00FF41] opacity-70 text-xs font-mono px-2 py-0.5 border border-[#00FF41] rounded bg-[#00FF41]/10">LIVE</span>
            </h1>
            <p className="text-[10px] text-[#88888E] uppercase tracking-[0.2em] mt-1">Ultra-Low Latency Deterministic Engine</p>
          </div>
        </div>
        
        <div className="flex bg-[#0A0A0C] rounded overflow-hidden border border-[#262628]">
           <button 
             onClick={() => setActiveTab('TRADER')}
             className={`px-4 py-2 text-[11px] uppercase font-bold tracking-wider ${activeTab === 'TRADER' ? 'bg-[#121214] text-[#00FF41] border-b-2 border-[#00FF41]' : 'text-[#88888E] hover:text-white'}`}
           >
             Trader Dashboard
           </button>
           <button 
             onClick={() => setActiveTab('OPERATOR')}
             className={`px-4 py-2 text-[11px] uppercase font-bold tracking-wider ${activeTab === 'OPERATOR' ? 'bg-[#121214] text-amber-400 border-b-2 border-amber-400' : 'text-[#88888E] hover:text-white'}`}
           >
             Operator Console
           </button>
        </div>

        <div className="flex gap-4 sm:gap-6 bg-[#0A0A0C] border border-[#262628] px-4 py-2 rounded flex-wrap items-center">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-[#88888E] uppercase">99th % Latency</p>
            <p className="text-lg font-mono text-[#00FF41]">{metrics.latency.toFixed(2)}μs</p>
          </div>
          <div className="text-right border-l border-[#262628] pl-4 sm:pl-6 hidden sm:block">
            <p className="text-[10px] text-[#88888E] uppercase">Throughput</p>
            <p className="text-lg font-mono text-white">{(metrics.throughput / 1000000).toFixed(2)}M/s</p>
          </div>
          <div className="border-l border-[#262628] pl-4 sm:pl-6 flex items-center">
            <div className="flex items-center gap-3">
              <img src={`https://ui-avatars.com/api/?name=${user.email}&background=random`} alt="Avatar" className="w-8 h-8 rounded-full border border-[#262628]" />
              <div className="hidden sm:block text-left text-xs">
                <p className="text-white font-medium">{user.email?.split('@')[0]}</p>
                <p className="text-[#88888E] text-[10px]">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="text-[#88888E] hover:text-[#FF3366] transition-colors ml-2 cursor-pointer" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
        
        {/* SHARED COLUMN 1: Order Book */}
        <section className="lg:col-span-3 flex flex-col gap-4 overflow-hidden h-full">
          <div className="flex-1 bg-[#0A0A0C] border border-[#262628] rounded-lg p-3 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[11px] font-semibold text-[#88888E] uppercase tracking-wider flex items-center gap-2">
                <span>Order Book</span>
                <div className="flex bg-[#121214] rounded border border-[#262628] overflow-hidden ml-2">
                  <button 
                    onClick={() => setBookView('AGGREGATE')}
                    className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${bookView === 'AGGREGATE' ? 'bg-[#262628] text-white' : 'text-[#88888E] hover:text-white'}`}
                  >
                    Agg
                  </button>
                  <button 
                    onClick={() => setBookView('DETAILED')}
                    className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${bookView === 'DETAILED' ? 'bg-[#262628] text-white' : 'text-[#88888E] hover:text-white'}`}
                  >
                    Orders
                  </button>
                </div>
              </h3>
              <span className="text-[11px] font-semibold text-white">BTC/USD</span>
            </div>
            
            <div className="grid grid-cols-3 text-[10px] text-[#88888E] uppercase pb-2 mb-2 border-b border-[#262628]">
              <span>Price</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Total</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-0.5 text-xs font-mono flex flex-col">
              {/* ASKS (Red) */}
              <div className="flex flex-col justify-end min-h-[45%] border-b border-[#262628] pb-2 mb-2 gap-0.5">
                {bookView === 'AGGREGATE' ? aggregatedAsks.map(([price, qty], idx) => {
                  let runningTotal = aggregatedAsks.slice(idx).reduce((sum: number, item: any) => sum + (item[1] as number), 0) as number;
                  const depthPct = Math.min((runningTotal / (maxDepthQty * 3)) * 100, 100);
                  const heatAlpha = ((qty as number) / (maxDepthQty || 1)) * 0.4;
                  return (
                    <div key={`ask-${price}`} className="grid grid-cols-3 relative group hover:bg-[#121214] py-0.5 px-1 cursor-pointer" onClick={() => setFormPrice(price.toString())}>
                      <div className="absolute inset-0 pointer-events-none z-0 transition-colors" style={{ backgroundColor: `rgba(255, 51, 102, ${heatAlpha})` }}></div>
                      <div className="absolute right-0 top-0 bottom-0 bg-[#FF3366]/15 z-0 transition-all pointer-events-none" style={{ width: `${depthPct}%` }}></div>
                      <span className="text-[#FF3366] z-10 relative">{price.toFixed(1)}</span>
                      <span className="text-right text-white z-10 relative">{(qty as number).toFixed(4)}</span>
                      <span className="text-right text-[#88888E] z-10 relative">{runningTotal.toFixed(2)}</span>
                    </div>
                  );
                }) : (() => {
                  const detailedAsks = asks.slice(0, 15).reverse();
                  return detailedAsks.map((order, idx) => {
                    let runningTotal = detailedAsks.slice(idx).reduce((sum, item) => sum + item.qty, 0);
                    const depthPct = Math.min((runningTotal / (maxDepthQty * 3)) * 100, 100);
                    return (
                      <div key={order.id} className="grid grid-cols-3 relative group hover:bg-[#121214] py-0.5 px-1 cursor-pointer" onClick={() => setFormPrice(order.price.toString())}>
                        <div className="absolute right-0 top-0 bottom-0 bg-[#FF3366]/15 z-0 transition-all pointer-events-none" style={{ width: `${depthPct}%` }}></div>
                        <span className="text-[#FF3366] z-10 relative flex items-center gap-1">
                          {order.price.toFixed(1)}
                          {order.accountId === 'USR' && <span className="w-1 h-1 bg-white rounded-full"></span>}
                        </span>
                        <span className="text-right text-white z-10 relative">{order.qty.toFixed(4)}</span>
                        <span className="text-right text-[#88888E] z-10 relative">{runningTotal.toFixed(2)}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* SPREAD */}
              <div className="flex justify-between items-center py-2 px-1 text-sm font-bold text-white">
                <span className={trades[0]?.side === 'BUY' ? 'text-[#00FF41]' : 'text-[#FF3366]'}>
                  {marketPrice.toFixed(1)}
                  {trades[0]?.side === 'BUY' ? ' ↑' : ' ↓'}
                </span>
                <span className="text-[#88888E] text-[10px] font-normal uppercase">Spread: {
                  (aggregatedAsks.length && aggregatedBids.length) 
                    ? (aggregatedAsks[aggregatedAsks.length-1][0] - aggregatedBids[0][0]).toFixed(1)
                    : '-'
                }</span>
              </div>

              {/* BIDS (Green) */}
              <div className="flex flex-col min-h-[45%] border-t border-[#262628] pt-2 mt-2 gap-0.5">
                {bookView === 'AGGREGATE' ? aggregatedBids.map(([price, qty], idx) => {
                  let runningTotal = aggregatedBids.slice(0, idx + 1).reduce((sum: number, item: any) => sum + (item[1] as number), 0) as number;
                  const depthPct = Math.min((runningTotal / (maxDepthQty * 3)) * 100, 100);
                  const heatAlpha = ((qty as number) / (maxDepthQty || 1)) * 0.4;
                  return (
                    <div key={`bid-${price}`} className="grid grid-cols-3 relative group hover:bg-[#121214] py-0.5 px-1 cursor-pointer" onClick={() => setFormPrice(price.toString())}>
                      <div className="absolute inset-0 pointer-events-none z-0 transition-colors" style={{ backgroundColor: `rgba(0, 255, 65, ${heatAlpha})` }}></div>
                      <div className="absolute right-0 top-0 bottom-0 bg-[#00FF41]/15 z-0 transition-all pointer-events-none" style={{ width: `${depthPct}%` }}></div>
                      <span className="text-[#00FF41] z-10 relative">{price.toFixed(1)}</span>
                      <span className="text-right text-white z-10 relative">{(qty as number).toFixed(4)}</span>
                      <span className="text-right text-[#88888E] z-10 relative">{runningTotal.toFixed(2)}</span>
                    </div>
                  );
                }) : (() => {
                  const detailedBids = bids.slice(0, 15);
                  return detailedBids.map((order, idx) => {
                    let runningTotal = detailedBids.slice(0, idx + 1).reduce((sum, item) => sum + item.qty, 0);
                    const depthPct = Math.min((runningTotal / (maxDepthQty * 3)) * 100, 100);
                    return (
                      <div key={order.id} className="grid grid-cols-3 relative group hover:bg-[#121214] py-0.5 px-1 cursor-pointer" onClick={() => setFormPrice(order.price.toString())}>
                        <div className="absolute right-0 top-0 bottom-0 bg-[#00FF41]/15 z-0 transition-all pointer-events-none" style={{ width: `${depthPct}%` }}></div>
                        <span className="text-[#00FF41] z-10 relative flex items-center gap-1">
                          {order.price.toFixed(1)}
                          {order.accountId === 'USR' && <span className="w-1 h-1 bg-white rounded-full"></span>}
                        </span>
                        <span className="text-right text-white z-10 relative">{order.qty.toFixed(4)}</span>
                        <span className="text-right text-[#88888E] z-10 relative">{runningTotal.toFixed(2)}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </section>

        {activeTab === 'TRADER' ? (
          <>
            {/* TRADER COLUMN 2: Trading & Trades */}
            <section className="lg:col-span-5 flex flex-col gap-4 overflow-hidden h-full">
              
              <div className="bg-[#0A0A0C] border border-[#262628] rounded-lg p-4 flex-shrink-0">
                <h3 className="text-[11px] font-semibold text-[#88888E] uppercase mb-4 tracking-wider">Order Entry</h3>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-[10px] text-[#88888E] uppercase mb-1">Price (USD)</label>
                    <input 
                      type="number" 
                      value={formPrice} 
                      onChange={e => setFormPrice(e.target.value)}
                      className="w-full bg-[#121214] border border-[#262628] text-white rounded p-2 text-sm font-mono focus:outline-none focus:border-[#00FF41] transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-[#88888E] uppercase mb-1">Amount (BTC)</label>
                    <input 
                      type="number" 
                      value={formQty} 
                      onChange={e => setFormQty(e.target.value)}
                      className="w-full bg-[#121214] border border-[#262628] text-white rounded p-2 text-sm font-mono focus:outline-none focus:border-[#00FF41] transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleManualOrder('BUY')}
                    className="flex-1 bg-[#00FF41]/10 border border-[#00FF41]/50 text-[#00FF41] hover:bg-[#00FF41]/20 hover:shadow-[0_0_15px_rgba(0,255,65,0.2)] font-bold py-2 rounded text-sm transition-all"
                  >
                    BUY BTC
                  </button>
                  <button 
                    onClick={() => handleManualOrder('SELL')}
                    className="flex-1 bg-[#FF3366]/10 border border-[#FF3366]/50 text-[#FF3366] hover:bg-[#FF3366]/20 hover:shadow-[0_0_15px_rgba(255,51,102,0.2)] font-bold py-2 rounded text-sm transition-all"
                  >
                    SELL BTC
                  </button>
                </div>
              </div>

              <div className="bg-[#0A0A0C] border border-[#262628] rounded-lg p-3 flex flex-col flex-shrink-0 max-h-[35%] overflow-hidden">
                <h3 className="text-[11px] font-semibold text-[#88888E] uppercase mb-2 tracking-wider">My Open Orders</h3>
                <div className="flex-1 overflow-y-auto pr-1 space-y-1 font-mono text-xs">
                  {(() => {
                    const activeOrders = [...bids, ...asks].filter(o => o.accountId === user?.uid).sort((a,b) => b.timestamp - a.timestamp);
                    if (activeOrders.length === 0) return <div className="text-[#444448] text-[10px] p-2 text-center uppercase tracking-wider mt-4">No open orders</div>;
                    return activeOrders.map(o => (
                      <div key={o.id} className="border border-[#262628] rounded p-2 bg-[#121214] flex flex-col gap-2">
                        {editingOrder === o.id ? (
                          <div className="flex items-center gap-2">
                            <input type="number" className="w-20 bg-[#1A1A1D] border border-[#262628] text-white rounded px-1 py-1 text-[10px]" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                            <input type="number" className="w-16 bg-[#1A1A1D] border border-[#262628] text-white rounded px-1 py-1 text-[10px]" value={editQty} onChange={e => setEditQty(e.target.value)} />
                            <button onClick={() => {
                              const p = parseFloat(editPrice);
                              const q = parseFloat(editQty);
                              if (!isNaN(p) && !isNaN(q) && p > 0 && q > 0) {
                                modifyOrder(o.id, p, q);
                              }
                              setEditingOrder(null);
                            }} className="text-[#00FF41] hover:text-white p-1 rounded hover:bg-[#262628]"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingOrder(null)} className="text-[#88888E] hover:text-white p-1 rounded hover:bg-[#262628]"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex gap-3">
                              <span className={o.side === 'BUY' ? 'text-[#00FF41] w-8' : 'text-[#FF3366] w-8'}>{o.side}</span>
                              <span className="text-white w-12 text-right">{o.qty.toFixed(4)}</span>
                              <span className="text-[#88888E]">@ {o.price.toFixed(1)}</span>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => {
                                setEditingOrder(o.id);
                                setEditPrice(o.price.toString());
                                setEditQty(o.qty.toString());
                              }} className="text-[#88888E] hover:text-white p-1 rounded hover:bg-[#262628]" title="Modify">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => cancelOrder(o.id)} className="text-[#88888E] hover:text-[#FF3366] p-1 rounded hover:bg-[#262628]" title="Cancel">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="flex-1 bg-[#0A0A0C] border border-[#262628] rounded-lg p-3 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#262628]/40">
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={() => setTradeView('PUBLIC')}
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded transition-colors cursor-pointer ${tradeView === 'PUBLIC' ? 'bg-[#121214] text-[#00FF41] border border-[#00FF41]/30 font-bold' : 'text-[#88888E] hover:text-white'}`}
                    >
                      Public Trades
                    </button>
                    <button 
                      onClick={() => {
                        setTradeView('MY_TRADES');
                        fetchUserTradesAsync(false);
                      }}
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${tradeView === 'MY_TRADES' ? 'bg-[#121214] text-[#00FF41] border border-[#00FF41]/30 font-bold' : 'text-[#88888E] hover:text-white'}`}
                    >
                      My Trades ({userTrades.length})
                      {isLoadingTrades && <RefreshCw size={10} className="animate-spin text-[#00FF41]" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {tradeView === 'MY_TRADES' && (
                      <button 
                        onClick={() => fetchUserTradesAsync(false)}
                        disabled={isLoadingTrades}
                        className="text-[10px] bg-[#121214] border border-[#262628] hover:border-[#88888E] disabled:opacity-50 text-[#88888E] hover:text-white p-1 rounded transition-all cursor-pointer"
                        title="Force Reload My Trades"
                      >
                        <RefreshCw size={12} className={isLoadingTrades ? "animate-spin text-[#00FF41]" : ""} />
                      </button>
                    )}
                    {tradeView === 'PUBLIC' && (
                      <button 
                        onClick={downloadTradesCSV}
                        className="text-[10px] bg-[#121214] border border-[#262628] hover:border-[#88888E] text-[#88888E] hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Download Trade History CSV"
                      >
                        <Download className="w-3 h-3" /> CSV
                      </button>
                    )}
                  </div>
                </div>

                {tradeView === 'PUBLIC' ? (
                  <>
                    <div className="grid grid-cols-3 text-[10px] text-[#88888E] uppercase pb-2 mb-2 border-b border-[#262628]">
                      <span>Price</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Time</span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 space-y-1 font-mono text-xs">
                      {trades.map((t, i) => (
                        <div key={t.id + i} className={`grid grid-cols-3 p-1 rounded ${t.side === 'BUY' ? 'bg-[#00FF41]/10 text-[#00FF41]' : 'bg-[#FF3366]/10 text-[#FF3366]'}`}>
                          <span>{t.price.toFixed(1)}</span>
                          <span className="text-right text-white">{t.qty.toFixed(4)}</span>
                          <span className="text-right text-[#88888E]">{new Date(t.timestamp).toISOString().split('T')[1].slice(0,-1)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-4 text-[10px] text-[#88888E] uppercase pb-2 mb-2 border-b border-[#262628]">
                      <span>Side</span>
                      <span className="text-right">Price</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Time</span>
                    </div>
                    
                    {tradesFetchError && (
                      <div className="p-2 border border-[#FF3366]/30 bg-[#FF3366]/5 rounded text-left mb-2">
                        <p className="text-[10px] font-mono text-[#FF3366]">⚠️ {tradesFetchError}</p>
                        <button 
                          onClick={() => fetchUserTradesAsync(false)} 
                          className="mt-1 text-[9px] uppercase font-bold text-white bg-[#262628] hover:bg-[#323235] px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Retry Sync
                        </button>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-1 space-y-1 font-mono text-xs">
                      {isLoadingTrades && userTrades.length === 0 ? (
                        <div className="text-center py-6 text-[#00FF41] animate-pulse text-[10px] tracking-widest font-mono">
                          [RETRIEVING SECURE HISTORY...]
                        </div>
                      ) : userTrades.length === 0 ? (
                        <div className="text-[#444448] text-[10px] p-4 text-center uppercase tracking-wider mt-4">No match history found</div>
                      ) : (
                        userTrades.map((t, i) => (
                          <div key={t.id || i} className={`grid grid-cols-4 p-1 rounded items-center ${t.side === 'BUY' ? 'bg-[#00FF41]/10 text-[#00FF41]' : 'bg-[#FF3366]/10 text-[#FF3366]'}`}>
                            <span className="font-bold text-left text-[10px] tracking-wide flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${t.side === 'BUY' ? 'bg-[#00FF41]' : 'bg-[#FF3366]'}`}></span>
                              {t.side}
                            </span>
                            <span className="text-right text-white font-semibold">${t.price.toFixed(1)}</span>
                            <span className="text-right text-white font-medium">{t.qty.toFixed(4)}</span>
                            <span className="text-right text-[#88888E] text-[10px]">
                              {t.timestamp ? new Date(t.timestamp).toISOString().split('T')[1].slice(0,-1) : '--:--:--'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* TRADER COLUMN 3: Execution Reports & AI Co-Pilot */}
            <section className="lg:col-span-4 flex flex-col gap-4 overflow-hidden h-full">
               {/* Top half: FIX Client */}
               <div className="flex-[4] bg-[#0A0A0C] border border-[#262628] rounded-lg p-3 flex flex-col min-h-0">
                  <h3 className="text-[11px] font-semibold text-[#88888E] uppercase mb-3 tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#00FF41]" />
                    Execution Reports (FIX Client)
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 font-mono text-[10px]">
                    {executionReports.length === 0 && (
                      <div className="text-[#444448] text-center mt-4 uppercase">Waiting for orders...</div>
                    )}
                    {executionReports.map((r, i) => (
                      <div key={r.id + i} className="p-2 border border-[#262628] bg-[#121214] rounded text-[#88888E] space-y-1">
                        <div className="flex justify-between text-white">
                          <span className="font-bold text-blue-400">← EXECUTION_REPORT</span>
                          <span>{new Date(r.timestamp).toISOString().split('T')[1].slice(0,-1)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <span>order_id: <span className="text-white">{r.order_id}</span></span>
                          <span>exec_type: <span className={r.exec_type === 'CANCELED' ? 'text-[#FF3366]' : 'text-[#00FF41]'}>{r.exec_type}</span></span>
                          <span>filled_qty: <span className="text-white">{r.filled_qty.toFixed(4)}</span></span>
                          <span>price: <span className="text-white">{r.price > 0 ? r.price.toFixed(2) : '-'}</span></span>
                          <span>leaves_qty: <span className="text-white">{r.leaves_qty.toFixed(4)}</span></span>
                          {r.counterparty && <span>counterparty: <span className="text-white">{r.counterparty}</span></span>}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Bottom half: AI Co-Pilot */}
               <div className="flex-[6] bg-[#0A0A0C] border border-[#262628] rounded-lg p-3 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                     <h3 className="text-[11px] font-semibold text-[#88888E] uppercase tracking-wider flex items-center gap-2">
                       <Brain className="w-4 h-4 text-[#00FF41] animate-pulse" />
                       L0-AI Trading Co-Pilot
                     </h3>
                     <button 
                       onClick={() => handleAiRequest()}
                       disabled={aiLoading}
                       className="text-[10px] bg-[#00FF41]/10 hover:bg-[#00FF41]/20 border border-[#00FF41]/30 hover:border-[#00FF41] text-[#00FF41] px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                     >
                       <Sparkles className="w-3 h-3" />
                       {aiLoading ? "Analyzing..." : "Run Full Analysis"}
                     </button>
                  </div>

                  {/* Predefined prompt shortcut chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 flex-wrap">
                    <button 
                      onClick={() => handleAiRequest("Perform a comprehensive volume imbalance, order book spread, and liquidity depth analysis right now.")}
                      disabled={aiLoading}
                      className="text-[9px] bg-[#121214] hover:bg-[#1C1C1F] border border-[#262628] text-[#88888E] hover:text-white px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      📊 Order Book Depth
                    </button>
                    <button 
                      onClick={() => handleAiRequest("Analyze market trends, spread width, and give a short bullish/bearish tactical sentiment score.")}
                      disabled={aiLoading}
                      className="text-[9px] bg-[#121214] hover:bg-[#1C1C1F] border border-[#262628] text-[#88888E] hover:text-white px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      📈 Sentiment Score
                    </button>
                    <button 
                      onClick={() => handleAiRequest("Based on my BTC and USD balance, formulate a safe, conservative high-frequency order placement strategy.")}
                      disabled={aiLoading}
                      className="text-[9px] bg-[#121214] hover:bg-[#1C1C1F] border border-[#262628] text-[#88888E] hover:text-white px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      ⚡ Asset Strategy
                    </button>
                  </div>

                  {/* Chat / Result terminal pane */}
                  <div className="flex-1 bg-[#121214]/50 border border-[#262628] rounded p-2 overflow-y-auto mb-2 text-xs font-mono select-text text-left">
                     {aiError && (
                       <div className="text-[#FF3366] mb-2 p-1 border border-[#FF3366]/20 bg-[#FF3366]/5 rounded text-[11px]">
                         ⚠️ {aiError}
                       </div>
                     )}
                     <div className="space-y-1.5 text-[#A0A0A5]">
                        {renderMarkdown(aiOutput)}
                     </div>
                  </div>

                  {/* Input form */}
                  <form 
                     onSubmit={(e) => {
                       e.preventDefault();
                       if (aiQuery.trim()) {
                         handleAiRequest();
                       }
                     }}
                     className="flex gap-2"
                  >
                     <input 
                       type="text" 
                       value={aiQuery}
                       onChange={(e) => setAiQuery(e.target.value)}
                       placeholder={user ? "Ask Co-Pilot about order book or trading strategy..." : "Please login to consult Co-Pilot..."}
                       disabled={!user || aiLoading}
                       className="flex-1 bg-[#121214] border border-[#262628] focus:border-[#00FF41] text-white text-xs rounded px-2.5 py-1.5 focus:outline-none font-mono disabled:opacity-50"
                     />
                     <button 
                       type="submit"
                       disabled={!user || aiLoading || !aiQuery.trim()}
                       className="bg-[#00FF41] hover:bg-[#00DD39] disabled:bg-[#1F1F22] text-black disabled:text-[#444448] p-2 rounded transition-colors cursor-pointer flex items-center justify-center"
                     >
                       <Send className="w-3.5 h-3.5" />
                     </button>
                  </form>
               </div>
            </section>
          </>
        ) : (
          <>
            {/* OPERATOR COLUMN 2 & 3: Logs and Telemetry */}
            <section className="lg:col-span-9 flex flex-col gap-4 overflow-hidden h-full">
              <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                <div className="bg-[#0A0A0C] border border-[#262628] rounded-lg p-4 relative group/net">
                  <h3 className="text-[11px] font-semibold text-[#88888E] uppercase mb-4 tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-amber-400" />
                      Network Interface (DPDK)
                    </div>
                    <div className="text-[#88888E] hover:text-white cursor-help">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                  </h3>
                  <div className="absolute top-10 right-4 w-48 bg-[#121214] border border-[#262628] rounded p-2 text-[10px] text-[#A0A0A0] shadow-xl opacity-0 group-hover/net:opacity-100 pointer-events-none transition-opacity z-50">
                    <strong className="text-white">Kernel Bypass:</strong> DPDK allows user-space applications to read packets directly from the NIC hardware queues, bypassing the Linux networking stack for ultra-low latency.
                  </div>
                  <div className="flex items-end justify-between gap-1 h-12 mb-2">
                     {Array.from({length: 24}).map((_, i) => (
                       <div 
                         key={i} 
                         className={`w-full ${Math.random() > 0.6 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'bg-[#1A1A1D]'}`} 
                         style={{ height: `${Math.max(15, Math.random() * 100)}%` }}
                       />
                     ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono mt-4">
                    <span className="text-[#88888E]">RX Packets/s</span>
                    <span className="text-amber-400">{(metrics.throughput * 2.1).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                  </div>
                </div>

                <div className="bg-[#0A0A0C] border border-[#262628] rounded-lg p-4 relative group/core">
                  <h3 className="text-[11px] font-semibold text-[#88888E] uppercase mb-4 tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-amber-400" />
                      Core Isolation
                    </div>
                    <div className="text-[#88888E] hover:text-white cursor-help">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                  </h3>
                  <div className="absolute top-10 right-4 w-48 bg-[#121214] border border-[#262628] rounded p-2 text-[10px] text-[#A0A0A0] shadow-xl opacity-0 group-hover/core:opacity-100 pointer-events-none transition-opacity z-50">
                    <strong className="text-white">CPU Pinning:</strong> Threads are bound to specific physical cores, avoiding OS context switches and cache misses to maintain sub-microsecond latency.
                  </div>
                  <div className="space-y-3 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#88888E]">Matching Core:</span>
                      <span className="text-white">CPU 2 (Pinned)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#88888E]">Sequencer Core:</span>
                      <span className="text-white">CPU 3 (Pinned)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#88888E]">Context Switches:</span>
                      <span className="text-[#00FF41]">0 / sec</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#262628]">
                      <span className="text-[#88888E]">L1 Cache Hit Rate:</span>
                      <span className="text-white">99.8%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0C] border border-[#262628] rounded-lg p-4 relative group/sys">
                  <h3 className="text-[11px] font-semibold text-[#88888E] uppercase mb-4 tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      System State
                    </div>
                    <div className="text-[#88888E] hover:text-white cursor-help">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                  </h3>
                  <div className="absolute top-10 right-4 w-48 bg-[#121214] border border-[#262628] rounded p-2 text-[10px] text-[#A0A0A0] shadow-xl opacity-0 group-hover/sys:opacity-100 pointer-events-none transition-opacity z-50">
                    <strong className="text-white">Lock-Free Architecture:</strong> Data structures (ring buffers, intrusive lists) are pre-allocated and mutated in-place without locks or garbage collection.
                  </div>
                  <div className="space-y-3 text-[10px] font-mono">
                     <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse"></div>
                      <span className="text-white font-bold">NORMAL TRADING</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#88888E]">Last Sequence:</span>
                      <span className="text-white">{sequenceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#88888E]">Memory Alloc:</span>
                      <span className="text-white">Pre-allocated</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#88888E]">Garbage Coll:</span>
                      <span className="text-[#00FF41]">DISABLED</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0">
                <div className="bg-[#0A0A0C] border border-[#262628] rounded-lg p-4 flex flex-col min-h-0">
                  <h3 className="text-[11px] font-semibold text-[#88888E] uppercase mb-4 tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#00FF41]" />
                      Latency Heatmap (μs)
                    </div>
                  </h3>
                  <div className="flex-1 flex flex-col gap-3 justify-center">
                    {['BUY', 'SELL', 'CANCEL', 'MODIFY'].map(type => (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#88888E] uppercase w-14">{type}</span>
                        <div className="flex-1 flex gap-[2px] h-6">
                          {metrics.latencyHeatmap[type].map((val, idx) => {
                             let bg = 'bg-[#1A1A1D]';
                             if (val > 0) {
                               if (val < 1.5) bg = 'bg-[#00FF41]/20';
                               else if (val < 2.0) bg = 'bg-[#00FF41]/60';
                               else if (val < 3.0) bg = 'bg-amber-400/80';
                               else bg = 'bg-[#FF3366]';
                             }
                             return <div key={idx} className={`flex-1 rounded-sm ${bg} transition-colors duration-200`} title={val > 0 ? `${val.toFixed(2)} μs` : 'No data'} />;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0A0A0C] border border-[#262628] rounded-lg p-4 flex flex-col min-h-0">
                  <h3 className="text-[11px] font-semibold text-[#88888E] uppercase mb-4 tracking-wider">Sequencer & Matcher Logs (stdout)</h3>
                  <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 pr-1">
                    {operatorLogs.map((log, i) => {
                      let colorClass = "text-[#88888E]";
                      if (log.includes("MATCH")) colorClass = "text-[#E0E0E0]";
                      if (log.includes("INIT") || log.includes("READY")) colorClass = "text-amber-400";
                      if (log.includes("CANCEL")) colorClass = "text-[#FF3366]";
                      if (log.includes("MODIFY")) colorClass = "text-blue-400";
                      
                      return (
                        <div key={i} className="py-0.5 hover:bg-[#121214]">
                          <span className={colorClass}>{log}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

      </main>

    </div>
  );
}
