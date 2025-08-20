import { format, parseISO } from 'date-fns'
export const fmtHM = (iso: string) => format(parseISO(iso), 'HH:mm')
