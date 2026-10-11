import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { mikrotikService } from './server/mikrotik.js';
import { paymentGatewayService } from './server/paymentGateway.js';
import { authService, authenticateToken, authorizeRole, AuthenticatedRequest } from './server/auth.js';
import { Client, Plan, Invoice, User, UserRole } from './src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// -----------------------------------------------------------------------------
// 0. AUTHENTICATION & RBAC (JWT & SESSIONS)
// -----------------------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe usuário/e-mail e senha para acessar.' });
    }

    const cleanInput = email.toLowerCase().trim();
    
    // Suporte prioritário para jr0955@gmail.com, jr0955, admin e outros operadores
    let user = db.users.find(u => {
      const uEmail = u.email.toLowerCase();
      return (
        uEmail === cleanInput ||
        ((cleanInput === 'jr0955@gmail.com' || cleanInput === 'jr0955' || cleanInput === 'admin' || cleanInput === 'root' || cleanInput === 'administrador') && u.role === 'administrador') ||
        (cleanInput.startsWith('admin@') && u.role === 'administrador') ||
        ((cleanInput === 'tecnico' || cleanInput === 'tec') && u.role === 'tecnico') ||
        (cleanInput.startsWith('tecnico@') && u.role === 'tecnico') ||
        ((cleanInput === 'financeiro' || cleanInput === 'fin') && u.role === 'financeiro') ||
        (cleanInput.startsWith('financeiro@') && u.role === 'financeiro')
      );
    });

    // Se ainda não encontrou e digitou algo com jr0955 ou admin, assume o administrador principal
    if (!user && (cleanInput.includes('jr0955') || cleanInput.includes('admin') || cleanInput.includes('root'))) {
      user = db.users.find(u => u.role === 'administrador');
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'Usuário não encontrado. Utilize "jr0955@gmail.com" (ou admin) com a senha "admin123".' 
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Sua conta de operador está inativa. Contate o administrador.' });
    }

    // Validação de senha: hash bcrypt ou senha de implantação admin123
    const isMasterAdmin = user.role === 'administrador';
    const isMasterTec = user.role === 'tecnico';
    const isMasterFin = user.role === 'financeiro';

    const isValidPassword = 
      (user.passwordHash && authService.comparePassword(password, user.passwordHash)) ||
      (isMasterAdmin && (password === 'admin123' || password === 'admin')) ||
      (isMasterTec && (password === 'tec123' || password === 'tecnico')) ||
      (isMasterFin && (password === 'fin123' || password === 'financeiro'));

    if (!isValidPassword) {
      return res.status(401).json({ 
        error: isMasterAdmin 
          ? 'Senha incorreta. A senha para o usuário jr0955@gmail.com é "admin123".'
          : 'Senha incorreta. Verifique suas credenciais de acesso.' 
      });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();

    const token = authService.generateToken(user);

    db.addAuditLog({
      type: 'system',
      action: 'USER_LOGIN',
      message: `Login realizado com sucesso: [${user.name}] perfil [${user.role.toUpperCase()}].`,
      status: 'success'
    });

    const { passwordHash: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro no processo de login' });
  }
});

// POST /api/auth/register (Create new operator / signup)
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role = 'tecnico' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
      return res.status(400).json({ error: 'Já existe um operador com este e-mail cadastrado.' });
    }

    const validRoles: UserRole[] = ['administrador', 'tecnico', 'financeiro'];
    const assignedRole: UserRole = validRoles.includes(role) ? role : 'tecnico';

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email: email.toLowerCase().trim(),
      role: assignedRole,
      passwordHash: authService.hashPassword(password),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: new Date().toISOString()
    };

    db.users.push(newUser);

    const token = authService.generateToken(newUser);

    db.addAuditLog({
      type: 'system',
      action: 'USER_REGISTER',
      message: `Novo operador registrado: [${newUser.name}] com perfil [${newUser.role.toUpperCase()}].`,
      status: 'success'
    });

    const { passwordHash: _, ...userSafe } = newUser;
    res.status(201).json({ token, user: userSafe });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao registrar operador' });
  }
});

// POST /api/auth/forgot-password (Request recovery code)
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
    }

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      // Don't disclose user existence for security, or return simulated code for lab
      return res.json({
        success: true,
        message: 'Se o e-mail constar no sistema, um código de verificação foi emitido.',
        simulatedCode: null
      });
    }

    const code = authService.createResetCode(user.email);

    db.addAuditLog({
      type: 'system',
      action: 'PASSWORD_RESET_REQUEST',
      message: `Solicitação de redefinição de senha para [${user.email}]. Código gerado: ${code}`,
      status: 'info'
    });

    res.json({
      success: true,
      message: `Código de verificação gerado para ${user.email}. Utilize o código abaixo para redefinir sua senha:`,
      simulatedCode: code
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao solicitar recuperação' });
  }
});

// POST /api/auth/reset-password (Verify code and update password)
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'E-mail, código de verificação e nova senha são obrigatórios.' });
    }

    if (newPassword.length < 5) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 5 caracteres.' });
    }

    const success = authService.verifyAndResetPassword(email, code, newPassword);
    if (!success) {
      return res.status(400).json({ error: 'Código inválido ou expirado. Solicite um novo código.' });
    }

    res.json({ success: true, message: 'Senha redefinida com sucesso! Você já pode efetuar login.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao redefinir senha' });
  }
});

// GET /api/auth/me (Get current authenticated user info)
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  const { passwordHash: _, ...userSafe } = user;
  res.json({ user: userSafe });
});

// -----------------------------------------------------------------------------
// USER MANAGEMENT (ADMIN ONLY)
// -----------------------------------------------------------------------------
app.get('/api/users', authenticateToken, authorizeRole(['administrador']), (req, res) => {
  const safeUsers = db.users.map(({ passwordHash, ...safe }) => safe);
  res.json({ users: safeUsers });
});

app.post('/api/users', authenticateToken, authorizeRole(['administrador']), (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios: Nome, E-mail, Senha e Perfil (Role).' });
    }

    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email: email.toLowerCase().trim(),
      role,
      passwordHash: authService.hashPassword(password),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    db.users.push(newUser);

    db.addAuditLog({
      type: 'system',
      action: 'USER_CREATED_BY_ADMIN',
      message: `Novo operador [${newUser.name}] criado pelo administrador [${req.user?.name}] com perfil [${newUser.role}].`,
      status: 'success'
    });

    const { passwordHash: _, ...safe } = newUser;
    res.status(201).json({ user: safe });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, authorizeRole(['administrador']), (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const user = db.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { name, role, status, newPassword } = req.body;
    if (name) user.name = name;
    if (role) user.role = role;
    if (status) user.status = status;
    if (newPassword) user.passwordHash = authService.hashPassword(newPassword);

    db.addAuditLog({
      type: 'system',
      action: 'USER_UPDATED',
      message: `Operador [${user.name}] atualizado pelo administrador [${req.user?.name}].`,
      status: 'info'
    });

    const { passwordHash: _, ...safe } = user;
    res.json({ user: safe });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeRole(['administrador']), (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta de administrador.' });
    }

    const user = db.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    db.users = db.users.filter(u => u.id !== id);

    db.addAuditLog({
      type: 'system',
      action: 'USER_DELETED',
      message: `Operador [${user.name}] removido pelo administrador [${req.user?.name}].`,
      status: 'warning'
    });

    res.json({ success: true, message: `Usuário '${user.name}' removido.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 1. DASHBOARD & STATS API
// -----------------------------------------------------------------------------
app.get('/api/stats', (req, res) => {
  res.json({
    stats: db.getStats(),
    systemInfo: mikrotikService.getSystemInfo(),
    mikrotikConfig: db.mikrotikConfig,
    gatewayConfig: db.gatewayConfig
  });
});

// -----------------------------------------------------------------------------
// 2. CLIENTS (CRUD) & PPPoE AUTOMATION
// -----------------------------------------------------------------------------
app.get('/api/clients', (req, res) => {
  res.json({ clients: db.clients, plans: db.plans, towers: db.towers });
});

app.post('/api/clients', async (req, res) => {
  try {
    const data: Partial<Client> = req.body;
    if (!data.name || !data.document || !data.pppoeUsername || !data.pppoePassword) {
      return res.status(400).json({ error: 'Campos obrigatórios: Nome, Documento, Usuário PPPoE e Senha.' });
    }

    // Check duplicate username
    if (db.clients.some(c => c.pppoeUsername === data.pppoeUsername)) {
      return res.status(400).json({ error: `Usuário PPPoE '${data.pppoeUsername}' já está em uso.` });
    }

    const newClient: Client = {
      id: `cli-${Date.now()}`,
      name: data.name,
      document: data.document,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      ruralLocation: data.ruralLocation || 'Zona Rural',
      towerId: data.towerId || db.towers[0].id,
      planId: data.planId || db.plans[0].id,
      dueDay: Number(data.dueDay) || 10,
      pppoeUsername: data.pppoeUsername,
      pppoePassword: data.pppoePassword,
      ipAddress: data.ipAddress || `10.50.${Math.floor(1 + Math.random() * 3)}.${Math.floor(20 + Math.random() * 200)}`,
      macAddress: data.macAddress || '',
      status: 'active',
      signalDbm: data.signalDbm || -55,
      createdAt: new Date().toISOString().split('T')[0]
    };

    db.clients.unshift(newClient);

    // Automatically create /ppp secret in MikroTik RouterOS
    await mikrotikService.syncSecret(newClient);

    // Auto-generate current month initial invoice for the new client
    const plan = db.plans.find(p => p.id === newClient.planId) || db.plans[0];
    const now = new Date();
    const invoiceId = `FAT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(db.invoices.length + 1).padStart(4, '0')}`;
    const { pixCopyPaste, qrCodeDataUrl } = await paymentGatewayService.generatePixPayload(invoiceId, plan.price, newClient.name);
    const barcode = paymentGatewayService.generateBarcode(plan.price);

    const initialInvoice: Invoice = {
      id: invoiceId,
      clientId: newClient.id,
      clientName: newClient.name,
      clientDocument: newClient.document,
      clientPhone: newClient.phone,
      planName: plan.name,
      amount: plan.price,
      dueDate: new Date(now.getFullYear(), now.getMonth(), newClient.dueDay).toISOString().split('T')[0],
      status: 'pendente',
      barcode,
      pixCopyPaste,
      qrCodeDataUrl,
      gateway: db.gatewayConfig.provider,
      referenceMonth: `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
      createdAt: new Date().toISOString()
    };
    db.invoices.unshift(initialInvoice);

    db.addAuditLog({
      type: 'client',
      action: 'CLIENT_CREATE',
      message: `Novo cliente cadastrado: ${newClient.name} (${newClient.pppoeUsername}) - Secret criada no MikroTik.`,
      status: 'success'
    });

    res.status(201).json({ client: newClient, invoice: initialInvoice });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao criar cliente' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientIndex = db.clients.findIndex(c => c.id === id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const updatedData = { ...db.clients[clientIndex], ...req.body };
    db.clients[clientIndex] = updatedData;

    // Sync updated secret in MikroTik RouterOS
    await mikrotikService.syncSecret(updatedData);

    res.json({ client: updatedData });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao atualizar cliente' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = db.clients.find(c => c.id === id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Remove Secret in MikroTik
    await mikrotikService.removeSecret(client.pppoeUsername);

    db.clients = db.clients.filter(c => c.id !== id);
    db.invoices = db.invoices.filter(i => i.clientId !== id);

    res.json({ success: true, message: `Cliente '${client.name}' e Secret removidos.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao remover cliente' });
  }
});

// Batch Import Clients (CSV, JSON or MikroTik /ppp secret export script)
app.post('/api/clients/import-batch', async (req, res) => {
  try {
    const { rawText, clientsList } = req.body;
    let clientsToImport: Partial<Client>[] = [];

    if (Array.isArray(clientsList)) {
      clientsToImport = clientsList;
    } else if (typeof rawText === 'string') {
      // Parse RouterOS /ppp secret export lines or CSV
      const lines = rawText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Parse MikroTik: add name="user" password="pwd" comment="name"
        if (trimmed.includes('add') && trimmed.includes('name=')) {
          const nameMatch = trimmed.match(/name="?([^"\s]+)"?/);
          const passMatch = trimmed.match(/password="?([^"\s]+)"?/);
          const commentMatch = trimmed.match(/comment="?([^"]+)"?/);
          const remoteIpMatch = trimmed.match(/remote-address="?([^"\s]+)"?/);

          if (nameMatch) {
            const username = nameMatch[1];
            const password = passMatch ? passMatch[1] : '123456';
            const clientName = commentMatch ? commentMatch[1] : `Cliente ${username}`;
            const ipAddress = remoteIpMatch ? remoteIpMatch[1] : undefined;

            clientsToImport.push({
              name: clientName,
              document: '000.000.000-00',
              phone: '',
              pppoeUsername: username,
              pppoePassword: password,
              ipAddress,
              ruralLocation: 'Migrado do MikroTik',
              dueDay: 10
            });
          }
        } else if (trimmed.includes(',') || trimmed.includes(';')) {
          // Parse CSV: Nome, CPF, WhatsApp, PPPoE User, Senha
          const parts = trimmed.split(/[,;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length >= 2) {
            clientsToImport.push({
              name: parts[0],
              document: parts[1] || '000.000.000-00',
              phone: parts[2] || '',
              pppoeUsername: parts[3] || parts[0].toLowerCase().replace(/\s+/g, '_').slice(0, 16),
              pppoePassword: parts[4] || '123456',
              ruralLocation: parts[5] || 'Zona Rural',
              dueDay: Number(parts[6]) || 10
            });
          }
        }
      }
    }

    if (clientsToImport.length === 0) {
      return res.status(400).json({ error: 'Nenhum formato válido identificado para importação.' });
    }

    const result = db.importClients(clientsToImport);

    // Auto-sync imported secrets in MikroTik
    for (const c of clientsToImport) {
      const created = db.clients.find(item => item.pppoeUsername === c.pppoeUsername);
      if (created) {
        await mikrotikService.syncSecret(created);
      }
    }

    res.json({
      success: true,
      added: result.added,
      errors: result.errors,
      message: `${result.added} clientes importados com sucesso para a base!`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro na importação em lote' });
  }
});

// Reset Bench Lab to Sample Lab Data
app.post('/api/bench/reset', (req, res) => {
  db.resetToSampleData();
  res.json({ success: true, message: 'Dados de bancada restaurados com sucesso!' });
});

// Manual Block/Unblock toggle on MikroTik
app.post('/api/clients/:id/toggle-block', async (req, res) => {
  try {
    const { id } = req.params;
    const client = db.clients.find(c => c.id === id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (client.status === 'blocked') {
      const result = await mikrotikService.unblockClient(client);
      return res.json({ success: true, status: 'active', message: result.message });
    } else {
      const result = await mikrotikService.blockClient(client);
      return res.json({ success: true, status: 'blocked', message: result.message });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao alterar status de bloqueio' });
  }
});

// -----------------------------------------------------------------------------
// 3. MIKROTIK ROUTEROS API & REAL-TIME SESSIONS
// -----------------------------------------------------------------------------
app.get('/api/mikrotik/config', (req, res) => {
  res.json({ config: db.mikrotikConfig, history: mikrotikService.getHistory() });
});

app.post('/api/mikrotik/config', async (req, res) => {
  db.mikrotikConfig = { ...db.mikrotikConfig, ...req.body };
  res.json({ config: db.mikrotikConfig });
});

app.post('/api/mikrotik/test', async (req, res) => {
  const result = await mikrotikService.testConnection(req.body);
  res.json(result);
});

app.get('/api/mikrotik/active', (req, res) => {
  const sessions = mikrotikService.getActiveSessions();
  res.json({ sessions, count: sessions.length });
});

app.post('/api/mikrotik/disconnect', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username não fornecido.' });
  }
  const result = await mikrotikService.kickSession(username);
  res.json(result);
});

app.get('/api/mikrotik/cli-script', (req, res) => {
  const { action, clientId } = req.query;
  const client = db.clients.find(c => c.id === clientId) || db.clients[0];
  const script = mikrotikService.getCliScript((action as any) || 'sync', client);
  res.json({ script, client });
});

// -----------------------------------------------------------------------------
// 4. INVOICES, PIX & BOLETOS
// -----------------------------------------------------------------------------
app.get('/api/invoices', (req, res) => {
  res.json({ invoices: db.invoices });
});

app.post('/api/invoices', async (req, res) => {
  try {
    const { clientId, amount, dueDate, referenceMonth } = req.body;
    const client = db.clients.find(c => c.id === clientId);
    if (!client) {
      return res.status(400).json({ error: 'Cliente inválido' });
    }
    const plan = db.plans.find(p => p.id === client.planId) || db.plans[0];
    const finalAmount = Number(amount) || plan.price;

    const now = new Date();
    const invoiceId = `FAT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(db.invoices.length + 1).padStart(4, '0')}`;
    const { pixCopyPaste, qrCodeDataUrl } = await paymentGatewayService.generatePixPayload(invoiceId, finalAmount, client.name);
    const barcode = paymentGatewayService.generateBarcode(finalAmount);

    const newInvoice: Invoice = {
      id: invoiceId,
      clientId: client.id,
      clientName: client.name,
      clientDocument: client.document,
      clientPhone: client.phone,
      planName: plan.name,
      amount: finalAmount,
      dueDate: dueDate || new Date(now.getFullYear(), now.getMonth(), client.dueDay).toISOString().split('T')[0],
      status: 'pendente',
      barcode,
      pixCopyPaste,
      qrCodeDataUrl,
      gateway: db.gatewayConfig.provider,
      referenceMonth: referenceMonth || `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
      createdAt: new Date().toISOString()
    };

    db.invoices.unshift(newInvoice);
    res.status(201).json({ invoice: newInvoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual payment confirmation
app.post('/api/invoices/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await paymentGatewayService.processPaymentConfirmation({
      invoiceId: id,
      gateway: 'asaas',
      paymentMethod: 'pix'
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 5. PAYMENT GATEWAY WEBHOOKS & SIMULATOR
// -----------------------------------------------------------------------------
app.post('/api/webhooks/asaas', async (req, res) => {
  try {
    const result = await paymentGatewayService.handleAsaasWebhook(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const result = await paymentGatewayService.handleMercadoPagoWebhook(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// One-click Webhook Test Simulator for Admin UI
app.post('/api/webhooks/simulate', async (req, res) => {
  try {
    const { invoiceId, gateway = 'asaas' } = req.body;
    let targetInvoice = db.invoices.find(i => i.id === invoiceId);

    // If none provided, pick an overdue or pending invoice
    if (!targetInvoice) {
      targetInvoice = db.invoices.find(i => i.status === 'atrasada') || db.invoices.find(i => i.status === 'pendente') || db.invoices[0];
    }

    if (!targetInvoice) {
      return res.status(400).json({ error: 'Nenhuma fatura encontrada para simular.' });
    }

    const result = await paymentGatewayService.processPaymentConfirmation({
      invoiceId: targetInvoice.id,
      gateway: gateway as any,
      paymentMethod: 'pix',
      externalId: `sim_${Date.now()}`
    });

    res.json({
      ...result,
      invoice: targetInvoice,
      client: db.clients.find(c => c.id === targetInvoice?.clientId)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 6. PLANS & TOWERS & AUDIT LOGS
// -----------------------------------------------------------------------------
app.get('/api/plans', (req, res) => res.json({ plans: db.plans }));

app.post('/api/plans', (req, res) => {
  try {
    const { name, speedDown, speedUp, price, technology, profileName, description } = req.body;
    if (!name || !speedDown || !price) {
      return res.status(400).json({ error: 'Nome do plano, velocidade de download e valor mensal são obrigatórios.' });
    }

    const cleanProfile = profileName || `prof_${speedDown}m_${(name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10)}`;

    const newPlan: Plan = {
      id: `plan-${Date.now()}`,
      name,
      speedDown: Number(speedDown),
      speedUp: Number(speedUp) || Math.round(Number(speedDown) / 3),
      price: Number(price),
      technology: technology || 'radio_5ghz',
      profileName: cleanProfile,
      description: description || ''
    };

    db.plans.push(newPlan);

    db.addAuditLog({
      type: 'system',
      action: 'PLAN_CREATED',
      message: `Novo plano de internet cadastrado: [${newPlan.name}] (${newPlan.speedDown}M/${newPlan.speedUp}M - R$ ${newPlan.price.toFixed(2)}) com profile='${newPlan.profileName}'.`,
      status: 'success'
    });

    res.status(201).json({ plan: newPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao cadastrar plano.' });
  }
});

app.put('/api/plans/:id', (req, res) => {
  try {
    const { id } = req.params;
    const planIndex = db.plans.findIndex(p => p.id === id);
    if (planIndex === -1) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }

    const currentPlan = db.plans[planIndex];
    const updatedPlan: Plan = {
      ...currentPlan,
      ...req.body,
      speedDown: req.body.speedDown !== undefined ? Number(req.body.speedDown) : currentPlan.speedDown,
      speedUp: req.body.speedUp !== undefined ? Number(req.body.speedUp) : currentPlan.speedUp,
      price: req.body.price !== undefined ? Number(req.body.price) : currentPlan.price
    };

    db.plans[planIndex] = updatedPlan;

    db.addAuditLog({
      type: 'system',
      action: 'PLAN_UPDATED',
      message: `Plano atualizado: [${updatedPlan.name}] (${updatedPlan.speedDown}M/${updatedPlan.speedUp}M - R$ ${updatedPlan.price.toFixed(2)}).`,
      status: 'info'
    });

    res.json({ plan: updatedPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar plano.' });
  }
});

app.delete('/api/plans/:id', (req, res) => {
  try {
    const { id } = req.params;
    const plan = db.plans.find(p => p.id === id);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }

    // Check if any client is currently subscribed to this plan
    const clientsUsing = db.clients.filter(c => c.planId === id);
    if (clientsUsing.length > 0) {
      return res.status(400).json({
        error: `Não é possível excluir o plano '${plan.name}' pois existem ${clientsUsing.length} clientes vinculados a ele. Altere o plano desses clientes antes de excluir.`
      });
    }

    db.plans = db.plans.filter(p => p.id !== id);

    db.addAuditLog({
      type: 'system',
      action: 'PLAN_DELETED',
      message: `Plano de internet removido: [${plan.name}].`,
      status: 'warning'
    });

    res.json({ success: true, message: `Plano '${plan.name}' excluído com sucesso.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir plano.' });
  }
});

app.get('/api/towers', (req, res) => res.json({ towers: db.towers }));
app.get('/api/audit-logs', (req, res) => res.json({ logs: db.auditLogs }));

// -----------------------------------------------------------------------------
// 7. BEESWEB ISP MODULES (SERVICE ORDERS, CONTRACTS, INVENTORY, FISCAL)
// -----------------------------------------------------------------------------
app.get('/api/service-orders', (req, res) => {
  res.json({ serviceOrders: db.serviceOrders });
});

app.post('/api/service-orders', (req, res) => {
  try {
    const { clientId, clientName, type, description, priority, scheduledDate, technicianName, address } = req.body;
    if (!clientName || !type) {
      return res.status(400).json({ error: 'Cliente e tipo de O.S. são obrigatórios.' });
    }

    const client = db.clients.find(c => c.id === clientId) || db.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    const count = db.serviceOrders.length + 1;
    const protocol = `OS-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const newOrder = {
      id: `os-${Date.now()}`,
      protocol,
      clientId: client?.id || 'manual',
      clientName: clientName || client?.name || 'Cliente Avulso',
      clientPhone: client?.phone || req.body.clientPhone || '',
      address: address || client?.address || 'Endereço não informado',
      type: type || 'instalacao',
      status: 'aberta' as const,
      priority: priority || 'normal',
      technicianName: technicianName || 'Marcos Vinícius (Técnico)',
      scheduledDate: scheduledDate || new Date(Date.now() + 86400000).toISOString().replace('T', ' ').substring(0, 16),
      description: description || 'Solicitação de atendimento técnico em campo.',
      createdAt: new Date().toISOString().split('T')[0]
    };

    db.serviceOrders.unshift(newOrder);
    db.addAuditLog({
      type: 'system',
      action: 'OS_CREATED',
      message: `Nova Ordem de Serviço criada: [${protocol}] para ${newOrder.clientName}.`,
      status: 'info'
    });

    res.status(201).json({ serviceOrder: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao criar O.S.' });
  }
});

app.put('/api/service-orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = db.serviceOrders.findIndex(o => o.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    db.serviceOrders[index] = {
      ...db.serviceOrders[index],
      ...req.body
    };

    res.json({ serviceOrder: db.serviceOrders[index] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar O.S.' });
  }
});

app.delete('/api/service-orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.serviceOrders = db.serviceOrders.filter(o => o.id !== id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contracts', (req, res) => {
  res.json({ contracts: db.contracts });
});

app.post('/api/contracts', (req, res) => {
  try {
    const newContract = {
      id: `cnt-${Date.now()}`,
      contractNumber: `CTR-${new Date().getFullYear()}-${String(db.contracts.length + 1).padStart(4, '0')}`,
      ...req.body
    };
    db.contracts.unshift(newContract);
    res.status(201).json({ contract: newContract });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/equipments', (req, res) => {
  res.json({ equipments: db.equipments });
});

app.post('/api/equipments', (req, res) => {
  try {
    const newEquipment = {
      id: `eq-${Date.now()}`,
      ...req.body
    };
    db.equipments.unshift(newEquipment);
    res.status(201).json({ equipment: newEquipment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fiscal-invoices', (req, res) => {
  res.json({ fiscalInvoices: db.fiscalInvoices });
});

app.post('/api/fiscal-invoices', (req, res) => {
  try {
    const newFiscal = {
      id: `fisc-${Date.now()}`,
      verificationCode: `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      status: 'autorizada' as const,
      emissionDate: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.fiscalInvoices.unshift(newFiscal);
    res.status(201).json({ fiscalInvoice: newFiscal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 8. COMPANY & PROVIDER SETTINGS (Identidade Visual, Logo & Boletos)
// -----------------------------------------------------------------------------
app.get('/api/company-settings', (req, res) => {
  res.json({ settings: db.companySettings });
});

app.put('/api/company-settings', (req, res) => {
  try {
    const updates = req.body;
    db.companySettings = {
      ...db.companySettings,
      ...updates,
      address: {
        ...db.companySettings.address,
        ...(updates.address || {})
      }
    };

    if (updates.legalName || updates.name) {
      db.gatewayConfig.beneficiaryName = (updates.legalName || updates.name).toUpperCase();
    }
    if (updates.cnpj) {
      db.gatewayConfig.pixKey = updates.cnpj;
    }

    db.addAuditLog({
      type: 'system',
      action: 'UPDATE_COMPANY_SETTINGS',
      message: `Dados do provedor atualizados: [${db.companySettings.name}]. Identidade e boletos sincronizados.`,
      status: 'success'
    });

    res.json({ settings: db.companySettings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar dados do provedor.' });
  }
});

// -----------------------------------------------------------------------------
// 9. SYSTEM BACKUP & EXPORT (MikroTik, Dados da Empresa, Gateway & Planos)
// -----------------------------------------------------------------------------
app.get('/api/backup', (req, res) => {
  try {
    const backupData = {
      system: 'ISP Telecom Management',
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      companySettings: db.companySettings,
      mikrotikConfig: db.mikrotikConfig,
      gatewayConfig: db.gatewayConfig,
      plans: db.plans,
      towers: db.towers,
      summary: {
        companyName: db.companySettings.name,
        cnpj: db.companySettings.cnpj,
        mikrotikHost: db.mikrotikConfig.host,
        totalPlans: db.plans.length,
        totalTowers: db.towers.length,
        totalClients: db.clients.length,
        totalInvoices: db.invoices.length,
        totalServiceOrders: db.serviceOrders.length
      }
    };

    db.addAuditLog({
      type: 'system',
      action: 'SYSTEM_BACKUP_EXPORT',
      message: `Exportação de backup realizada com sucesso para [${db.companySettings.name}].`,
      status: 'success'
    });

    res.json({ backup: backupData });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar backup do sistema.' });
  }
});

app.post('/api/backup/restore', (req, res) => {
  try {
    const { backup } = req.body;
    if (!backup) {
      return res.status(400).json({ error: 'Arquivo de backup inválido.' });
    }

    if (backup.companySettings) {
      db.companySettings = { ...db.companySettings, ...backup.companySettings };
      if (backup.companySettings.legalName || backup.companySettings.name) {
        db.gatewayConfig.beneficiaryName = (backup.companySettings.legalName || backup.companySettings.name).toUpperCase();
      }
      if (backup.companySettings.cnpj) {
        db.gatewayConfig.pixKey = backup.companySettings.cnpj;
      }
    }

    if (backup.mikrotikConfig) {
      db.mikrotikConfig = { ...db.mikrotikConfig, ...backup.mikrotikConfig };
    }

    if (backup.gatewayConfig) {
      db.gatewayConfig = { ...db.gatewayConfig, ...backup.gatewayConfig };
    }

    if (backup.plans && Array.isArray(backup.plans)) {
      db.plans = backup.plans;
    }

    if (backup.towers && Array.isArray(backup.towers)) {
      db.towers = backup.towers;
    }

    db.addAuditLog({
      type: 'system',
      action: 'SYSTEM_BACKUP_RESTORE',
      message: `Configurações do sistema restauradas a partir de backup (${backup.exportedAt || 'Data não informada'}).`,
      status: 'success'
    });

    res.json({ 
      success: true, 
      message: 'Configurações restauradas com sucesso!',
      companySettings: db.companySettings,
      mikrotikConfig: db.mikrotikConfig,
      gatewayConfig: db.gatewayConfig,
      plans: db.plans,
      towers: db.towers
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao restaurar configurações do backup.' });
  }
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER INTEGRATION OR STATIC FILE SERVING
// -----------------------------------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AgroISP Pro] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
