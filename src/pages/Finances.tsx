import { useState } from 'react';
import { Plus, Download, Pencil, Trash2, Wallet, ArrowUpRight } from 'lucide-react';
import { dayKey, money, weekDays } from '../../shared/analytics.ts';
import { expenseCategories } from '../../shared/domain.ts';
import { PageHeading, Panel, Progress, Empty, Tag } from '../components/ui.tsx';
import type { PageProps } from './types.ts';
export function Finances(p: PageProps) {
  const [currency, setCurrency] = useState(p.data.settings[0].currency);
  const [month, setMonth] = useState(dayKey().slice(0, 7));
  const [category, setCategory] = useState('');
  const records = p.data.expenses.filter(
    (e) => e.currency === currency && e.date.startsWith(month),
  );
  const filtered = records
    .filter((e) => !category || e.category === category)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = records.reduce((n, e) => n + e.amountMinor, 0);
  const week = weekDays();
  const weekTotal = p.data.expenses
    .filter((e) => e.currency === currency && week.includes(e.date))
    .reduce((n, e) => n + e.amountMinor, 0);
  const breakdown = expenseCategories
    .map((c) => ({
      category: c,
      amount: records.filter((e) => e.category === c).reduce((n, e) => n + e.amountMinor, 0),
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const colors = ['violet', 'blue', 'green', 'amber', 'rose'];
  const trends = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(month + '-01T12:00:00');
    d.setMonth(d.getMonth() - 5 + i);
    const key = dayKey(d).slice(0, 7);
    return {
      key,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      total: p.data.expenses
        .filter((e) => e.currency === currency && e.date.startsWith(key))
        .reduce((sum, e) => sum + e.amountMinor, 0),
    };
  });
  return (
    <>
      <PageHeading
        eyebrow="SPEND WITH INTENTION"
        title="Finances"
        description="Know where it goes. Make room for what you value."
      >
        <a href="/api/export" className="button subtle" download>
          <Download size={16} />
          Export CSV
        </a>
        <button className="button primary" onClick={() => p.edit({ resource: 'expenses' })}>
          <Plus size={16} />
          Record expense
        </button>
      </PageHeading>
      <div className="toolbar">
        <input
          aria-label="Statement month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value || dayKey().slice(0, 7))}
        />
        <select
          aria-label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as typeof currency)}
        >
          {['TWD', 'USD', 'EUR', 'JPY'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span className="muted">Currencies are tracked separately.</span>
      </div>
      <div className="stats-grid three">
        <div className="stat-card">
          <div className="stat-top">
            Selected month
            <Wallet size={18} />
          </div>
          <strong>{money(total, currency)}</strong>
          <small>{records.length} recorded transactions</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            This week
            <ArrowUpRight size={18} />
          </div>
          <strong>{money(weekTotal, currency)}</strong>
          <small>Current calendar week</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            Top category<Tag>{currency}</Tag>
          </div>
          <strong>{breakdown[0]?.category || '—'}</strong>
          <small>
            {breakdown[0] ? money(breakdown[0].amount, currency) : 'No expenses this month'}
          </small>
        </div>
      </div>
      <div className="two-columns">
        <Panel title="Where it went" meta={<Tag>{month}</Tag>}>
          <div className="category-breakdown">
            {breakdown.map((b, i) => (
              <div key={b.category}>
                <div className="progress-label">
                  <span>
                    <i className={`dot bg-${colors[i % 5]}`} />
                    {b.category}
                  </span>
                  <b>
                    {money(b.amount, currency)}{' '}
                    <small>{Math.round((b.amount / total) * 100)}%</small>
                  </b>
                </div>
                <Progress value={(b.amount / total) * 100} color={colors[i % 5]} />
              </div>
            ))}
            {!breakdown.length && (
              <Empty
                title="A fresh ledger"
                detail="Record an expense to see your spending breakdown."
              />
            )}
          </div>
        </Panel>
        <Panel title="Monthly spending trend" meta={<Tag>{currency}</Tag>}>
          <div
            className="bar-chart finance-chart"
            role="img"
            aria-label={trends.map((t) => `${t.label}: ${money(t.total, currency)}`).join('; ')}
          >
            {trends.map((t) => (
              <div className="bar-column" key={t.key}>
                <span className="bar-number">{t.total ? money(t.total, currency) : '—'}</span>
                <div className="bar-track">
                  <div
                    style={{
                      height: `${Math.max(
                        2,
                        (t.total / Math.max(1, ...trends.map((v) => v.total))) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel
        title="Monthly budgets"
        className="section-gap"
        meta={
          <button className="text-link" onClick={() => p.edit({ resource: 'budgets' })}>
            <Plus size={15} />
            Add budget
          </button>
        }
      >
        <div className="budget-grid">
          {p.data.budgets
            .filter((b) => b.currency === currency)
            .map((b) => {
              const used = records
                .filter((e) => e.category === b.category)
                .reduce((n, e) => n + e.amountMinor, 0);
              return (
                <div key={b.id} className="budget-card">
                  <div className="card-top">
                    <h3>{b.category}</h3>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${b.category} budget`}
                        onClick={() => p.edit({ resource: 'budgets', record: b })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${b.category} budget`}
                        onClick={() => p.remove('budgets', b)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p>
                    {money(used, currency)}{' '}
                    <span className="muted">/ {money(b.amountMinor, currency)}</span>
                  </p>
                  <Progress
                    value={(used / b.amountMinor) * 100}
                    color={used > b.amountMinor ? 'rose' : 'green'}
                  />
                  <small className={used > b.amountMinor ? 'overdue' : 'muted'}>
                    {used > b.amountMinor
                      ? 'Over budget'
                      : `${money(b.amountMinor - used, currency)} remaining`}
                  </small>
                </div>
              );
            })}
          {!p.data.budgets.some((b) => b.currency === currency) && (
            <p className="muted padded">
              No budgets for {currency}. Set a monthly limit for any category.
            </p>
          )}
        </div>
      </Panel>
      <Panel
        title="Transactions"
        className="section-gap"
        meta={
          <select
            aria-label="Expense category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {expenseCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th className="align-right">Amount</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.description}</strong>
                    <small>
                      {e.demo && 'Demo record'}
                      {e.recurring !== 'None' && ` · ${e.recurring} recurrence label`}
                    </small>
                  </td>
                  <td>
                    <Tag>{e.category}</Tag>
                  </td>
                  <td>{e.date}</td>
                  <td className="align-right money">{money(e.amountMinor, e.currency)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${e.description}`}
                        onClick={() => p.edit({ resource: 'expenses', record: e })}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`Delete ${e.description}`}
                        onClick={() => p.remove('expenses', e)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title="No transactions in this view"
            action={() => p.edit({ resource: 'expenses' })}
            label="Record expense"
          />
        )}
      </Panel>
    </>
  );
}
