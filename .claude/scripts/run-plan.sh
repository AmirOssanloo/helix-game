#!/usr/bin/env bash
# Run the implementation plan through one phase or a range of phases, one fresh Claude Code
# session per ticket.
#
#   .claude/scripts/run-plan.sh <phase-dir>                    until that phase closes
#   .claude/scripts/run-plan.sh <first-phase-dir> <last-phase-dir>   from the first through the last
#
#   e.g. .claude/scripts/run-plan.sh .claude/plan/implementation/phase-6-the-long-road
#
# A phase is named by its folder under .claude/plan/implementation/, as a path or a bare name.
#
# Each ticket runs as `/pick-up-a-ticket <id>` in its own tmux window, on Opus 5.5 in auto mode,
# with Remote Control on so the session shows in the Claude mobile app. The ticket is the one
# STATUS.md names under In progress, else Next ticket. The session commits the ticket (no push),
# then writes a sentinel file. The runner checks the commit, closes the session, pushes the branch
# to origin, and starts the next ticket. The push is the runner's, not the session's, so it never
# waits on a permission prompt. Rerunning resumes from wherever STATUS.md points; the runner refuses to start if
# that ticket lies outside the phases asked for, and stops once the last of them is closed.
#
# Validation by a person waits until the last phase of the run is done; the sessions record it
# and move on.
# Anything else that needs you (a question, a blocker, a check that will not go green) is pushed
# to your phone by the session. If a session dies without finishing, the runner stops and alerts.
set -euo pipefail

usage() {
  echo "usage: $0 <phase-dir> [<last-phase-dir>]" >&2
  echo "  e.g. $0 .claude/plan/implementation/phase-6-the-long-road" >&2
  exit 2
}
[[ $# -eq 1 || $# -eq 2 ]] || usage

SCRIPT="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
REPO_ROOT="$(git -C "$(dirname "$SCRIPT")" rev-parse --show-toplevel)"
PLAN_DIR="$REPO_ROOT/.claude/plan/implementation"
STATUS_FILE="$PLAN_DIR/STATUS.md"
STATE_DIR="$PLAN_DIR/.runner"
TMUX_SESSION="helix-plan"
MODEL="claude-opus-5-5"
POLL_SECONDS=30

# Accepts a phase folder as a path from anywhere or a bare name; prints the folder's name.
phase_dir() {
  local name
  name="$(basename "${1%/}")"
  if [[ ! "$name" =~ ^phase-[0-9]+- || ! -d "$PLAN_DIR/$name" ]]; then
    echo "not a phase folder under $PLAN_DIR: $1" >&2
    exit 2
  fi
  echo "$name"
}
phase_of_dir() { sed -E 's/^phase-([0-9]+)-.*/\1/' <<<"$1"; }

FIRST_DIR="$(phase_dir "$1")"
LAST_DIR="$(phase_dir "${2:-$1}")"
FIRST="$(phase_of_dir "$FIRST_DIR")"
LAST="$(phase_of_dir "$LAST_DIR")"
(( FIRST <= LAST )) || { echo "$FIRST_DIR comes after $LAST_DIR" >&2; usage; }
if (( FIRST == LAST )); then SCOPE="phase $LAST"; else SCOPE="phases $FIRST to $LAST"; fi

status_row() { grep -E "^\| \*\*$1\*\* \|" "$STATUS_FILE" | head -n1 || true; }
ticket_in() { grep -oE 'P[0-9]+-S[0-9]{2}-T[0-9]{2}' <<<"$1" | head -n1 || true; }
phase_of_ticket() { sed -E 's/^P([0-9]+)-.*/\1/' <<<"$1"; }
last_closed_phase() { status_row "Last closed phase" | sed -nE 's/^[^[]*\[([0-9]+) .*/\1/p'; }
last_phase_closed() { local n; n="$(last_closed_phase)"; [[ -n "$n" ]] && (( n >= LAST )); }
open_person_rows() { grep -cE '^- \[ \]' "$STATUS_FILE" || true; }

pick_ticket() {
  local id
  id="$(ticket_in "$(status_row 'In progress')")"
  [[ -n "$id" ]] || id="$(ticket_in "$(status_row 'Next ticket')")"
  echo "$id"
}

# Checked before the tmux hand-off, so a wrong argument fails in the terminal that ran it.
if last_phase_closed; then
  echo "Phase $LAST is already closed (STATUS.md: last closed phase $(last_closed_phase)). Nothing to run."
  exit 0
fi
START_TICKET="$(pick_ticket)"
[[ -n "$START_TICKET" ]] || { echo "STATUS.md names no ticket in progress or next." >&2; exit 1; }
START_PHASE="$(phase_of_ticket "$START_TICKET")"
if (( START_PHASE < FIRST || START_PHASE > LAST )); then
  echo "STATUS.md points at $START_TICKET, in phase $START_PHASE, outside $SCOPE." >&2
  exit 1
fi

# Re-launch inside a detached tmux session so the run survives closing the terminal.
if [[ -z "${TMUX:-}" ]]; then
  if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    echo "tmux session '$TMUX_SESSION' already exists. Attach with: tmux attach -t $TMUX_SESSION" >&2
    exit 1
  fi
  tmux new-session -d -s "$TMUX_SESSION" -n runner -c "$REPO_ROOT" \
    "bash $(printf '%q ' "$SCRIPT" "$FIRST_DIR" "$LAST_DIR"); echo; echo 'Runner exited. Press enter to close.'; read"
  echo "Plan runner for $SCOPE started in tmux session '$TMUX_SESSION', from $START_TICKET."
  echo "Watch it:  tmux attach -t $TMUX_SESSION   (detach with Ctrl-b d)"
  exit 0
fi

cd "$REPO_ROOT"
mkdir -p "$STATE_DIR"
# Keep runner state out of `git status` without touching the committed .gitignore.
EXCLUDE="$(git rev-parse --git-path info/exclude)"
grep -qxF '.claude/plan/implementation/.runner/' "$EXCLUDE" 2>/dev/null \
  || echo '.claude/plan/implementation/.runner/' >>"$EXCLUDE"

BRANCH="$(git branch --show-current)"
LOG="$STATE_DIR/runner.log"
log() { echo "[$(date '+%F %H:%M:%S')] $*" | tee -a "$LOG"; }

# Push an alert to the phone when no ticket session is alive to do it: a short-lived
# Remote Control session whose only job is to call PushNotification. The push is skipped as
# redundant while the session still counts as freshly prompted, so it waits before sending.
alert() {
  log "ALERT: $*"
  osascript -e "display notification \"${1//\"/}\" with title \"Helix runner\"" 2>/dev/null || true
  local f="$STATE_DIR/alert.sh"
  printf '%s\n' "#!/usr/bin/env bash" \
    "exec claude --remote-control 'Helix runner alert' --model $MODEL --permission-mode auto $(printf '%q' "Run the shell command \`sleep 90\` in the foreground and wait for it to finish. Then use the PushNotification tool to send me exactly this message, and do nothing else: Helix runner: $1")" >"$f"
  chmod +x "$f"
  tmux new-window -d -t "$TMUX_SESSION" -n alert -c "$REPO_ROOT" "$f"
}

# Untracked paths that were there before the runner started are the maintainer's, not a ticket's.
git status --porcelain | grep '^?? ' >"$STATE_DIR/untracked-at-start" || true
dirty_paths() { git status --porcelain | grep -vxFf "$STATE_DIR/untracked-at-start" || true; }
tree_is_clean() { [[ -z "$(dirty_paths)" ]]; }

# Prints the Status row of a ticket, from the sprint file that holds it.
ticket_status() {
  awk -v id="$1" '
    $0 ~ "^### " id " " { found = 1; next }
    found && /^### / { exit }
    found && /^\| Status \|/ { print; exit }
  ' "$PLAN_DIR"/phase-*/sprint-*.md
}

build_prompt() {
  local ticket="$1" sentinel="$2" keep_out
  keep_out="$(sed 's/^?? /- /' "$STATE_DIR/untracked-at-start")"
  cat <<EOF
/pick-up-a-ticket $ticket

You are running unattended as one ticket of an automated plan runner. These instructions override the skill where they conflict:

- Stay on the current branch, $BRANCH. Do not create, switch or pull branches.
- This run covers $SCOPE. Validation by a person waits until phase $LAST is done. That is the maintainer's standing instruction for unattended runs, first given on 2026-09-24. It covers walks by hand, approvals by the product owner or maintainer, looks by eye, benchmarks or browser checks only a person can run, and the reference-laptop numbers. None of them blocks a ticket, a sprint or a phase gate before then, and none of them is a reason to notify me. For each one, write an open checkbox under "Waiting on a person" in STATUS.md with the steps, where the result goes and what it confirms, and say it is deferred until phase $LAST is done by that instruction. A phase gate row that needs a person also goes to backlog/deferred.md. Then close the ticket, sprint or phase on the rows an agent can verify, with a note that the person rows are deferred.
- Every validation an agent can do is done now and not deferred: \`pnpm check\`, every test tier, specs, replays, headless benchmarks, and anything the definition of done lets an agent run.
- A product or design decision the docs do not settle: take the most conservative reading of the docs, record it in backlog/open-questions.md as decided provisionally and awaiting the maintainer, and carry on without asking.
- Whenever you need me for anything else (a Depends on ticket that is not done, \`pnpm check\` you cannot get green, a structural decision that would be unsafe to guess, a permission you do not have), first send a PushNotification of one line saying what I need to act on, then ask here and wait for my answer. I may answer from the Claude mobile app.
- Do not send notifications for routine progress. If this ticket closes phase $LAST, send a PushNotification saying the plan is finished and how many rows wait on me under "Waiting on a person".
- Commit is authorised. When the ticket is done, \`pnpm check\` has passed, its Status row is \`done\` and STATUS.md is updated, stage everything this ticket changed and make exactly one commit in the style of this repository's git log: a "Close $ticket: <what changed>" subject, a blank line, prose paragraphs, and the Co-Authored-By line. Do not push; the runner pushes once it has checked your commit.$( [[ -n "$keep_out" ]] && printf '\n- Never stage these paths; they are the maintainer'"'"'s:\n%s' "$keep_out" )
- Last step, after the commit succeeds: write one line to $sentinel containing \`DONE <full commit sha>\`. Nothing comes after writing that file. The runner closes this session once it sees it.
EOF
}

# Wait for the ticket session to report DONE, checking its commit. Returns non-zero if the
# session went away without finishing.
await_ticket() {
  local ticket="$1" window="$2" sentinel="$3" start_sha="$4"
  while true; do
    if [[ -f "$sentinel" ]]; then
      local line sha problems=""
      line="$(head -n1 "$sentinel")"
      sha="$(awk '{print $2}' <<<"$line")"
      [[ "$line" == DONE* ]] || problems+="sentinel does not start with DONE; "
      [[ "$(git rev-parse HEAD)" != "$start_sha" ]] || problems+="no new commit on $BRANCH; "
      [[ -n "$sha" && "$(git rev-parse HEAD)" == "$(git rev-parse "$sha" 2>/dev/null)" ]] || problems+="HEAD is not $sha; "
      tree_is_clean || problems+="working tree is not clean: $(dirty_paths | tr '\n' ' '); "
      ticket_status "$ticket" | grep -qE '\|[[:space:]]*(done|cut)[[:space:]]*\|' || problems+="$ticket's Status row is not done; "
      [[ "$(pick_ticket)" != "$ticket" ]] || problems+="STATUS.md still names $ticket as in progress or next; "

      if [[ -z "$problems" ]]; then
        log "$ticket verified at $(git rev-parse --short HEAD)"
        return 0
      fi
      # Hand the failure back to the still-open session and keep waiting.
      log "$ticket check failed: $problems"
      rm -f "$sentinel"
      tmux send-keys -t "$window" -l "Plan runner check failed: ${problems}Fix this, notify me if you need me, then write the sentinel again."
      sleep 1
      tmux send-keys -t "$window" Enter
    fi
    if ! tmux list-windows -t "$TMUX_SESSION" -F '#{window_id}' | grep -qxF "$window"; then
      return 1
    fi
    sleep "$POLL_SECONDS"
  done
}

close_session() {
  local window="$1"
  sleep 20 # let the session finish its closing message
  tmux send-keys -t "$window" Escape
  tmux send-keys -t "$window" -l "/exit"
  sleep 1
  tmux send-keys -t "$window" Enter
  for _ in $(seq 1 30); do
    tmux list-windows -t "$TMUX_SESSION" -F '#{window_id}' | grep -qx "$window" || return 0
    sleep 1
  done
  tmux kill-window -t "$window" 2>/dev/null || true
}

# Push the verified commit, retrying a few times so a passing network blip does not end the run.
push_branch() {
  local attempt
  for attempt in 1 2 3; do
    if git push origin "$BRANCH" >>"$LOG" 2>&1; then
      log "pushed $(git rev-parse --short HEAD) to origin/$BRANCH"
      return 0
    fi
    log "push attempt $attempt failed"
    sleep 60
  done
  return 1
}

log "plan runner for $SCOPE on $BRANCH, next: $(pick_ticket)"

n=0
until last_phase_closed; do
  ticket="$(pick_ticket)"
  if [[ -z "$ticket" ]]; then
    alert "stopped: STATUS.md names no ticket in progress or next, and phase $LAST is not closed"
    exit 1
  fi
  if (( $(phase_of_ticket "$ticket") > LAST )); then
    alert "stopped before $ticket: it is past phase $LAST, which STATUS.md does not show closed"
    exit 1
  fi
  if ! tree_is_clean; then
    alert "stopped before $ticket: working tree is not clean"
    exit 1
  fi

  n=$((n + 1))
  sentinel="$STATE_DIR/$ticket.done"
  rm -f "$sentinel"
  start_sha="$(git rev-parse HEAD)"
  session_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"

  build_prompt "$ticket" "$sentinel" >"$STATE_DIR/$ticket.prompt.md"
  launcher="$STATE_DIR/$ticket.sh"
  cat >"$launcher" <<EOF
#!/usr/bin/env bash
cd '$REPO_ROOT'
exec claude --remote-control 'Helix $ticket' --model $MODEL --permission-mode auto --session-id $session_id "\$(cat '$STATE_DIR/$ticket.prompt.md')"
EOF
  chmod +x "$launcher"

  window="$(tmux new-window -P -F '#{window_id}' -t "$TMUX_SESSION" -n "$ticket" -c "$REPO_ROOT" "$launcher")"
  log "$ticket started (session $session_id, window $window)"

  if ! await_ticket "$ticket" "$window" "$sentinel" "$start_sha"; then
    alert "$ticket session ended without finishing. Resume: claude --resume $session_id"
    exit 1
  fi
  close_session "$window"
  if ! push_branch; then
    alert "$ticket is committed but the push to origin/$BRANCH failed; see runner.log"
    exit 1
  fi
done

log "phase $LAST is closed after $n tickets this run; $(open_person_rows) rows wait on a person in STATUS.md"
