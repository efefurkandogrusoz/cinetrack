export const MODERATION_RULES_STORAGE_KEY = 'cinetrack-moderation-rules';

export const DEFAULT_MODERATION_RULES = {
  minimumCommentLength: 10,
  minimumWordCount: 3,
  uppercaseRatioLimit: 0.72,
  uppercaseRuleEnabled: true,
  bannedWordFilterEnabled: true,
  linkCommentsPending: true,
  publishNewCommentsImmediately: true,
  allowShortComments: false,
  emojiHeavyPending: true,
};

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const toBoolean = (value, fallback) => (
  typeof value === 'boolean' ? value : fallback
);

export const normalizeModerationRules = (rules = {}) => ({
  minimumCommentLength: Math.round(clampNumber(
    rules.minimumCommentLength,
    1,
    500,
    DEFAULT_MODERATION_RULES.minimumCommentLength,
  )),
  minimumWordCount: Math.round(clampNumber(
    rules.minimumWordCount,
    1,
    80,
    DEFAULT_MODERATION_RULES.minimumWordCount,
  )),
  uppercaseRatioLimit: clampNumber(
    rules.uppercaseRatioLimit,
    0.1,
    1,
    DEFAULT_MODERATION_RULES.uppercaseRatioLimit,
  ),
  uppercaseRuleEnabled: toBoolean(
    rules.uppercaseRuleEnabled,
    DEFAULT_MODERATION_RULES.uppercaseRuleEnabled,
  ),
  bannedWordFilterEnabled: toBoolean(
    rules.bannedWordFilterEnabled,
    DEFAULT_MODERATION_RULES.bannedWordFilterEnabled,
  ),
  linkCommentsPending: toBoolean(
    rules.linkCommentsPending,
    DEFAULT_MODERATION_RULES.linkCommentsPending,
  ),
  publishNewCommentsImmediately: toBoolean(
    rules.publishNewCommentsImmediately,
    DEFAULT_MODERATION_RULES.publishNewCommentsImmediately,
  ),
  allowShortComments: toBoolean(
    rules.allowShortComments,
    DEFAULT_MODERATION_RULES.allowShortComments,
  ),
  emojiHeavyPending: toBoolean(
    rules.emojiHeavyPending,
    DEFAULT_MODERATION_RULES.emojiHeavyPending,
  ),
});

export const getLocalModerationRules = () => {
  if (typeof window === 'undefined') return DEFAULT_MODERATION_RULES;

  try {
    return normalizeModerationRules(JSON.parse(window.localStorage.getItem(MODERATION_RULES_STORAGE_KEY) || '{}'));
  } catch {
    return DEFAULT_MODERATION_RULES;
  }
};

export const saveLocalModerationRules = (rules) => {
  const normalized = normalizeModerationRules(rules);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MODERATION_RULES_STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
};
