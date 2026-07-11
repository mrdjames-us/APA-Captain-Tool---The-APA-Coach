import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc,
  getDocs, writeBatch, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Player, Match, SessionArchive, ScheduleEntry, APAConnection } from '../types';

// ── Path helpers ──────────────────────────────────────────────────────────────
const col  = (uid: string, name: string) => collection(db, 'captains', uid, name);
const docr = (uid: string, name: string, id: string) => doc(db, 'captains', uid, name, id);

// Firestore's setDoc/batch.set reject any field explicitly set to `undefined`
// (e.g. an optional stat that was never populated) — drop those keys instead
// of writing them, rather than requiring every caller to remember to.
function stripUndefined<T extends object>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// ── Generic live collection hook ──────────────────────────────────────────────
function useLiveCollection<T extends { id: string }>(
  uid: string | null,
  colName: string
): [T[], boolean] {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setItems([]); setLoading(false); return; }
    const q = query(col(uid, colName));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
      setLoading(false);
    });
    return unsub;
  }, [uid, colName]);

  return [items, loading];
}

// ── Players ───────────────────────────────────────────────────────────────────
export function usePlayers(uid: string | null) {
  const [players, loading] = useLiveCollection<Player>(uid, 'players');

  const save = useCallback(async (p: Player) => {
    if (!uid) return;
    await setDoc(docr(uid, 'players', p.id), stripUndefined(p));
  }, [uid]);

  const remove = useCallback(async (id: string) => {
    if (!uid) return;
    await deleteDoc(docr(uid, 'players', id));
  }, [uid]);

  const saveAll = useCallback(async (list: Player[]) => {
    if (!uid) return;
    const batch = writeBatch(db);
    list.forEach(p => batch.set(docr(uid, 'players', p.id), stripUndefined(p)));
    await batch.commit();
  }, [uid]);

  return { players, loading, save, remove, saveAll };
}

// ── Matches ───────────────────────────────────────────────────────────────────
export function useMatches(uid: string | null) {
  const [matches, loading] = useLiveCollection<Match>(uid, 'matches');

  const save = useCallback(async (m: Match) => {
    if (!uid) return;
    await setDoc(docr(uid, 'matches', m.id), stripUndefined(m));
  }, [uid]);

  return { matches, loading, save };
}

// ── Archives ──────────────────────────────────────────────────────────────────
export function useArchives(uid: string | null) {
  const [archives, loading] = useLiveCollection<SessionArchive>(uid, 'archives');

  const save = useCallback(async (a: SessionArchive) => {
    if (!uid) return;
    await setDoc(docr(uid, 'archives', a.id), stripUndefined(a));
  }, [uid]);

  const deleteAllMatches = useCallback(async () => {
    if (!uid) return;
    const snap = await getDocs(col(uid, 'matches'));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, [uid]);

  return { archives, loading, save, deleteAllMatches };
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export function useSchedule(uid: string | null) {
  const [schedule, loading] = useLiveCollection<ScheduleEntry>(uid, 'schedule');

  const save = useCallback(async (e: ScheduleEntry) => {
    if (!uid) return;
    await setDoc(docr(uid, 'schedule', e.id), stripUndefined(e));
  }, [uid]);

  const remove = useCallback(async (id: string) => {
    if (!uid) return;
    await deleteDoc(docr(uid, 'schedule', id));
  }, [uid]);

  const saveAll = useCallback(async (entries: ScheduleEntry[]) => {
    if (!uid) return;
    const batch = writeBatch(db);
    entries.forEach(e => batch.set(docr(uid, 'schedule', e.id), stripUndefined(e)));
    await batch.commit();
  }, [uid]);

  return { schedule, loading, save, remove, saveAll };
}

// ── APA connection (stored as a single settings doc) ─────────────────────────
// Holds the durable deviceRefreshToken + the member's teams so we can keep
// syncing without re-entering a password. Treat the token like a credential.
export function useApaConnection(uid: string | null) {
  const [connection, setConnection] = useState<APAConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setConnection(null); setLoading(false); return; }
    const unsub = onSnapshot(doc(db, 'captains', uid, 'settings', 'apa'), snap => {
      setConnection(snap.exists() ? (snap.data() as APAConnection) : null);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const save = useCallback(async (c: APAConnection) => {
    if (!uid) return;
    await setDoc(doc(db, 'captains', uid, 'settings', 'apa'), stripUndefined(c));
  }, [uid]);

  const update = useCallback(async (patch: Partial<APAConnection>) => {
    if (!uid) return;
    await setDoc(doc(db, 'captains', uid, 'settings', 'apa'), stripUndefined(patch), { merge: true });
  }, [uid]);

  const disconnect = useCallback(async () => {
    if (!uid) return;
    await deleteDoc(doc(db, 'captains', uid, 'settings', 'apa'));
  }, [uid]);

  return { connection, loading, save, update, disconnect };
}

// ── Season week (stored as a single doc) ─────────────────────────────────────
export function useSeasonWeek(uid: string | null): [number, (w: number) => void] {
  const [week, setWeek] = useState(1);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'captains', uid, 'settings', 'season'), snap => {
      if (snap.exists()) setWeek(snap.data().week ?? 1);
    });
    return unsub;
  }, [uid]);

  const updateWeek = useCallback((w: number) => {
    if (!uid) return;
    setDoc(doc(db, 'captains', uid, 'settings', 'season'), { week: w }, { merge: true });
  }, [uid]);

  return [week, updateWeek];
}
