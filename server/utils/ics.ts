/**
 * Fichier calendrier (.ics) joint à l'email de confirmation : Apple Calendar,
 * Outlook, Gmail (bouton « Ajouter au calendrier ») et agendas Android l'ouvrent directement.
 * Même logique que components/AddToCalendar.vue (durée par défaut 3 h, rappels), côté serveur.
 */
export interface IcsEventInput {
  /** Identifiant stable : renvoyer le même fichier ne crée pas de doublon dans l'agenda. */
  uid: string
  title: string
  start: string | Date
  end?: string | Date | null
  location?: string
  description?: string
  url?: string
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Les lignes ICS ne dépassent pas 75 octets : on les plie (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--
    out.push(rest.slice(0, cut))
    rest = ' ' + rest.slice(cut)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function buildIcs(input: IcsEventInput): string {
  const start = new Date(input.start)
  const endRaw = input.end ? new Date(input.end) : null
  const end = endRaw && endRaw > start ? endRaw : new Date(start.getTime() + 3 * 3600 * 1000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Babicho//Billetterie//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(input.title)}`,
    input.location ? `LOCATION:${esc(input.location)}` : '',
    input.description ? `DESCRIPTION:${esc(input.description)}` : '',
    input.url ? `URL:${input.url}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(`Demain : ${input.title}`)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(`Dans 2 h : ${input.title}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.filter(Boolean).map(fold).join('\r\n') + '\r\n'
}

/** Lien « Ajouter à Google Agenda » (utilisable tel quel dans un email). */
export function googleCalendarUrl(input: Omit<IcsEventInput, 'uid'>): string {
  const start = new Date(input.start)
  const endRaw = input.end ? new Date(input.end) : null
  const end = endRaw && endRaw > start ? endRaw : new Date(start.getTime() + 3 * 3600 * 1000)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: [input.description, input.url].filter(Boolean).join('\n\n'),
    location: input.location || '',
  })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}
