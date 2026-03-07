export type PlayerId = string & { readonly __brand: 'PlayerId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type EventId = string & { readonly __brand: 'EventId' };

export function newPlayerId(): PlayerId {
  return crypto.randomUUID().slice(0, 12) as PlayerId;
}

export function newSessionId(): SessionId {
  return crypto.randomUUID() as SessionId;
}

export function newEventId(): EventId {
  return crypto.randomUUID().slice(0, 12) as EventId;
}
