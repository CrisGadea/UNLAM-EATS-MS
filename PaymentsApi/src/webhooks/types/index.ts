export type MpBasicPayload = {
  action?: string;
  type?: string;
  data?: { id?: string | number };
};

export type MpFeedV2Payload = {
  resource?: string;
  topic?: string;
};
