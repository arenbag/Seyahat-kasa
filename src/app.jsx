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
    const next = myGroups.find(x => x.id === g.id) ? myGroups : [...myGroups, { id: g.id, ad: g.ad, kod: g.kod }];
    setMyGroupsState(next);
    setMyGroups(next);
  };
  const removeFromMyGroups = (id) => {
    const next = myGroups.filter(g => g.id !== id);
    setMyGroupsState(next);
    setMyGroups(next);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 128px' }}>
        {view === 'home' && (
          <HomeView
            myGroups={myGroups}
            onOpenGroup={(id) => { setActiveGroupId(id); setView('group'); }}
            onNewGroup={() => setView('newGroup')}
            onJoinGroup={() => setView('joinGroup')}
          />
        )}
        {view === 'newGroup' && (
          <NewGroupView
            onCreated={(g) => { addToMyGroups(g); setActiveGroupId(g.id); setView('group'); }}
            onBack={() => setView('home')}
          />
        )}
        {view === 'joinGroup' && (
          <JoinGroupView
            onJoined={(g) => { addToMyGroups(g); setActiveGroupId(g.id); setView('group'); }}
            onBack={() => setView('home')}
          />
        )}
        {view === 'group' && (
          <GroupView
            groupId={activeGroupId}
            onBack={() => setView('home')}
            onLeave={() => { removeFromMyGroups(activeGroupId); setView('home'); }}
          />
        )}
      </div>
    </div>
  );
}

function HomeView({ myGroups, onOpenGroup, onNewGroup, onJoinGroup }) {
  return (
    <div className="anim-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48, marginTop: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' }}>
          <Plane color="white" size={22} strokeWidth={2.2} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Seyahat Kasa</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Hesaplaşmadan keyfini çıkar</p>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <p className="display-font" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 30, lineHeight: 1.2 }}>Bir grup aç,</p>
        <p className="display-font" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 30, lineHeight: 1.2 }}>kodu paylaş, harcamaları kaydet.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        <button onClick={onNewGroup} className="pill-btn glow-card" style={{ borderRadius: 16, padding: 20, textAlign: 'left', color: 'white', border: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Plus color="#6ee7b7" size={20} />
          </div>
          <div style={{ fontWeight: 600 }}>Yeni Grup</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Seyahat başlat</div>
        </button>
        <button onClick={onJoinGroup} className="pill-btn glow-card" style={{ borderRadius: 16, padding: 20, textAlign: 'left', color: 'white', border: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Users color="#7dd3fc" size={20} />
          </div>
          <div style={{ fontWeight: 600 }}>Gruba Katıl</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Kodu gir</div>
        </button>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gruplarım</h2>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{myGroups.length}</span>
      </div>

      {myGroups.length === 0 ? (
        <div className="glow-card" style={{ borderRadius: 16, padding: 32, textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Henüz bir grup yok.</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>Yukarıdan birini oluştur ya da katıl.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myGroups.map((g, i) => (
            <button key={g.id} onClick={() => onOpenGroup(g.id)} className="pill-btn glow-card anim-in"
              style={{ borderRadius: 16, padding: 16, textAlign: 'left', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animationDelay: `${i * 50}ms` }}>
              <div>
                <div style={{ fontWeight: 600 }}>{g.ad}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2, fontFamily: 'monospace' }}>{g.kod}</div>
              </div>
              <ChevronLeft color="rgba(255,255,255,0.3)" size={20} style={{ transform: 'rotate(180deg)' }} />
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
    setSaving(true);
    setError('');
    try {
      const kod = groupCode();
      const { data: grup, error: e1 } = await supabase
        .from('gruplar')
        .insert({ kod, ad: ad.trim(), ana_para_birimi: baseCurrency, kurlar: DEFAULT_RATES })
        .select()
        .single();
      if (e1) throw e1;

      const uyeRows = members.filter(m => m.trim()).map(m => ({ grup_id: grup.id, ad: m.trim() }));
      const { error: e2 } = await supabase.from('uyeler').insert(uyeRows);
      if (e2) throw e2;

      onCreated(grup);
    } catch (err) {
      setError('Bir hata oluştu: ' + (err.message || 'bilinmeyen'));
      setSaving(false);
    }
  };

  return (
    <div className="anim-in">
      <BackBtn onBack={onBack} />
      <h1 className="display-font" style={{ fontSize: 30, marginBottom: 4 }}>Yeni grup</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32 }}>Seyahatin ismini ver, kimler geldiyse ekle.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Grup Adı">
          <input value={ad} onChange={e => setAd(e.target.value)} placeholder="Roma 2026" style={inputStyle} />
        </Field>

        <Field label="Ana Para Birimi">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Object.keys(CURRENCY_SYMBOLS).map(c => (
              <button key={c} onClick={() => setBaseCurrency(c)} className="pill-btn"
                style={{ borderRadius: 12, padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none',
                  ...(baseCurrency === c ? { background: 'white', color: '#0f1620' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }) }}>
                {c}
              </button>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>Sonuçlar bu para biriminde gösterilecek.</p>
        </Field>

        <Field label="Kim Geldi?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input value={m} onChange={e => updateMember(i, e.target.value)} placeholder={`Kişi ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                {members.length > 1 && (
                  <button onClick={() => removeMember(i)} className="pill-btn glow-card" style={{ width: 48, borderRadius: 12, border: 'none', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addMember} className="pill-btn" style={{ borderRadius: 12, border: '1px dashed rgba(255,255,255,0.2)', padding: 12, color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'transparent' }}>
              + Kişi ekle
            </button>
          </div>
        </Field>

        {error && <p style={{ color: '#fb7185', fontSize: 14 }}>{error}</p>}

        <button onClick={create} disabled={!canSave || saving} className="pill-btn"
          style={{ borderRadius: 12, padding: 16, fontWeight: 700, color: '#0f1620', border: 'none',
            background: canSave ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' : '#666',
            opacity: (!canSave || saving) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving && <Loader2 size={18} className="spinner" />}
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
    setTrying(true);
    setError('');
    try {
      const { data, error: e } = await supabase
        .from('gruplar')
        .select('*')
        .eq('kod', kod.trim().toUpperCase())
        .maybeSingle();
      if (e) throw e;
      if (!data) {
        setError('Bu kodla bir grup bulunamadı.');
        setTrying(false);
        return;
      }
      onJoined(data);
    } catch (err) {
      setError('Hata: ' + (err.message || 'bilinmeyen'));
      setTrying(false);
    }
  };

  return (
    <div className="anim-in">
      <BackBtn onBack={onBack} />
      <h1 className="display-font" style={{ fontSize: 30, marginBottom: 4 }}>Gruba katıl</h1>
      <p style={{
