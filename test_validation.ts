function validate(val: string, allowNegative = false) {
  if (!val) return true;
  if (val === '-' && allowNegative) return true;
  const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
  return regex.test(val) && !val.includes('e') && !val.includes('E');
}

const tests = [
  "100", "100.50", "0", "0.99", "abc", "100abc", "abc100", "$100", "₹100", "€100", "100 USD", 
  "1e5", "1E5", "1.2.3", "..", ".", " ", "10+20", "10/20", "1,000", "Infinity", "-Infinity", "NaN", "-100"
];

for (const t of tests) {
  console.log(`[Normal] ${t}: ${validate(t)}`);
  console.log(`[NegativeAllowed] ${t}: ${validate(t, true)}`);
}
