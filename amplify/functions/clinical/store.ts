import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
export const models = [
  "User",
  "DoctorProfile",
  "PatientProfile",
  "Clinic",
  "VerificationRun",
  "ConsultationAccess",
  "Consultation",
  "Prescription",
  "PrescriptionItem",
  "MedicationDecision",
  "Notification",
  "AuditEvent",
  "MedicationUseReport",
] as const;
export type Model = (typeof models)[number];
export type RecordData<T = unknown> = {
  id: string;
  revision: number;
  data: T;
  fields: Record<string, unknown>;
  secret?: string;
};
export type Write = {
  model: Model;
  record: RecordData;
  expected: number | null;
  check?: boolean;
};
export interface Store {
  get<T>(model: Model, id: string): Promise<RecordData<T> | null>;
  list<T>(
    model: Model,
    index: string,
    key: string,
    value: string,
  ): Promise<RecordData<T>[]>;
  commit(writes: Write[]): Promise<void>;
}
export class Conflict extends Error {
  constructor() {
    super("This record changed. Reload before trying again.");
  }
}
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
function table(model: Model) {
  const name = process.env[`TABLE_${model}`];
  if (!name) throw new Error("Database configuration unavailable");
  return name;
}
function decode<T>(item: Record<string, unknown>): RecordData<T> {
  const { id, _revision, snapshot, _secret, ...fields } = item;
  return {
    id: String(id),
    revision: Number(_revision ?? 0),
    data: (typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot) as T,
    fields,
    secret: _secret as string | undefined,
  };
}
export const store: Store = {
  async get<T>(model: Model, id: string) {
    const r = await client.send(
      new GetCommand({
        TableName: table(model),
        Key: { id },
        ConsistentRead: true,
      }),
    );
    return r.Item ? decode<T>(r.Item) : null;
  },
  async list<T>(model: Model, index: string, key: string, value: string) {
    const records: RecordData<T>[] = [];
    let cursor: Record<string, unknown> | undefined;
    do {
      const r = await client.send(
        new QueryCommand({
          TableName: table(model),
          IndexName: index,
          KeyConditionExpression: "#key = :value",
          ExpressionAttributeNames: { "#key": key },
          ExpressionAttributeValues: { ":value": value },
          ExclusiveStartKey: cursor,
          Limit: 100,
        }),
      );
      records.push(...(r.Items ?? []).map((i) => decode<T>(i)));
      cursor = r.LastEvaluatedKey;
      if (records.length > 2000)
        throw new Error(
          "Too many records. Contact support to paginate this history.",
        );
    } while (cursor);
    return records;
  },
  async commit(writes) {
    try {
      await client.send(
        new TransactWriteCommand({
          TransactItems: writes.map((w) => {
            const conditions = {
              TableName: table(w.model),
              ConditionExpression:
                w.expected === null
                  ? "attribute_not_exists(id)"
                  : "#version = :expected",
              ...(w.expected === null
                ? {}
                : {
                    ExpressionAttributeNames: { "#version": "_revision" },
                    ExpressionAttributeValues: { ":expected": w.expected },
                  }),
            };
            if (w.check)
              return {
                ConditionCheck: { ...conditions, Key: { id: w.record.id } },
              };
            return {
              Put: {
                ...conditions,
                Item: {
                  ...w.record.fields,
                  id: w.record.id,
                  _revision: w.record.revision,
                  snapshot: JSON.stringify(w.record.data),
                  _secret: w.record.secret,
                  createdAt:
                    w.record.fields.createdAt ?? new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              },
            };
          }),
        }),
      );
    } catch (e) {
      if (
        e instanceof Error &&
        [
          "TransactionCanceledException",
          "ConditionalCheckFailedException",
        ].includes(e.name)
      )
        throw new Conflict();
      throw e;
    }
  },
};
