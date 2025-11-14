const normaliseCardNumber = (value) => (value || '').toString().replace(/\D+/g, '');

const luhnCheck = (cardNumber) => {
  const digits = normaliseCardNumber(cardNumber);
  if (!digits) return false;
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number.parseInt(digits.charAt(i), 10);
    if (!Number.isFinite(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const detectCardBrand = (cardNumber) => {
  const digits = normaliseCardNumber(cardNumber);
  if (!digits) return 'Tarjeta';

  const patterns = [
    { brand: 'Visa', regex: /^4\d{12}(\d{3})?(\d{3})?$/ },
    { brand: 'Mastercard', regex: /^(5[1-5]\d{4}|2(2[2-9]|[3-6]\d|7[01])\d{2})\d{10}$/ },
    { brand: 'American Express', regex: /^3[47]\d{13}$/ },
    { brand: 'Discover', regex: /^6(?:011|5\d{2})\d{12}$/ },
    { brand: 'Maestro', regex: /^(5[0678]|6\d)\d{10,17}$/ }
  ];

  const match = patterns.find((pattern) => pattern.regex.test(digits));
  return match ? match.brand : 'Tarjeta';
};

const validateExpiryDate = (month, year) => {
  const parsedMonth = Number.parseInt(month, 10);
  const parsedYear = Number.parseInt(year, 10);

  if (!Number.isFinite(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return false;
  }

  if (!Number.isFinite(parsedYear) || parsedYear < 0) {
    return false;
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const fullYear = parsedYear < 100 ? 2000 + parsedYear : parsedYear;

  if (fullYear < currentYear) return false;
  if (fullYear === currentYear && parsedMonth < currentMonth) return false;

  return { month: parsedMonth, year: fullYear };
};

export { normaliseCardNumber, luhnCheck, detectCardBrand, validateExpiryDate };
