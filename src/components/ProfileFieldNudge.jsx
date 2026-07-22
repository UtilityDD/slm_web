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
  getNextNudgeField,
  isNudgeDue,
  setLocalLastPromptDate,
  todayDateString,
} from '../utils/profileNudge';
import { isGuestUser } from '../utils/guestPreview';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const FIELD_NOUN = {
  en: {
    avatar_url: 'profile photo',
    district: 'district',
    block: 'block',
    job: 'job type',
    dob: 'date of birth',
    education: 'education',
    blood_group: 'blood group',
    is_donor: 'blood donor status',
  },
  bn: {
    avatar_url: 'প্রোফাইল ছবি',
    district: 'জেলা',
    block: 'ব্লক',
    job: 'কাজের ধরন',
    dob: 'জন্ম তারিখ',
    education: 'শিক্ষা',
    blood_group: 'রক্তের গ্রুপ',
    is_donor: 'রক্তদাতা তথ্য',
  },
};

const FIELD_COPY = {
  en: {
    askSelect: (noun) => `Please select your ${noun}`,
    askUpdate: (noun) => `Please update your ${noun}`,
    save: 'Save',
    skip: 'Not now',
    mustFill: 'Please select to continue.',
    mustPhoto: 'Please choose a photo to continue.',
    saving: 'Saving…',
    yes: 'Yes',
    no: 'No',
    select: 'Select…',
    choosePhoto: 'Choose photo',
    photoHint: 'Under 2MB',
    photoTooBig: 'Photo must be under 2MB.',
  },
  bn: {
    askSelect: (noun) => `অনুগ্রহ করে আপনার ${noun} বেছে নিন`,
    askUpdate: (noun) => `অনুগ্রহ করে আপনার ${noun} আপডেট করুন`,
    save: 'সংরক্ষণ',
    skip: 'এখন নয়',
    mustFill: 'এগিয়ে যেতে বেছে নিন।',
    mustPhoto: 'এগিয়ে যেতে একটি ছবি বেছে নিন।',
    saving: 'সংরক্ষণ হচ্ছে…',
    yes: 'হ্যাঁ',
    no: 'না',
    select: 'বেছে নিন…',
    choosePhoto: 'ছবি বেছে নিন',
    photoHint: '২MB-এর নিচে',
    photoTooBig: 'ছবি ২MB-এর নিচে হতে হবে।',
  },
};

function promptForField(lang, field) {
  const nouns = FIELD_NOUN[lang] || FIELD_NOUN.en;
  const copy = FIELD_COPY[lang] || FIELD_COPY.en;
  const noun = nouns[field] || field;
  if (field === 'dob' || field === 'is_donor' || field === 'avatar_url') {
    return copy.askUpdate(noun);
  }
  return copy.askSelect(noun);
}

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

/**
 * Soft progressive prompt: one missing profile field every few days.
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
  const t = FIELD_COPY[language === 'bn' ? 'bn' : 'en'];
  const bn = language === 'bn';
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

  const districts = useMemo(() => Object.keys(wbLocations || {}).sort(), []);
  const blocks = useMemo(() => {
    const d = profileRef.current?.district || userProfile?.district || districts[0];
    if (!d || !wbLocations?.[d]) return [];
    return [...wbLocations[d]].sort();
  }, [userProfile?.district, districts]);

  const resetDraft = useCallback(() => {
    setField(null);
    setValue('');
    setDonorChoice(null);
    setPhotoFile(null);
    setPhotoPreview('');
    setError('');
  }, []);

  const closeUi = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      resetDraft();
      onOpenChange?.(false);
      if (isPreview) onPreviewClose?.();
    }, 200);
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
      setOpen(true);
      onOpenChange?.(true);
      requestAnimationFrame(() => setVisible(true));
    },
    [onOpenChange]
  );

  // Admin preview: open immediately for the requested field
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

      // Re-check against a fresh DB profile so stale cache cannot ask for filled fields.
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
  }, [user?.id, userProfile, nudgeState, blocked, open, onOpenChange, isPreview, openForField]);

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
  };

  const uploadAvatar = async (file) => {
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const url = publicUrlData?.publicUrl;
    if (!url) throw new Error('No photo URL');
    return url;
  };

  const handleSkip = async () => {
    if (!field || !allowSkip || busy) return;
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
      closeUi();
    } catch (err) {
      console.error('Profile nudge skip failed:', err);
      setError(err.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!field || busy) return;

    if (field === 'avatar_url') {
      if (!photoFile) {
        setError(t.mustPhoto);
        return;
      }
      if (isPreview) {
        closeUi();
        return;
      }
      setBusy(true);
      setError('');
      try {
        const url = await uploadAvatar(photoFile);
        const patch = buildSaveNudgePatch(
          profileRef.current?.profile_nudge_state || nudgeState,
          field
        );
        await applyRpc({ avatar_url: url }, patch);
        await onSaved?.();
        closeUi();
      } catch (err) {
        console.error('Profile nudge photo save failed:', err);
        setError(err.message || 'Failed');
      } finally {
        setBusy(false);
      }
      return;
    }

    const resolved =
      field === 'is_donor' ? donorChoice : typeof value === 'string' ? value.trim() : value;

    if (field === 'is_donor' && resolved !== true && resolved !== false) {
      setError(t.mustFill);
      return;
    }
    if (field !== 'is_donor' && (resolved === '' || resolved == null)) {
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
      const updates = buildValuePayload(field, resolved, profileRef.current || userProfile);
      const patch = buildSaveNudgePatch(
        profileRef.current?.profile_nudge_state || nudgeState,
        field
      );
      await applyRpc(updates, patch);
      await onSaved?.();
      closeUi();
    } catch (err) {
      console.error('Profile nudge save failed:', err);
      setError(err.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const renderControl = () => {
    if (field === 'avatar_url') {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-slate-400" aria-hidden>
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
            className={`min-h-[44px] px-4 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50 ${bn ? 'font-bengali' : ''}`}
          >
            {t.choosePhoto}
          </button>
          <p className={`text-xs text-slate-400 ${bn ? 'font-bengali' : ''}`}>{t.photoHint}</p>
        </div>
      );
    }

    if (field === 'is_donor') {
      return (
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((choice) => {
            const selected = donorChoice === choice;
            return (
              <button
                key={String(choice)}
                type="button"
                onClick={() => {
                  setDonorChoice(choice);
                  setError('');
                }}
                className={`min-h-[48px] rounded-xl border-2 px-3 py-3 text-sm font-bold transition ${
                  selected
                    ? 'border-orange-500 bg-orange-50 text-orange-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200'
                } ${bn ? 'font-bengali' : ''}`}
              >
                {choice ? t.yes : t.no}
              </button>
            );
          })}
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
          className="w-full min-h-[48px] rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-orange-500 focus:outline-none"
          style={{ colorScheme: 'light' }}
        />
      );
    }

    let options = [];
    if (field === 'district') options = districts;
    else if (field === 'block') options = blocks;
    else if (field === 'job') options = JOB_TYPES;
    else if (field === 'education') options = EDUCATION_LEVELS;
    else if (field === 'blood_group') options = BLOOD_GROUPS;

    return (
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
        }}
        className={`w-full min-h-[48px] rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-orange-500 focus:outline-none ${bn ? 'font-bengali' : ''}`}
        style={{ colorScheme: 'light' }}
      >
        <option value="">{t.select}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  };

  if (!open || !field) return null;

  const langKey = bn ? 'bn' : 'en';
  const prompt = promptForField(langKey, field);

  return createPortal(
    <div
      className={`fixed inset-0 z-[135] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-field-nudge-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/45"
        aria-hidden
        onClick={allowSkip && !busy ? handleSkip : undefined}
      />
      <div
        className={`relative z-[1] w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-transform duration-200 ${
          visible ? 'translate-y-0' : 'translate-y-4 sm:translate-y-2'
        }`}
        style={{ colorScheme: 'light' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 space-y-4 bg-white">
          {isPreview ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
              {bn ? 'প্রিভিউ' : 'Preview'}
              {!allowSkip ? (bn ? ' · আবশ্যক' : ' · required') : ''}
            </p>
          ) : null}
          <p
            id="profile-field-nudge-title"
            className={`text-base font-semibold text-slate-900 ${bn ? 'font-bengali' : ''}`}
          >
            {prompt}
          </p>
          {renderControl()}
          {error ? (
            <p className={`text-sm text-rose-600 ${bn ? 'font-bengali' : ''}`}>{error}</p>
          ) : null}
        </div>

        <div className="flex gap-2 px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5 bg-white">
          {allowSkip ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleSkip}
              className={`min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm hover:bg-slate-50 disabled:opacity-60 ${bn ? 'font-bengali' : ''}`}
            >
              {t.skip}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className={`min-h-[48px] ${allowSkip ? 'flex-1' : 'w-full'} rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold text-sm ${bn ? 'font-bengali' : ''}`}
          >
            {busy ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
