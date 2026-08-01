// Matches the trailing file extension (e.g. ".mp3") at the end of a filename.
export const EXTENSION_REGEX = /\.\w+$/;
// True when a string consists only of digits, used to detect numbered chapter prefixes.
export const DIGITS_ONLY_REGEX = /^\d+$/;
// Splits a string into alternating runs of digits and non-digits, for natural-number-aware sorting.
export const NATURAL_SPLIT_REGEX = /\d+|[^\d]+/g;
// Parses "Title [Author]" folder names into title and author groups.
export const TITLE_AUTHOR_REGEX = /(.+)\s*\[(.+)\]$/;
