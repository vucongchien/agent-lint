import pc from 'picocolors';
import { HistoryManager, formatComparisonTerminal } from '@chien_swe/observatory';

export interface CompareCommandOptions {
  base?: string;
  head?: string;
  maxRegression?: string;
}

export function compareCommand(options: CompareCommandOptions) {
  try {
    const historyManager = new HistoryManager(process.cwd());
    const history = historyManager.listHistory();

    if (history.length < 2 && !options.base && !options.head) {
      console.log(
        pc.yellow('\n⚠️ Need at least 2 historical runs to compare. Run `agent-lint gate` first to generate runs.\n')
      );
      return;
    }

    const baseId = options.base || (history[1] ? history[1].id : history[0].id);
    const headId = options.head || history[0].id;

    const baseRun = historyManager.getRun(baseId);
    const headRun = historyManager.getRun(headId);

    if (!baseRun || !headRun) {
      console.error(pc.red(`\n❌ Could not find runs to compare: base=${baseId}, head=${headId}\n`));
      process.exit(1);
    }

    const output = formatComparisonTerminal(baseRun, headRun);
    console.log(output);

    if (headRun.status === 'FAIL') {
      process.exit(1);
    }
  } catch (err: any) {
    console.error(pc.red(`Error during comparison: ${err.message}`));
    process.exit(1);
  }
}
