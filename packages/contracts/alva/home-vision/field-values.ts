import type {Item, Value} from './flow.js';

export function record(value: Value | undefined): Record<string, Value> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function hasValue(value: Value | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === 'object') return Object.values(value).some(hasValue);
  return true;
}

const amount = (value: Value | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const text = (value: Value | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Drafts may be partial; only complete, explicitly confirmed values enter a brief. */
export function completeValue(item: Item, value: Value | undefined,
  visible: (field: Item) => boolean = () => true): boolean {
  if (!hasValue(value)) return false;
  const object = record(value);
  if (item.type === 'country_city') {
    return text(object.country) && text(object.city) &&
      (object.country !== 'Other' || text(object.otherCountry));
  }
  if (item.type === 'number_unit') {
    return amount(object.amount) && typeof object.unit === 'string' &&
      !!item.units?.includes(object.unit);
  }
  if (item.type === 'currency_range') {
    if (object.choice) return (item.options || []).some(option =>
      typeof option === 'object' && option.id === object.choice);
    const currency = object.currency === 'Other' ? object.currencyCode : object.currency;
    return typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) &&
      amount(object.comfortable) && amount(object.maximum) && object.maximum >= object.comfortable;
  }
  if (item.type === 'number') return amount(value);
  if (item.type === 'group') {
    const started = (item.fields || []).filter(field => visible(field) && hasValue(object[field.id]));
    return started.length > 0 && started.every(field => completeValue(field, object[field.id], visible));
  }
  if (typeof object.choice === 'string' && object.choice.endsWith('.other')) return text(object.text);
  if (item.min && Array.isArray(value)) return value.length >= item.min;
  return true;
}

/** Omit hidden or unfinished nested fields without deleting their saved drafts. */
export function effectiveValue(item: Item, value: Value | undefined,
  visible: (field: Item) => boolean): Value | undefined {
  if (item.type === 'group') {
    const object = record(value);
    const fields = Object.fromEntries((item.fields || []).filter(visible).flatMap(field => {
      const current = effectiveValue(field, object[field.id], visible);
      return current === undefined ? [] : [[field.id, current]];
    }));
    return hasValue(fields) ? fields : undefined;
  }
  return completeValue(item, value, visible) ? value : undefined;
}
