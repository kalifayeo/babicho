/**
 * Causes solidaires (dons, cotisations) : les contributions ne sont jamais limitées.
 * `ticket_types.quantity` est un entier obligatoire en base ; on y met donc cette
 * valeur très élevée pour dire « illimité ». L'interface la traite comme « pas de limite »
 * (voir composables/useEventDetail.ts) et ne l'affiche jamais.
 */
export const UNLIMITED_CONTRIBUTIONS = 1_000_000
