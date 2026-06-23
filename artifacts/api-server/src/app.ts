import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const PgStore = connectPgSimple(session);

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const app: Express = express();

// Trust Replit's reverse proxy — critical for secure cookies over HTTPS
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS: allow only known Replit domains + localhost in dev
const allowedOrigins = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .flatMap((d) => [`https://${d}`, `http://${d}`]);

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost", "http://localhost:80", "http://localhost:3000");
}

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate-limit login attempts: 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

app.use("/api/auth/login", loginLimiter);

const sessionStore = process.env.DATABASE_URL
  ? new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      pruneSessionInterval: 60 * 60,
    })
  : undefined;

app.use(
  session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: "auto",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

// Serve uploaded files (logo, stamp)
const PROJECT_ROOT = path.resolve(import.meta.dirname ?? process.cwd(), "..");
const UPLOADS_DIR = path.join(PROJECT_ROOT, "uploads");
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/api", router);

export default app;
