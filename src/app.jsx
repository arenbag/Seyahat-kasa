import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Users, Receipt, ArrowRightLeft, Trash2, Check, X, Plane, Coins, ChevronLeft, Copy, Loader2 } from 'lucide-react';
import { supabase } from './supabase';

const CURRENCY_SYMBOLS = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'Fr', AED: 'د.إ' };
const DEFAULT_RATES = { TRY: 1, EUR: 45.5, USD: 42.0, GBP: 53.0, JPY: 0.27, CHF: 47.5, AED: 11.4 };

const groupCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const LS_KEY = 'seyahatkasa_gruplarim';
const getMyGroups = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
};
const setMyGroups = (list) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
};

export default function App() {
  const [view, setView] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [myGroups, setMyGroupsState] = useState(getMyGroups());

  const addToMyGroups = (g) => {
    const next = myGroups.find(x => x.id === g.id) ? myGroups : [...myGroups, { id: g.id, ad: g.
