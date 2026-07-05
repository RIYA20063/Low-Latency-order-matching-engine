import { Order, Side } from '../types';

const getHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  login: async (email: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },
  register: async (email: string, password: string) => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error("Registration failed");
    return res.json();
  },
  getMe: async () => {
    const res = await fetch("/api/me", { headers: getHeaders() });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },
  getOrders: async () => {
    const res = await fetch("/api/orders", { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch orders");
    return res.json();
  },
  createOrder: async (side: Side, price: number, qty: number) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ side, price, qty })
    });
    if (!res.ok) throw new Error("Failed to create order");
    return res.json();
  },
  cancelOrder: async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to cancel order");
    return res.json();
  },
  modifyOrder: async (orderId: string, price: number, qty: number) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ price, qty })
    });
    if (!res.ok) throw new Error("Failed to modify order");
    return res.json();
  },
  getTrades: async () => {
    const res = await fetch("/api/trades", { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch trades");
    return res.json();
  },
  getSnapshot: async () => {
    const res = await fetch("/api/book");
    if (!res.ok) throw new Error("Failed to fetch book");
    return res.json();
  },
  analyzeMarket: async (query?: string) => {
    const res = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ query })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to generate AI analysis");
    }
    return res.json();
  }
};
