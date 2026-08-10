import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import wbLocations from '../data/wb_locations.json';
import {
  BLOOD_GROUPS,
  EDUCATION_LEVELS,
  JOB_TYPES,
} from '../data/profileFieldOptions';
import {
  PROFILE_NUDGE_GAP_DAYS,
  PROFILE_NUDGE_SELECT,
  PROFILE_NUDGE_SHOW_AFTER_MS,
  ageFromDob,
  buildSaveNudgePatch,
  buildSkipNudgePatch,
  canSkipField,
  countFilledNudgeFields,
  getNextNudgeField,
  isNudgeDue,
  setLocalLastPromptDate,
  todayDateString,
} from '../utils/profileNudge';
import { isGuestUser } from '../utils/guestPreview';
import NativeSheetHandle from './NativeSheetHandle';
import { hapticImpact, hapticNotification } from '../utils/nativeAndroidUx';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const FIELD_META = {
  avatar_url: {
    icon: '📷',
    en: {
      title: 'Put a face to your name',
      why: 'Helps friends recognise you on Rank and the Forum.',
    },
    bn: {
      title: 'নিজের ছবি যোগ করুন',
      why: 'র‍্যাঙ্ক ও ফোরামে সহকর্মীরা আপনাকে চিনতে পারবে।',
    },
  },
  district: {
    icon: '📍',
    en: {
      title: 'Where do you work?',
      why: 'District tips and weather alerts stay relevant to you.',
    },
    bn: {
      title: 'আপনি কোন জেলায় কাজ করেন?',
      why: 'জেলাভিত্তিক টিপস ও আবহাওয়া সতর্কতা মিলবে।',
    },
  },
  block: {
    icon: '🗺️',
    en: {
      title: 'Your block',
      why: 'Fine-tunes local tips for your work area.',
    },
    bn: {
      title: 'আপনার ব্লক',
      why: 'আপনার কাজের এলাকার টিপস আরও মিলবে।',
    },
  },
  job: {
    icon: '⚡',
    en: {
      title: 'What kind of line work?',
      why: 'Training suggestions follow your job type.',
    },
    bn: {
      title: 'কী ধরনের লাইন কাজ করেন?',
      why: 'কাজের ধরন অনুযায়ী প্রশিক্ষণ সাজানো যায়।',
    },
  },
  dob: {
    icon: '🎂',
    en: {
      title: 'Date of birth',
      why: 'Used only for your profile age — never shared publicly.',
    },
    bn: {
      title: 'জন্ম তারিখ',
      why: 'শুধু প্রোফাইলের বয়সের জন্য — প্রকাশ্যে দেখানো হয় না।',
    },
  },
  education: {
    icon: '🎓',
    en: {
      title: 'Education background',
      why: 'Helps us pitch lessons at the right level.',
    },
    bn: {
      title: 'শিক্ষাগতগত',
      why: 'পাঠের স্তর ঠিক রাখতে সাহায্য করে।',
    },
  },
  blood_group: {
    icon: '🩸',
    en: {
      title: 'Blood group',
      why: 'Critical in field emergencies — keep it on your ID.',
    },
    bn: {
      title: 'রক্তের গ্রুপ',
      why: 'জরুরি অবস্থায় খুব দরকার — আইডিতে রাখুন।',
    },
  },
  is_donor: {
    icon: '❤️',
    en: {
      title: 'Are you a blood donor?',
      why: 'Optional — helps the community know if you can help.',
    },
    bn: {
      title: 'আপনি কি রক্তদাতা?',
      why: 'ঐচ্ছিক — প্রয়োজনে সাহায্য করতে পারবেন কিনা জানা যায়।',
    },
  },
};

const UI_COPY = {
  en: {
    badge: 'SmartLineman ID',
    progress: (f, t) => `${f} of ${t} ready`,
    save: 'Save & continue',
    skip: 'Later',
    mustFill: 'Pick one to continue.',
    mustPhoto: 'Choose a photo to continue.',
    saving: 'Saving…',
    yes: 'Yes, I donate',
    no: 'Not now',
    choosePhoto: 'Choose photo',
    changePhoto: 'Change photo',
    photoHint: 'Under 2MB · clear face works best',
    photoTooBig: 'Photo must be under 2MB.',
    searchDistrict: 'Search district…',
    searchBlock: 'Search block…',
    required: 'Required this time',
    preview: 'Preview',
  },
  bn: {
    badge: 'স্মার্টলাইনম্যান আইডি',
    progress: (f, t) => `${f} / ${t} সম্পন্ন`,
    save: 'সেভ করে এগোও',
    skip: 'পরে',
    mustFill: 'এগোতে একটি বেছে নিন।',
    mustPhoto: 'এগোতে একটি ছবি বেছে নিন।',
    saving: 'সেভ হচ্ছে…',
    yes: 'হ্যাঁ, দিই',
    no: 'এখন নয়',
    choosePhoto: 'ছবি বেছে নিন',
    changePhoto: 'ছবি বদলান',
    photoHint: '২MB-এর নিচে · মুখ স্পষ্ট হলে ভালো',
    photoTooBig: 'ছবি ২MB-এর নিচে হতে হবে।',
    searchDistrict: 'জেলা খুঁজুন…',
    searchBlock: 'ব্লক খুঁজুন…',
    required: 'এবার আবশ্যক',
    preview: 'প্রিভিউ',
  },
};

function buildValuePayload(field, value, profile) {
  if (field === 'is_donor') {
    return { is_donor: value === true || value === 'true' };
  }
  if (field === 'dob') {
    const age = ageFromDob(value);
    const payload = { dob: value };
    if (age != null) payload.age = age;
    return payload;
  }
  if (field === 'district') {
    const payload = { district: value };
    if (profile?.district && profile.district !== value) {
      payload.block = '';
    }
    return payload;
  }
  return { [field]: value };
}

function OptionChip({ label, selected, onClick, bn, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${compact ? 'min-h-[40px] px-3 py-2 text-xs' : 'min-h-[44px] px-3.5 py-2.5 text-sm'} rounded-full border font-bold transition-all active:scale-[0.98] touch-manipulation ${
        selected
          ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/25'
          : 'border-slate-200/90 bg-white text-slate-800 hover:border-orange-200 hover:bg-orange-50/60'
      } ${bn ? 'font-bengali' : ''}`}
    >
      {label}
    </button>
  );
}

function SearchableChipList({ options, value, onChange, placeholder, bn }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((opt) => String(opt).toLowerCase().includes(needle));
  }, [options, q]);

  return (
    <div className="space-y-3">
      {options.length > 8 ? (
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className={`w-full min-h-[44px] rounded-2xl border border-slate-200/80 bg-white px-4 text-sm font-semibold text-slate-900 outline-none ring-orange-200 focus:border-orange-300 focus:ring-2 ${bn ? 'font-bengali' : ''}`}
        />
      ) : null}
      <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto overscroll-contain pb-1">
        {filtered.map((opt) => (
          <OptionChip
            key={opt}
            label={opt}
            selected={value === opt}
            onClick={() => onChange(opt)}
            bn={bn}
            compact
          />
        ))}
        {filtered.length === 0 ? (
          <p className={`w-full py-4 text-center text-sm font-semibold text-slate-400 ${bn ? 'font-bengali' : ''}`}>
            —
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Soft progressive “SmartLineman ID” prompt: one missing profile field every few days.
 * First skip allowed per field; second time the same field is required.
 *
 * preview: { field, allowSkip } — admin review only; no DB writes.
 */
export default function ProfileFieldNudge({
  user,
  userProfile,
  language = 'en',
  blocked = false,
  onSaved,
  onOpenChange,
  preview = null,
  onPreviewClose,
}) {
  const bn = language === 'bn';
  const t = UI_COPY[bn ? 'bn' : 'en'];
  const isPreview = !!(preview && preview.field);

  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [field, setField] = useState(null);
  const [value, setValue] = useState('');
  const [donorChoice, setDonorChoice] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const shownForSessionRef = useRef(false);
  const timerRef = useRef(null);
  const profileRef = useRef(userProfile);
  const photoInputRef = useRef(null);

  useEffect(() => {
    profileRef.current = userProfile;
  }, [userProfile]);

  const nudgeState = userProfile?.profile_nudge_state;
  const allowSkip = isPreview
    ? preview?.allowSkip !== false
    : field
      ? canSkipField(nudgeState, field)
      : true;

  const progress = useMemo(
    () => countFilledNudgeFields(profileRef.current || userProfile, nudgeState),
    [userProfile, nudgeState, field, open]
  );

  const districts = useMemo(() => Object.keys(wbLocations || {}).sort(), []);
  const blocks = useMemo(() => {
    const d = value && field === 'district' ? value : (profileRef.current?.district || userProfile?.district || districts[0]);
    if (!d || !wbLocations?.[d]) return [];
    return [...wbLocations[d]].sort();
  }, [userProfile?.district, districts, value, field]);

  const meta = field ? FIELD_META[field] : null;
  const fieldCopy = meta ? (bn ? meta.bn : meta.en) : null;

  const resetDraft = useCallback(() => {
    setField(null);
    setValue('');
    setDonorChoice(null);
    setPhotoFile(null);
    setPhotoPreview('');
    setError('');
    setSavedFlash(false);
  }, []);

  const closeUi = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      resetDraft();
      onOpenChange?.(false);
      if (isPreview) onPreviewClose?.();
    }, 220);
  }, [onOpenChange, onPreviewClose, isPreview, resetDraft]);

  const openForField = useCallback(
    (nextField) => {
      shownForSessionRef.current = true;
      setField(nextField);
      setValue('');
      setDonorChoice(null);
      setPhotoFile(null);
      setPhotoPreview('');
      setError('');
      setSavedFlash(false);
      setOpen(true);
      onOpenChange?.(true);
      requestAnimationFrame(() => setVisible(true));
      void hapticImpact('Light');
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!isPreview) return undefined;
    openForField(preview.field);
    setBusy(false);
    return undefined;
  }, [isPreview, preview?.field, preview?.allowSkip, openForField]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isPreview) return undefined;

    if (
      !user?.id ||
      !userProfile ||
      isGuestUser(userProfile) ||
      blocked ||
      shownForSessionRef.current ||
      open
    ) {
      return undefined;
    }

    if (!isNudgeDue(nudgeState, user.id, PROFILE_NUDGE_GAP_DAYS)) {
      return undefined;
    }

    const tentative = getNextNudgeField(userProfile, nudgeState);
    if (!tentative) return undefined;

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      if (document.visibilityState !== 'visible') return;
      if (blocked || shownForSessionRef.current) return;

      let profileForCheck = profileRef.current;
      try {
        const { data: fresh, error: freshError } = await supabase
          .from('profiles')
          .select(PROFILE_NUDGE_SELECT)
          .eq('id', user.id)
          .single();
        if (!freshError && fresh) {
          profileForCheck = fresh;
          profileRef.current = { ...(profileRef.current || {}), ...fresh };
        }
      } catch (err) {
        console.warn('Profile nudge fresh check failed:', err);
      }

      const stillNext = getNextNudgeField(
        profileForCheck,
        profileForCheck?.profile_nudge_state
      );
      if (!stillNext) {
        shownForSessionRef.current = true;
        return;
      }

      openForField(stillNext);
    }, PROFILE_NUDGE_SHOW_AFTER_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user?.id, userProfile, nudgeState, blocked, open, isPreview, openForField]);

  useEffect(() => {
    if (!isPreview && blocked && open) closeUi();
  }, [blocked, open, closeUi, isPreview]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview]
  );

  const applyRpc = async (updates, nudgePatch) => {
    const { data, error: rpcError } = await supabase.rpc('apply_profile_nudge', {
      p_user_id: user.id,
      p_updates: updates || {},
      p_nudge_state: nudgePatch,
    });
    if (rpcError) throw rpcError;
    if (data && data.success === false) {
      throw new Error(data.error || 'Update failed');
    }
    setLocalLastPromptDate(user.id, todayDateString());
  };

  const handlePhotoPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t.photoTooBig);
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
    void hapticImpact('Light');
  };

  const uploadAvatar = async (file) => {
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data?.publicUrl;
  };

  const handleSkip = async () => {
    if (!allowSkip || busy || !field) return;
    if (isPreview) {
      closeUi();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const patch = buildSkipNudgePatch(
        profileRef.current?.profile_nudge_state || nudgeState,
        field
      );
      await applyRpc({}, patch);
      await onSaved?.();
      void hapticImpact('Light');
      closeUi();
    } catch (err) {
      console.error('Profile nudge skip failed:', err);
      setError(err.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (busy || !field) return;

    let resolved = value;
    if (field === 'is_donor') {
      if (donorChoice === null) {
        setError(t.mustFill);
        return;
      }
      resolved = donorChoice;
    } else if (field === 'avatar_url') {
      if (!photoFile && !isPreview) {
        setError(t.mustPhoto);
        return;
      }
    } else if (!resolved) {
      setError(t.mustFill);
      return;
    }

    if (isPreview) {
      closeUi();
      return;
    }

    setBusy(true);
    setError('');
    try {
      let updates = buildValuePayload(field, resolved, profileRef.current || userProfile);
      if (field === 'avatar_url' && photoFile) {
        const url = await uploadAvatar(photoFile);
        updates = { avatar_url: url };
      }
      const patch = buildSaveNudgePatch(
        profileRef.current?.profile_nudge_state || nudgeState,
        field
      );
      await applyRpc(updates, patch);
      setSavedFlash(true);
      void hapticNotification('Success');
      await onSaved?.();
      window.setTimeout(() => closeUi(), 420);
    } catch (err) {
      console.error('Profile nudge save failed:', err);
      setError(err.message || 'Failed');
      void hapticNotification('Error');
    } finally {
      setBusy(false);
    }
  };

  const renderControl = () => {
    if (field === 'avatar_url') {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-orange-200/80 bg-orange-50 shadow-sm">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl" aria-hidden>
                📷
              </span>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoPick}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className={`min-h-[48px] rounded-full border border-slate-200/80 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:bg-orange-50 active:scale-[0.98] ${bn ? 'font-bengali' : ''}`}
          >
            {photoPreview ? t.changePhoto : t.choosePhoto}
          </button>
          <p className={`text-xs font-semibold text-slate-500 ${bn ? 'font-bengali' : ''}`}>{t.photoHint}</p>
        </div>
      );
    }

    if (field === 'is_donor') {
      return (
        <div className="grid grid-cols-1 gap-2.5">
          {[true, false].map((choice) => (
            <OptionChip
              key={String(choice)}
              label={choice ? t.yes : t.no}
              selected={donorChoice === choice}
              onClick={() => {
                setDonorChoice(choice);
                setError('');
                void hapticImpact('Light');
              }}
              bn={bn}
            />
          ))}
        </div>
      );
    }

    if (field === 'dob') {
      return (
        <input
          type="date"
          value={value}
          max={todayDateString()}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          className="w-full min-h-[52px] rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none ring-orange-200 focus:border-orange-300 focus:ring-2"
          style={{ colorScheme: 'light' }}
        />
      );
    }

    if (field === 'district') {
      return (
        <SearchableChipList
          options={districts}
          value={value}
          onChange={(opt) => {
            setValue(opt);
            setError('');
            void hapticImpact('Light');
          }}
          placeholder={t.searchDistrict}
          bn={bn}
        />
      );
    }

    if (field === 'block') {
      return (
        <SearchableChipList
          options={blocks}
          value={value}
          onChange={(opt) => {
            setValue(opt);
            setError('');
            void hapticImpact('Light');
          }}
          placeholder={t.searchBlock}
          bn={bn}
        />
      );
    }

    let options = [];
    if (field === 'job') options = JOB_TYPES;
    else if (field === 'education') options = EDUCATION_LEVELS;
    else if (field === 'blood_group') options = BLOOD_GROUPS;

    return (
      <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto overscroll-contain">
        {options.map((opt) => (
          <OptionChip
            key={opt}
            label={opt}
            selected={value === opt}
            onClick={() => {
              setValue(opt);
              setError('');
              void hapticImpact('Light');
            }}
            bn={bn}
            compact={field === 'blood_group'}
          />
        ))}
      </div>
    );
  };

  if (!open || !field || !fieldCopy) return null;

  const pct = progress.total ? Math.round((progress.filled / progress.total) * 100) : 0;

  return createPortal(
    <div
      className={`native-sheet-scrim fixed inset-0 z-[135] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4 transition-opacity duration-200 ${
        visible ? 'opacity-100 animate-fade-in' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-field-nudge-title"
    >
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={allowSkip && !busy ? handleSkip : undefined}
      />
      <div
        className={`native-sheet-panel relative z-[1] w-full sm:max-w-sm ${
          visible ? 'animate-slide-up-sheet sm:animate-scale-in' : ''
        }`}
        style={{ colorScheme: 'light' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="native-sheet-card relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
          <NativeSheetHandle />

          {savedFlash ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl" aria-hidden>
                ✓
              </span>
              <p className={`text-lg font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                {bn ? 'সেভ হয়েছে!' : 'Saved!'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 px-5 pb-4 pt-1 sm:px-6">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-2xl shadow-sm"
                    aria-hidden
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider text-orange-600 ${bn ? 'font-bengali normal-case tracking-normal' : ''}`}>
                      {t.badge}
                      {isPreview ? ` · ${t.preview}` : ''}
                      {!allowSkip ? ` · ${t.required}` : ''}
                    </p>
                    <h2
                      id="profile-field-nudge-title"
                      className={`mt-0.5 text-lg font-black leading-snug text-slate-900 sm:text-xl ${bn ? 'font-bengali' : ''}`}
                    >
                      {fieldCopy.title}
                    </h2>
                    <p className={`mt-1 text-sm font-semibold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                      {fieldCopy.why}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
                    <span className={bn ? 'font-bengali' : ''}>{t.progress(progress.filled, progress.total)}</span>
                    <span className="tabular-nums text-orange-600">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-[width] duration-500"
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>

                {renderControl()}
                {error ? (
                  <p className={`text-sm font-bold text-rose-600 ${bn ? 'font-bengali' : ''}`}>{error}</p>
                ) : null}
              </div>

              <div className="flex gap-2.5 border-t border-slate-200/80 bg-white/70 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-5">
                {allowSkip ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSkip}
                    className={`min-h-[48px] flex-1 rounded-full border border-slate-200/80 bg-white text-sm font-bold text-slate-600 shadow-sm transition active:scale-[0.98] disabled:opacity-60 ${bn ? 'font-bengali' : ''}`}
                  >
                    {t.skip}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSave}
                  className={`min-h-[48px] ${allowSkip ? 'flex-[1.4]' : 'w-full'} rounded-full bg-orange-500 text-sm font-black text-white shadow-md shadow-orange-500/30 transition active:scale-[0.98] disabled:opacity-60 ${bn ? 'font-bengali' : ''}`}
                >
                  {busy ? t.saving : t.save}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
