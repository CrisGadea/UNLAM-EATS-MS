import { MpBasicPayload, MpFeedV2Payload } from '../types';

export function safeJsonParse<T = unknown>(
  input: string,
): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(input) as T };
  } catch {
    return { ok: false };
  }
}

export function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export function isMpBasicPayload(x: unknown): x is MpBasicPayload {
  if (!isObject(x)) return false;
  const d = x['data'];
  const dataOk =
    d === undefined ||
    (isObject(d) &&
      ('id' in d
        ? typeof d['id'] === 'string' || typeof d['id'] === 'number'
        : true));
  const actionOk = x['action'] === undefined || typeof x['action'] === 'string';
  const typeOk = x['type'] === undefined || typeof x['type'] === 'string';
  return dataOk && actionOk && typeOk;
}

export function isMpFeedV2Payload(x: unknown): x is MpFeedV2Payload {
  if (!isObject(x)) return false;
  const resourceOk =
    x['resource'] === undefined || typeof x['resource'] === 'string';
  const topicOk = x['topic'] === undefined || typeof x['topic'] === 'string';
  return resourceOk && topicOk;
}

export function getQueryParamString(
  q: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = q[key];
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v) && v.length) {
    const first: unknown = v[0];
    if (typeof first === 'string' || typeof first === 'number')
      return String(first);
  }
  return undefined;
}

export function extractIdFromResource(
  resource: string | undefined,
): string | undefined {
  if (!resource) return undefined;
  const seg = resource.split('/').filter(Boolean);
  return seg.length ? seg[seg.length - 1] : undefined;
}
