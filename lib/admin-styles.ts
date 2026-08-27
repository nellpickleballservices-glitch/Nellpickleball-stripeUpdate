/**
 * Shared Tailwind class strings for the admin (light) theme.
 * Centralizing these means a single edit updates every form input + label
 * sitewide, instead of hunting through every admin form.
 */

// Field shell — same look on text inputs, selects, date pickers, textareas.
// Compose with width or flex utilities at the call site.
export const FIELD_BASE =
  'bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'

// Width: full container width. Use this on standalone inputs/textareas.
export const FIELD_FULL = `w-full ${FIELD_BASE}`

// Compact label that sits above a field in a stacked form row.
export const FIELD_LABEL = 'block text-sm text-gray-700 mb-1'

// Same label, slightly smaller — useful inside the page-builder's per-block editor.
export const FIELD_LABEL_SM = 'block text-xs text-gray-600 mb-1'

// Primary blue submit/CTA button used across admin forms.
export const BUTTON_PRIMARY =
  'px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50'

// Secondary upload / "do something" pill — softer, sits next to the primary CTA.
export const BUTTON_SOFT =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50'
