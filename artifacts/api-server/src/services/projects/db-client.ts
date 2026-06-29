import { db } from "@workspace/db";

export type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
