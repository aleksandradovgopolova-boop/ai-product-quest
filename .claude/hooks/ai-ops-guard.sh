#!/usr/bin/env bash
# AI Ops — МЯГКОЕ напоминание (НЕ блокирует, exit 0): прямая правка исходника идёт мимо гейтов кита.
# PreToolUse-hook на Edit/Write. Получает tool-input JSON на stdin. Молчит на правках кита/зависимостей.
input=$(cat)
path=$(printf '%s' "$input" | python3 -c "import sys, json
try:
    d = json.load(sys.stdin)
    print((d.get('tool_input') or {}).get('file_path', ''))
except Exception:
    print('')" 2>/dev/null)
case "$path" in
  ""|*/.ai/*|*/node_modules/*|*/.git/*) exit 0 ;;   # правки кита/зависимостей/служебные — молча
esac
echo "ℹ AI Ops: прямая правка '$path' идёт МИМО гейтов кита (нет evidence на SHA / независимого ревью / #5)." >&2
echo "  Для гейтованного изменения С ГАРАНТИЯМИ: ./ai-run \"<задача словами>\"   (напоминание, не блок)" >&2
exit 0
