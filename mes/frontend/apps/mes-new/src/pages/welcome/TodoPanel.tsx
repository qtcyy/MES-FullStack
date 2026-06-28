import { MOCK_TODOS, type TodoItem } from './welcomeMock'
import { ACCENTS } from './accents'

const TYPE_COLOR: Record<TodoItem['type'], string> = {
  审批: ACCENTS.violet.color,
  排产: ACCENTS.blue.color,
  告警: ACCENTS.amber.color,
}

export default function TodoPanel() {
  return (
    <ul className="space-y-1">
      {MOCK_TODOS.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: TYPE_COLOR[t.type] }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{t.title}</p>
            <p className="text-xs text-muted-foreground">{t.type} · {t.time}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
