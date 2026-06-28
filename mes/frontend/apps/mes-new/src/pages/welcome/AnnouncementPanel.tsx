import { MOCK_ANNOUNCEMENTS } from './welcomeMock'
import { ACCENTS } from './accents'

export default function AnnouncementPanel() {
  return (
    <ol className="space-y-3">
      {MOCK_ANNOUNCEMENTS.map((a) => (
        <li key={a.id} className="flex gap-3">
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full"
            style={{ background: ACCENTS.amber.color }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{a.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{a.tag} · {a.time}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
