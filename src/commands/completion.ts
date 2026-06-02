/**
 * lkw completion <shell> — print a shell completion script.
 *
 * Usage:
 *   bash:  lkw completion bash >> ~/.bashrc
 *   zsh:   lkw completion zsh  >> ~/.zshrc
 *   fish:  lkw completion fish > ~/.config/fish/completions/lkw.fish
 *
 * Completes top-level subcommands + common flags. For exhaustive
 * completion of args/IDs, set LKW_DYNAMIC_COMPLETION=true and the
 * shell will call back into `lkw __complete <line>` (not implemented
 * here — would need workflow/project IDs from the API at completion time,
 * which is slow).
 */
import { Command } from 'commander';

const SUBCOMMANDS = [
  'init',
  'auth', 'whoami',
  'client',
  'project',
  'workflow',
  'template',
  'mocks',
  'completion',
  'help',
];

const BASH = `
# lkw shell completion (bash)
_lkw() {
  local cur prev words cword
  _init_completion || return
  if [ "$cword" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${SUBCOMMANDS.join(' ')}" -- "$cur") )
    return
  fi
  # delegate everything else to "<cmd> --help" hints handled by commander itself
  COMPREPLY=()
}
complete -F _lkw lkw
`.trim();

const ZSH = `
#compdef lkw

_lkw() {
  local -a subs
  subs=(${SUBCOMMANDS.map((s) => `"${s}"`).join(' ')})
  _arguments -C \\
    '1:command:->cmds' \\
    '*::arg:->args'
  case $state in
    cmds) _describe 'command' subs ;;
    args) ;;
  esac
}

compdef _lkw lkw
`.trim();

const FISH = `
# lkw shell completion (fish)
complete -c lkw -f
${SUBCOMMANDS.map((s) => `complete -c lkw -n "__fish_use_subcommand" -a ${s}`).join('\n')}
`.trim();

export function completionCommand(): Command {
  return new Command('completion')
    .description('Print shell completion script (bash | zsh | fish)')
    .argument('<shell>', 'shell name (bash, zsh, or fish)')
    .action((shell: string) => {
      const s = shell.toLowerCase();
      if (s === 'bash') console.log(BASH);
      else if (s === 'zsh') console.log(ZSH);
      else if (s === 'fish') console.log(FISH);
      else {
        console.error(`Unsupported shell: ${shell}. Use bash, zsh, or fish.`);
        process.exit(2);
      }
    });
}
