import { Landmark, CreditCard, HandCoins, Repeat, Plus } from 'lucide-react';
import { useStore } from '../engine/store';
import { inr } from '../engine/format';
import { accountBalance, cardStats, loanStats, inWorld } from '../engine/finance';
import { Card, EmptyState, Row, RowMeta, Icon, Money, ACC_ICON, Button } from '../components/ui';

export default function ManagePage({ tab, openAdd, openItem }: { tab: string; openAdd: (t: string) => void; openItem: (t: string, id: string) => void }) {
  const { state } = useStore();
  const world = state.world;

  const accs = state.accounts.filter(inWorld(world));
  const cards = world === 'personal' ? state.cards : [];
  const loans = state.loans.filter(inWorld(world));
  const subs = state.recurring.filter(inWorld(world)).filter(r => r.type === 'expense');

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 pb-24 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mb-8 flex items-end justify-between max-md:mb-6">
        <div>
          <div className="mb-1.5 text-meta text-foreground-subtle capitalize">Manage</div>
          <h1 className="font-display text-page font-semibold text-foreground max-md:text-[26px] max-md:leading-8 capitalize">{tab}</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => openAdd(tab === 'subscriptions' ? 'recurring' : tab.slice(0, -1))}><Plus /> Add {tab.slice(0, -1)}</Button>
      </div>

      <div className="flex flex-col gap-4">
        {tab === 'accounts' && (
          <Card className="p-2 sm:p-4">
            {accs.length === 0 ? (
              <EmptyState size="md" icon={Landmark} title="No accounts" description="Add cash, bank, or wallets." primaryAction={{ label: 'Add account', onClick: () => openAdd('account') }} />
            ) : accs.map((a) => (
              <Row key={a.id} onClick={() => openItem('account', a.id)} className="cursor-pointer hover:bg-surface-muted/50 rounded-lg">
                <Icon as={ACC_ICON[a.type] || ACC_ICON.other} />
                <RowMeta title={a.name} sub={<span className="capitalize">{a.institution || a.type}</span>} />
                <Money v={accountBalance(state, a)} className="text-[15px] font-medium" />
              </Row>
            ))}
          </Card>
        )}

        {tab === 'cards' && (
          <Card className="p-2 sm:p-4">
            {cards.length === 0 ? (
              <EmptyState size="md" icon={CreditCard} title="No cards" description="Add a credit or debit card." primaryAction={{ label: 'Add card', onClick: () => openAdd('card') }} />
            ) : cards.map((c) => {
              const s = cardStats(state, c);
              return (
                <Row key={c.id} onClick={() => openItem('card', c.id)} className="cursor-pointer hover:bg-surface-muted/50 rounded-lg">
                  <Icon as={CreditCard} />
                  <RowMeta title={<>{c.name} {c.last4 && <span className="text-foreground-subtle">•• {c.last4}</span>}</>} sub={c.kind === 'credit' ? `${Math.round(s.utilization * 100)}% used` : 'Debit'} />
                  <Money v={s.spent} className="text-[15px] font-medium" />
                </Row>
              );
            })}
          </Card>
        )}

        {tab === 'loans' && (
          <Card className="p-2 sm:p-4">
            {loans.length === 0 ? (
              <EmptyState size="md" icon={HandCoins} title="No loans" description="Add a loan to track EMIs." primaryAction={{ label: 'Add loan', onClick: () => openAdd('loan') }} />
            ) : loans.map((l) => {
              const s = loanStats(l);
              return (
                <Row key={l.id} onClick={() => openItem('loan', l.id)} className="cursor-pointer hover:bg-surface-muted/50 rounded-lg">
                  <Icon as={HandCoins} />
                  <RowMeta title={l.name} sub={`${inr(s.emi)}/mo`} />
                  <Money v={s.balance} compact className="text-[15px] font-medium" />
                </Row>
              );
            })}
          </Card>
        )}

        {tab === 'subscriptions' && (
          <Card className="p-2 sm:p-4">
            {subs.length === 0 ? (
              <EmptyState size="md" icon={Repeat} title="No subscriptions" description="Add recurring expenses or subscriptions." primaryAction={{ label: 'Add subscription', onClick: () => openAdd('recurring') }} />
            ) : subs.map((r) => (
              <Row key={r.id} onClick={() => openItem('recurring', r.id)} className="cursor-pointer hover:bg-surface-muted/50 rounded-lg">
                <Icon as={Repeat} />
                <RowMeta title={r.name} sub={`Day ${r.day} · ${r.category}`} />
                <Money v={r.amount} className="text-[15px] font-medium" />
              </Row>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
