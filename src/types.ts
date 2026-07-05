export type Side = 'BUY' | 'SELL';
export type ExecType = 'NEW' | 'PARTIAL_FILL' | 'FILL' | 'CANCELED' | 'REPLACED';

export interface Order {
  id: string;
  price: number;
  qty: number;
  side: Side;
  timestamp: number;
  accountId: string;
}

export interface Trade {
  id: string;
  price: number;
  qty: number;
  timestamp: number;
  side: Side;
  makerOrderId: string;
  takerOrderId: string;
}

export interface ExecutionReport {
  id: string;
  order_id: string;
  exec_type: ExecType;
  filled_qty: number;
  price: number;
  leaves_qty: number;
  timestamp: number;
  counterparty?: string;
}

export interface EngineMetrics {
  latency: number;
  throughput: number;
  jitter: number;
  latencyHeatmap: Record<string, number[]>;
}

export interface EngineState {
  bids: Order[];
  asks: Order[];
  trades: Trade[];
  operatorLogs: string[];
  executionReports: ExecutionReport[];
  marketPrice: number;
  sequenceId: number;
  metrics: EngineMetrics;
}
