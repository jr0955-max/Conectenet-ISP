import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../src/types/index.js';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'agroisp_jwt_super_secret_key_2026';
const JWT_EXPIRES_IN = '7d';

// Extend Express Request type to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

// In-Memory Password Reset Requests
interface PasswordResetEntry {
  email: string;
  code: string;
  expiresAt: number;
}
const passwordResets = new Map<string, PasswordResetEntry>();

// Initial Seed Users with pre-hashed passwords
export const initialUsers: User[] = [
  {
    id: 'user-admin',
    name: 'Administrador Master',
    email: 'jr0955@gmail.com',
    role: 'administrador',
    passwordHash: bcrypt.hashSync('admin123', 10),
    status: 'active',
    createdAt: '2026-01-01',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'user-tecnico',
    name: 'Lucas Mendes (Técnico de Redes / NOC)',
    email: 'tecnico@provedor.com.br',
    role: 'tecnico',
    passwordHash: bcrypt.hashSync('tec123', 10),
    status: 'active',
    createdAt: '2026-02-10',
    lastLogin: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'user-financeiro',
    name: 'Juliana Rocha (Gestão Financeira & Cobrança)',
    email: 'financeiro@provedor.com.br',
    role: 'financeiro',
    passwordHash: bcrypt.hashSync('fin123', 10),
    status: 'active',
    createdAt: '2026-03-05',
    lastLogin: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

class AuthService {
  // Generate JWT Token
  public generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Verify JWT Token
  public verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }

  // Hash Password
  public hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  // Compare Password
  public comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  // Create Password Reset Code
  public createResetCode(email: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    passwordResets.set(email.toLowerCase(), { email: email.toLowerCase(), code, expiresAt });
    return code;
  }

  // Validate and Use Reset Code
  public verifyAndResetPassword(email: string, code: string, newPassword: string): boolean {
    const entry = passwordResets.get(email.toLowerCase());
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      passwordResets.delete(email.toLowerCase());
      return false;
    }
    if (entry.code !== code.trim()) return false;

    // Reset password
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return false;

    user.passwordHash = this.hashPassword(newPassword);
    passwordResets.delete(email.toLowerCase());

    db.addAuditLog({
      type: 'system',
      action: 'PASSWORD_RESET',
      message: `Senha redefinida com sucesso para o usuário [${user.email}] (${user.role}).`,
      status: 'success'
    });

    return true;
  }
}

export const authService = new AuthService();

// Middleware: Authenticate JWT Token
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido. Faça login para continuar.' });
  }

  try {
    const decoded = authService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Sessão expirada ou token inválido. Faça login novamente.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Falha na validação da sessão JWT.' });
  }
}

// Middleware: Authorize specific roles
export function authorizeRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso negado. Esta ação requer permissão de [${allowedRoles.join(' ou ')}]. Seu perfil atual é [${req.user.role}].`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}
