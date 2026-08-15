/** Shared select options for profile demographic fields. */

export const JOB_TYPES = [
  'HT-Mobile Van',
  'LT-Mobile Van',
  'HT-LT Others',
  'Substation Operation',
  'Engineer',
  'Non-Technical',
  'Others',
];

/** Job types that may track and edit personal PPE. */
export const FIELD_PPE_JOBS = new Set([
  'HT-Mobile Van',
  'LT-Mobile Van',
  'HT-LT Others',
  'Substation Operation',
]);

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const ACCIDENT_VOLTAGES = ['LT', '11kV', '33kV', 'Other'];

export const EDUCATION_LEVELS = [
  'Below 10th',
  '10th',
  '12th',
  'ITI',
  'Diploma',
  'BA',
  'B.Sc',
  'B.Tech / BE',
  'MA / M.Sc',
  'Other',
];

/** Progressive nudge order: one field at a time. */
export const PROFILE_NUDGE_FIELD_ORDER = [
  'avatar_url',
  'district',
  'block',
  'job',
  'dob',
  'education',
  'blood_group',
  'is_donor',
];
