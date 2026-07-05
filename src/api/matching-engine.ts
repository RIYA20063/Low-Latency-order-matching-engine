import { Order, Trade, ExecutionReport, EngineState, Side } from '../types';

class MatchingEngine {
  public state: EngineState;
  public onTrade?: (trade: Trade) => void;

  constructor() {
    this.state = {
      bids: [],
      asks: [],
      trades: [],
      operatorLogs: [],
      executionReports: [],
      marketPrice: 65000.0,
      sequenceId: 10000,
      metrics: {
        latency: 2.1,
        throughput: 124500,
        jitter: 0.12,
        latencyHeatmap: {
          BUY: Array(24).fill(0),
          SELL: Array(24).fill(0),
          CANCEL: Array(24).fill(0),
          MODIFY: Array(24).fill(0)
        }
      }
    };
  }

  public addOperatorLog(msg: string) {
    const timestampStr = new Date().toISOString().split('T')[1].slice(0,-1);
    this.state.operatorLogs.unshift(`[${timestampStr}] ${msg}`);
    if (this.state.operatorLogs.length > 100) {
      this.state.operatorLogs = this.state.operatorLogs.slice(0, 100);
    }
  }

  public addExecutionReport(report: Omit<ExecutionReport, 'id'>) {
    this.state.executionReports.unshift({
      ...report,
      id: Math.random().toString(36).substring(2, 8)
    });
    if (this.state.executionReports.length > 50) {
      this.state.executionReports = this.state.executionReports.slice(0, 50);
    }
  }

  public recordLatency(type: string) {
    const simulatedLatency = 1.2 + Math.random() * 0.5 + (Math.random() > 0.95 ? Math.random() * 2 : 0);
    this.state.metrics.latency = simulatedLatency;
    this.state.metrics.throughput = 1200000 + Math.random() * 150000;
    this.state.metrics.jitter = 0.05 + Math.random() * 0.05;
    
    this.state.metrics.latencyHeatmap[type].push(simulatedLatency);
    if (this.state.metrics.latencyHeatmap[type].length > 24) {
      this.state.metrics.latencyHeatmap[type].shift();
    }
  }

  public processOrder(order: Order, skipLatencyRecord = false) {
    let remaining = order.qty;
    this.state.sequenceId++;
    const seq = this.state.sequenceId;
    
    this.addOperatorLog(`SEQ_ID:${seq} | INGRESS | ${order.side} ${order.qty.toFixed(4)} @ $${order.price.toFixed(2)} [${order.id}]`);

    let filledQty = 0;
    let lastTradePrice = order.price;

    if (order.side === 'BUY') {
      while(remaining > 0 && this.state.asks.length > 0 && this.state.asks[0].price <= order.price) {
        const ask = this.state.asks[0];
        const tradeQty = Math.min(remaining, ask.qty);
        const tradeId = Math.random().toString(36).substring(2, 8);
        
        const trade: Trade = {
          id: tradeId,
          price: ask.price,
          qty: tradeQty,
          timestamp: Date.now(),
          side: 'BUY',
          makerOrderId: ask.id,
          takerOrderId: order.id
        };
        this.state.trades.unshift(trade);
        if (this.onTrade) {
          try {
            this.onTrade(trade);
          } catch (err) {
            console.error("onTrade callback error:", err);
          }
        }
        
        this.state.marketPrice = ask.price;
        lastTradePrice = ask.price;
        this.addOperatorLog(`MATCH | Qty: ${tradeQty.toFixed(4)} @ $${ask.price.toFixed(2)} | Taker:${order.id} Maker:${ask.id}`);

        if (ask.accountId === 'USR') {
          this.addExecutionReport({
            order_id: ask.id,
            exec_type: ask.qty - tradeQty <= 0.000001 ? 'FILL' : 'PARTIAL_FILL',
            filled_qty: tradeQty,
            price: ask.price,
            leaves_qty: Math.max(0, ask.qty - tradeQty),
            timestamp: Date.now(),
            counterparty: order.id
          });
        }

        ask.qty -= tradeQty;
        remaining -= tradeQty;
        filledQty += tradeQty;
        
        if (ask.qty <= 0.000001) this.state.asks.shift();
      }
      
      if (order.accountId === 'USR') {
        if (filledQty > 0) {
          this.addExecutionReport({
            order_id: order.id,
            exec_type: remaining <= 0.000001 ? 'FILL' : 'PARTIAL_FILL',
            filled_qty: filledQty,
            price: lastTradePrice,
            leaves_qty: remaining,
            timestamp: Date.now()
          });
        }
      }

      if (remaining > 0.000001) {
        this.state.bids.push({ ...order, qty: remaining });
        this.state.bids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
        
        if (order.accountId === 'USR' && filledQty === 0) {
           this.addExecutionReport({
              order_id: order.id,
              exec_type: 'NEW',
              filled_qty: 0,
              price: order.price,
              leaves_qty: remaining,
              timestamp: Date.now()
           });
        }
      }
    } else {
      while(remaining > 0 && this.state.bids.length > 0 && this.state.bids[0].price >= order.price) {
        const bid = this.state.bids[0];
        const tradeQty = Math.min(remaining, bid.qty);
        const tradeId = Math.random().toString(36).substring(2, 8);
        
        const trade: Trade = {
          id: tradeId,
          price: bid.price,
          qty: tradeQty,
          timestamp: Date.now(),
          side: 'SELL',
          makerOrderId: bid.id,
          takerOrderId: order.id
        };
        this.state.trades.unshift(trade);
        if (this.onTrade) {
          try {
            this.onTrade(trade);
          } catch (err) {
            console.error("onTrade callback error:", err);
          }
        }
        
        this.state.marketPrice = bid.price;
        lastTradePrice = bid.price;
        this.addOperatorLog(`MATCH | Qty: ${tradeQty.toFixed(4)} @ $${bid.price.toFixed(2)} | Taker:${order.id} Maker:${bid.id}`);

        if (bid.accountId === 'USR') {
          this.addExecutionReport({
            order_id: bid.id,
            exec_type: bid.qty - tradeQty <= 0.000001 ? 'FILL' : 'PARTIAL_FILL',
            filled_qty: tradeQty,
            price: bid.price,
            leaves_qty: Math.max(0, bid.qty - tradeQty),
            timestamp: Date.now(),
            counterparty: order.id
          });
        }

        bid.qty -= tradeQty;
        remaining -= tradeQty;
        filledQty += tradeQty;
        
        if (bid.qty <= 0.000001) this.state.bids.shift();
      }

      if (order.accountId === 'USR') {
        if (filledQty > 0) {
          this.addExecutionReport({
            order_id: order.id,
            exec_type: remaining <= 0.000001 ? 'FILL' : 'PARTIAL_FILL',
            filled_qty: filledQty,
            price: lastTradePrice,
            leaves_qty: remaining,
            timestamp: Date.now()
          });
        }
      }

      if (remaining > 0.000001) {
        this.state.asks.push({ ...order, qty: remaining });
        this.state.asks.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
        
        if (order.accountId === 'USR' && filledQty === 0) {
           this.addExecutionReport({
              order_id: order.id,
              exec_type: 'NEW',
              filled_qty: 0,
              price: order.price,
              leaves_qty: remaining,
              timestamp: Date.now()
           });
        }
      }
    }

    if (this.state.trades.length > 40) this.state.trades = this.state.trades.slice(0, 40);
    
    if (!skipLatencyRecord) this.recordLatency(order.side);
  }

  public cancelOrder(orderId: string, isModify = false) {
    const bidIndex = this.state.bids.findIndex(o => o.id === orderId);
    if (bidIndex !== -1) {
      this.state.bids.splice(bidIndex, 1);
      this.addOperatorLog(`CANCEL | Order ${orderId} removed from book`);
      this.addExecutionReport({ order_id: orderId, exec_type: 'CANCELED', filled_qty: 0, price: 0, leaves_qty: 0, timestamp: Date.now() });
      if (!isModify) this.recordLatency('CANCEL');
      return;
    }
    const askIndex = this.state.asks.findIndex(o => o.id === orderId);
    if (askIndex !== -1) {
      this.state.asks.splice(askIndex, 1);
      this.addOperatorLog(`CANCEL | Order ${orderId} removed from book`);
      this.addExecutionReport({ order_id: orderId, exec_type: 'CANCELED', filled_qty: 0, price: 0, leaves_qty: 0, timestamp: Date.now() });
      if (!isModify) this.recordLatency('CANCEL');
    }
  }

  public modifyOrder(orderId: string, newPrice: number, newQty: number) {
    const foundOrder = this.state.bids.find(o => o.id === orderId) || this.state.asks.find(o => o.id === orderId);
    if (foundOrder) {
      this.cancelOrder(orderId, true);
      this.addOperatorLog(`MODIFY | Order ${orderId} replaced with new terms`);
      this.processOrder({
        ...foundOrder,
        id: `USR-${Math.random().toString(36).substring(2, 6)}`,
        price: newPrice,
        qty: newQty,
        timestamp: Date.now()
      }, true);
      this.recordLatency('MODIFY');
    }
  }

  public getSnapshot() {
    return this.state;
  }
}

export const matchingEngine = new MatchingEngine();
