import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Users, Receipt, ArrowRightLeft, Trash2, Check, X, Plane, Coins, ChevronLeft, Copy, Loader2, Share2,
  UtensilsCrossed, Car, BedDouble, Ticket, ShoppingBag, Plane as PlaneIcon, Wine, MoreHorizontal, TrendingUp,
  LogOut, User, Lock, AtSign, ArrowRight, Eye, EyeOff, Pencil } from 'lucide-react';
import { supabase } from './supabase';

const CURRENCY_SYMBOLS = { TRY: '₺', EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'Fr', AED: 'د.إ' };
const DEFAULT_RATES = { TRY: 1, EUR: 45.5, USD: 42.0, GBP: 53.0, JPY: 0.27, CHF: 47.5, AED: 11.4 };

const CATEGORIES = [
  { id: 'yemek', label: 'Yemek', Icon: UtensilsCrossed, color: '#c1602f' },
  { id: 'ulasim', label: 'Ulaşım', Icon: Car, color: '#3f6b6b' },
  { id: 'konaklama', label: 'Konaklama', Icon: BedDouble, color: '#6f7a4f' },
  { id: 'gezi', label: 'Gezi & Bilet', Icon: Ticket, color: '#b8893f' },
  { id: 'alisveris', label: 'Alışveriş', Icon: ShoppingBag, color: '#9e4b54' },
  { id: 'eglence', label: 'Eğlence', Icon: Wine, color: '#8a5a9e' },
  { id: 'ucak', label: 'Uçak/Yol', Icon: PlaneIcon, color: '#4a6d9e' },
  { id: 'diger', label: 'Diğer', Icon: MoreHorizontal, color: '#6b6258' },
];
const catOf = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

// Bir harcamanın ödeyenlerini normalize eder: çoklu ödeyen (odeyenler) varsa onu,
// yoksa eski tek-ödeyen alanından ({odeyen_id, tutar}) üretir.
const payersOf = (e) => (Array.isArray(e.odeyenler) && e.odeyenler.length)
  ? e.odeyenler
  : [{ id: e.odeyen_id, tutar: e.tutar }];

const AVATAR_COLORS = ['#c1602f', '#3f6b6b', '#6f7a4f', '#b8893f', '#9e4b54', '#8a5a9e', '#4a6d9e', '#a0612f'];
const avatarColor = (id) => {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};
const initials = (name) => {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const groupCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const LS_KEY = 'seyahatkasa_gruplarim';
const getMyGroups = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } };
const clearMyGroups = () => { try { localStorage.removeItem(LS_KEY); } catch {} };

const SESSION_KEY = 'seyahatkasa_oturum';
const getSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
const saveSession = (s) => { try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch {} };

async function hashPassword(pw) {
  const data = new TextEncoder().encode(pw + '::seyahatkasa.v1');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function App() {
  const [session, setSessionState] = useState(getSession());
  const [view, setView] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [myGroups, setMyGroupsState] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(!!getSession());

  const loadGroups = useCallback(async (uid) => {
    if (!uid) return;
    const { data } = await supabase.from('kullanici_gruplari')
      .select('grup_id, olusturma_tarihi, gruplar(id, ad, kod)')
      .eq('kullanici_id', uid).order('olusturma_tarihi');
    setMyGroupsState((data || []).map(r => r.gruplar).filter(Boolean));
    setLoadingGroups(false);
  }, []);

  // Bu cihazdaki eski localStorage gruplarını bir kez hesaba taşı
  const migrateLocalGroups = useCallback(async (uid) => {
    const old = getMyGroups();
    if (!old.length) return;
    for (const g of old) {
      try { await supabase.from('kullanici_gruplari').upsert({ kullanici_id: uid, grup_id: g.id }, { onConflict: 'kullanici_id,grup_id', ignoreDuplicates: true }); } catch {}
    }
    clearMyGroups();
  }, []);

  useEffect(() => {
    if (!session) { setLoadingGroups(false); return; }
    (async () => { await migrateLocalGroups(session.id); await loadGroups(session.id); })();
  }, [session, loadGroups, migrateLocalGroups]);

  const onAuthed = (user) => {
    const s = { id: user.id, kullanici_adi: user.kullanici_adi };
    saveSession(s); setSessionState(s); setLoadingGroups(true); setView('home');
  };
  const logout = () => {
    saveSession(null); setSessionState(null); setMyGroupsState([]); setActiveGroupId(null); setView('home');
  };

  const addToMyGroups = async (g) => {
    if (!session) return;
    try { await supabase.from('kullanici_gruplari').upsert({ kullanici_id: session.id, grup_id: g.id }, { onConflict: 'kullanici_id,grup_id', ignoreDuplicates: true }); } catch {}
    loadGroups(session.id);
  };
  const removeFromMyGroups = async (id) => {
    if (!session) return;
    await supabase.from('kullanici_gruplari').delete().eq('kullanici_id', session.id).eq('grup_id', id);
    loadGroups(session.id);
  };

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', width: '100%' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 18px 60px' }}>
          <AuthView onAuthed={onAuthed} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 18px 120px' }}>
        {view === 'home' && <HomeView session={session} myGroups={myGroups} loadingGroups={loadingGroups}
          onOpenGroup={(id) => { setActiveGroupId(id); setView('group'); }}
          onNewGroup={() => setView('newGroup')} onJoinGroup={() => setView('joinGroup')} onLogout={logout} />}
        {view === 'newGroup' && <NewGroupView
          onCreated={(g) => { addToMyGroups(g); setActiveGroupId(g.id); setView('group'); }}
          onBack={() => setView('home')} />}
        {view === 'joinGroup' && <JoinGroupView
          onJoined={(g) => { addToMyGroups(g); setActiveGroupId(g.id); setView('group'); }}
          onBack={() => setView('home')} />}
        {view === 'group' && <GroupView groupId={activeGroupId}
          onBack={() => setView('home')}
          onLeave={() => { removeFromMyGroups(activeGroupId); setView('home'); }}
          onDeleted={() => { setView('home'); loadGroups(session.id); }} />}
      </div>
    </div>
  );
}

function AuthView({ onAuthed }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const adiNorm = kullaniciAdi.trim().toLowerCase();
  const canSubmit = adiNorm.length >= 3 && sifre.length >= 4;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true); setError('');
    try {
      const hash = await hashPassword(sifre);
      if (mode === 'register') {
        const { data: existing } = await supabase.from('kullanicilar').select('id').eq('kullanici_adi', adiNorm).maybeSingle();
        if (existing) { setError('Bu kullanıcı adı zaten alınmış.'); setBusy(false); return; }
        const { data, error: e } = await supabase.from('kullanicilar')
          .insert({ kullanici_adi: adiNorm, sifre: hash }).select().single();
        if (e) throw e;
        onAuthed(data);
      } else {
        const { data, error: e } = await supabase.from('kullanicilar').select('*').eq('kullanici_adi', adiNorm).maybeSingle();
        if (e) throw e;
        if (!data) { setError('Bu kullanıcı adı bulunamadı.'); setBusy(false); return; }
        if (data.sifre !== hash) { setError('Şifre hatalı.'); setBusy(false); return; }
        onAuthed(data);
      }
    } catch (err) { setError('Bir hata oluştu: ' + (err.message || 'bilinmeyen')); setBusy(false); }
  };

  return (
    <div className="rise">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 36, marginBottom: 34 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta-dark))', boxShadow: '0 6px 18px rgba(193,96,47,0.32)', marginBottom: 18 }}>
          <Plane color="#fff" size={28} strokeWidth={2} />
        </div>
        <h1 className="serif" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em' }}>Seyahat Kasa</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 6, maxWidth: 300 }}>
          {mode === 'login' ? 'Hesabına gir, grupların her cihazda seni beklesin.' : 'Bir hesap oluştur, grupların her yerde seninle gelsin.'}
        </p>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--paper-2)', borderRadius: 13, padding: 4, marginBottom: 22 }}>
          {[{ k: 'login', l: 'Giriş Yap' }, { k: 'register', l: 'Kayıt Ol' }].map(t => (
            <button key={t.k} onClick={() => { setMode(t.k); setError(''); }} className="tap"
              style={{ flex: 1, borderRadius: 10, padding: '10px 0', fontSize: 13.5, fontWeight: 600, border: 'none',
                ...(mode === t.k ? { background: 'var(--card)', color: 'var(--ink)', boxShadow: 'var(--shadow-sm)' } : { background: 'transparent', color: 'var(--ink-soft)' }) }}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Kullanıcı Adı</label>
            <div style={{ position: 'relative' }}>
              <AtSign size={17} color="var(--ink-faint)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input value={kullaniciAdi} onChange={e => setKullaniciAdi(e.target.value)} placeholder="kullaniciadi" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                className="input" style={{ paddingLeft: 40 }}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
            </div>
          </div>

          <div>
            <label className="label">Şifre</label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} color="var(--ink-faint)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input value={sifre} onChange={e => setSifre(e.target.value)} placeholder="••••••" type={showPw ? 'text' : 'password'}
                className="input" style={{ paddingLeft: 40, paddingRight: 44 }}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
              <button onClick={() => setShowPw(!showPw)} className="tap" type="button"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ink-faint)', padding: 6, display: 'flex' }}>
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {mode === 'register' && <p style={{ color: 'var(--ink-faint)', fontSize: 11.5, marginTop: 6 }}>En az 4 karakter. Şifreni unutma — sıfırlama yok.</p>}
          </div>

          {error && <p style={{ color: 'var(--berry)', fontSize: 13.5 }}>{error}</p>}

          <button onClick={submit} disabled={!canSubmit || busy} className="btn-primary tap"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy && <Loader2 size={18} className="spin" />}
            {busy ? 'Lütfen bekle...' : (mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur')}
            {!busy && <ArrowRight size={18} />}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--ink-faint)', fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
        Giriş yaptığın gruplar hesabına kaydedilir;<br />başka cihazdan aynı kullanıcı adıyla girince hepsi gelir.
      </p>
    </div>
  );
}

function Avatar({ name, id, size = 38 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarColor(id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, letterSpacing: '0.02em', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.12)' }}>
      {initials(name)}
    </div>
  );
}

function HomeView({ session, myGroups, loadingGroups, onOpenGroup, onNewGroup, onJoinGroup, onLogout }) {
  return (
    <div className="rise">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, marginTop: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta-dark))', boxShadow: '0 4px 12px rgba(193,96,47,0.3)' }}>
          <Plane color="#fff" size={22} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Seyahat Kasa</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AtSign size={12} /> {session?.kullanici_adi}
          </div>
        </div>
        <button onClick={onLogout} className="tap" title="Çıkış yap"
          style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LogOut size={18} />
        </button>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 34, lineHeight: 1.12, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Bir grup aç,<br />
          <span className="serif-italic" style={{ color: 'var(--terracotta)' }}>kodu paylaş,</span><br />
          harcamaları kaydet.
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36 }}>
        <button onClick={onNewGroup} className="card tap" style={{ padding: 18, textAlign: 'left', border: '1px solid var(--line)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(193,96,47,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Plus color="var(--terracotta)" size={20} strokeWidth={2.4} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Yeni Grup</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 2 }}>Seyahat başlat</div>
        </button>
        <button onClick={onJoinGroup} className="card tap" style={{ padding: 18, textAlign: 'left', border: '1px solid var(--line)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(63,107,107,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Users color="var(--teal)" size={20} strokeWidth={2.2} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Gruba Katıl</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 2 }}>Kodu gir</div>
        </button>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="label" style={{ marginBottom: 0 }}>Gruplarım</span>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>{myGroups.length}</span>
      </div>

      {loadingGroups ? (
        <div className="card-flat" style={{ padding: 36, textAlign: 'center', borderStyle: 'dashed', color: 'var(--ink-faint)' }}>
          <Loader2 className="spin" size={22} style={{ margin: '0 auto' }} />
        </div>
      ) : myGroups.length === 0 ? (
        <div className="card-flat" style={{ padding: 36, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Henüz bir grup yok.</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 4 }}>Yukarıdan birini oluştur ya da katıl.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myGroups.map((g, i) => (
            <button key={g.id} onClick={() => onOpenGroup(g.id)} className="card tap rise"
              style={{ padding: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, animationDelay: `${i * 60}ms` }}>
              <Avatar name={g.ad} id={g.id} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontWeight: 600, fontSize: 17 }}>{g.ad}</div>
                <div style={{ color: 'var(--ink-faint)', fontSize: 12, marginTop: 1, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{g.kod}</div>
              </div>
              <ChevronLeft color="var(--ink-faint)" size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewGroupView({ onCreated, onBack }) {
  const [ad, setAd] = useState('');
  const [members, setMembers] = useState(['']);
  const [baseCurrency, setBaseCurrency] = useState('TRY');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateMember = (i, v) => { const n = [...members]; n[i] = v; setMembers(n); };
  const addMember = () => setMembers([...members, '']);
  const removeMember = (i) => setMembers(members.filter((_, idx) => idx !== i));
  const canSave = ad.trim() && members.filter(m => m.trim()).length >= 2;

  const create = async () => {
    if (!canSave || saving) return;
    setSaving(true); setError('');
    try {
      const kod = groupCode();
      const { data: grup, error: e1 } = await supabase.from('gruplar')
        .insert({ kod, ad: ad.trim(), ana_para_birimi: baseCurrency, kurlar: DEFAULT_RATES }).select().single();
      if (e1) throw e1;
      const uyeRows = members.filter(m => m.trim()).map(m => ({ grup_id: grup.id, ad: m.trim() }));
      const { error: e2 } = await supabase.from('uyeler').insert(uyeRows);
      if (e2) throw e2;
      onCreated(grup);
    } catch (err) { setError('Bir hata oluştu: ' + (err.message || 'bilinmeyen')); setSaving(false); }
  };

  return (
    <div className="rise">
      <BackBtn onBack={onBack} />
      <h1 className="serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.01em' }}>Yeni grup</h1>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 28 }}>Seyahatin ismini ver, kimler geldiyse ekle.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <label className="label">Grup Adı</label>
          <input value={ad} onChange={e => setAd(e.target.value)} placeholder="Roma 2026" className="input" />
        </div>

        <div>
          <label className="label">Ana Para Birimi</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Object.keys(CURRENCY_SYMBOLS).map(c => (
              <button key={c} onClick={() => setBaseCurrency(c)} className="tap"
                style={{ borderRadius: 11, padding: '11px 0', fontSize: 14, fontWeight: 600, border: '1.5px solid',
                  ...(baseCurrency === c
                    ? { background: 'var(--terracotta)', color: '#fff', borderColor: 'var(--terracotta)' }
                    : { background: '#fff', color: 'var(--ink-soft)', borderColor: 'var(--line)' }) }}>
                {c}
              </button>
            ))}
          </div>
          <p style={{ color: 'var(--ink-faint)', fontSize: 12, marginTop: 8 }}>Sonuçlar bu para biriminde gösterilecek.</p>
        </div>

        <div>
          <label className="label">Kim Geldi?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={m} onChange={e => updateMember(i, e.target.value)} placeholder={`Kişi ${i + 1}`} className="input" style={{ flex: 1 }} />
                {members.length > 1 && (
                  <button onClick={() => removeMember(i)} className="tap" style={{ width: 46, height: 46, borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', color: 'var(--ink-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addMember} className="tap" style={{ borderRadius: 11, border: '1.5px dashed var(--line)', padding: 13, color: 'var(--ink-soft)', fontSize: 14, fontWeight: 500, background: 'transparent' }}>
              + Kişi ekle
            </button>
          </div>
        </div>

        {error && <p style={{ color: 'var(--berry)', fontSize: 14 }}>{error}</p>}

        <button onClick={create} disabled={!canSave || saving} className="btn-primary tap"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving && <Loader2 size={18} className="spin" />}
          {saving ? 'Oluşturuluyor...' : 'Grubu Oluştur'}
        </button>
      </div>
    </div>
  );
}

function JoinGroupView({ onJoined, onBack }) {
  const [kod, setKod] = useState('');
  const [error, setError] = useState('');
  const [trying, setTrying] = useState(false);

  const tryJoin = async () => {
    if (!kod.trim() || trying) return;
    setTrying(true); setError('');
    try {
      const { data, error: e } = await supabase.from('gruplar').select('*').eq('kod', kod.trim().toUpperCase()).maybeSingle();
      if (e) throw e;
      if (!data) { setError('Bu kodla bir grup bulunamadı.'); setTrying(false); return; }
      onJoined(data);
    } catch (err) { setError('Hata: ' + (err.message || 'bilinmeyen')); setTrying(false); }
  };

  return (
    <div className="rise">
      <BackBtn onBack={onBack} />
      <h1 className="serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.01em' }}>Gruba katıl</h1>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 28 }}>Paylaşılan 6 haneli kodu gir.</p>

      <input value={kod} onChange={e => setKod(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="input"
        style={{ textAlign: 'center', fontSize: 32, fontFamily: 'monospace', letterSpacing: '0.4em', padding: '22px 16px', fontWeight: 600 }} />
      {error && <p style={{ color: 'var(--berry)', fontSize: 14, marginTop: 12 }}>{error}</p>}

      <button onClick={tryJoin} disabled={kod.length < 4 || trying} className="btn-primary tap"
        style={{ width: '100%', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {trying && <Loader2 size={18} className="spin" />}
        {trying ? 'Aranıyor...' : 'Katıl'}
      </button>
    </div>
  );
}

function GroupView({ groupId, onBack, onLeave, onDeleted }) {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [tab, setTab] = useState('expenses');
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: g } = await supabase.from('gruplar').select('*').eq('id', groupId).maybeSingle();
    const { data: u } = await supabase.from('uyeler').select('*').eq('grup_id', groupId).order('olusturma_tarihi');
    const { data: h } = await supabase.from('harcamalar').select('*').eq('grup_id', groupId).order('olusturma_tarihi', { ascending: false });
    const { data: t } = await supabase.from('transferler').select('*').eq('grup_id', groupId).order('olusturma_tarihi', { ascending: false });
    setGroup(g); setMembers(u || []); setExpenses(h || []); setTransfers(t || []); setLoading(false);
  }, [groupId]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { const t = setInterval(reload, 6000); return () => clearInterval(t); }, [reload]);

  const share = async () => {
    if (!group) return;
    const text = `"${group.ad}" seyahat kasasına katıl! Kod: ${group.kod}\n${window.location.origin}`;
    if (navigator.share) { try { await navigator.share({ title: group.ad, text }); return; } catch {} }
    navigator.clipboard?.writeText(group.kod);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--ink-faint)', marginTop: 120 }}><Loader2 className="spin" /></div>;
  if (!group) return <div style={{ textAlign: 'center', color: 'var(--ink-faint)', marginTop: 120 }}>Grup bulunamadı.</div>;

  return (
    <>
    <div className="rise">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <BackBtn onBack={onBack} label="Gruplar" noMargin />
        <button onClick={share} className="tap" style={{ borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600 }}>
          {copied ? <Check size={15} color="var(--olive)" /> : <Share2 size={15} />}
          <span style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}>{copied ? 'Kopyalandı' : group.kod}</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <Avatar name={group.ad} id={group.id} size={52} />
        <div>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{group.ad}</h1>
          <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 2 }}>{members.length} kişi · {expenses.length} harcama</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, background: 'var(--paper-2)', borderRadius: 13, padding: 4, marginBottom: 20 }}>
        {[{ k: 'expenses', l: 'Harcamalar', I: Receipt }, { k: 'balances', l: 'Hesaplaşma', I: ArrowRightLeft }, { k: 'settings', l: 'Ayarlar', I: Coins }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className="tap"
            style={{ flex: 1, borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              ...(tab === t.k ? { background: 'var(--card)', color: 'var(--ink)', boxShadow: 'var(--shadow-sm)' } : { background: 'transparent', color: 'var(--ink-soft)' }) }}>
            <t.I size={15} /> {t.l}
          </button>
        ))}
      </div>

      {tab === 'expenses' && <ExpensesTab group={group} members={members} expenses={expenses} reload={reload} onEdit={(e) => setEditExpense(e)} />}
      {tab === 'balances' && <BalancesTab group={group} members={members} expenses={expenses} transfers={transfers} reload={reload} />}
      {tab === 'settings' && <SettingsTab group={group} members={members} expenses={expenses} transfers={transfers} reload={reload} onLeave={onLeave} onDeleted={onDeleted} />}
    </div>

    {(showNewExpense || editExpense) && <NewExpenseModal group={group} members={members} expense={editExpense}
      onClose={() => { setShowNewExpense(false); setEditExpense(null); }}
      onSaved={() => { setShowNewExpense(false); setEditExpense(null); reload(); }} />}

    {tab === 'expenses' && !showNewExpense && !editExpense && (
      <button onClick={() => setShowNewExpense(true)} className="tap"
        style={{ position: 'fixed', bottom: 26, right: 26, width: 58, height: 58, borderRadius: 999, border: 'none', boxShadow: '0 8px 28px rgba(193,96,47,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta-dark))' }}>
        <Plus color="#fff" size={28} strokeWidth={2.5} />
      </button>
    )}
    </>
  );
}

function ExpensesTab({ group, members, expenses, reload, onEdit }) {
  const baseSym = CURRENCY_SYMBOLS[group.ana_para_birimi] || group.ana_para_birimi;
  const deleteExpense = async (id) => {
    if (!confirm('Bu harcamayı silmek istediğinden emin misin?')) return;
    await supabase.from('harcamalar').delete().eq('id', id); reload();
  };

  if (expenses.length === 0) {
    return (
      <div className="card-flat" style={{ padding: 40, textAlign: 'center', borderStyle: 'dashed', marginTop: 8 }}>
        <Receipt color="var(--ink-faint)" size={30} style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Henüz harcama yok.</div>
        <div style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 4 }}>Sağ alttaki + ile ilk harcamayı ekle.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {expenses.map((e, i) => {
        const payers = payersOf(e);
        const payerNames = payers.map(p => members.find(m => m.id === p.id)?.ad || '?');
        const payerLabel = payerNames.length === 1 ? payerNames[0] : `${payerNames.length} kişi`;
        const baseAmt = convertToBase(e.tutar, e.para_birimi, group.ana_para_birimi, group.kurlar);
        const cat = catOf(e.kategori);
        return (
          <div key={e.id} className="card rise" style={{ padding: 14, animationDelay: `${i * 35}ms` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: cat.color + '1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <cat.Icon size={20} color={cat.color} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.baslik}</div>
                <div style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>{payerLabel}</span> ödedi · {e.bolusenler.length} kişi
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="serif" style={{ fontWeight: 600, fontSize: 16 }}>{CURRENCY_SYMBOLS[e.para_birimi]}{formatNum(e.tutar)}</div>
                {e.para_birimi !== group.ana_para_birimi && (
                  <div style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>≈ {baseSym}{formatNum(baseAmt)}</div>
                )}
              </div>
              <button onClick={() => onEdit(e)} className="tap" title="Düzenle"
                style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--terracotta)', background: 'rgba(193,96,47,0.1)', border: 'none' }}>
                <Pencil size={15} />
              </button>
              <button onClick={() => deleteExpense(e.id)} className="tap" title="Sil"
                style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, marginLeft: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--berry)', background: 'rgba(158,75,84,0.1)', border: 'none' }}>
                <Trash2 size={15} />
              </button>
            </div>
            {e.not_metni && <div style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 8, paddingLeft: 55, fontStyle: 'italic' }}>"{e.not_metni}"</div>}
          </div>
        );
      })}
    </div>
  );
}

function NewExpenseModal({ group, members, expense, onClose, onSaved }) {
  const editing = !!expense;
  const [baslik, setBaslik] = useState(expense?.baslik || '');
  const [tutar, setTutar] = useState(expense != null ? String(expense.tutar) : '');
  const [paraBirimi, setParaBirimi] = useState(expense?.para_birimi || group.ana_para_birimi);
  const [kategori, setKategori] = useState(expense?.kategori || 'yemek');
  const [payers, setPayers] = useState(
    expense
      ? (Array.isArray(expense.odeyenler) && expense.odeyenler.length
          ? expense.odeyenler.map(p => ({ id: p.id, tutar: String(p.tutar) }))
          : [{ id: expense.odeyen_id, tutar: '' }])
      : [{ id: members[0]?.id || '', tutar: '' }]
  );
  const [bolusenler, setBolusenler] = useState(expense?.bolusenler || members.map(m => m.id));
  const [notMetni, setNotMetni] = useState(expense?.not_metni || '');
  const [saving, setSaving] = useState(false);

  const isMulti = payers.length > 1;
  const payersSum = payers.reduce((s, p) => s + (parseFloat(p.tutar) || 0), 0);
  const total = isMulti ? payersSum : (parseFloat(tutar) || 0);
  const sym = CURRENCY_SYMBOLS[paraBirimi];

  const toggle = (id) => setBolusenler(bolusenler.includes(id) ? bolusenler.filter(x => x !== id) : [...bolusenler, id]);
  const isPayer = (id) => payers.some(p => p.id === id);
  const togglePayer = (id) => setPayers(prev => prev.find(p => p.id === id)
    ? (prev.length > 1 ? prev.filter(p => p.id !== id) : prev)
    : [...prev, { id, tutar: '' }]);
  const setPayerAmount = (id, v) => setPayers(prev => prev.map(p => p.id === id ? { ...p, tutar: v } : p));

  const payersValid = isMulti ? payers.every(p => parseFloat(p.tutar) > 0) : (parseFloat(tutar) > 0);
  const canSave = baslik.trim() && total > 0 && payersValid && payers.every(p => p.id) && bolusenler.length > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const odeyenler = payers.map(p => ({ id: p.id, tutar: isMulti ? parseFloat(p.tutar) : total }));
    const payload = {
      grup_id: group.id, baslik: baslik.trim(), tutar: total, para_birimi: paraBirimi,
      kategori, odeyen_id: payers[0].id, odeyenler, bolusenler, not_metni: notMetni.trim(),
    };
    if (editing) await supabase.from('harcamalar').update(payload).eq('id', expense.id);
    else await supabase.from('harcamalar').insert(payload);
    onSaved();
  };

  return (
    <div className="fade" style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(43,38,32,0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div className="sheet-up" onClick={ev => ev.stopPropagation()} style={{ width: '100%', maxWidth: 600, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92vh', overflowY: 'auto', background: 'var(--paper)', borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 5, borderRadius: 999, background: 'var(--line)' }} />
        </div>
        <div style={{ position: 'sticky', top: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 14px', background: 'var(--paper)', zIndex: 2 }}>
          <h3 className="serif" style={{ fontWeight: 600, fontSize: 20 }}>{editing ? 'Harcamayı Düzenle' : 'Yeni Harcama'}</h3>
          <button onClick={onClose} className="tap" style={{ color: 'var(--ink-soft)', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 999, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={19} /></button>
        </div>

        <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label className="label">Ne için?</label>
            <input value={baslik} onChange={e => setBaslik(e.target.value)} placeholder="Akşam yemeği, taksi, müze..." className="input" />
          </div>

          <div>
            <label className="label">{isMulti ? 'Toplam (otomatik)' : 'Tutar'}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {isMulti ? (
                <div className="input serif" style={{ flex: 1, fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', background: 'var(--paper-2)', color: 'var(--ink)' }}>
                  {sym}{formatNum(total)}
                </div>
              ) : (
                <input type="number" inputMode="decimal" value={tutar} onChange={e => setTutar(e.target.value)} placeholder="0.00" className="input serif" style={{ flex: 1, fontSize: 22, fontWeight: 600 }} />
              )}
              <select value={paraBirimi} onChange={e => setParaBirimi(e.target.value)} className="input" style={{ width: 'auto', fontWeight: 600 }}>
                {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {isMulti && <p style={{ color: 'var(--ink-faint)', fontSize: 11.5, marginTop: 6 }}>Toplam, ödeyenlerin tutarlarının toplamıdır.</p>}
          </div>

          <div>
            <label className="label">Kategori</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CATEGORIES.map(c => {
                const on = kategori === c.id;
                return (
                  <button key={c.id} onClick={() => setKategori(c.id)} className="tap"
                    style={{ borderRadius: 12, padding: '11px 4px', border: '1.5px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      ...(on ? { borderColor: c.color, background: c.color + '14' } : { borderColor: 'var(--line)', background: '#fff' }) }}>
                    <c.Icon size={18} color={on ? c.color : 'var(--ink-soft)'} strokeWidth={2} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: on ? c.color : 'var(--ink-soft)' }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">Kim Ödedi?</label>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {members.map(m => {
                const on = isPayer(m.id);
                return (
                  <button key={m.id} onClick={() => togglePayer(m.id)} className="tap"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 2px', border: 'none', background: 'none', flexShrink: 0, minWidth: 60 }}>
                    <div style={{ position: 'relative', padding: 2, borderRadius: '50%', border: on ? '2.5px solid var(--terracotta)' : '2.5px solid transparent' }}>
                      <Avatar name={m.ad} id={m.id} size={42} />
                      {on && (
                        <span style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: 'var(--terracotta)', border: '2px solid var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} color="#fff" strokeWidth={3.5} />
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: on ? 700 : 500, color: on ? 'var(--ink)' : 'var(--ink-faint)', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.ad}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ color: 'var(--ink-faint)', fontSize: 11.5, marginTop: 6 }}>Birden fazla kişi seçebilirsin; her biri için ödediği tutarı gir.</p>

            {isMulti && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {payers.map(p => {
                  const m = members.find(x => x.id === p.id);
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={m?.ad} id={p.id} size={32} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m?.ad}</span>
                      <div style={{ position: 'relative', width: 130 }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 14, pointerEvents: 'none' }}>{sym}</span>
                        <input type="number" inputMode="decimal" value={p.tutar} onChange={e => setPayerAmount(p.id, e.target.value)} placeholder="0.00" className="input" style={{ paddingLeft: 28, textAlign: 'right', fontWeight: 600 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="label" style={{ marginBottom: 0 }}>Kime Bölünecek?</label>
              <button onClick={() => setBolusenler(bolusenler.length === members.length ? [] : members.map(m => m.id))} className="tap" style={{ color: 'var(--terracotta)', fontSize: 12.5, fontWeight: 600, background: 'none', border: 'none' }}>
                {bolusenler.length === members.length ? 'Hiçbiri' : 'Hepsi'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
              {members.map(m => {
                const on = bolusenler.includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggle(m.id)} className="tap"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, padding: '9px 12px', border: '1.5px solid', textAlign: 'left',
                      ...(on ? { borderColor: 'var(--olive)', background: 'rgba(111,122,79,0.07)' } : { borderColor: 'var(--line)', background: '#fff' }) }}>
                    <Avatar name={m.ad} id={m.id} size={34} />
                    <span style={{ flex: 1, fontWeight: 500, fontSize: 14.5 }}>{m.ad}</span>
                    <span style={{ width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(on ? { background: 'var(--olive)' } : { border: '1.5px solid var(--line)' }) }}>
                      {on && <Check size={14} color="#fff" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {bolusenler.length > 0 && total > 0 && (
              <p style={{ color: 'var(--ink-soft)', fontSize: 12.5, marginTop: 10, textAlign: 'center' }}>
                Kişi başı <strong className="serif">{sym}{formatNum(total / bolusenler.length)}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="label">Not (opsiyonel)</label>
            <input value={notMetni} onChange={e => setNotMetni(e.target.value)} placeholder="Kısa açıklama..." className="input" />
          </div>

          <button onClick={save} disabled={!canSave || saving} className="btn-primary tap"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving && <Loader2 size={18} className="spin" />}
            {saving ? 'Kaydediliyor...' : (editing ? 'Güncelle' : 'Kaydet')}
          </button>
        </div>
      </div>
    </div>
  );
}

function BalancesTab({ group, members, expenses, transfers, reload }) {
  const baseSym = CURRENCY_SYMBOLS[group.ana_para_birimi] || group.ana_para_birimi;
  const [showTransfer, setShowTransfer] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const { balances, settlements, total, byCat } = useMemo(() => {
    const bal = {}; members.forEach(m => bal[m.id] = 0);
    let tot = 0; const cats = {};
    expenses.forEach(e => {
      const baseAmt = convertToBase(e.tutar, e.para_birimi, group.ana_para_birimi, group.kurlar);
      tot += baseAmt;
      cats[e.kategori || 'diger'] = (cats[e.kategori || 'diger'] || 0) + baseAmt;
      const per = baseAmt / e.bolusenler.length;
      payersOf(e).forEach(p => {
        const paidBase = convertToBase(p.tutar, e.para_birimi, group.ana_para_birimi, group.kurlar);
        if (bal[p.id] !== undefined) bal[p.id] += paidBase;
      });
      e.bolusenler.forEach(id => { if (bal[id] !== undefined) bal[id] -= per; });
    });
    // Nakit/elden ödemeler: gönderen borcunu kapatır (bakiye +), alan alacağı azalır (bakiye −)
    (transfers || []).forEach(t => {
      const amt = convertToBase(t.tutar, t.para_birimi, group.ana_para_birimi, group.kurlar);
      if (bal[t.gonderen_id] !== undefined) bal[t.gonderen_id] += amt;
      if (bal[t.alan_id] !== undefined) bal[t.alan_id] -= amt;
    });
    const creditors = [], debtors = [];
    Object.entries(bal).forEach(([id, v]) => { if (v > 0.01) creditors.push({ id, amt: v }); else if (v < -0.01) debtors.push({ id, amt: -v }); });
    creditors.sort((a, b) => b.amt - a.amt); debtors.sort((a, b) => b.amt - a.amt);
    const settle = []; let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      settle.push({ from: debtors[i].id, to: creditors[j].id, amt: pay });
      debtors[i].amt -= pay; creditors[j].amt -= pay;
      if (debtors[i].amt < 0.01) i++; if (creditors[j].amt < 0.01) j++;
    }
    const byCat = Object.entries(cats).map(([id, v]) => ({ ...catOf(id), amt: v })).sort((a, b) => b.amt - a.amt);
    return { balances: bal, settlements: settle, total: tot, byCat };
  }, [group, members, expenses, transfers]);

  const member = (id) => members.find(m => m.id === id);
  const name = (id) => member(id)?.ad || '?';

  const deleteTransfer = async (id) => {
    if (!confirm('Bu nakit ödemeyi sil?')) return;
    await supabase.from('transferler').delete().eq('id', id); reload();
  };
  const openSettle = (s) => { setPrefill({ from: s.from, to: s.to, amt: s.amt, para_birimi: group.ana_para_birimi }); setShowTransfer(true); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ borderRadius: 18, padding: '22px 20px', background: 'linear-gradient(135deg, var(--ink), #3d362d)', color: '#fff', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.7 }}>Toplam Harcama</div>
        <div className="serif" style={{ fontSize: 38, fontWeight: 600, marginTop: 2 }}>{baseSym}{formatNum(total)}</div>
        <div style={{ fontSize: 12.5, opacity: 0.65, marginTop: 2 }}>Kişi başı ortalama {baseSym}{formatNum(total / (members.length || 1))}</div>
      </div>

      {byCat.length > 0 && (
        <div>
          <h3 className="label">Nereye Gitti</h3>
          <div className="card" style={{ padding: 16 }}>
            {(() => {
              const max = byCat[0].amt || 1;
              return byCat.map((c, i) => (
                <div key={c.id} style={{ marginBottom: i === byCat.length - 1 ? 0 : 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                    <c.Icon size={15} color={c.color} strokeWidth={2} />
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{c.label}</span>
                    <span className="serif" style={{ fontSize: 13.5, fontWeight: 600 }}>{baseSym}{formatNum(c.amt)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--paper-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(c.amt / max) * 100}%`, background: c.color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      <div>
        <h3 className="label">Bireysel Durum</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(m => {
            const v = balances[m.id] || 0; const pos = v > 0.01, neg = v < -0.01;
            return (
              <div key={m.id} className="card" style={{ padding: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={m.ad} id={m.id} size={38} />
                <span style={{ fontWeight: 500, fontSize: 14.5, flex: 1 }}>{m.ad}</span>
                <span className="serif" style={{ fontWeight: 600, fontSize: 15.5, color: pos ? 'var(--olive)' : neg ? 'var(--berry)' : 'var(--ink-faint)' }}>
                  {pos ? '+' : neg ? '−' : ''}{baseSym}{formatNum(Math.abs(v))}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ color: 'var(--ink-faint)', fontSize: 12, marginTop: 8 }}>
          <span style={{ color: 'var(--olive)' }}>● Yeşil</span> alacaklı · <span style={{ color: 'var(--berry)' }}>● Kırmızı</span> borçlu
        </p>
      </div>

      <div>
        <h3 className="label">En Az Transferle Hesaplaşma</h3>
        {settlements.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <Check color="var(--olive)" size={24} style={{ margin: '0 auto 8px' }} />
            <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Herkes ödeşmiş 🎉</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {settlements.map((s, i) => (
                <button key={i} onClick={() => openSettle(s)} className="card rise tap" title="Ödendiyse dokun, nakit ödeme olarak kaydet"
                  style={{ padding: 13, display: 'flex', alignItems: 'center', gap: 10, animationDelay: `${i * 50}ms`, textAlign: 'left', width: '100%', cursor: 'pointer' }}>
                  <Avatar name={name(s.from)} id={s.from} size={34} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{name(s.from)}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--ink-faint)' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                    <ArrowRight size={14} />
                    <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{name(s.to)}</span>
                  <Avatar name={name(s.to)} id={s.to} size={34} />
                  <span className="serif" style={{ fontWeight: 600, fontSize: 15, color: 'var(--terracotta)', marginLeft: 4 }}>{baseSym}{formatNum(s.amt)}</span>
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--ink-faint)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>Bir ödeme gerçekleştiyse karta dokun, nakit ödeme olarak kaydet.</p>
          </>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="label" style={{ marginBottom: 0 }}>Nakit Ödemeler</h3>
          <button onClick={() => { setPrefill(null); setShowTransfer(true); }} className="tap"
            style={{ color: 'var(--terracotta)', fontSize: 12.5, fontWeight: 600, background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={14} /> Ödeme ekle
          </button>
        </div>
        {(!transfers || transfers.length === 0) ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 8 }}>Elden verilen nakitleri buraya ekle; bakiyeler buna göre güncellenir.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {transfers.map(t => (
              <div key={t.id} className="card" style={{ padding: 11, display: 'flex', alignItems: 'center', gap: 9 }}>
                <Avatar name={name(t.gonderen_id)} id={t.gonderen_id} size={30} />
                <ArrowRight size={14} color="var(--ink-faint)" />
                <Avatar name={name(t.alan_id)} id={t.alan_id} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(t.gonderen_id)} → {name(t.alan_id)}</div>
                  {t.not_metni && <div style={{ color: 'var(--ink-faint)', fontSize: 11.5, fontStyle: 'italic' }}>"{t.not_metni}"</div>}
                </div>
                <span className="serif" style={{ fontWeight: 600, fontSize: 14, color: 'var(--olive)' }}>{CURRENCY_SYMBOLS[t.para_birimi]}{formatNum(t.tutar)}</span>
                <button onClick={() => deleteTransfer(t.id)} className="tap" style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 4 }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTransfer && <TransferModal group={group} members={members} prefill={prefill}
        onClose={() => { setShowTransfer(false); setPrefill(null); }}
        onSaved={() => { setShowTransfer(false); setPrefill(null); reload(); }} />}
    </div>
  );
}

function TransferModal({ group, members, prefill, onClose, onSaved }) {
  const [gonderenId, setGonderenId] = useState(prefill?.from || members[0]?.id || '');
  const [alanId, setAlanId] = useState(prefill?.to || members[1]?.id || '');
  const [tutar, setTutar] = useState(prefill?.amt != null ? String(Math.round(prefill.amt * 100) / 100) : '');
  const [paraBirimi, setParaBirimi] = useState(prefill?.para_birimi || group.ana_para_birimi);
  const [notMetni, setNotMetni] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = gonderenId && alanId && gonderenId !== alanId && parseFloat(tutar) > 0;
  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    await supabase.from('transferler').insert({
      grup_id: group.id, gonderen_id: gonderenId, alan_id: alanId,
      tutar: parseFloat(tutar), para_birimi: paraBirimi, not_metni: notMetni.trim(),
    });
    onSaved();
  };

  const picker = (selectedId, setter, exclude) => (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      {members.map(m => {
        const on = selectedId === m.id; const dis = exclude === m.id;
        return (
          <button key={m.id} onClick={() => !dis && setter(m.id)} className="tap" disabled={dis}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 2px', border: 'none', background: 'none', flexShrink: 0, minWidth: 60, opacity: dis ? 0.3 : 1 }}>
            <div style={{ padding: 2, borderRadius: '50%', border: on ? '2.5px solid var(--terracotta)' : '2.5px solid transparent' }}>
              <Avatar name={m.ad} id={m.id} size={42} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: on ? 700 : 500, color: on ? 'var(--ink)' : 'var(--ink-faint)', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.ad}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fade" style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(43,38,32,0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div className="sheet-up" onClick={ev => ev.stopPropagation()} style={{ width: '100%', maxWidth: 600, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92vh', overflowY: 'auto', background: 'var(--paper)', borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 5, borderRadius: 999, background: 'var(--line)' }} />
        </div>
        <div style={{ position: 'sticky', top: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 14px', background: 'var(--paper)', zIndex: 2 }}>
          <h3 className="serif" style={{ fontWeight: 600, fontSize: 20 }}>Nakit Ödeme</h3>
          <button onClick={onClose} className="tap" style={{ color: 'var(--ink-soft)', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 999, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={19} /></button>
        </div>

        <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Elden verilen parayı kaydet. Borçlu kişi alacaklıya ödeyince bakiyeler güncellenir.</p>
          <div>
            <label className="label">Kim Verdi?</label>
            {picker(gonderenId, setGonderenId, alanId)}
          </div>
          <div>
            <label className="label">Kime Verdi?</label>
            {picker(alanId, setAlanId, gonderenId)}
          </div>
          <div>
            <label className="label">Tutar</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" inputMode="decimal" value={tutar} onChange={e => setTutar(e.target.value)} placeholder="0.00" className="input serif" style={{ flex: 1, fontSize: 22, fontWeight: 600 }} />
              <select value={paraBirimi} onChange={e => setParaBirimi(e.target.value)} className="input" style={{ width: 'auto', fontWeight: 600 }}>
                {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Not (opsiyonel)</label>
            <input value={notMetni} onChange={e => setNotMetni(e.target.value)} placeholder="Örn. akşam elden verdi" className="input" />
          </div>
          <button onClick={save} disabled={!canSave || saving} className="btn-primary tap"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving && <Loader2 size={18} className="spin" />}
            {saving ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ group, members, expenses, transfers, reload, onLeave, onDeleted }) {
  const baseCur = group.ana_para_birimi;
  const baseRate = Number(group.kurlar?.[baseCur]) || 1;
  // Kurları ana para birimi cinsine normalize edip metin olarak tut (yazarken ondalık/virgül kaybolmasın)
  const [rates, setRates] = useState(() => {
    const o = {};
    Object.keys(CURRENCY_SYMBOLS).forEach(c => {
      if (c === baseCur) return;
      const v = group.kurlar?.[c];
      if (v != null) o[c] = String(Math.round((v / baseRate) * 1e6) / 1e6).replace('.', ',');
    });
    return o;
  });
  const [newMember, setNewMember] = useState('');
  const [savingRates, setSavingRates] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = expenses.length === 0;
  const deleteGroup = async () => {
    if (!canDelete || deleting) return;
    if (!confirm(`"${group.ad}" grubunu kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;
    setDeleting(true);
    try {
      // Güvenlik için önce alt kayıtlar (harcama boş olmalı), sonra grup
      await supabase.from('harcamalar').delete().eq('grup_id', group.id);
      await supabase.from('transferler').delete().eq('grup_id', group.id);
      await supabase.from('uyeler').delete().eq('grup_id', group.id);
      await supabase.from('kullanici_gruplari').delete().eq('grup_id', group.id);
      const { error } = await supabase.from('gruplar').delete().eq('id', group.id);
      if (error) throw error;
      onDeleted();
    } catch (err) { alert('Grup silinemedi: ' + (err.message || 'bilinmeyen')); setDeleting(false); }
  };

  const saveRates = async () => {
    setSavingRates(true);
    const numeric = { [baseCur]: 1 };
    Object.keys(CURRENCY_SYMBOLS).forEach(c => {
      if (c === baseCur) return;
      const n = parseFloat(String(rates[c] ?? '').replace(',', '.'));
      const fallback = group.kurlar?.[c] != null ? group.kurlar[c] / baseRate : 1;
      numeric[c] = n > 0 ? n : fallback;
    });
    await supabase.from('gruplar').update({ kurlar: numeric }).eq('id', group.id);
    setSavingRates(false); reload();
  };
  const addMember = async () => { if (!newMember.trim()) return; await supabase.from('uyeler').insert({ grup_id: group.id, ad: newMember.trim() }); setNewMember(''); reload(); };
  const removeMember = async (id) => {
    const inExpense = expenses.some(e => e.odeyen_id === id || (e.odeyenler || []).some(p => p.id === id) || e.bolusenler.includes(id));
    const inTransfer = (transfers || []).some(t => t.gonderen_id === id || t.alan_id === id);
    if (inExpense || inTransfer) { alert('Bu kişinin harcaması veya nakit ödemesi var, önce onları sil.'); return; }
    if (!confirm('Bu kişiyi gruptan çıkar?')) return;
    await supabase.from('uyeler').delete().eq('id', id); reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        <h3 className="label">Grup Kodu</h3>
        <div className="serif" style={{ fontSize: 34, fontFamily: 'monospace', letterSpacing: '0.25em', color: 'var(--terracotta)', fontWeight: 600 }}>{group.kod}</div>
        <p style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 6 }}>Arkadaşlarınla paylaş, gruba katılsınlar.</p>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }} className="serif">Üyeler</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Avatar name={m.ad} id={m.id} size={34} />
              <span style={{ flex: 1, fontSize: 14.5 }}>{m.ad}</span>
              <button onClick={() => removeMember(m.id)} className="tap" style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 4 }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newMember} onChange={e => setNewMember(e.target.value)} placeholder="Yeni üye ismi" className="input" style={{ flex: 1 }} />
          <button onClick={addMember} className="tap" style={{ borderRadius: 12, padding: '0 18px', background: 'var(--ink)', color: '#fff', fontWeight: 600, border: 'none' }}>Ekle</button>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }} className="serif">Döviz Kurları</h3>
        <p style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginBottom: 14 }}>1 birim = kaç {group.ana_para_birimi}? (örn. 1 TRY = 0,019 {group.ana_para_birimi})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {Object.keys(CURRENCY_SYMBOLS).filter(c => c !== group.ana_para_birimi).map(c => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 52, fontSize: 13.5, fontFamily: 'monospace', color: 'var(--ink-soft)' }}>1 {c}</span>
              <span style={{ color: 'var(--ink-faint)' }}>=</span>
              <input type="text" inputMode="decimal" value={rates[c] ?? ''}
                onChange={e => setRates({ ...rates, [c]: e.target.value.replace(/[^0-9.,]/g, '') })}
                placeholder="0,00" className="input" style={{ flex: 1 }} />
              <span style={{ width: 40, fontSize: 13.5, fontFamily: 'monospace', color: 'var(--ink-soft)' }}>{group.ana_para_birimi}</span>
            </div>
          ))}
        </div>
        <button onClick={saveRates} disabled={savingRates} className="tap" style={{ width: '100%', borderRadius: 12, padding: 13, background: 'var(--ink)', color: '#fff', fontWeight: 600, border: 'none', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {savingRates && <Loader2 size={16} className="spin" />} Kurları Kaydet
        </button>
      </div>

      <button onClick={onLeave} className="tap" style={{ width: '100%', borderRadius: 13, padding: 13, color: 'var(--berry)', border: '1.5px solid rgba(158,75,84,0.3)', background: 'transparent', fontWeight: 600 }}>
        Bu grubu listemden kaldır
      </button>
      <p style={{ color: 'var(--ink-faint)', fontSize: 12, textAlign: 'center', marginTop: -10 }}>Grup verisi silinmez, kodla tekrar katılabilirsin.</p>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: 4, paddingTop: 18 }}>
        <h3 className="label" style={{ color: 'var(--berry)' }}>Tehlikeli Bölge</h3>
        <button onClick={deleteGroup} disabled={!canDelete || deleting} className="tap"
          style={{ width: '100%', borderRadius: 13, padding: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none',
            ...(canDelete ? { background: 'var(--berry)', color: '#fff' } : { background: 'var(--paper-2)', color: 'var(--ink-faint)', cursor: 'not-allowed' }) }}>
          {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
          {deleting ? 'Siliniyor...' : 'Grubu kalıcı olarak sil'}
        </button>
        <p style={{ color: 'var(--ink-faint)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          {canDelete
            ? 'Grup ve tüm üyeleri herkes için kalıcı olarak silinir, geri alınamaz.'
            : `İçinde ${expenses.length} harcama var. Silmek için önce tüm harcamaları kaldır.`}
        </p>
      </div>
    </div>
  );
}

function BackBtn({ onBack, label = 'Geri', noMargin }) {
  return (
    <button onClick={onBack} className="tap" style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--ink-soft)', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', marginBottom: noMargin ? 0 : 22, padding: '4px 4px 4px 0' }}>
      <ChevronLeft size={18} /> {label}
    </button>
  );
}

function convertToBase(amount, fromCurrency, baseCurrency, rates) {
  if (fromCurrency === baseCurrency) return amount;
  const fromRate = rates[fromCurrency] || 1; const toRate = rates[baseCurrency] || 1;
  return (amount * fromRate) / toRate;
}
function formatNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0,00';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
