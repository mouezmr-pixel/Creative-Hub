import { vi } from "vitest";

process.env.SESSION_SECRET = "test-secret";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
