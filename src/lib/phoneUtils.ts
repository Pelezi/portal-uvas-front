/**
 * Remove all non-digit characters from a phone number
 * @param phone - Phone number with or without formatting
 * @returns Only the digits
 */
export function stripPhoneFormatting(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Detects the country code (DDI) from a phone number
 * @param phone - Phone number (formatted or unformatted)
 * @returns Country code or null
 */
function detectCountryCode(phone: string): string | null {
  if (!phone) return null;
  
  // Check if starts with +
  if (phone.startsWith('+')) {
    const numbers = phone.replace(/\D/g, '');
    
    // Brazil: +55
    if (numbers.startsWith('55')) return '55';
    
    // USA/Canada: +1
    if (numbers.startsWith('1')) return '1';
    
    // Other countries - extract first 1-3 digits
    const match = numbers.match(/^(\d{1,3})/);
    return match ? match[1] : null;
  }
  
  return null;
}

/**
 * Format a phone number for display with country code
 * @param phone - Phone number (digits only or formatted)
 * @returns Formatted phone number with DDI
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digits
  const numbers = phone.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Brazil: 55 + 11 digits = 13 total
  if (numbers.startsWith('55') && numbers.length >= 12) {
    const ddi = numbers.slice(0, 2);
    const ddd = numbers.slice(2, 4);
    const rest = numbers.slice(4);
    
    if (rest.length <= 4) {
      return `+${ddi} (${ddd}) ${rest}`;
    } else if (rest.length <= 8) {
      return `+${ddi} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
    } else {
      return `+${ddi} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
    }
  }
  
  // USA/Canada: 1 + 10 digits = 11 total
  if (numbers.startsWith('1') && numbers.length >= 11) {
    const ddi = numbers.slice(0, 1);
    const area = numbers.slice(1, 4);
    const first = numbers.slice(4, 7);
    const last = numbers.slice(7, 11);
    return `+${ddi} (${area}) ${first}-${last}`;
  }
  
  // Other countries or incomplete: just add + prefix
  return `+${numbers}`;
}

/**
 * Format phone number while typing (for input fields)
 * Applies appropriate mask based on country code
 * @param value - Current input value
 * @returns Formatted value for the input field
 */
export function formatPhoneForInput(value: string): string {
  if (!value) return '';
  
  // Always keep the + if it exists or add it
  let formatted = value;
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  
  // Remove all non-digits except the leading +
  const numbers = formatted.replace(/[^\d+]/g, '').replace(/\+/g, '');
  
  if (!numbers) return '+';
  
  // Brazil: +55
  if (numbers.startsWith('55')) {
    const ddi = numbers.slice(0, 2);
    const ddd = numbers.slice(2, 4);
    const rest = numbers.slice(4, 13); // Limit to 11 digits after DDI
    
    if (numbers.length <= 2) {
      return `+${numbers}`;
    } else if (numbers.length <= 4) {
      return `+${ddi} (${ddd}`;
    } else if (numbers.length <= 8) {
      return `+${ddi} (${ddd}) ${rest}`;
    } else if (numbers.length <= 12) {
      return `+${ddi} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    } else {
      return `+${ddi} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
    }
  }
  
  // USA/Canada: +1
  if (numbers.startsWith('1')) {
    const ddi = numbers.slice(0, 1);
    const area = numbers.slice(1, 4);
    const first = numbers.slice(4, 7);
    const last = numbers.slice(7, 11); // Limit to 10 digits after DDI
    
    if (numbers.length <= 1) {
      return `+${numbers}`;
    } else if (numbers.length <= 4) {
      return `+${ddi} (${area}`;
    } else if (numbers.length <= 7) {
      return `+${ddi} (${area}) ${first}`;
    } else {
      return `+${ddi} (${area}) ${first}-${last}`;
    }
  }
  
  // Other countries: no mask, just allow typing with + prefix
  // Limit to reasonable length (15 digits as per E.164 standard)
  const limited = numbers.slice(0, 15);
  return `+${limited}`;
}

/**
 * Adds default country code (+55) if phone doesn't have one
 * @param phone - Phone number
 * @returns Phone with country code
 */
export function ensureCountryCode(phone: string): string {
  if (!phone) return '+55';
  
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  
  // If it's just digits
  const numbers = trimmed.replace(/\D/g, '');
  if (!numbers) return '+55';
  
  // Check for common country code patterns
  // Brazil: 55 + 2 (DDD) + 8-9 (number) = 12-13 digits
  if (numbers.startsWith('55') && numbers.length >= 12 && numbers.length <= 13) {
    return `+${numbers}`;
  }
  
  // USA/Canada: 1 + 10 digits = 11 digits
  if (numbers.startsWith('1') && numbers.length === 11) {
    return `+${numbers}`;
  }
  
  // UK: 44 + 10 digits = 12-13 digits
  if (numbers.startsWith('44') && numbers.length >= 12 && numbers.length <= 13) {
    return `+${numbers}`;
  }
  
  // Other countries: if has 11-15 digits and doesn't start with 55, assume it has country code
  // E.164 standard allows up to 15 digits total (including country code)
  if (numbers.length >= 11 && numbers.length <= 15 && !numbers.startsWith('55')) {
    return `+${numbers}`;
  }
  
  // Otherwise, assume it's a Brazilian local number without country code
  return `+55${numbers}`;
}
