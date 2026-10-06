const fs = require('fs');
let c = fs.readFileSync('src/components/ui.tsx', 'utf8');

const inputRepl = `export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, type, onChange, ...p }, ref) => {
  const isNumeric = type === 'number';
  const num = useNumericInput({ isNumeric, onChange });
  return (
    <input
      {...p}
      {...(isNumeric ? num.props : { type, onChange })}
      ref={ref}
      className={cn(CONTROL, className, num.error && "border-negative focus:border-negative focus:ring-negative/20 text-negative")}
    />
  );
});`;
c = c.replace(/export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>\(\(\{ className, \.\.\.p \}, ref\) => \(\n  <input className=\{cn\(CONTROL, className\)\} \{...\p\} ref=\{ref\} \/>\n\)\);/m, inputRepl);

const moneyRepl = `export function MoneyInput({ value, onChange, autoFocus, id, invalid, onBlur, placeholder = '0.00', size = 'lg', allowNegative = false }: { value: number | string; onChange: (v: number | '') => void; autoFocus?: boolean; id?: string; invalid?: boolean; onBlur?: () => void; placeholder?: string; size?: 'md' | 'lg'; allowNegative?: boolean }) {
  const big = size === 'lg';
  const num = useNumericInput({ isNumeric: true, allowNegative, onChange: (e) => onChange(e.target.value === '' ? '' : +e.target.value) });
  return (
    <div className={cn('group relative flex items-center rounded-xl border bg-surface shadow-card transition-[border,box-shadow] duration-150 focus-within:ring-4',
      (invalid || num.error) ? 'border-negative/50 focus-within:ring-negative/10' : 'border-border hover:border-border-strong focus-within:border-border-strong focus-within:ring-accent-soft',
      big ? 'h-16 px-4' : 'h-10 px-3')}>
      <span className={cn('num select-none', (invalid || num.error) ? 'text-negative/70' : 'text-foreground-subtle', big ? 'mr-2 text-[28px] font-medium' : 'mr-1.5 text-body')}>{cur()}</span>
      <input id={id} autoFocus={autoFocus} aria-invalid={invalid || num.error || undefined}
        className={cn('num w-full min-w-0 bg-transparent outline-none placeholder:text-foreground-subtle/60', (invalid || num.error) ? 'text-negative' : 'text-foreground', big ? 'font-display text-[32px] font-semibold tracking-[-0.03em]' : 'text-body')}
        placeholder={placeholder} value={value} onBlur={onBlur}
        {...num.props} />
    </div>
  );
}`;
c = c.replace(/export function MoneyInput\(\{.+\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n\}/m, moneyRepl);

fs.writeFileSync('src/components/ui.tsx', c, 'utf8');
