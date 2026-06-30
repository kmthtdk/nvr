import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../models/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { UserRow } from '../models/schemas.js';

interface TokenPayload {
  userId: number;
  username: string;
  role: 'admin' | 'viewer';
}

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Ensure the default admin user exists on startup.
   */
  static async ensureAdminExists(): Promise<void> {
    const existing = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(env.ADMIN_USERNAME) as Pick<UserRow, 'id'> | undefined;

    if (existing) {
      logger.debug('Admin user already exists');
      return;
    }

    const hash = await bcrypt.hash(env.ADMIN_PASSWORD, SALT_ROUNDS);

    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
      env.ADMIN_USERNAME,
      hash,
      'admin',
    );

    logger.info('Default admin user created');
  }

  /**
   * Authenticate a user and return a signed JWT.
   */
  static async login(
    username: string,
    password: string,
  ): Promise<{ token: string; user: Omit<UserRow, 'password_hash'> } | null> {
    const user = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username) as UserRow | undefined;

    if (!user) {
      logger.warn({ username }, 'Login attempt for unknown user');
      return null;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn({ username }, 'Login attempt with wrong password');
      return null;
    }

    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const signOptions: jwt.SignOptions = {
      expiresIn: env.JWT_EXPIRY as jwt.SignOptions['expiresIn'],
    };
    const token = jwt.sign(payload, env.JWT_SECRET, signOptions);

    const { password_hash, ...safeUser } = user;
    return { token, user: safeUser };
  }

  /**
   * Verify a JWT and return the decoded payload.
   */
  static verifyToken(token: string): TokenPayload | null {
    try {
      // Pin the algorithm (jwt.verify otherwise accepts any HS* variant) and
      // narrow the result: jwt.verify returns `string | JwtPayload`, and an
      // unchecked cast would let a string token through as a "ghost" user.
      const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        typeof (decoded as TokenPayload).userId === 'number' &&
        typeof (decoded as TokenPayload).username === 'string' &&
        ((decoded as TokenPayload).role === 'admin' ||
          (decoded as TokenPayload).role === 'viewer')
      ) {
        return decoded as TokenPayload;
      }
      return null;
    } catch {
      return null;
    }
  }
}
