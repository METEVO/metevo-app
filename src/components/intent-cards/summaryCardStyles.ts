import { MetevoTheme } from '../../design/ThemeContext';
import { layout } from '../styles';

/** Shared layout of the read-only cards (History, Spending, Profile),
 * built from the same tokens as the payment cards. */
export const makeSummaryCardStyles = (theme: MetevoTheme) => ({
  panel: {
    flex: 1,
    justifyContent: 'space-between' as const,
    gap: layout.rowGap,
  },
  content: {
    gap: layout.rowGap / 2,
  },
  title: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  body: theme.typography.body,
  caption: theme.typography.caption,
  row: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: layout.rowGap,
  },
  rowLabel: {
    ...theme.typography.body,
    flexShrink: 1,
  },
  value: {
    ...theme.typography.body,
    fontWeight: '700' as const,
  },
});
