export function normalizeGtin(value: string | null | undefined) {
  return (value || "").replace(/[^0-9]/g, "");
}

export function isValidGtin(value: string | null | undefined) {
  const gtin = normalizeGtin(value);

  if (![8, 12, 13, 14].includes(gtin.length) || /^0+$/.test(gtin)) {
    return false;
  }

  const digits = [...gtin].map(Number);
  const checkDigit = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);

  return checkDigit === (10 - (sum % 10)) % 10;
}
