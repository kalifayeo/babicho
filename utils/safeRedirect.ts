/**
 * Redirection post-connexion : n'accepte qu'un chemin INTERNE du site.
 * Refuse « //hote », « /\hote », les URLs absolues, les caractères de contrôle,
 * et tout ce qui n'est pas un chemin commençant par un seul « / ».
 * Un préfixe imposé (ex. « /organisateur ») peut être exigé via `mustStartWith`.
 */
export function safeRedirectPath(raw: unknown, fallback: string, mustStartWith = '/'): string {
  if (typeof raw !== 'string') return fallback
  const target = raw.trim()
  if (!target.startsWith('/') || target.startsWith('//')) return fallback
  if (target.includes('\\') || /[\u0000-\u001f\u007f]/.test(target)) return fallback
  if (target.length > 500) return fallback
  if (!target.startsWith(mustStartWith)) return fallback
  return target
}
