import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';
import { storageUtils } from '../utils/storageUtils';
import wbLocations from '../data/wb_locations.json';
import {
  ACCIDENT_VOLTAGES,
  BLOOD_GROUPS,
  EDUCATION_LEVELS,
  JOB_TYPES,
  PROFILE_NUDGE_FIELD_ORDER,
} from '../data/profileFieldOptions';
import { AWARENESS_STORIES } from '../data/awarenessStories';

import SaveSuccessModal from './SaveSuccessModal';
import AdminAnalytics from './AdminAnalytics';
import DeleteUserConfirmationModal from './DeleteUserConfirmationModal';
import MyPPE from './safety/MyPPE';
import MyTools from './safety/MyTools';

const ADMIN_THEME = {
  shell: 'min-h-full bg-[#fffdf7] text-slate-900',
  page: 'mx-auto max-w-5xl px-4 sm:px-6 py-5 sm:py-8 md:mb-6',
  card: 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm',
  tabBar: 'flex gap-1.5 rounded-full border border-slate-200/80 bg-white p-1.5 shadow-sm',
  tabActive: 'flex-1 rounded-full py-2.5 text-sm font-bold bg-orange-500 text-white shadow-sm',
  tabIdle: 'flex-1 rounded-full py-2.5 text-sm font-bold text-slate-600 hover:bg-orange-50/70 hover:text-orange-700',
  inset: 'rounded-xl border border-slate-200/70 bg-orange-50/50',
  input: 'w-full min-h-[48px] rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200/60',
  menuBtn: 'inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95',
  primaryBtn: 'rounded-full bg-orange-500 px-3 py-2 text-sm font-bold text-white shadow-sm shadow-orange-500/30 transition-all active:scale-95',
};

const EMPTY_SPONSOR_FORM = {
  headline: '',
  headlines_text: '',
  subtext: '',
  sponsor_name: '',
  image_url: '',
  logo_url: '',
  contact_phone: '',
  contact_email: '',
  contact_url: '',
  cta_label: '',
  theme: 'dark',
  display_seconds: 5,
  allow_skip: true,
  contact_safety_mitra: false,
  starts_at: '',
  ends_at: '',
  is_active: true,
};

/** Preset: Bangla non-profit “sponsor wanted” ad. Load into form, then Save + enable. */
const SPONSOR_ASK_PRESET = {
  ...EMPTY_SPONSOR_FORM,
  headline: 'স্পনসর চাই',
  headlines_text: 'স্পনসর চাই\nআমরা নন-প্রফিট\nবিজ্ঞাপনে স্পনসর হোন',
  subtext:
    'স্মার্ট লাইনম্যান একটি নন-প্রফিট উদ্যোগ। পুরস্কারের জন্য স্পনসরদের ধন্যবাদ। বিজ্ঞাপনের মাধ্যমে আমাদের স্পনসর হতে পারেন—দোকান, ব্যবসা, ফার্ম, ঠিকাদার।',
  sponsor_name: 'স্মার্ট লাইনম্যান',
  image_url: '/images/sponsor/sponsor_ad_slot.webp',
  contact_email: 'support@smartlineman.in',
  contact_url: 'smartlineman.in',
  cta_label: 'ইমেইল করুন',
  theme: 'dark',
  display_seconds: 10,
  allow_skip: true,
  contact_safety_mitra: true,
  is_active: false,
};

/** Local demo (preview only, not saved) — same content as the preset. */
const DEMO_SPONSOR_FORM = { ...SPONSOR_ASK_PRESET };

// Convert a timestamptz from Supabase to a value usable by <input type="datetime-local">.
function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const NOTIFICATION_URGENCY_STYLES = {
  info: { selected: 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm', idle: 'border-slate-200/80 text-slate-600 hover:bg-orange-50' },
  update: { selected: 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm', idle: 'border-slate-200/80 text-slate-600 hover:bg-emerald-50' },
  warning: { selected: 'border-amber-300 bg-amber-50 text-amber-700 shadow-sm', idle: 'border-slate-200/80 text-slate-600 hover:bg-amber-50' },
  alert: { selected: 'border-rose-300 bg-rose-50 text-rose-700 shadow-sm', idle: 'border-slate-200/80 text-slate-600 hover:bg-rose-50' }
};

const ProfileCardSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className={`${ADMIN_THEME.card} p-4 animate-pulse`}>
        <div className="flex gap-3 items-center">
          <div className="w-14 h-14 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-40 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

function formatProfileLastActive(value, isEn) {
  if (!value) return isEn ? 'Never' : 'কখনো নয়';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return isEn ? 'Never' : 'কখনো নয়';
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 300) return isEn ? 'Online now' : 'এখন অনলাইন';
  if (diffSec < 3600) {
    const m = Math.max(1, Math.floor(diffSec / 60));
    return isEn ? `${m}m ago` : `${m} মি. আগে`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return isEn ? `${h}h ago` : `${h} ঘ. আগে`;
  }
  return date.toLocaleString(isEn ? 'en-IN' : 'bn-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveProfileAvatarUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const fileName = trimmed.replace(/^avatars\//, '').replace(/^\/+/, '');
  if (!fileName) return '';
  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
  return data?.publicUrl || '';
}

function ProfileAvatar({ url, name, size = 'lg', className = '' }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = resolveProfileAvatarUrl(url);
  const initials = name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const sizeClass = {
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-28 h-28 text-3xl',
  }[size] || 'w-24 h-24 text-2xl';

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const showPhoto = avatarUrl && !failed;

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden shrink-0 border border-orange-200/80 bg-orange-50 shadow-sm ${className}`}
    >
      {showPhoto ? (
        <img
          key={avatarUrl}
          src={avatarUrl}
          alt={name ? `${name}` : 'Profile'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          loading="eager"
          decoding="async"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-bold text-[#ea580c]">
          {initials}
        </div>
      )}
    </div>
  );
}

const iconBtnBase = 'inline-flex items-center justify-center shrink-0 rounded-xl transition-colors disabled:opacity-50';

function PenIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function CameraIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  tone = 'neutral',
  canEdit,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
  isEn,
  children,
}) {
  const toneClass = {
    neutral: 'text-slate-700',
    good: 'text-emerald-700',
    warn: 'text-amber-700',
    bad: 'text-rose-700',
    muted: 'text-slate-400',
  }[tone] || 'text-slate-700';

  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      {!isEditing ? (
        <div className="flex items-center gap-2 min-h-[28px]">
          <span className="w-6 text-center text-sm shrink-0" aria-hidden>{icon}</span>
          <span className="text-xs text-slate-500 flex-1 min-w-0">{label}</span>
          <span className={`text-xs font-semibold text-right max-w-[45%] truncate ${toneClass}`}>{value}</span>
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={isEn ? 'Edit' : 'সম্পাদনা'}
              title={isEn ? 'Edit' : 'সম্পাদনা'}
              className={`${iconBtnBase} w-7 h-7 text-orange-600 hover:bg-orange-50`}
            >
              <PenIcon />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 pl-8">
          <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">{label}</p>
          {children}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              aria-label={isEn ? 'Save' : 'সংরক্ষণ'}
              title={isEn ? 'Save' : 'সংরক্ষণ'}
              className={`${iconBtnBase} w-9 h-9 bg-orange-600 text-white hover:bg-orange-700`}
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
              ) : (
                <CheckIcon />
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              aria-label={isEn ? 'Cancel' : 'বাতিল'}
              title={isEn ? 'Cancel' : 'বাতিল'}
              className={`${iconBtnBase} w-9 h-9 text-slate-500 hover:bg-slate-100`}
            >
              <XIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function emptyLabel(isEn) {
  return '—';
}

function buildProfileSearchFilter(term) {
  const clean = String(term || '').trim().replace(/[%_,*.()\\]/g, '');
  if (!clean) return null;
  const pattern = `%${clean}%`;
  const filters = [
    `full_name.ilike.${pattern}`,
    `phone_number.ilike.${pattern}`,
    `phone.ilike.${pattern}`,
    `email.ilike.${pattern}`,
    `district.ilike.${pattern}`,
    `block.ilike.${pattern}`,
  ];
  if (/^\d+$/.test(clean)) filters.push(`slm_id.eq.${clean}`);
  return filters.join(',');
}

function isProfileFieldFilled(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim() !== '';
  if (typeof val === 'number') return !Number.isNaN(val);
  if (typeof val === 'boolean') return true;
  return false;
}

function getProfileCompleteness(user) {
  const phone = user.phone_number || user.phone;
  const checks = [
    isProfileFieldFilled(user.avatar_url),
    isProfileFieldFilled(user.full_name),
    isProfileFieldFilled(phone),
    isProfileFieldFilled(user.district),
    isProfileFieldFilled(user.block),
    isProfileFieldFilled(user.job),
    isProfileFieldFilled(user.blood_group),
    isProfileFieldFilled(user.age) || isProfileFieldFilled(user.dob),
    isProfileFieldFilled(user.major_diseases),
    isProfileFieldFilled(user.regular_medicines),
    user.accident_count !== null && user.accident_count !== undefined,
    isProfileFieldFilled(user.accident_voltage),
    isProfileFieldFilled(user.accidents_details),
    isProfileFieldFilled(user.education),
    user.children_count !== null && user.children_count !== undefined,
    isProfileFieldFilled(user.children_ages),
    isProfileFieldFilled(user.parents_occupation),
    ...(user.is_donor ? [isProfileFieldFilled(user.last_donation_date)] : []),
  ];
  const filled = checks.filter(Boolean).length;
  const total = checks.length;
  return { pct: total ? Math.round((filled / total) * 100) : 0, filled, total };
}

function ProfileCompletenessBadge({ pct, isEn }) {
  const tone = pct >= 100 ? 'emerald' : pct >= 70 ? 'amber' : 'rose';
  const toneClass = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700 animate-pulse',
  }[tone];

  return (
    <span
      className={`text-[10px] font-black px-2 py-1 rounded-full ${toneClass}`}
      title={isEn ? `${pct}% profile updated` : `${pct}% প্রোফাইল আপডেট`}
    >
      {pct}%
    </span>
  );
}

function UserProfileCard({
  targetUser,
  isEn,
  isAdmin,
  isSafetyMitra,
  canManage,
  userProfile,
  formatRoleLabel,
  roleBadgeClass,
  avatarSize = 'lg',
  wbLocations,
  supervisors,
  onSaveField,
  onPPE,
  onTools,
  onReset,
  onResetPassword,
  onDelete,
  compact = false,
  isExpanded = true,
  onToggleExpand,
}) {
  const [editingField, setEditingField] = useState(null);
  const [draft, setDraft] = useState('');
  const [draftBool, setDraftBool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const phone = targetUser.phone_number || targetUser.phone;
  const completeness = getProfileCompleteness(targetUser);
  const lastActiveRaw = targetUser.last_login_at || targetUser.updated_at;
  const lastActiveLabel = formatProfileLastActive(lastActiveRaw, isEn);
  const isOnline = lastActiveRaw && (Date.now() - new Date(lastActiveRaw).getTime()) < 5 * 60 * 1000;
  const supervisorName = targetUser.supervisor_id
    ? (supervisors || []).find((s) => s.id === targetUser.supervisor_id)?.full_name
    : null;

  const display = (val, fallback) => {
    if (val === null || val === undefined || val === '') return fallback ?? emptyLabel(isEn);
    return String(val);
  };

  const truncate = (val, len = 48) => {
    if (!val) return emptyLabel(isEn);
    const s = String(val);
    return s.length > len ? `${s.slice(0, len)}…` : s;
  };

  const startEdit = (field, initial) => {
    setEditingField(field);
    if (typeof initial === 'boolean') {
      setDraftBool(initial);
      setDraft('');
    } else {
      setDraft(initial ?? '');
      setDraftBool(false);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraft('');
    setDraftBool(false);
  };

  useEffect(() => {
    if (!isExpanded) cancelEdit();
  }, [isExpanded]);

  const saveField = async (payload) => {
    setSaving(true);
    try {
      await onSaveField(targetUser.id, payload);
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(isEn ? 'Photo must be under 2MB.' : 'ছবি ২MB-এর নিচে হতে হবে।');
      return;
    }
    setAvatarUploading(true);
    try {
      await onSaveField(targetUser.id, {}, file);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const row = (key, icon, label, value, tone, editable, editor) => (
    <ProfileRow
      key={key}
      icon={icon}
      label={label}
      value={value}
      tone={tone}
      canEdit={canManage && editable}
      isEditing={editingField === key}
      isEn={isEn}
      saving={saving}
      onEdit={() => startEdit(key, editor.initial)}
      onCancel={cancelEdit}
      onSave={() => saveField(editor.payload())}
    >
      {editor.render()}
    </ProfileRow>
  );

  const inputCls = ADMIN_THEME.input;
  const textEditor = (field, initial) => ({
    initial,
    payload: () => ({ [field]: draft.trim() }),
    render: () => (
      <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} autoFocus />
    ),
  });
  const numberEditor = (field, initial) => ({
    initial: initial ?? '',
    payload: () => ({ [field]: draft === '' ? null : Number(draft) }),
    render: () => (
      <input type="number" value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} autoFocus />
    ),
  });
  const dateEditor = (field, initial) => ({
    initial: initial || '',
    payload: () => ({ [field]: draft || null }),
    render: () => (
      <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} />
    ),
  });
  const textareaEditor = (field, initial) => ({
    initial: initial || '',
    payload: () => ({ [field]: draft.trim() || null }),
    render: () => (
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className={`${inputCls} resize-none`} autoFocus />
    ),
  });
  const selectEditor = (field, initial, options) => ({
    initial: initial || '',
    payload: () => ({ [field]: draft || null }),
    render: () => (
      <select value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls}>
        <option value="">{emptyLabel(isEn)}</option>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    ),
  });
  const boolEditor = (field, initial) => ({
    initial,
    payload: () => ({ [field]: draftBool }),
    render: () => (
      <label className="flex items-center gap-3 py-1">
        <input type="checkbox" checked={draftBool} onChange={(e) => setDraftBool(e.target.checked)} className="w-5 h-5 rounded" />
        <span className="text-sm text-slate-700">{draftBool ? '✓' : '✗'}</span>
      </label>
    ),
  });

  const bloodGroups = BLOOD_GROUPS;
  const jobs = JOB_TYPES;
  const voltages = ACCIDENT_VOLTAGES;
  const districts = Object.keys(wbLocations || {});
  const blocks = targetUser.district && wbLocations?.[targetUser.district] ? wbLocations[targetUser.district] : [];

  return (
    <article className={ADMIN_THEME.card}>
      {compact ? (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="w-full p-3 sm:p-4 text-left hover:bg-orange-50/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <ProfileAvatar url={targetUser.avatar_url} name={targetUser.full_name} size="md" />
              {isOnline && (
                <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {targetUser.full_name || (isEn ? 'Unnamed' : 'নাম নেই')}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadgeClass(targetUser.role)}`}>
                  {formatRoleLabel(targetUser.role)}
                </span>
                <ProfileCompletenessBadge pct={completeness.pct} isEn={isEn} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500 truncate">
                📍 {targetUser.district || emptyLabel(isEn)}
                {targetUser.block ? ` · ${targetUser.block}` : ''}
              </p>
              {supervisorName ? (
                <p className="mt-0.5 text-xs text-slate-500 truncate" title={isEn ? 'Safety Mitra' : 'সেফটি মিত্র'}>
                  👔 {supervisorName}
                </p>
              ) : targetUser.supervisor_id ? (
                <p className="mt-0.5 text-xs text-slate-400 truncate">
                  👔 {isEn ? 'Supervisor assigned' : 'সুপারভাইজার আছে'}
                </p>
              ) : null}
              <p className={`mt-0.5 text-[11px] font-medium ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                ⏱ {lastActiveLabel}
              </p>
            </div>
            <span className="shrink-0 text-slate-400 text-lg font-bold" aria-hidden>
              {isExpanded ? '−' : '+'}
            </span>
          </div>
        </button>
      ) : (
        <div className="p-4 bg-gradient-to-b from-orange-50/80 to-transparent">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-4">
            <div className="relative shrink-0">
              <ProfileAvatar url={targetUser.avatar_url} name={targetUser.full_name} size={avatarSize} />
              {canManage && (
                <>
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label={isEn ? 'Change photo' : 'ছবি বদলান'}
                    title={isEn ? 'Change photo' : 'ছবি বদলান'}
                    className={`${iconBtnBase} absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-600 text-white shadow-md`}
                  >
                    {avatarUploading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                    ) : (
                      <CameraIcon />
                    )}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                </>
              )}
            </div>
            <div className="min-w-0 flex-1 mt-3 sm:mt-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <ProfileCompletenessBadge pct={completeness.pct} isEn={isEn} />
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleBadgeClass(targetUser.role)}`}>
                  {formatRoleLabel(targetUser.role)}
                </span>
                {targetUser.slm_id && (
                  <span className="text-[10px] font-mono text-slate-400">ID {targetUser.slm_id}</span>
                )}
              </div>
              <p className={`mt-2 text-xs ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                ⏱ {lastActiveLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <>
          {compact && (
            <div className="px-4 pt-2 pb-1 flex items-center gap-3 border-t border-slate-100 bg-gradient-to-b from-orange-50/40 to-transparent">
              <div className="relative shrink-0">
                <ProfileAvatar url={targetUser.avatar_url} name={targetUser.full_name} size="lg" />
                {canManage && (
                  <>
                    <button
                      type="button"
                      disabled={avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                      aria-label={isEn ? 'Change photo' : 'ছবি বদলান'}
                      title={isEn ? 'Change photo' : 'ছবি বদলান'}
                      className={`${iconBtnBase} absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-600 text-white shadow-md`}
                    >
                      {avatarUploading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                      ) : (
                        <CameraIcon />
                      )}
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                  </>
                )}
              </div>
              <div className="min-w-0">
                {targetUser.slm_id && (
                  <span className="text-[10px] font-mono text-slate-400">ID {targetUser.slm_id}</span>
                )}
                <p className="text-sm font-bold text-slate-800 truncate">
                  {targetUser.full_name || emptyLabel(isEn)}
                </p>
              </div>
            </div>
          )}

      <div className="px-4 pb-2">
        <p className="text-sm mb-1" aria-label={isEn ? 'Profile' : 'প্রোফাইল'} title={isEn ? 'Profile' : 'প্রোফাইল'}>👤</p>
        <div className={`${ADMIN_THEME.inset} px-3 py-1`}>
          {row('full_name', '👤', isEn ? 'Full name' : 'নাম', display(targetUser.full_name), targetUser.full_name ? 'neutral' : 'muted', isAdmin, textEditor('full_name', targetUser.full_name))}
          {row('phone_number', '📱', isEn ? 'Phone' : 'ফোন', display(phone), phone ? 'neutral' : 'muted', isAdmin, textEditor('phone_number', phone))}
          {row('email', '📧', isEn ? 'Email' : 'ইমেইল', display(targetUser.email), 'muted', false, textEditor('email', targetUser.email))}
          {row('district', '📍', isEn ? 'District' : 'জেলা', display(targetUser.district), targetUser.district ? 'neutral' : 'muted', true, selectEditor('district', targetUser.district, districts))}
          {row('block', '🗺️', isEn ? 'Block' : 'ব্লক', display(targetUser.block), targetUser.block ? 'neutral' : 'muted', true, selectEditor('block', targetUser.block, blocks))}
          {row('job', '👷', isEn ? 'Job type' : 'কাজের ধরন', display(targetUser.job), targetUser.job ? 'neutral' : 'muted', true, selectEditor('job', targetUser.job, jobs))}
          {isAdmin && row('role', '🎖️', isEn ? 'Role' : 'ভূমিকা', formatRoleLabel(targetUser.role), 'neutral', true, selectEditor('role', targetUser.role, ['lineman', 'guest', 'safety mitra', 'admin']))}
          {isAdmin && row('supervisor_id', '👔', isEn ? 'Supervisor' : 'সুপারভাইজার',
            (supervisors || []).find((s) => s.id === targetUser.supervisor_id)?.full_name || emptyLabel(isEn),
            'neutral', true,
            selectEditor('supervisor_id', targetUser.supervisor_id || '', [{ value: '', label: isEn ? 'None' : 'কেউ নয়' }, ...(supervisors || []).map((s) => ({ value: s.id, label: s.full_name }))]))}
        </div>
      </div>

      <div className="px-4 pb-2">
        <p className="text-sm mb-1" aria-label={isEn ? 'Health & safety' : 'স্বাস্থ্য ও নিরাপত্তা'} title={isEn ? 'Health & safety' : 'স্বাস্থ্য ও নিরাপত্তা'}>🩺</p>
        <div className={`${ADMIN_THEME.inset} px-3 py-1`}>
          {row('blood_group', '🩸', isEn ? 'Blood group' : 'রক্তের গ্রুপ', display(targetUser.blood_group), targetUser.blood_group ? 'neutral' : 'muted', true, selectEditor('blood_group', targetUser.blood_group, bloodGroups))}
          {row('age', '🎂', isEn ? 'Age' : 'বয়স', targetUser.age ? `${targetUser.age} ${isEn ? 'yrs' : 'বছর'}` : emptyLabel(isEn), targetUser.age ? 'neutral' : 'muted', true, numberEditor('age', targetUser.age))}
          {row('dob', '📅', isEn ? 'Date of birth' : 'জন্ম তারিখ', display(targetUser.dob), targetUser.dob ? 'neutral' : 'muted', true, dateEditor('dob', targetUser.dob))}
          {row('major_diseases', '🏥', isEn ? 'Health conditions' : 'স্বাস্থ্য সমস্যা', truncate(targetUser.major_diseases), targetUser.major_diseases ? 'warn' : 'good', true, textareaEditor('major_diseases', targetUser.major_diseases))}
          {row('regular_medicines', '💊', isEn ? 'Daily medicines' : 'নিয়মিত ওষুধ', truncate(targetUser.regular_medicines), targetUser.regular_medicines ? 'warn' : 'good', true, textareaEditor('regular_medicines', targetUser.regular_medicines))}
          {row('accident_count', '⚡', isEn ? 'Accident count' : 'দুর্ঘটনা সংখ্যা', display(targetUser.accident_count ?? 0), Number(targetUser.accident_count) > 0 ? 'warn' : 'good', true, numberEditor('accident_count', targetUser.accident_count))}
          {row('accident_voltage', '🔌', isEn ? 'Highest voltage' : 'সর্বোচ্চ ভোল্টেজ', display(targetUser.accident_voltage), 'neutral', true, selectEditor('accident_voltage', targetUser.accident_voltage, voltages))}
          {row('accidents_details', '📝', isEn ? 'Accident details' : 'দুর্ঘটনার বিবরণ', truncate(targetUser.accidents_details), 'neutral', true, textareaEditor('accidents_details', targetUser.accidents_details))}
          {row('is_donor', '❤️', isEn ? 'Blood donor' : 'রক্তদাতা', targetUser.is_donor ? '✓' : '✗', targetUser.is_donor ? 'good' : 'muted', true, boolEditor('is_donor', !!targetUser.is_donor))}
          {targetUser.is_donor && row('last_donation_date', '🩸', isEn ? 'Last donation' : 'শেষ রক্তদান', display(targetUser.last_donation_date), 'neutral', true, dateEditor('last_donation_date', targetUser.last_donation_date))}
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="text-sm mb-1" aria-label={isEn ? 'Family' : 'পরিবার'} title={isEn ? 'Family' : 'পরিবার'}>👨‍👩‍👧</p>
        <div className={`${ADMIN_THEME.inset} px-3 py-1`}>
          {row(
            'education',
            '🎓',
            isEn ? 'Education' : 'শিক্ষা',
            display(targetUser.education),
            'neutral',
            true,
            selectEditor(
              'education',
              targetUser.education,
              targetUser.education && !EDUCATION_LEVELS.includes(targetUser.education)
                ? [...EDUCATION_LEVELS, targetUser.education]
                : EDUCATION_LEVELS
            )
          )}
          {row('children_count', '👶', isEn ? 'Children count' : 'সন্তান সংখ্যা', display(targetUser.children_count), 'neutral', true, numberEditor('children_count', targetUser.children_count))}
          {row('children_ages', '🎂', isEn ? 'Children ages' : 'সন্তানের বয়স', display(targetUser.children_ages), 'neutral', true, textEditor('children_ages', targetUser.children_ages))}
          {row('parents_stay', '🏡', isEn ? 'Lives with parents' : 'বাবা-মায়ের সাথে', targetUser.parents_stay ? '✓' : '✗', 'neutral', true, boolEditor('parents_stay', !!targetUser.parents_stay))}
          {row('parents_occupation', '💼', isEn ? 'Parents occupation' : 'বাবা-মায়ের পেশা', display(targetUser.parents_occupation), 'neutral', true, textEditor('parents_occupation', targetUser.parents_occupation))}
        </div>
      </div>

      {canManage && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
          <p className="text-sm mb-1" aria-label={isEn ? 'Equipment & actions' : 'সরঞ্জাম ও কাজ'} title={isEn ? 'Equipment & actions' : 'সরঞ্জাম ও কাজ'}>⚙️</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onPPE}
              aria-label={isEn ? 'Update PPE' : 'PPE আপডেট'}
              title={isEn ? 'PPE' : 'PPE'}
              className="rounded-2xl border border-slate-200/80 bg-white py-2.5 text-lg font-semibold text-slate-800 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
            >
              🦺
            </button>
            <button
              type="button"
              onClick={onTools}
              aria-label={isEn ? 'Update tools' : 'সরঞ্জাম আপডেট'}
              title={isEn ? 'Tools' : 'সরঞ্জাম'}
              className="rounded-2xl border border-slate-200/80 bg-white py-2.5 text-lg font-semibold text-slate-800 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
            >
              🛠️
            </button>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onResetPassword}
                aria-label={isEn ? 'Reset password' : 'পাসওয়ার্ড রিসেট'}
                title={isEn ? 'Reset password' : 'পাসওয়ার্ড রিসেট'}
                className={`${iconBtnBase} flex-1 h-9 text-amber-600 hover:bg-amber-50 text-lg`}
              >
                🔑
              </button>
              <button
                type="button"
                onClick={onReset}
                aria-label={isEn ? 'Reset training scores' : 'প্রশিক্ষণ স্কোর রিসেট'}
                title={isEn ? 'Reset scores' : 'স্কোর রিসেট'}
                className={`${iconBtnBase} flex-1 h-9 text-rose-600 hover:bg-rose-50 text-lg`}
              >
                ↺
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={isEn ? 'Delete account' : 'অ্যাকাউন্ট মুছুন'}
                title={isEn ? 'Delete' : 'মুছুন'}
                className={`${iconBtnBase} flex-1 h-9 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-50`}
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </article>
  );
}

export default function Admin({ user, userProfile, language, setCurrentView, onPreviewProfileNudge, onPreviewIdleStory, onPreviewSponsorAd }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* Pagination State */
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage] = useState(20);



  /* PPE Management State */
  const [selectedUserForPPE, setSelectedUserForPPE] = useState(null);

  /* Tools Management State */
  const [selectedUserForTools, setSelectedUserForTools] = useState(null);

  /* Notification State */
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info'
  });
  const [supervisors, setSupervisors] = useState([]);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [adminBroadcasts, setAdminBroadcasts] = useState([]);
  const [adminBroadcastsLoading, setAdminBroadcastsLoading] = useState(false);
  const [adminBroadcastsError, setAdminBroadcastsError] = useState(null);
  const [deliveryHealth, setDeliveryHealth] = useState({
    checking: false,
    checkedAt: null,
    activeCount: null,
    publicRpcOk: null,
    adminRpcOk: null,
    realtimeStatus: null,
    error: null
  });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState(null);
  const [showInviteHelp, setShowInviteHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetTarget, setResetTarget] = useState(null); // { id, name } or null for 'all'
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [passwordResetTarget, setPasswordResetTarget] = useState(null); // { id, name }
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetResult, setPasswordResetResult] = useState(null); // { name, phone, password }
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNoticesSection, setShowNoticesSection] = useState(false);
  const [showSystemCheckSection, setShowSystemCheckSection] = useState(false);
  const [showProfileNudgePreviewSection, setShowProfileNudgePreviewSection] = useState(false);
  const [nudgePreviewRequireMode, setNudgePreviewRequireMode] = useState(false);
  const [showIdleStoryPreviewSection, setShowIdleStoryPreviewSection] = useState(false);
  const [showSponsorAdSection, setShowSponsorAdSection] = useState(false);
  const [sponsorAds, setSponsorAds] = useState([]);
  const [sponsorAdsLoading, setSponsorAdsLoading] = useState(false);
  const [sponsorAdsError, setSponsorAdsError] = useState(null);
  const [sponsorEditingId, setSponsorEditingId] = useState(null);
  const [sponsorSaving, setSponsorSaving] = useState(false);
  const [sponsorImageUploading, setSponsorImageUploading] = useState(false);
  const [sponsorForm, setSponsorForm] = useState(EMPTY_SPONSOR_FORM);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [profileSection, setProfileSection] = useState('team'); // 'team' | 'mine' for admin / safety mitra
  const [ownProfileRow, setOwnProfileRow] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [teamSortMode, setTeamSortMode] = useState('recent'); // recent | name | supervisor
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchQuery.trim();
      setDebouncedSearch(next);
      setCurrentPage(1);
      setExpandedUserId(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setExpandedUserId(null);
  }, [currentPage]);

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearch, teamSortMode);
  }, [currentPage, userProfile?.role, debouncedSearch, teamSortMode]);

  const profileSelectFields = 'id, slm_id, full_name, email, role, district, block, job, avatar_url, created_at, updated_at, last_login_at, dob, age, education, children_count, children_ages, parents_stay, parents_occupation, major_diseases, regular_medicines, accidents_details, accident_count, accident_voltage, is_donor, last_donation_date, blood_group, phone, phone_number, supervisor_id, total_penalties';

  useEffect(() => {
    if (!user?.id || userProfile?.role === 'lineman') return;

    const fromPage = users.find((u) => u.id === user.id);
    if (fromPage) {
      setOwnProfileRow(fromPage);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(profileSelectFields)
        .eq('id', user.id)
        .single();
      if (!cancelled && !error && data) setOwnProfileRow(data);
    })();

    return () => { cancelled = true; };
  }, [users, user?.id, userProfile?.role]);

  const clearAdminUserCaches = () => {
    for (let i = 1; i <= 10; i++) {
      cacheHelper.clear(`admin_users_page_${i}`);
      cacheHelper.clear(`admin_users_admin_all_page_${i}`);
      cacheHelper.clear(`admin_users_safety mitra_${user.id}_page_${i}`);
      cacheHelper.clear(`admin_users_v2_${userProfile?.role}_${userProfile?.role === 'safety mitra' ? user.id : 'all'}_page_${i}`);
      cacheHelper.clear(`admin_users_v3_${userProfile?.role}_${userProfile?.role === 'safety mitra' ? user.id : 'all'}_page_${i}`);
      cacheHelper.clear(`admin_users_v3_${userProfile?.role}_${userProfile?.role === 'safety mitra' ? user.id : 'all'}_page_${i}_q_all`);
    }
  };

  const loadAdminBroadcasts = async () => {
    if (userProfile?.role !== 'admin' || !user?.id) return;
    setAdminBroadcastsLoading(true);
    setAdminBroadcastsError(null);
    try {
      const { data, error } = await supabase.rpc('get_notifications_admin', {
        p_caller_id: user.id
      });
      if (error) throw error;
      setAdminBroadcasts(Array.isArray(data) ? data.slice(0, 40) : []);
    } catch (err) {
      console.error('Error loading broadcasts:', err);
      setAdminBroadcasts([]);
      setAdminBroadcastsError(
        err?.message ||
          (language === 'en'
            ? 'Could not load notices. Run the SQL migration notifications_admin_rpc.sql in Supabase if this is the first setup.'
            : 'বিজ্ঞপ্তি লোড করা যায়নি।')
      );
    } finally {
      setAdminBroadcastsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === 'admin' && user?.id) loadAdminBroadcasts();
  }, [userProfile?.role, user?.id]);

  const runDeliveryHealthCheck = async () => {
    if (userProfile?.role !== 'admin' || !user?.id) return;

    setDeliveryHealth((prev) => ({
      ...prev,
      checking: true,
      error: null
    }));

    try {
      const [publicResult, adminResult] = await Promise.all([
        supabase.rpc('get_active_notifications_public'),
        supabase.rpc('get_notifications_admin', { p_caller_id: user.id })
      ]);

      const publicError = publicResult.error;
      const adminError = adminResult.error;
      const publicData = Array.isArray(publicResult.data) ? publicResult.data : [];
      const adminData = Array.isArray(adminResult.data) ? adminResult.data : [];

      const realtimeStatus = await new Promise((resolve) => {
        const channel = supabase.channel(`diag:notifications:${Date.now()}`);
        let settled = false;

        const settle = (status) => {
          if (settled) return;
          settled = true;
          resolve(status);
          supabase.removeChannel(channel);
        };

        channel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {})
          .subscribe((status) => settle(status));

        setTimeout(() => settle('TIMEOUT'), 2500);
      });

      setDeliveryHealth({
        checking: false,
        checkedAt: new Date().toISOString(),
        activeCount: publicData.length,
        publicRpcOk: !publicError,
        adminRpcOk: !adminError,
        realtimeStatus,
        error: publicError?.message || adminError?.message || null
      });
    } catch (err) {
      setDeliveryHealth({
        checking: false,
        checkedAt: new Date().toISOString(),
        activeCount: null,
        publicRpcOk: false,
        adminRpcOk: false,
        realtimeStatus: 'FAILED',
        error: err?.message || 'Health check failed'
      });
    }
  };

  useEffect(() => {
    if (userProfile?.role === 'admin' && user?.id) {
      runDeliveryHealthCheck();
    }
  }, [userProfile?.role, user?.id]);

  useEffect(() => {
    const fetchSupervisors = async () => {
      if (!['admin', 'safety mitra'].includes(userProfile?.role)) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('role', ['admin', 'safety mitra'])
          .order('full_name');
        if (error) throw error;
        setSupervisors(data || []);
      } catch (err) {
        console.error('Error fetching supervisors:', err);
      }
    };
    fetchSupervisors();
  }, [userProfile?.role]);

  const fetchUsers = async (page = 1, search = '', sortMode = teamSortMode) => {
    const searchKey = search.trim().toLowerCase();
    const groupAll = sortMode === 'supervisor';
    const cacheKey = `admin_users_v3_${userProfile?.role}_${userProfile?.role === 'safety mitra' ? user.id : 'all'}_${groupAll ? 'group_all' : `page_${page}`}_q_${searchKey || 'all'}`;
    const cachedData = cacheHelper.get(cacheKey);
    if (cachedData) {
      setUsers(cachedData.users);
      setTotalUsers(cachedData.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(false);
    try {
      let query = supabase
        .from('profiles')
        .select(`${profileSelectFields}`, { count: 'exact' });

      if (userProfile?.role === 'lineman') {
        query = query.eq('id', user.id);
      } else if (userProfile?.role === 'safety mitra') {
        query = query.or(`id.eq.${user.id},supervisor_id.eq.${user.id}`);
      }

      if (userProfile?.role === 'admin' && searchKey) {
        const searchFilter = buildProfileSearchFilter(searchKey);
        if (searchFilter) query = query.or(searchFilter);
      }

      // Safety Mitra grouping needs the full list so one mitra is not split across pages
      if (!groupAll) {
        const start = (page - 1) * usersPerPage;
        const end = start + usersPerPage - 1;
        query = query.order('created_at', { ascending: false }).range(start, end);
      } else {
        query = query.order('full_name', { ascending: true }).limit(2000);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setUsers(data || []);
      setTotalUsers(count || 0);

      cacheHelper.set(cacheKey, { users: data || [], total: count || 0 }, 5);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  /* PPE & Tools Logic */
  const handleEditPPE = (targetUser) => {
    // Authorization check
    const canEdit =
      userProfile?.role === 'admin' ||
      targetUser.id === user.id ||
      (userProfile?.role === 'safety mitra' && targetUser.supervisor_id === user.id);

    if (!canEdit) {
      alert('You do not have permission to view this user\'s PPE.');
      return;
    }
    setSelectedUserForPPE(targetUser);
  };

  const handleEditTools = (targetUser) => {
    // Authorization check
    const canEdit =
      userProfile?.role === 'admin' ||
      targetUser.id === user.id ||
      (userProfile?.role === 'safety mitra' && targetUser.supervisor_id === user.id);

    if (!canEdit) {
      alert('You do not have permission to view this user\'s Tools.');
      return;
    }
    setSelectedUserForTools(targetUser);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notificationForm.title || !notificationForm.message) {
      alert('Please fill in both title and message.');
      return;
    }

    setIsSendingNotification(true);
    try {
      const { error } = await supabase.rpc('admin_create_notification', {
        p_caller_id: user.id,
        p_title: notificationForm.title.trim(),
        p_message: notificationForm.message.trim(),
        p_type: notificationForm.type
      });

      if (error) throw error;

      await loadAdminBroadcasts();

      alert('Notification sent successfully!');
      setNotificationForm({ title: '', message: '', type: 'info' });
      setShowNotificationModal(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`Failed to send notification: ${error.message}`);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleToggleBroadcastActive = async (row) => {
    if (!user?.id) return;
    try {
      const next = row.is_active !== true;
      const { error } = await supabase.rpc('admin_set_notification_active', {
        p_caller_id: user.id,
        p_notification_id: row.id,
        p_is_active: next
      });
      if (error) throw error;
      setAdminBroadcasts((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to update notice');
    }
  };

  const handleDeleteBroadcastRow = async (id) => {
    if (!user?.id) return;
    if (!window.confirm(language === 'en' ? 'Delete this notice permanently?' : 'এই বিজ্ঞপ্তি স্থায়ীভাবে মুছবেন?')) return;
    try {
      const { error } = await supabase.rpc('admin_delete_notification', {
        p_caller_id: user.id,
        p_notification_id: id
      });
      if (error) throw error;
      setAdminBroadcasts((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete notice');
    }
  };

  // ---- Sponsor full-screen ad management ----
  const loadSponsorAds = async () => {
    if (userProfile?.role !== 'admin' || !user?.id) return;
    setSponsorAdsLoading(true);
    setSponsorAdsError(null);
    try {
      const { data, error } = await supabase.rpc('get_sponsor_ads_admin', {
        p_caller_id: user.id
      });
      if (error) throw error;
      setSponsorAds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading sponsor ads:', err);
      setSponsorAds([]);
      setSponsorAdsError(
        err?.message ||
          (language === 'en'
            ? 'Could not load sponsor ads. Run the SQL migration sponsor_ads_rpc.sql in Supabase if this is the first setup.'
            : 'স্পনসর অ্যাড লোড করা যায়নি।')
      );
    } finally {
      setSponsorAdsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === 'admin' && user?.id && showSponsorAdSection && sponsorAds.length === 0) {
      loadSponsorAds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.role, user?.id, showSponsorAdSection]);

  const resetSponsorForm = () => {
    setSponsorForm(EMPTY_SPONSOR_FORM);
    setSponsorEditingId(null);
  };

  const startEditSponsorAd = (row) => {
    setSponsorEditingId(row.id);
    setSponsorForm({
      headline: row.headline || '',
      headlines_text: Array.isArray(row.headlines) ? row.headlines.join('\n') : '',
      subtext: row.subtext || '',
      sponsor_name: row.sponsor_name || '',
      image_url: row.image_url || '',
      logo_url: row.logo_url || '',
      contact_phone: row.contact_phone || '',
      contact_email: row.contact_email || '',
      contact_url: row.contact_url || '',
      cta_label: row.cta_label || '',
      theme: row.theme === 'light' ? 'light' : 'dark',
      display_seconds: row.display_seconds || 5,
      allow_skip: row.allow_skip !== false,
      contact_safety_mitra: row.contact_safety_mitra === true,
      starts_at: toLocalInputValue(row.starts_at),
      ends_at: toLocalInputValue(row.ends_at),
      is_active: row.is_active !== false,
    });
    setShowSponsorAdSection(true);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const parseSponsorHeadlines = (form) => {
    if (Array.isArray(form.headlines)) {
      const arr = form.headlines.map((h) => String(h || '').trim()).filter(Boolean);
      if (arr.length) return arr;
    }
    return String(form.headlines_text || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSponsorImageUpload = async (file, field) => {
    if (!file || !user?.id) return;
    setSponsorImageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sponsor-${field}-${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const url = publicUrlData?.publicUrl;
      if (url) setSponsorForm((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      console.error('Sponsor image upload failed:', err);
      alert(err.message || 'Failed to upload image');
    } finally {
      setSponsorImageUploading(false);
    }
  };

  const handleSaveSponsorAd = async () => {
    if (!user?.id) return;
    const headlinesArr = parseSponsorHeadlines(sponsorForm);
    const primaryHeadline = (sponsorForm.headline || '').trim() || headlinesArr[0] || '';
    if (!primaryHeadline && !sponsorForm.image_url.trim()) {
      alert(language === 'en' ? 'Add at least a headline or an image.' : 'অন্তত একটি হেডলাইন বা ছবি দিন।');
      return;
    }
    setSponsorSaving(true);
    try {
      const { error } = await supabase.rpc('admin_upsert_sponsor_ad', {
        p_caller_id: user.id,
        p_headline: primaryHeadline,
        p_subtext: sponsorForm.subtext,
        p_sponsor_name: sponsorForm.sponsor_name,
        p_image_url: sponsorForm.image_url,
        p_logo_url: sponsorForm.logo_url,
        p_contact_phone: sponsorForm.contact_phone,
        p_contact_email: sponsorForm.contact_email,
        p_contact_url: sponsorForm.contact_url,
        p_cta_label: sponsorForm.cta_label,
        p_theme: sponsorForm.theme,
        p_display_seconds: Number(sponsorForm.display_seconds) || 5,
        p_allow_skip: sponsorForm.allow_skip,
        p_starts_at: sponsorForm.starts_at ? new Date(sponsorForm.starts_at).toISOString() : null,
        p_ends_at: sponsorForm.ends_at ? new Date(sponsorForm.ends_at).toISOString() : null,
        p_is_active: sponsorForm.is_active,
        p_headlines: headlinesArr.length ? headlinesArr : null,
        p_contact_safety_mitra: sponsorForm.contact_safety_mitra === true,
        p_id: sponsorEditingId,
      });
      if (error) throw error;
      resetSponsorForm();
      await loadSponsorAds();
    } catch (err) {
      console.error('Failed to save sponsor ad:', err);
      alert(err.message || 'Failed to save sponsor ad');
    } finally {
      setSponsorSaving(false);
    }
  };

  const handleToggleSponsorAdActive = async (row) => {
    if (!user?.id) return;
    try {
      const next = row.is_active !== true;
      const { error } = await supabase.rpc('admin_set_sponsor_ad_active', {
        p_caller_id: user.id,
        p_id: row.id,
        p_is_active: next
      });
      if (error) throw error;
      setSponsorAds((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to update sponsor ad');
    }
  };

  const handleDeleteSponsorAd = async (id) => {
    if (!user?.id) return;
    if (!window.confirm(language === 'en' ? 'Delete this sponsor ad permanently?' : 'এই স্পনসর অ্যাড স্থায়ীভাবে মুছবেন?')) return;
    try {
      const { error } = await supabase.rpc('admin_delete_sponsor_ad', {
        p_caller_id: user.id,
        p_id: id
      });
      if (error) throw error;
      setSponsorAds((prev) => prev.filter((r) => r.id !== id));
      if (sponsorEditingId === id) resetSponsorForm();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete sponsor ad');
    }
  };

  const handlePreviewSponsorForm = (formOverride = null) => {
    if (typeof onPreviewSponsorAd !== 'function') return;
    const form = formOverride || sponsorForm;
    const headlinesArr = parseSponsorHeadlines(form);
    onPreviewSponsorAd({
      id: sponsorEditingId || 'preview',
      headline: form.headline || headlinesArr[0] || '',
      headlines: headlinesArr.length ? headlinesArr : undefined,
      subtext: form.subtext,
      sponsor_name: form.sponsor_name,
      image_url: form.image_url || null,
      logo_url: form.logo_url || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      contact_url: form.contact_url || null,
      cta_label: form.cta_label || null,
      theme: form.theme,
      display_seconds: Number(form.display_seconds) || 5,
      allow_skip: form.allow_skip,
      contact_safety_mitra: form.contact_safety_mitra === true,
    });
  };

  /** Fill form with demo content and open overlay — admin view only, nothing saved. */
  const handleDemoSponsorPreview = () => {
    setSponsorEditingId(null);
    setSponsorForm(DEMO_SPONSOR_FORM);
    handlePreviewSponsorForm(DEMO_SPONSOR_FORM);
  };


  const formatPhone = (value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    // Take only first 10 digits
    return cleaned.substring(0, 10);
  };

  const handlePhoneChange = (value) => {
    setInvitePhone(formatPhone(value));
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!invitePhone || invitePhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!inviteName || inviteName.trim() === '') {
      alert('Please enter the user\'s full name.');
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase.rpc('create_user_account', {
        p_phone: invitePhone,
        p_full_name: inviteName.trim(),
        p_supervisor_id: userProfile.role === 'safety mitra' ? user.id : null
      });

      if (error) throw error;

      const result = data[0];

      // Show temporary password to admin
      setTempPasswordResult({
        phone: result.phone_number,
        name: inviteName,
        password: result.temp_password
      });

      // Clear form but keep modal open to show password
      setInvitePhone('');
      setInviteName('');

      // Refresh user list
      await fetchUsers(currentPage, debouncedSearch, teamSortMode);
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already registered')) {
        alert('This phone number is already registered in the system.');
      } else {
        alert(`Failed to create user: ${error.message}`);
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setTempPasswordResult(null);
    setInvitePhone('');
    setInviteName('');
  };


  const handleSaveProfileField = async (userId, updates, avatarFile = null) => {
    const targetUser =
      users.find((u) => u.id === userId) ||
      (ownProfileRow?.id === userId ? ownProfileRow : null);
    if (!targetUser) return;

    const canEdit =
      userProfile?.role === 'admin' ||
      userId === user.id ||
      (userProfile?.role === 'safety mitra' && targetUser.supervisor_id === user.id && targetUser.role !== 'admin');

    if (!canEdit) {
      alert('You do not have permission to edit this user\'s profile.');
      return;
    }

    if (userProfile?.role === 'safety mitra' && targetUser.role === 'admin') {
      alert('Safety Mitras are not allowed to edit Admin profiles.');
      return;
    }

    const payload = { ...updates };
    if (userProfile?.role !== 'admin') {
      delete payload.full_name;
      delete payload.phone_number;
      delete payload.phone;
    }
    if (payload.supervisor_id === '') payload.supervisor_id = null;
    if (payload.district && payload.district !== targetUser.district) {
      payload.block = '';
    }

    if (!avatarFile && Object.keys(payload).length === 0) return;

    let avatar_url = targetUser.avatar_url;
    if (avatarFile) {
      if (targetUser.avatar_url) {
        try {
          const oldFileName = targetUser.avatar_url.split('/').pop().split('?')[0];
          if (oldFileName && !targetUser.avatar_url.includes('googleusercontent')) {
            await supabase.storage.from('avatars').remove([oldFileName]);
          }
        } catch (err) {
          console.error('Error deleting old avatar:', err);
        }
      }
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, {
        cacheControl: '3600',
        upsert: true,
      });
      if (uploadError) {
        alert(`Failed to upload photo: ${uploadError.message}`);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      avatar_url = publicUrlData?.publicUrl || avatar_url;
      payload.avatar_url = avatar_url;
    }

    delete payload.points;
    delete payload.created_at;

    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    if (error) {
      alert(`Failed to save: ${error.message}`);
      return;
    }

    clearAdminUserCaches();
    await fetchUsers(currentPage, debouncedSearch, teamSortMode);
    setSuccessMessage({
      title: language === 'en' ? 'Saved' : 'সংরক্ষিত',
      message: language === 'en' ? 'Profile updated.' : 'প্রোফাইল আপডেট হয়েছে।',
    });
    setShowSuccessModal(true);
  };

  const handleOpenDeleteConfirm = (targetUser) => {
    setUserToDelete(targetUser);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    try {
      // 1. Delete from profiles (Cascades based on SQL setup)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      // 2. Clear caches
      for (let i = 1; i <= 10; i++) {
        cacheHelper.clear(`admin_users_page_${i}`);
        cacheHelper.clear(`admin_users_admin_all_page_${i}`);
        cacheHelper.clear(`admin_users_safety mitra_${user.id}_page_${i}`);
        cacheHelper.clear(`admin_users_v2_${userProfile?.role}_${userProfile?.role === 'safety mitra' ? user.id : 'all'}_page_${i}`);
        cacheHelper.clear(`admin_users_v3_${userProfile?.role}_${userProfile?.role === 'safety mitra' ? user.id : 'all'}_page_${i}`);
        cacheHelper.clear(`admin_users_v3_${userProfile?.role}_${userProfile?.role === 'safety mitra' ? user.id : 'all'}_page_${i}_q_all`);
      }
      cacheHelper.clear(`user_ppe_${userToDelete.id}`);
      cacheHelper.clear(`user_tools_${userToDelete.id}`);

      // 3. Update local state
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setTotalUsers(prev => prev - 1);

      // 4. Success feedback
      setSuccessMessage({
        title: language === 'en' ? 'User Deleted' : 'ইউজার মুছে ফেলা হয়েছে',
        message: language === 'en'
          ? `User ${userToDelete.full_name} has been permanently removed from the application. Please remember to manually delete them from Supabase Auth if needed.`
          : `ইউজার ${userToDelete.full_name}-কে স্থায়ীভাবে সরিয়ে ফেলা হয়েছে। প্রয়োজন হলে দয়া করে সুপারবেস অথ থেকে ম্যানুয়ালি মুছে ফেলুন।`
      });
      setShowSuccessModal(true);

      // 5. Cleanup
      setShowDeleteConfirm(false);
      setUserToDelete(null);

    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetScore = async () => {
    // 1. Double check target
    const targetName = resetTarget === 'all' ? 'EVERYONE' : resetTarget.name;
    const expectedInput = resetTarget === 'all' ? 'RESET ALL' : 'RESET';

    if (resetConfirmInput !== expectedInput) {
      alert(`Please type "${expectedInput}" to confirm.`);
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.rpc('admin_reset_score', {
        p_target_user_id: resetTarget === 'all' ? null : resetTarget.id
      });

      if (error) throw error;

      // 2. Clear cache to reflect changes
      cacheHelper.clearAll(); // Broad clear for leaderboards and user lists

      // 3. Refresh local list
      await fetchUsers(currentPage, debouncedSearch, teamSortMode);

      setShowResetConfirm(false);
      setResetTarget(null);
      setResetConfirmInput('');

      setSuccessMessage({
        title: language === 'en' ? 'Scores Reset' : 'স্কোর রিসেট করা হয়েছে',
        message: language === 'en'
          ? `Successfully reset scores for ${targetName}.`
          : `${targetName}-এর স্কোর সফলভাবে রিসেট করা হয়েছে।`
      });
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error resetting scores:', err);
      alert(`Failed to reset score: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetTarget) return;
    setIsResettingPassword(true);
    try {
      // Custom auth may store slm_session_id (device session) and/or session_token (login RPC).
      // Older or restored sessions often only have session_token — sync whichever exists
      // so admin_reset_password's server-side session check passes.
      const adminSession =
        storageUtils.getItem('slm_session_id') ||
        storageUtils.getItem('session_token');

      if (!adminSession) {
        throw new Error(
          language === 'en'
            ? 'No active session found. Please log out and log in again.'
            : 'সক্রিয় সেশন পাওয়া যায়নি। লগআউট করে আবার লগইন করুন।'
        );
      }

      await supabase.rpc('set_current_session_id', {
        p_user_id: user.id,
        p_session_id: adminSession,
      });

      if (!storageUtils.getItem('slm_session_id')) {
        storageUtils.setItem('slm_session_id', adminSession);
      }

      const { data, error } = await supabase.rpc('admin_reset_password', {
        p_user_id: passwordResetTarget.id,
        p_admin_id: user.id,
        p_admin_session: adminSession,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result) throw new Error('No result returned');

      setPasswordResetResult({
        name: result.full_name,
        phone: result.phone_number,
        password: result.temp_password,
      });
      setShowPasswordResetConfirm(false);
      setPasswordResetTarget(null);
    } catch (err) {
      console.error('Error resetting password:', err);
      alert(
        (language === 'en' ? 'Failed to reset password: ' : 'পাসওয়ার্ড রিসেট ব্যর্থ: ') +
          (err.message || err)
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isEn = language === 'en';
  const isAdmin = userProfile?.role === 'admin';
  const isSafetyMitra = userProfile?.role === 'safety mitra';
  const isLineman = userProfile?.role === 'lineman' || userProfile?.role === 'guest';

  const formatRoleLabel = (role) => {
    if (role === 'guest') return isEn ? 'Guest preview' : 'গেস্ট প্রিভিউ';
    if (role === 'admin') return isEn ? 'Admin' : 'অ্যাডমিন';
    if (role === 'safety mitra') return isEn ? 'Safety Mitra' : 'সেফটি মিত্র';
    return isEn ? 'Lineman' : 'লাইনম্যান';
  };

  const roleBadgeClass = (role) => {
    if (role === 'guest') return 'bg-sky-100 text-sky-800 border border-slate-200/70';
    if (role === 'admin') return 'bg-purple-100 text-purple-800 border border-slate-200/70';
    if (role === 'safety mitra') return 'bg-orange-100 text-orange-800 border border-slate-200/70';
    return 'bg-slate-100 text-slate-800 border border-slate-200/70';
  };

  const healthStatusLabel = (ok) => {
    if (ok === true) return isEn ? 'Working' : 'ঠিক আছে';
    if (ok === false) return isEn ? 'Problem' : 'সমস্যা';
    return '—';
  };

  const realtimeLabel = (status) => {
    if (status === 'SUBSCRIBED') return isEn ? 'Working' : 'ঠিক আছে';
    if (status) return isEn ? 'Check needed' : 'চেক করুন';
    return '—';
  };

  const pageTitle = isLineman
    ? (isEn ? 'My Profile' : 'আমার প্রোফাইল')
    : (isEn ? 'Update Profile' : 'প্রোফাইল আপডেট');

  const pageSubtitle = isAdmin
    ? (isEn ? 'Tap the pen icon on any row to update details.' : 'যেকোনো সারিতে কলম চিহ্ন চাপুন আপডেট করতে।')
    : isSafetyMitra
      ? (isEn ? 'Update your profile or your team.' : 'আপনার প্রোফাইল বা দল আপডেট করুন।')
      : null;

  const teamUsers = users.filter((u) => u.id !== user.id);

  const supervisorLabel = (u) => {
    if (!u?.supervisor_id) return isEn ? 'No supervisor' : 'সুপারভাইজার নেই';
    return (supervisors || []).find((s) => s.id === u.supervisor_id)?.full_name
      || (isEn ? 'Unknown supervisor' : 'অজানা সুপারভাইজার');
  };

  const activityTime = (u) => {
    const raw = u?.last_login_at || u?.updated_at || u?.created_at;
    const t = raw ? new Date(raw).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  };

  const sortedTeamUsers = [...teamUsers].sort((a, b) => {
    if (teamSortMode === 'name') {
      return (a.full_name || '').localeCompare(b.full_name || '', undefined, { sensitivity: 'base' });
    }
    if (teamSortMode === 'supervisor') {
      const sa = supervisorLabel(a);
      const sb = supervisorLabel(b);
      const bySup = sa.localeCompare(sb, undefined, { sensitivity: 'base' });
      if (bySup !== 0) return bySup;
      return (a.full_name || '').localeCompare(b.full_name || '', undefined, { sensitivity: 'base' });
    }
    // recent first
    return activityTime(b) - activityTime(a);
  });

  const teamGroups = (() => {
    if (profileSection !== 'team' || isLineman) return null;
    if (teamSortMode === 'supervisor') {
      const map = new Map();
      for (const u of sortedTeamUsers) {
        const key = u.supervisor_id || '__none__';
        if (!map.has(key)) {
          map.set(key, {
            key,
            title: supervisorLabel(u),
            users: [],
          });
        }
        map.get(key).users.push(u);
      }
      return Array.from(map.values()).sort((a, b) => {
        if (a.key === '__none__') return 1;
        if (b.key === '__none__') return -1;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      });
    }
    return [{
      key: 'all',
      title: null,
      users: sortedTeamUsers,
    }];
  })();

  const teamTotal = Math.max(0, totalUsers - 1);
  const profileUsers = isLineman
    ? users
    : profileSection === 'mine'
      ? (ownProfileRow ? [ownProfileRow] : [])
      : sortedTeamUsers;

  const sectionTabBtn = (active) =>
    active ? ADMIN_THEME.tabActive : ADMIN_THEME.tabIdle;

  const moreMenuBtn = `${ADMIN_THEME.card} w-full text-left px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-orange-50/60 transition-colors flex items-center gap-2`;

  return (
    <div className={ADMIN_THEME.shell}>
    <div className={ADMIN_THEME.page}>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
        {pageSubtitle && (
          <p className="mt-1 text-sm text-slate-500">{pageSubtitle}</p>
        )}
      </div>

      {/* My profile / Team toggle — admin & safety mitra */}
      {!isLineman && !showAnalytics && (
        <div className={`mb-5 ${ADMIN_THEME.tabBar}`}>
          <button
            type="button"
            onClick={() => {
              setProfileSection('mine');
              setExpandedUserId(null);
            }}
            className={sectionTabBtn(profileSection === 'mine')}
          >
            👤 {isEn ? 'My Profile' : 'আমার প্রোফাইল'}
          </button>
          <button
            type="button"
            onClick={() => {
              setProfileSection('team');
              setExpandedUserId(null);
            }}
            className={sectionTabBtn(profileSection === 'team')}
          >
            👥 {isSafetyMitra ? (isEn ? 'My Team' : 'আমার দল') : (isEn ? 'Team' : 'দল')}
          </button>
        </div>
      )}

      {/* Compact manage menu — admin / safety mitra only */}
      {setCurrentView && !showAnalytics && (isAdmin || isSafetyMitra) && (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setShowManageMenu((v) => !v)}
            className="text-sm font-semibold text-slate-500 hover:text-orange-600 transition-colors"
          >
            {showManageMenu
              ? (isEn ? '▲ Hide manage options' : '▲ অপশন লুকান')
              : (isEn ? '▼ Manage (add people, notices…)' : '▼ পরিচালনা (যোগ, বিজ্ঞপ্তি…)')}
          </button>
          {showManageMenu && (
            <div className={`mt-3 flex flex-wrap gap-2 p-3 ${ADMIN_THEME.inset}`}>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className={ADMIN_THEME.primaryBtn}
              >
                ➕ {isEn ? 'Add Lineman' : 'লাইনম্যান যোগ'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteHelp(true)}
                className={ADMIN_THEME.menuBtn}
              >
                {isEn ? 'Help' : 'সাহায্য'}
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowNotificationModal(true)}
                    className={ADMIN_THEME.menuBtn}
                  >
                    📢 {isEn ? 'Send Notice' : 'বিজ্ঞপ্তি'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAnalytics(true)}
                    className={ADMIN_THEME.menuBtn}
                  >
                    📊 {isEn ? 'Reports' : 'রিপোর্ট'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('visual-quiz-preview')}
                    className={ADMIN_THEME.menuBtn}
                  >
                    🖼️ {isEn ? 'Quiz Preview' : 'কুইজ প্রিভিউ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMoreMenu((v) => !v)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-500"
                  >
                    {isEn ? 'More…' : 'আরও…'}
                  </button>
                </>
              )}
            </div>
          )}
          {isAdmin && showMoreMenu && showManageMenu && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button type="button" onClick={() => setCurrentView('admin-services')} className={moreMenuBtn}>
                🚨 {isEn ? 'Emergency Contacts' : 'জরুরি নম্বর'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetTarget('all');
                  setResetConfirmInput('');
                  setShowResetConfirm(true);
                }}
                className={`${moreMenuBtn} text-rose-700 border-rose-200`}
              >
                ⚠️ {isEn ? 'Reset All Scores' : 'সব স্কোর রিসেট'}
              </button>
            </div>
          )}
        </div>
      )}

      {showAnalytics && isAdmin && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAnalytics(false)}
            className="text-sm font-semibold text-orange-600 mb-2"
          >
            {isEn ? '← Back to Update Profile' : '← প্রোফাইল আপডেটে ফিরুন'}
          </button>
          <h2 className="text-lg font-bold text-slate-800">{isEn ? 'Workforce Reports' : 'কর্মী রিপোর্ট'}</h2>
        </div>
      )}

      {/* Admin-only collapsible panels — only when manage menu open */}
      {isAdmin && !showAnalytics && showManageMenu && (
        <div className={`mb-4 ${ADMIN_THEME.card}`}>
          <button
            type="button"
            onClick={() => setShowNoticesSection((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-orange-50/60 transition-colors"
          >
            <span className="font-semibold text-slate-800 text-sm">
              📢 {isEn ? 'Sent notices' : 'পাঠানো বিজ্ঞপ্তি'}
              {!adminBroadcastsLoading && adminBroadcasts.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">({adminBroadcasts.length})</span>
              )}
            </span>
            <span className="text-slate-400 text-xs">{showNoticesSection ? '▲' : '▼'}</span>
          </button>
          {showNoticesSection && (
            <div className="px-4 pb-4 border-t border-slate-100">
              <div className="flex justify-end pt-3 mb-3">
                <button
                  type="button"
                  onClick={() => loadAdminBroadcasts()}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  {isEn ? 'Refresh list' : 'তালিকা রিফ্রেশ'}
                </button>
              </div>
              {adminBroadcastsLoading ? (
                <p className="text-sm text-slate-500">{isEn ? 'Loading…' : 'লোড হচ্ছে…'}</p>
              ) : adminBroadcastsError ? (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">{isEn ? 'Could not load notices.' : 'বিজ্ঞপ্তি লোড হয়নি।'}</p>
                  <p className="text-xs mt-1 text-amber-700/80">
                    {isEn ? 'Tap Refresh to try again.' : 'আবার চেষ্টা করতে রিফ্রেশ ট্যাপ করুন।'}
                  </p>
                </div>
              ) : adminBroadcasts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {isEn ? 'No notices sent yet. Use "Send Notice" above.' : 'এখনও কোনো বিজ্ঞপ্তি পাঠানো হয়নি।'}
                </p>
              ) : (
                <ul className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {adminBroadcasts.map((row) => {
                    const rowIsActive = row.is_active === true;
                    return (
                      <li
                        key={row.id}
                        className={`p-3 rounded-lg ${ADMIN_THEME.inset}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rowIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                {rowIsActive ? (isEn ? 'Live' : 'চালু') : (isEn ? 'Off' : 'বন্ধ')}
                              </span>
                              {row.created_at && (
                                <span className="text-[10px] text-slate-400">{new Date(row.created_at).toLocaleDateString()}</span>
                              )}
                            </div>
                            <p className="font-semibold text-sm text-slate-900 truncate">{row.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{row.message}</p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleBroadcastActive(row)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700"
                            >
                              {rowIsActive ? (isEn ? 'Turn off' : 'বন্ধ') : (isEn ? 'Turn on' : 'চালু')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBroadcastRow(row.id)}
                              className="px-2 py-1 rounded text-[10px] font-bold text-rose-600"
                            >
                              {isEn ? 'Remove' : 'মুছুন'}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notice system check — only inside manage menu */}
      {isAdmin && !showAnalytics && showManageMenu && (
        <div className={`mb-5 ${ADMIN_THEME.card}`}>
          <button
            type="button"
            onClick={() => setShowSystemCheckSection((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-orange-50/60 transition-colors"
          >
            <span className="font-semibold text-slate-800 text-sm">
              🔧 {isEn ? 'Notice system check' : 'বিজ্ঞপ্তি সিস্টেম চেক'}
            </span>
            <span className="text-slate-400 text-xs">{showSystemCheckSection ? '▲' : '▼'}</span>
          </button>
          {showSystemCheckSection && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500 mb-3">
                {isEn ? 'Check if notices are reaching users correctly.' : 'বিজ্ঞপ্তি ব্যবহারকারীদের কাছে পৌঁছাচ্ছে কিনা দেখুন।'}
              </p>
              <button
                type="button"
                onClick={runDeliveryHealthCheck}
                disabled={deliveryHealth.checking}
                className="mb-3 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {deliveryHealth.checking ? (isEn ? 'Checking…' : 'চেক হচ্ছে…') : (isEn ? 'Run check' : 'চেক করুন')}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg p-3 ${ADMIN_THEME.inset}`}>
                  <p className="text-xs text-slate-500 mb-1">{isEn ? 'Live notices' : 'চালু বিজ্ঞপ্তি'}</p>
                  <p className="text-lg font-bold text-slate-900">{deliveryHealth.activeCount ?? '—'}</p>
                </div>
                <div className={`rounded-lg p-3 ${ADMIN_THEME.inset}`}>
                  <p className="text-xs text-slate-500 mb-1">{isEn ? 'Users can see notices' : 'ইউজার দেখতে পারে'}</p>
                  <p className={`text-sm font-bold ${deliveryHealth.publicRpcOk === true ? 'text-emerald-600' : deliveryHealth.publicRpcOk === false ? 'text-rose-600' : 'text-slate-400'}`}>
                    {healthStatusLabel(deliveryHealth.publicRpcOk)}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${ADMIN_THEME.inset}`}>
                  <p className="text-xs text-slate-500 mb-1">{isEn ? 'Admin panel works' : 'অ্যাডমিন প্যানেল'}</p>
                  <p className={`text-sm font-bold ${deliveryHealth.adminRpcOk === true ? 'text-emerald-600' : deliveryHealth.adminRpcOk === false ? 'text-rose-600' : 'text-slate-400'}`}>
                    {healthStatusLabel(deliveryHealth.adminRpcOk)}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${ADMIN_THEME.inset}`}>
                  <p className="text-xs text-slate-500 mb-1">{isEn ? 'Instant updates' : 'তাৎক্ষণিক আপডেট'}</p>
                  <p className={`text-sm font-bold ${deliveryHealth.realtimeStatus === 'SUBSCRIBED' ? 'text-emerald-600' : deliveryHealth.realtimeStatus ? 'text-amber-600' : 'text-slate-400'}`}>
                    {realtimeLabel(deliveryHealth.realtimeStatus)}
                  </p>
                </div>
              </div>
              {deliveryHealth.checkedAt && (
                <p className="mt-2 text-[10px] text-slate-400">
                  {isEn ? 'Last checked:' : 'সর্বশেষ:'} {new Date(deliveryHealth.checkedAt).toLocaleString()}
                </p>
              )}
              {deliveryHealth.error && (
                <p className="mt-2 text-xs text-rose-600">{deliveryHealth.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin: review progressive profile prompt modals (preview only — no DB write) */}
      {isAdmin && !showAnalytics && showManageMenu && typeof onPreviewProfileNudge === 'function' && (
        <div className={`mb-5 ${ADMIN_THEME.card}`}>
          <button
            type="button"
            onClick={() => setShowProfileNudgePreviewSection((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-orange-50/60 transition-colors"
          >
            <span className="font-semibold text-slate-800 text-sm">
              🧩 {isEn ? 'Review profile prompts' : 'প্রোফাইল প্রম্পট রিভিউ'}
            </span>
            <span className="text-slate-400 text-xs">{showProfileNudgePreviewSection ? '▲' : '▼'}</span>
          </button>
          {showProfileNudgePreviewSection && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nudgePreviewRequireMode}
                  onChange={(e) => setNudgePreviewRequireMode(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                {isEn ? 'Simulate 2nd visit (no Skip)' : '২য় ভিজিট সিমুলেট (Skip নেই)'}
              </label>
              <div className="flex flex-wrap gap-2">
                {PROFILE_NUDGE_FIELD_ORDER.map((fieldKey) => {
                  const labels = {
                    district: isEn ? 'District' : 'জেলা',
                    block: isEn ? 'Block' : 'ব্লক',
                    job: isEn ? 'Job' : 'কাজ',
                    dob: isEn ? 'DOB' : 'জন্ম',
                    education: isEn ? 'Education' : 'শিক্ষা',
                    blood_group: isEn ? 'Blood' : 'রক্ত',
                    is_donor: isEn ? 'Donor' : 'দাতা',
                  };
                  return (
                    <button
                      key={fieldKey}
                      type="button"
                      onClick={() =>
                        onPreviewProfileNudge({
                          field: fieldKey,
                          allowSkip: !nudgePreviewRequireMode,
                        })
                      }
                      className="rounded-full border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50"
                    >
                      {labels[fieldKey] || fieldKey}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Preview only — Save / Not now will not change your profile.'
                  : 'শুধু প্রিভিউ — Save / Not now আপনার প্রোফাইল বদলাবে না।'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Admin: preview idle full-screen story overlay */}
      {isAdmin && !showAnalytics && showManageMenu && typeof onPreviewIdleStory === 'function' && (
        <div className={`mb-5 ${ADMIN_THEME.card}`}>
          <button
            type="button"
            onClick={() => setShowIdleStoryPreviewSection((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-orange-50/60 transition-colors"
          >
            <span className="font-semibold text-slate-800 text-sm">
              {isEn ? 'Preview idle story' : 'আইডল স্টোরি প্রিভিউ'}
            </span>
            <span className="text-slate-400 text-xs">{showIdleStoryPreviewSection ? '▲' : '▼'}</span>
          </button>
          {showIdleStoryPreviewSection && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onPreviewIdleStory({})}
                  className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-100"
                >
                  {isEn ? 'Random story' : 'এলোমেলো গল্প'}
                </button>
                {AWARENESS_STORIES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPreviewIdleStory({ storyId: s.id })}
                    className="rounded-full border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50"
                  >
                    {s.title[language] || s.title.en}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Opens the idle full-screen image overlay immediately (no 4-minute wait).'
                  : 'আইডল ফুল-স্ক্রিন ইমেজ ওভারলে তৎক্ষণাৎ খোলে (৪ মিনিট অপেক্ষা নেই)।'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Admin: sponsor full-screen ad */}
      {isAdmin && !showAnalytics && showManageMenu && (
        <div className={`mb-5 ${ADMIN_THEME.card}`}>
          <button
            type="button"
            onClick={() => setShowSponsorAdSection((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-orange-50/60 transition-colors"
          >
            <span className="font-semibold text-slate-800 text-sm">
              🎬 {isEn ? 'Sponsor ad (full screen)' : 'স্পনসর অ্যাড (ফুল স্ক্রিন)'}
              {!sponsorAdsLoading && sponsorAds.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">({sponsorAds.length})</span>
              )}
            </span>
            <span className="text-slate-400 text-xs">{showSponsorAdSection ? '▲' : '▼'}</span>
          </button>
          {showSponsorAdSection && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'Shown once per user session, full screen, only while enabled and inside the date range.'
                  : 'প্রতি সেশনে একবার, ফুল স্ক্রিন, শুধু চালু ও তারিখ সীমার মধ্যে দেখানো হয়।'}
              </p>

              {typeof onPreviewSponsorAd === 'function' && (
                <button
                  type="button"
                  onClick={handleDemoSponsorPreview}
                  className="w-full rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.99]"
                >
                  {isEn ? '▶ Demo: Bangla ad ask (admin only)' : '▶ ডেমো: বাংলা বিজ্ঞাপন অনুরোধ (শুধু অ্যাডমিন)'}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSponsorEditingId(null);
                  setSponsorForm({ ...SPONSOR_ASK_PRESET });
                  setShowSponsorAdSection(true);
                }}
                className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 transition-all hover:bg-orange-100 active:scale-[0.99]"
              >
                {isEn ? '↧ Load “sponsor wanted” preset into form' : '↧ ফর্মে “স্পনসর চাই” প্রিসেট লোড করুন'}
              </button>

              {/* Editor form */}
              <div className={`rounded-xl p-3 space-y-3 ${ADMIN_THEME.inset}`}>
                <p className="text-xs font-bold text-slate-700">
                  {sponsorEditingId
                    ? (isEn ? 'Editing ad' : 'অ্যাড সম্পাদনা')
                    : (isEn ? 'New ad' : 'নতুন অ্যাড')}
                </p>

                <input
                  type="text"
                  value={sponsorForm.sponsor_name}
                  onChange={(e) => setSponsorForm((p) => ({ ...p, sponsor_name: e.target.value }))}
                  placeholder={isEn ? 'Sponsor / company name' : 'স্পনসর / কোম্পানির নাম'}
                  className={ADMIN_THEME.input}
                />
                <input
                  type="text"
                  value={sponsorForm.headline}
                  onChange={(e) => setSponsorForm((p) => ({ ...p, headline: e.target.value }))}
                  placeholder={isEn ? 'Headline' : 'হেডলাইন'}
                  className={ADMIN_THEME.input}
                />
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">
                    {isEn ? 'Rotating headlines (one per line, optional)' : 'ঘূর্ণায়মান হেডলাইন (প্রতি লাইনে একটি, ঐচ্ছিক)'}
                  </label>
                  <textarea
                    value={sponsorForm.headlines_text}
                    onChange={(e) => setSponsorForm((p) => ({ ...p, headlines_text: e.target.value }))}
                    placeholder={isEn ? 'Line 1\nLine 2\nLine 3' : 'লাইন ১\nলাইন ২\nলাইন ৩'}
                    rows={3}
                    className={ADMIN_THEME.input}
                  />
                  <p className="text-[10px] text-slate-400">
                    {isEn
                      ? 'If set, these cycle in the ad instead of the single headline.'
                      : 'দিলে অ্যাডে একক হেডলাইনের বদলে এগুলো ঘুরে ঘুরে দেখাবে।'}
                  </p>
                </div>
                <textarea
                  value={sponsorForm.subtext}
                  onChange={(e) => setSponsorForm((p) => ({ ...p, subtext: e.target.value }))}
                  placeholder={isEn ? 'Subtext / short message' : 'সাবটেক্সট / সংক্ষিপ্ত বার্তা'}
                  rows={2}
                  className={ADMIN_THEME.input}
                />

                {/* Images */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">{isEn ? 'Product image' : 'প্রোডাক্ট ছবি'}</label>
                    {sponsorForm.image_url && (
                      <img src={sponsorForm.image_url} alt="" className="h-16 w-full object-contain rounded-lg bg-white border border-slate-200" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleSponsorImageUpload(e.target.files[0], 'image_url')}
                      className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:bg-orange-100 file:text-orange-700 file:text-[11px] file:font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">{isEn ? 'Logo (optional)' : 'লোগো (ঐচ্ছিক)'}</label>
                    {sponsorForm.logo_url && (
                      <img src={sponsorForm.logo_url} alt="" className="h-16 w-full object-contain rounded-lg bg-white border border-slate-200" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleSponsorImageUpload(e.target.files[0], 'logo_url')}
                      className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:bg-orange-100 file:text-orange-700 file:text-[11px] file:font-semibold"
                    />
                  </div>
                </div>
                {sponsorImageUploading && (
                  <p className="text-[11px] text-orange-600">{isEn ? 'Uploading image…' : 'ছবি আপলোড হচ্ছে…'}</p>
                )}

                {/* Contact */}
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="tel"
                    value={sponsorForm.contact_phone}
                    onChange={(e) => setSponsorForm((p) => ({ ...p, contact_phone: e.target.value }))}
                    placeholder={isEn ? 'Contact phone' : 'যোগাযোগ ফোন'}
                    className={ADMIN_THEME.input}
                  />
                  <input
                    type="email"
                    value={sponsorForm.contact_email}
                    onChange={(e) => setSponsorForm((p) => ({ ...p, contact_email: e.target.value }))}
                    placeholder={isEn ? 'Contact email' : 'যোগাযোগ ইমেইল'}
                    className={ADMIN_THEME.input}
                  />
                  <input
                    type="text"
                    value={sponsorForm.contact_url}
                    onChange={(e) => setSponsorForm((p) => ({ ...p, contact_url: e.target.value }))}
                    placeholder={isEn ? 'Website / link' : 'ওয়েবসাইট / লিঙ্ক'}
                    className={ADMIN_THEME.input}
                  />
                  <input
                    type="text"
                    value={sponsorForm.cta_label}
                    onChange={(e) => setSponsorForm((p) => ({ ...p, cta_label: e.target.value }))}
                    placeholder={isEn ? 'Button text (e.g. Learn more)' : 'বাটন টেক্সট'}
                    className={ADMIN_THEME.input}
                  />
                </div>

                {/* Style + timing */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">{isEn ? 'Theme' : 'থিম'}</label>
                    <select
                      value={sponsorForm.theme}
                      onChange={(e) => setSponsorForm((p) => ({ ...p, theme: e.target.value }))}
                      className={ADMIN_THEME.input}
                    >
                      <option value="dark">{isEn ? 'Dark' : 'ডার্ক'}</option>
                      <option value="light">{isEn ? 'Light' : 'লাইট'}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">{isEn ? 'Duration (sec)' : 'সময় (সেকেন্ড)'}</label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={sponsorForm.display_seconds}
                      onChange={(e) => setSponsorForm((p) => ({ ...p, display_seconds: e.target.value }))}
                      className={ADMIN_THEME.input}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">{isEn ? 'Start date' : 'শুরুর তারিখ'}</label>
                    <input
                      type="datetime-local"
                      value={sponsorForm.starts_at}
                      onChange={(e) => setSponsorForm((p) => ({ ...p, starts_at: e.target.value }))}
                      className={ADMIN_THEME.input}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">{isEn ? 'End date' : 'শেষ তারিখ'}</label>
                    <input
                      type="datetime-local"
                      value={sponsorForm.ends_at}
                      onChange={(e) => setSponsorForm((p) => ({ ...p, ends_at: e.target.value }))}
                      className={ADMIN_THEME.input}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sponsorForm.allow_skip}
                      onChange={(e) => setSponsorForm((p) => ({ ...p, allow_skip: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    {isEn ? 'Allow skip' : 'স্কিপ অনুমতি'}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sponsorForm.contact_safety_mitra}
                      onChange={(e) => setSponsorForm((p) => ({ ...p, contact_safety_mitra: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    {isEn ? 'Show Safety Mitra contact line' : 'সেফটি মিত্র যোগাযোগ লাইন দেখান'}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sponsorForm.is_active}
                      onChange={(e) => setSponsorForm((p) => ({ ...p, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    {isEn ? 'Enabled' : 'চালু'}
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveSponsorAd}
                    disabled={sponsorSaving || sponsorImageUploading}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {sponsorSaving
                      ? (isEn ? 'Saving…' : 'সেভ হচ্ছে…')
                      : sponsorEditingId
                        ? (isEn ? 'Update ad' : 'আপডেট')
                        : (isEn ? 'Create ad' : 'তৈরি করুন')}
                  </button>
                  {typeof onPreviewSponsorAd === 'function' && (
                    <button
                      type="button"
                      onClick={handlePreviewSponsorForm}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 transition-colors"
                    >
                      {isEn ? 'Preview' : 'প্রিভিউ'}
                    </button>
                  )}
                  {sponsorEditingId && (
                    <button
                      type="button"
                      onClick={resetSponsorForm}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-700"
                    >
                      {isEn ? 'Cancel edit' : 'বাতিল'}
                    </button>
                  )}
                </div>
              </div>

              {/* Existing ads list */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700">{isEn ? 'Saved ads' : 'সংরক্ষিত অ্যাড'}</span>
                  <button
                    type="button"
                    onClick={() => loadSponsorAds()}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                  >
                    {isEn ? 'Refresh' : 'রিফ্রেশ'}
                  </button>
                </div>
                {sponsorAdsLoading ? (
                  <p className="text-sm text-slate-500">{isEn ? 'Loading…' : 'লোড হচ্ছে…'}</p>
                ) : sponsorAdsError ? (
                  <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">{isEn ? 'Could not load sponsor ads.' : 'স্পনসর অ্যাড লোড হয়নি।'}</p>
                    <p className="text-xs mt-1 text-amber-700/80">{sponsorAdsError}</p>
                  </div>
                ) : sponsorAds.length === 0 ? (
                  <p className="text-sm text-slate-500">{isEn ? 'No sponsor ads yet.' : 'এখনও কোনো স্পনসর অ্যাড নেই।'}</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {sponsorAds.map((row) => {
                      const rowIsActive = row.is_active === true;
                      return (
                        <li key={row.id} className={`p-3 rounded-lg ${ADMIN_THEME.inset}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rowIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                  {rowIsActive ? (isEn ? 'Live' : 'চালু') : (isEn ? 'Off' : 'বন্ধ')}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">{row.theme}</span>
                                {(row.starts_at || row.ends_at) && (
                                  <span className="text-[10px] text-slate-400">
                                    {row.starts_at ? new Date(row.starts_at).toLocaleDateString() : '…'} – {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : '…'}
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-sm text-slate-900 truncate">{row.headline || row.sponsor_name || '(untitled)'}</p>
                              {row.subtext && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{row.subtext}</p>}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditSponsorAd(row)}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700"
                              >
                                {isEn ? 'Edit' : 'সম্পাদনা'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleSponsorAdActive(row)}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700"
                              >
                                {rowIsActive ? (isEn ? 'Turn off' : 'বন্ধ') : (isEn ? 'Turn on' : 'চালু')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSponsorAd(row.id)}
                                className="px-2 py-1 rounded text-[10px] font-bold text-rose-600"
                              >
                                {isEn ? 'Remove' : 'মুছুন'}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin search + team sort — team tab only */}
      {!isLineman && !showAnalytics && profileSection === 'team' && (
        <div className="mb-4 space-y-3">
          {isAdmin && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden>🔍</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search name, phone, email, district, ID…' : 'নাম, ফোন, ইমেইল, জেলা, ID…'}
                className={`${ADMIN_THEME.input} pl-9 pr-9 py-2.5 placeholder:text-slate-400`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={isEn ? 'Clear search' : 'অনুসন্ধান মুছুন'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  ×
                </button>
              )}
            </div>
          )}
          <div className={`${ADMIN_THEME.tabBar} overflow-x-auto`}>
            {[
              { id: 'recent', label: isEn ? '⏱ Recent' : '⏱ সাম্প্রতিক' },
              { id: 'supervisor', label: isEn ? '👔 By Safety Mitra' : '👔 সেফটি মিত্র অনুযায়ী' },
              { id: 'name', label: isEn ? '🔤 Name' : '🔤 নাম' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTeamSortMode(opt.id);
                  setExpandedUserId(null);
                  if (opt.id === 'supervisor') setCurrentPage(1);
                }}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-all ${
                  teamSortMode === opt.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-orange-50/70 hover:text-orange-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* People list section label */}
      {!showAnalytics && !loading && profileUsers.length > 0 && !isLineman && profileSection === 'team' && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">
            {debouncedSearch
              ? (isEn ? `${totalUsers} found` : `${totalUsers}টি পাওয়া গেছে`)
              : isSafetyMitra
                ? (isEn ? `${teamTotal} in my team` : `আমার দলে ${teamTotal} জন`)
                : (isEn ? `${teamTotal} people` : `${teamTotal} জন`)}
          </h2>
        </div>
      )}

      {loading ? (
        <ProfileCardSkeleton />
      ) : fetchError ? (
        <div className={`${ADMIN_THEME.card} p-12 text-center border-red-300`}>
          <div className="text-4xl mb-4">📡</div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            {language === 'en' ? 'Connection Error' : 'কানেকশন এরর'}
          </h3>
          <p className="text-slate-500 mb-6 max-w-xs mx-auto">
            {language === 'en'
              ? 'Unable to load user data. Please check your internet connection.'
              : 'ইউজার ডাটা লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট কানেকশন চেক করুন।'}
          </p>
          <button
            onClick={() => fetchUsers(currentPage, debouncedSearch, teamSortMode)}
            className="rounded-full bg-orange-500 px-8 py-2.5 font-bold text-white shadow-sm shadow-orange-500/30 transition-all active:scale-95"
          >
            {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
          </button>
        </div>
      ) : showAnalytics ? (
        <AdminAnalytics language={language} userRole={userProfile?.role} />
      ) : (
        profileUsers.length === 0 ? (
          <div className={`${ADMIN_THEME.card} p-12 text-center`}>
            <div className="text-4xl mb-4">{profileSection === 'mine' ? '👤' : '👥'}</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {profileSection === 'mine'
                ? (isEn ? 'Profile not loaded' : 'প্রোফাইল লোড হয়নি')
                : debouncedSearch
                  ? (isEn ? 'No matches' : 'কিছু পাওয়া যায়নি')
                  : userProfile?.role === 'safety mitra'
                    ? (language === 'en' ? 'No one is yet tagged' : 'এখনও কাউকে ট্যাগ করা হয়নি')
                    : (language === 'en' ? 'No users found' : 'কোনো ব্যবহারকারী পাওয়া যায়নি')}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              {profileSection === 'mine'
                ? (isEn ? 'Please try again in a moment.' : 'অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।')
                : debouncedSearch
                  ? (isEn ? 'Try a different name, phone, or district.' : 'অন্য নাম, ফোন বা জেলা দিয়ে চেষ্টা করুন।')
                  : userProfile?.role === 'safety mitra'
                  ? (language === 'en'
                    ? 'There are no linemen currently assigned to you. Please contact an administrator.'
                    : 'বর্তমানে আপনার সাথে কোনো লাইনম্যান সংযুক্ত নেই। অনুগ্রহ করে অ্যাডমিনিস্ট্রেটরের সাথে যোগাযোগ করুন।')
                  : (language === 'en'
                    ? 'Try adjusting your filters or add a new user.'
                    : 'আপনার ফিল্টার পরিবর্তন করুন বা নতুন ব্যবহারকারী যোগ করুন।')
              }
            </p>
          </div>
        ) : (
          profileSection === 'mine' || isLineman ? (
            <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto">
              {profileUsers.map((targetUser) => {
                const canManage = !(isSafetyMitra && targetUser.role === 'admin');
                return (
                  <UserProfileCard
                    key={targetUser.id}
                    targetUser={targetUser}
                    isEn={isEn}
                    isAdmin={isAdmin}
                    isSafetyMitra={isSafetyMitra}
                    canManage={canManage}
                    userProfile={userProfile}
                    avatarSize="xl"
                    formatRoleLabel={formatRoleLabel}
                    roleBadgeClass={roleBadgeClass}
                    wbLocations={wbLocations}
                    supervisors={supervisors}
                    compact={false}
                    isExpanded
                    onSaveField={handleSaveProfileField}
                    onPPE={() => handleEditPPE(targetUser)}
                    onTools={() => handleEditTools(targetUser)}
                    onReset={() => {
                      setResetTarget({ id: targetUser.id, name: targetUser.full_name });
                      setResetConfirmInput('');
                      setShowResetConfirm(true);
                    }}
                    onResetPassword={() => {
                      setPasswordResetTarget({ id: targetUser.id, name: targetUser.full_name });
                      setShowPasswordResetConfirm(true);
                    }}
                    onDelete={() => handleOpenDeleteConfirm(targetUser)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {(teamGroups || []).map((group) => (
                <section key={group.key}>
                  {group.title && (
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 min-w-0">
                        <span aria-hidden>👔</span>
                        <span className="truncate">{group.title}</span>
                        <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-slate-200/70">
                          {group.users.length}{' '}
                          {group.users.length === 1
                            ? (isEn ? 'lineman' : 'লাইনম্যান')
                            : (isEn ? 'linemen' : 'লাইনম্যান')}
                        </span>
                      </h3>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.users.map((targetUser) => {
                      const canManage = !(isSafetyMitra && targetUser.role === 'admin');
                      const isExpanded = expandedUserId === targetUser.id;
                      return (
                        <UserProfileCard
                          key={targetUser.id}
                          targetUser={targetUser}
                          isEn={isEn}
                          isAdmin={isAdmin}
                          isSafetyMitra={isSafetyMitra}
                          canManage={canManage}
                          userProfile={userProfile}
                          avatarSize="lg"
                          formatRoleLabel={formatRoleLabel}
                          roleBadgeClass={roleBadgeClass}
                          wbLocations={wbLocations}
                          supervisors={supervisors}
                          compact
                          isExpanded={isExpanded}
                          onToggleExpand={() =>
                            setExpandedUserId((id) => (id === targetUser.id ? null : targetUser.id))
                          }
                          onSaveField={handleSaveProfileField}
                          onPPE={() => handleEditPPE(targetUser)}
                          onTools={() => handleEditTools(targetUser)}
                          onReset={() => {
                            setResetTarget({ id: targetUser.id, name: targetUser.full_name });
                            setResetConfirmInput('');
                            setShowResetConfirm(true);
                          }}
                          onResetPassword={() => {
                            setPasswordResetTarget({ id: targetUser.id, name: targetUser.full_name });
                            setShowPasswordResetConfirm(true);
                          }}
                          onDelete={() => handleOpenDeleteConfirm(targetUser)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )
        )
      )}

      {/* Pagination Controls — hidden for Safety Mitra grouping (full list loaded) */}
      {!loading && !isLineman && profileSection === 'team' && teamSortMode !== 'supervisor' && totalUsers > usersPerPage && (
        <div className="mt-4 flex items-center justify-between gap-3 py-3">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:bg-orange-50 active:scale-95 disabled:opacity-40"
          >
            {isEn ? '← Previous' : '← আগে'}
          </button>
          <span className="text-sm text-slate-500">
            {isEn ? `Page ${currentPage} of ${Math.ceil(totalUsers / usersPerPage)}` : `পৃষ্ঠা ${currentPage} / ${Math.ceil(totalUsers / usersPerPage)}`}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(Math.ceil(totalUsers / usersPerPage), p + 1))}
            disabled={currentPage >= Math.ceil(totalUsers / usersPerPage)}
            className="rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:bg-orange-50 active:scale-95 disabled:opacity-40"
          >
            {isEn ? 'Next →' : 'পরে →'}
          </button>
        </div>
      )}



      {/* Invite User Modal - Portal-ized for Android/Mobile feel */}
      {showInviteModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fffdf7] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200/80 animate-slide-up sm:animate-scale-in max-h-[90vh]">
            <div className="p-6 border-b border-slate-200/80 flex justify-between items-center shrink-0 bg-orange-50">
              <h2 className="text-xl font-bold text-slate-900">{isEn ? 'Add New Lineman' : 'নতুন লাইনম্যান যোগ করুন'}</h2>
              <button
                onClick={handleCloseInviteModal}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {tempPasswordResult ? (
              // SHOW TEMP PASSWORD RESULT
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-inner">
                    ✅
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">User Created!</h3>
                  <p className="text-sm text-slate-500">Share these credentials with the new user</p>
                </div>

                <div className="space-y-4 bg-blue-50 rounded-xl p-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                    <p className="text-lg font-bold text-slate-900">{tempPasswordResult.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number</label>
                    <p className="text-lg font-mono font-bold text-slate-900">{tempPasswordResult.phone}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Temporary Password</label>
                    <p className="text-2xl font-mono font-bold text-green-600 tracking-widest">{tempPasswordResult.password}</p>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-sm text-orange-900">
                    ⚠️ <strong>Important:</strong> User must change this password on first login
                  </p>
                </div>

                <button
                  onClick={handleCloseInviteModal}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              // CREATE USER FORM
              <form onSubmit={handleInviteUser} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-inner">
                    👤
                  </div>
                  <p className="text-sm text-slate-500 max-w-[280px]">
                    Create a new lineman account. They will receive a temporary password to login.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-base lg:text-sm"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Phone Number (10 digits)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <input
                      type="tel"
                      required
                      value={invitePhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-base lg:text-sm font-mono tracking-wider"
                      placeholder="9876543210"
                    />
                  </div>
                  <p className="text-xs text-slate-500 ml-1">
                    {invitePhone.length}/10 digits
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-safe-offset-4">
                  <button
                    type="button"
                    onClick={handleCloseInviteModal}
                    className="order-2 sm:order-1 flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting || invitePhone.length !== 10 || !inviteName.trim()}
                    className="order-1 sm:order-2 flex-1 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isInviting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Create User</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* PPE Wizard Overlay */}
      {selectedUserForPPE && createPortal(
        <div className="fixed inset-0 z-[300] bg-white overflow-y-auto animate-fade-in custom-scrollbar">
          <div className="sticky top-0 z-[310] bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 safe-area-top">
            <button
              type="button"
              onClick={() => setSelectedUserForPPE(null)}
              className="inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800 transition-colors"
            >
              <span aria-hidden>←</span>
              {isEn ? 'Back to admin panel' : 'অ্যাডমিন প্যানেলে ফিরুন'}
            </button>
            {selectedUserForPPE.full_name && (
              <p className="mt-1 text-xs text-slate-500 truncate">
                🦺 {isEn ? 'PPE' : 'পিপিই'} — {selectedUserForPPE.full_name}
              </p>
            )}
          </div>
          <div className="max-w-4xl mx-auto py-4 px-2 sm:px-4">
            <MyPPE
              user={selectedUserForPPE}
              language={language}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Tools Wizard Overlay */}
      {selectedUserForTools && createPortal(
        <div className="fixed inset-0 z-[300] bg-white overflow-y-auto animate-fade-in custom-scrollbar">
          <div className="sticky top-0 z-[310] bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 safe-area-top">
            <button
              type="button"
              onClick={() => setSelectedUserForTools(null)}
              className="inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800 transition-colors"
            >
              <span aria-hidden>←</span>
              {isEn ? 'Back to admin panel' : 'অ্যাডমিন প্যানেলে ফিরুন'}
            </button>
            {selectedUserForTools.full_name && (
              <p className="mt-1 text-xs text-slate-500 truncate">
                🛠️ {isEn ? 'Tools' : 'সরঞ্জাম'} — {selectedUserForTools.full_name}
              </p>
            )}
          </div>
          <div className="max-w-4xl mx-auto py-4 px-2 sm:px-4">
            <MyTools
              user={selectedUserForTools}
              language={language}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Success Modal - Uses the reusable SaveSuccessModal */}
      <SaveSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
        language={language}
      />

      {/* Send Notification Modal - Portal-ized */}
      {showNotificationModal && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-slate-900/55 backdrop-blur-sm z-[200] p-4 flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh] overflow-hidden bg-[#fffdf7]">
            <div className="flex justify-between items-center p-6 border-b border-slate-200/80 shrink-0 bg-orange-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                {isEn ? 'Send Notice' : 'বিজ্ঞপ্তি পাঠান'}
              </h2>
              <button type="button" onClick={() => setShowNotificationModal(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">{isEn ? 'Title' : 'শিরোনাম'}</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  placeholder={isEn ? 'e.g. Training update' : 'যেমন: প্রশিক্ষণ আপডেট'}
                  className={`${ADMIN_THEME.input} px-4 py-3`}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">{isEn ? 'Message' : 'বার্তা'}</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  placeholder={isEn ? 'Write your message here…' : 'এখানে লিখুন…'}
                  className={`${ADMIN_THEME.input} px-4 py-3 h-28 resize-none`}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">{isEn ? 'How important?' : 'কতটা জরুরি?'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'info', label: isEn ? 'Info' : 'তথ্য' },
                    { id: 'update', label: isEn ? 'Update' : 'আপডেট' },
                    { id: 'warning', label: isEn ? 'Warning' : 'সতর্ক' },
                    { id: 'alert', label: isEn ? 'Urgent' : 'জরুরি' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNotificationForm({ ...notificationForm, type: type.id })}
                      className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${notificationForm.type === type.id
                        ? NOTIFICATION_URGENCY_STYLES[type.id]?.selected
                        : NOTIFICATION_URGENCY_STYLES[type.id]?.idle
                        }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingNotification}
                className="w-full py-4 rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 font-bold disabled:opacity-50 flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98]"
              >
                {isSendingNotification ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : (isEn ? 'Send to Everyone' : 'সবাইকে পাঠান')}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      <DeleteUserConfirmationModal
        isOpen={showDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteUser}
        targetUser={userToDelete}
        loading={isDeleting}
        language={language}
      />

      {/* RESET SCORE CONFIRMATION MODAL */}
      {showResetConfirm && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in bg-[#fffdf7]">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner animate-pulse">
                ⚠️
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                {language === 'en' ? 'Are you absolutely sure?' : 'আপনি কি নিশ্চিত?'}
              </h3>
              <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                {resetTarget === 'all'
                  ? (language === 'en' ? 'This will permanently erase scores and training progress for EVERYONE in the organization.' : 'এটি সংস্থার প্রত্যেকের স্কোর এবং প্রশিক্ষণের অগ্রগতি স্থায়ীভাবে মুছে ফেলবে।')
                  : (language === 'en' ? `This will permanently reset all points and progress for ${resetTarget?.name}.` : `এটি ${resetTarget?.name}-এর সমস্ত পয়েন্ট এবং অগ্রগতি স্থায়ীভাবে রিসেট করবে।`)
                }
              </p>

              <div className="space-y-4">
                <div className="text-left space-y-2">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">
                    {language === 'en' ? `Type "${resetTarget === 'all' ? 'RESET ALL' : 'RESET'}" to confirm` : `নিশ্চিত করতে "${resetTarget === 'all' ? 'RESET ALL' : 'RESET'}" টাইপ করুন`}
                  </label>
                  <input
                    type="text"
                    value={resetConfirmInput}
                    onChange={(e) => setResetConfirmInput(e.target.value.toUpperCase())}
                    placeholder="..."
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-rose-100 rounded-2xl focus:border-rose-500 outline-none text-center font-black transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowResetConfirm(false); setResetTarget(null); setResetConfirmInput(''); }}
                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    {language === 'en' ? 'Cancel' : 'বাতিল'}
                  </button>
                  <button
                    disabled={isResetting || resetConfirmInput !== (resetTarget === 'all' ? 'RESET ALL' : 'RESET')}
                    onClick={handleResetScore}
                    className="flex-[2] py-4 px-6 rounded-2xl font-black bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    {isResetting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>🎯</span>
                        {language === 'en' ? 'Reset Now' : 'এখনই রিসেট'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Password Confirm Modal */}
      {showPasswordResetConfirm && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in bg-[#fffdf7]">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                🔑
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                {language === 'en' ? 'Reset password?' : 'পাসওয়ার্ড রিসেট করবেন?'}
              </h3>
              <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                {language === 'en'
                  ? `A new temporary PIN will be generated for ${passwordResetTarget?.name}. Their current password stops working, and they must set a new one on next login.`
                  : `${passwordResetTarget?.name}-এর জন্য একটি নতুন অস্থায়ী পিন তৈরি হবে। তার বর্তমান পাসওয়ার্ড আর কাজ করবে না এবং পরের বার লগইনে নতুন পাসওয়ার্ড দিতে হবে।`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowPasswordResetConfirm(false); setPasswordResetTarget(null); }}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  {language === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  disabled={isResettingPassword}
                  onClick={handleResetPassword}
                  className="flex-[2] py-4 px-6 rounded-2xl font-black bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-500/30 transition-all active:scale-95 disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {isResettingPassword ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>🔑</span>
                      {language === 'en' ? 'Generate PIN' : 'পিন তৈরি করুন'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Password Result Modal */}
      {passwordResetResult && createPortal(
        <div className="fixed inset-0 z-[10001] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in bg-[#fffdf7]">
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-inner">
                  ✅
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {language === 'en' ? 'Password Reset' : 'পাসওয়ার্ড রিসেট হয়েছে'}
                </h3>
                <p className="text-sm text-slate-500">
                  {language === 'en' ? 'Share these credentials with the user' : 'এই তথ্য ব্যবহারকারীকে দিন'}
                </p>
              </div>

              <div className="space-y-4 bg-blue-50 rounded-xl p-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {language === 'en' ? 'Name' : 'নাম'}
                  </label>
                  <p className="text-lg font-bold text-slate-900">{passwordResetResult.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {language === 'en' ? 'Phone Number' : 'ফোন নম্বর'}
                  </label>
                  <p className="text-lg font-mono font-bold text-slate-900">{passwordResetResult.phone}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {language === 'en' ? 'Temporary Password' : 'অস্থায়ী পাসওয়ার্ড'}
                  </label>
                  <p className="text-2xl font-mono font-bold text-green-600 tracking-widest">{passwordResetResult.password}</p>
                </div>
              </div>

              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-sm text-orange-900">
                  ⚠️ <strong>{language === 'en' ? 'Important:' : 'গুরুত্বপূর্ণ:'}</strong>{' '}
                  {language === 'en'
                    ? 'User must change this password on first login.'
                    : 'পরের বার লগইনে ব্যবহারকারীকে এই পাসওয়ার্ড পরিবর্তন করতে হবে।'}
                </p>
              </div>

              <button
                onClick={() => setPasswordResetResult(null)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all"
              >
                {language === 'en' ? 'Done' : 'সম্পন্ন'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Invite Guideline Modal */}
      {showInviteHelp && createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-sm">?</span>
                How to Add a Lineman
              </h3>
              <button onClick={() => setShowInviteHelp(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                <div className="flex-none flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">1</div>
                  <div className="w-0.5 grow bg-indigo-50 my-1"></div>
                </div>
                <div className="pb-6">
                  <h4 className="font-bold text-slate-900 mb-1">Enter Details</h4>
                  <p className="text-sm text-slate-500">Click <strong>{isEn ? 'Add Lineman' : 'লাইনম্যান যোগ করুন'}</strong> and enter their <strong>name</strong> and <strong>phone number</strong>.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-none flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">2</div>
                  <div className="w-0.5 grow bg-indigo-50 my-1"></div>
                </div>
                <div className="pb-6">
                  <h4 className="font-bold text-slate-900 mb-1">Get Temporary Password</h4>
                  <p className="text-sm text-slate-500">The system will generate a temporary password (e.g., <code>123456</code>). Write this down.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-none flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">3</div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Share & Login</h4>
                  <p className="text-sm text-slate-500">Share the phone number and password with the lineman. They must login and change their password.</p>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <p className="text-xs text-orange-800">
                  <strong>Note:</strong> The new lineman will be automatically tagged to you (Safety Mitra).
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowInviteHelp(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Uniform bottom spacing for all roles to prevent content cut-off by sticky navs or safe areas */}
      <div className="h-24 sm:h-12 w-full"></div>
    </div>
    </div>
  );
}


