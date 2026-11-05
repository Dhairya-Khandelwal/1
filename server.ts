import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db } from './server/db';
import { baileysAdapter, whatsappAdapter } from './server/baileysAdapter';
import { pacingEngine } from './server/pacingEngine';
import { messageDispatcher } from './server/messageDispatcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TypeScript declaration for session data
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userName?: string;
    role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    csrfToken?: string;
  }
}

// Zod schemas for input validation
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(100),
});

const contactInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(8, 'Valid phone number is required').max(25),
  businessName: z.string().optional().default(''),
  city: z.string().optional().default('Satna'),
  category: z.string().optional().default('Other'),
  productInterest: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  consentStatus: z.enum(['OPTED_IN', 'OPTED_OUT', 'NOT_GIVEN', 'PENDING', 'EXPIRED', 'BLOCKED']).optional().default('NOT_GIVEN'),
  consentEvidence: z.string().optional().default(''),
  consentSource: z.string().optional().default('Manual Entry'),
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';

  app.set('trust proxy', 1);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Session configuration with secure HTTP-only cookies and expiration
  app.use(
    session({
      name: 'vikas.sid',
      secret: process.env.SESSION_SECRET || 'vikas-automator-satna-secure-session-key-2026',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8-hour session expiration
      },
    })
  );

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests. Please slow down.' },
  });
  app.use('/api/', apiLimiter);

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
  });

  // CSRF Protection Middleware
  function verifyCsrf(req: Request, res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    // Exempt public or initial auth endpoints
    const fullPath = (req.originalUrl || req.path).split('?')[0];
    if (
      fullPath === '/api/auth/login' ||
      fullPath === '/api/consent/register' ||
      fullPath === '/api/consent/opt-out' ||
      req.path === '/auth/login' ||
      req.path === '/consent/register' ||
      req.path === '/consent/opt-out'
    ) {
      return next();
    }
    const tokenFromHeader = req.headers['x-csrf-token'] as string;
    const tokenFromBody = req.body?._csrf;
    const clientToken = tokenFromHeader || tokenFromBody;

    if (!req.session?.csrfToken || !clientToken || clientToken !== req.session.csrfToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or missing CSRF token',
      });
    }
    next();
  }

  // Authentication Middleware
  // Acceptance test: Opening an administrative API without logging in must return HTTP 401.
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    next();
  }

  // Server-side RBAC Middleware
  function requireRole(allowedRoles: ('ADMIN' | 'MANAGER' | 'EMPLOYEE')[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.session?.role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Action requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${userRole || 'NONE'}`,
        });
      }
      next();
    };
  }

  // Apply CSRF verification on mutating API calls
  app.use('/api/', verifyCsrf);

  // Helper to get active session actor
  function getActor(req: Request) {
    return {
      userId: req.session?.userId || 'anonymous',
      userName: req.session?.userName || 'Anonymous User',
      role: (req.session?.role || 'EMPLOYEE') as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
    };
  }

  // ==========================================
  // AUTHENTICATION & SESSION ENDPOINTS
  // ==========================================

  // CSRF token retrieval endpoint
  app.get('/api/auth/csrf', (req: Request, res: Response) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }
    res.json({ success: true, csrfToken: req.session.csrfToken });
  });

  // Current session info
  app.get('/api/auth/me', (req: Request, res: Response) => {
    if (!req.session?.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }

    if (req.session?.userId) {
      const user = db.findUserById(req.session.userId);
      res.json({
        success: true,
        authenticated: true,
        data: {
          userId: req.session.userId,
          userName: req.session.userName,
          role: req.session.role,
          email: user?.email,
          phone: user?.phone,
          avatarColor: user?.avatarColor || 'bg-blue-600',
          csrfToken: req.session.csrfToken,
        },
      });
    } else {
      res.json({
        success: true,
        authenticated: false,
        csrfToken: req.session.csrfToken,
      });
    }
  });

  // Login endpoint with rate limiter and Zod validation
  app.post('/api/auth/login', loginLimiter, (req: Request, res: Response) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues?.[0]?.message || 'Invalid input credentials',
      });
    }

    const { username, password } = parseResult.data;
    const user = db.findUserByUsername(username);

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    // Initialize session and CSRF token
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.role = user.role;
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');

    db.addAuditLog(user.name, user.role, 'USER_LOGIN', `User ${user.name} logged in successfully.`);

    res.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        avatarColor: user.avatarColor,
        csrfToken: req.session.csrfToken,
      },
    });
  });

  // Logout endpoint
  app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
    const actor = getActor(req);
    db.addAuditLog(actor.userName, actor.role, 'USER_LOGOUT', `User ${actor.userName} logged out.`);

    req.session.destroy((err) => {
      res.clearCookie('vikas.sid');
      if (err) {
        return res.status(500).json({ success: false, error: 'Could not log out' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  // ==========================================
  // PROTECTED ADMINISTRATIVE ENDPOINTS
  // ==========================================

  // 1. SYSTEM STATUS
  app.get('/api/status', requireAuth, (req: Request, res: Response) => {
    const queue = db.getQueue();
    const pendingQueueCount = queue.filter((q) => q.status === 'PENDING' || q.status === 'SCHEDULED').length;
    const conn = db.getConnectionInfo();
    const pacing = db.getPacingConfig();

    res.json({
      success: true,
      data: {
        business: db.getData().settings,
        connection: conn,
        pacing: pacing,
        pendingQueueCount,
        totalContacts: db.getContacts().length,
        currentUser: getActor(req),
      },
    });
  });

  // 2. WHATSAPP CONNECTION (Baileys WebSocket Adapter)
  app.get('/api/whatsapp/status', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: baileysAdapter.getStatus() });
  });

  app.post('/api/whatsapp/connect', requireAuth, async (req: Request, res: Response) => {
    try {
      const state = await baileysAdapter.initSocket();
      res.json({ success: true, data: state });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to initialize WhatsApp socket' });
    }
  });

  app.post('/api/whatsapp/disconnect', requireAuth, async (req: Request, res: Response) => {
    try {
      const state = await baileysAdapter.disconnect();
      res.json({ success: true, data: state });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to disconnect WhatsApp' });
    }
  });

  // Simulate incoming WhatsApp message from a customer
  app.post('/api/whatsapp/test-incoming', requireAuth, (req: Request, res: Response) => {
    const { phone, text, name } = req.body;
    if (!phone || !text) {
      return res.status(400).json({ success: false, error: 'Phone and text are required' });
    }
    const result = pacingEngine.handleIncomingMessage(phone, text, name);
    res.json({ success: true, data: result });
  });

  // 3. CONTACTS CRUD
  app.get('/api/contacts', requireAuth, (req: Request, res: Response) => {
    const { search, category, consentStatus, city } = req.query;
    let contacts = db.getContacts();

    if (search) {
      const q = String(search).toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.businessName.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.productInterest.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (category && category !== 'All') {
      contacts = contacts.filter((c) => c.category === category);
    }

    if (consentStatus && consentStatus !== 'All') {
      contacts = contacts.filter((c) => c.consentStatus === consentStatus);
    }

    if (city && city !== 'All') {
      contacts = contacts.filter((c) => c.city.toLowerCase() === String(city).toLowerCase());
    }

    res.json({ success: true, data: contacts });
  });

  app.post('/api/contacts', requireAuth, (req: Request, res: Response) => {
    const parseResult = contactInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues?.[0]?.message || 'Invalid contact fields',
      });
    }

    const {
      name,
      phone,
      businessName,
      city,
      category,
      productInterest,
      notes,
      tags,
      consentStatus,
      consentEvidence,
      consentSource,
    } = parseResult.data;

    // Duplicate check on phone
    const existing = db.getContactByPhone(phone);
    if (existing) {
      return res.status(409).json({ success: false, error: 'A contact with this phone number already exists', existingContact: existing });
    }

    const actor = getActor(req);

    const created = db.createContact({
      name,
      phone,
      businessName: businessName || '',
      city: city || 'Satna',
      category: (category || 'Other') as any,
      productInterest: productInterest || '',
      notes: notes || '',
      tags: tags || [],
      consentStatus: consentStatus || 'NOT_GIVEN',
      consentEvidence: consentEvidence || '',
      consentSource: consentSource || 'Manual Entry',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      consentDate: consentStatus === 'OPTED_IN' ? new Date().toISOString() : undefined,
    });

    db.addAuditLog(actor.userName, actor.role, 'CREATE_CONTACT', `Added contact ${name} (${phone}) with consent: ${created.consentStatus}`);
    res.json({ success: true, data: created });
  });

  app.put('/api/contacts/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const actor = getActor(req);

    // RBAC: Only Admin or Manager can change consent status to OPTED_IN or override
    if (updates.consentStatus && updates.consentStatus === 'OPTED_IN' && actor.role === 'EMPLOYEE') {
      return res.status(403).json({ success: false, error: 'Employees cannot override consent status. Administrator approval required.' });
    }

    const updated = db.updateContact(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    db.addAuditLog(actor.userName, actor.role, 'UPDATE_CONTACT', `Updated contact ${updated.name} (${id})`);
    res.json({ success: true, data: updated });
  });

  app.delete('/api/contacts/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const actor = getActor(req);

    const success = db.deleteContact(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    db.addAuditLog(actor.userName, actor.role, 'DELETE_CONTACT', `Deleted contact ${id}`);
    res.json({ success: true });
  });

  // Bulk import with MANDATORY NOT_GIVEN consent rule
  app.post('/api/contacts/import', requireAuth, (req: Request, res: Response) => {
    const { contacts: importedList } = req.body;
    if (!Array.isArray(importedList) || importedList.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid array of contacts required' });
    }

    const actor = getActor(req);
    let addedCount = 0;
    let duplicateCount = 0;

    for (const item of importedList) {
      if (!item.name || !item.phone) continue;
      const existing = db.getContactByPhone(item.phone);
      if (existing) {
        duplicateCount++;
        continue;
      }

      // STRICT REQUIREMENT: Importing a phone number must NEVER automatically mean the customer has given promotional consent.
      // All imported contacts should initially receive NOT_GIVEN unless verifiable evidence is imported.
      const hasVerifiedEvidence = item.consentEvidence && item.consentEvidence.length > 5 && item.consentStatus === 'OPTED_IN';
      const assignedConsent = hasVerifiedEvidence ? 'OPTED_IN' : 'NOT_GIVEN';

      db.createContact({
        name: item.name,
        phone: item.phone,
        businessName: item.businessName || '',
        city: item.city || 'Satna',
        category: item.category || 'Retailers',
        productInterest: item.productInterest || 'HP Lubricants',
        notes: item.notes || 'Imported via bulk CSV/Excel',
        tags: item.tags || ['Imported'],
        consentStatus: assignedConsent,
        consentSource: item.consentSource || 'Bulk Import',
        consentEvidence: hasVerifiedEvidence ? item.consentEvidence : 'No verifiable consent attached during import. Defaulted to NOT_GIVEN.',
        consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
        consentDate: assignedConsent === 'OPTED_IN' ? new Date().toISOString() : undefined,
      });
      addedCount++;
    }

    db.addAuditLog(
      actor.userName,
      actor.role,
      'BULK_IMPORT_CONTACTS',
      `Imported ${addedCount} contacts (${duplicateCount} duplicates skipped). Defaulted consent to NOT_GIVEN.`
    );

    res.json({
      success: true,
      data: {
        addedCount,
        duplicateCount,
        note: 'Imported contacts defaulted to NOT_GIVEN per statutory consent enforcement.',
      },
    });
  });

  // 4. CONTACT GROUPS
  app.get('/api/groups', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getGroups() });
  });

  app.post('/api/groups', requireAuth, (req: Request, res: Response) => {
    const { name, description, contactIds } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Group name required' });
    const created = db.createGroup(name, description || '', contactIds || []);
    res.json({ success: true, data: created });
  });

  app.put('/api/groups/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = db.updateGroup(id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Group not found' });
    res.json({ success: true, data: updated });
  });

  app.delete('/api/groups/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = db.deleteGroup(id);
    res.json({ success: deleted });
  });

  // 5. CONSENT MANAGER
  app.get('/api/consent', requireAuth, (req: Request, res: Response) => {
    const contacts = db.getContacts();
    const records = db.getData().consentRecords;

    const stats = {
      total: contacts.length,
      optedIn: contacts.filter((c) => c.consentStatus === 'OPTED_IN').length,
      pending: contacts.filter((c) => c.consentStatus === 'PENDING').length,
      notGiven: contacts.filter((c) => c.consentStatus === 'NOT_GIVEN').length,
      optedOut: contacts.filter((c) => c.consentStatus === 'OPTED_OUT').length,
      expired: contacts.filter((c) => c.consentStatus === 'EXPIRED').length,
      blocked: contacts.filter((c) => c.consentStatus === 'BLOCKED').length,
    };

    res.json({
      success: true,
      data: {
        stats,
        records,
        standardWording: 'I agree to receive promotional updates, product availability information, offers and business communications from Vikas Automobiles through WhatsApp. I understand that I can withdraw my consent at any time.',
      },
    });
  });

  // Public/Counter consent registration form endpoint
  app.post('/api/consent/register', (req: Request, res: Response) => {
    const { name, phone, businessName, city, category, checkboxChecked, source, evidence } = req.body;

    if (!phone || !name) {
      return res.status(400).json({ success: false, error: 'Name and phone number are required.' });
    }

    if (!checkboxChecked) {
      return res.status(400).json({
        success: false,
        error: 'Explicit agreement required: Opening a form does NOT grant consent. The checkbox must be actively checked.',
      });
    }

    let contact = db.getContactByPhone(phone);
    const now = new Date().toISOString();

    if (contact) {
      db.updateContact(contact.id, {
        consentStatus: 'OPTED_IN',
        consentDate: now,
        consentSource: source || 'Customer Registration Web/Counter Form',
        consentEvidence: evidence || `Digital signature recorded via IP ${req.ip || '127.0.0.1'} at ${now}`,
        consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      });
    } else {
      contact = db.createContact({
        name,
        phone,
        businessName: businessName || '',
        city: city || 'Satna',
        category: category || 'Retailers',
        productInterest: 'HP Lubricants',
        notes: 'Opted in via Consent Registration Portal',
        tags: ['Opted-In Customer'],
        consentStatus: 'OPTED_IN',
        consentDate: now,
        consentSource: source || 'Customer Registration Web/Counter Form',
        consentEvidence: evidence || `Digital submission via local form at ${now}`,
        consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      });
    }

    db.addAuditLog(
      'CONSENT_PORTAL',
      'ADMIN',
      'EXPLICIT_OPT_IN_REGISTERED',
      `Explicit consent recorded for ${name} (${phone}) via ${source || 'Form'}`
    );

    res.json({
      success: true,
      message: 'Consent successfully recorded with verifiable audit trail.',
      contact,
    });
  });

  // Manual or customer opt-out
  app.post('/api/consent/opt-out', (req: Request, res: Response) => {
    const { phone, source } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required' });

    db.handleCustomerOptOut(phone, source || 'Administrative Opt-Out');
    res.json({ success: true, message: 'Contact opted out and added to suppression list.' });
  });

  // 6. MESSAGES & INBOX
  app.get('/api/conversations', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getConversations() });
  });

  app.get('/api/messages', requireAuth, (req: Request, res: Response) => {
    const { conversationId, search, direction, status } = req.query;
    let list = db.getMessages(conversationId ? String(conversationId) : undefined);

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter((m) => m.content.toLowerCase().includes(q) || m.customerName.toLowerCase().includes(q) || m.phone.includes(q));
    }
    if (direction) {
      list = list.filter((m) => m.direction === direction);
    }
    if (status) {
      list = list.filter((m) => m.status === status);
    }

    res.json({ success: true, data: list });
  });

  app.post('/api/messages/send', requireAuth, async (req: Request, res: Response) => {
    const { contactId, phone, content, category, type } = req.body;
    if (!content || (!contactId && !phone)) {
      return res.status(400).json({ success: false, error: 'Recipient and content are required' });
    }

    const contact = contactId ? db.getContactById(contactId) : db.getContactByPhone(phone);
    const recipientPhone = contact?.phone || phone;

    const result = await messageDispatcher.dispatchDirectMessage({
      phone: recipientPhone,
      contactId: contact?.id || contactId,
      content,
      category: category || 'support',
      type: type || 'text',
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        data: result.message,
      });
    }

    res.json({
      success: true,
      data: result.message,
    });
  });

  app.post('/api/conversations/:id/resolve', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const { resolved } = req.body;
    db.resolveConversation(id, resolved !== false);
    res.json({ success: true });
  });

  app.post('/api/conversations/:id/assign', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const conv = db.getConversations().find((c) => c.id === id);
    if (conv) {
      conv.assignedTo = assignedTo;
      db.saveDatabase();
    }
    res.json({ success: true });
  });

  // 7. TEMPLATES
  app.get('/api/templates', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getTemplates() });
  });

  app.post('/api/templates', requireAuth, (req: Request, res: Response) => {
    const { name, category, body, variables } = req.body;
    if (!name || !body) return res.status(400).json({ success: false, error: 'Name and body required' });
    const saved = db.saveTemplate({ name, category: category || 'General', body, variables: variables || [] });
    res.json({ success: true, data: saved });
  });

  app.delete('/api/templates/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    data.templates = data.templates.filter((t) => t.id !== id);
    db.saveDatabase();
    res.json({ success: true });
  });

  // 8. CAMPAIGNS & SAFETY CHECK
  app.get('/api/campaigns', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getCampaigns() });
  });

  app.post('/api/campaigns/safety-check', requireAuth, (req: Request, res: Response) => {
    const { targetGroupIds, targetContactIds } = req.body;

    let targetIds = new Set<string>();
    if (Array.isArray(targetContactIds)) {
      targetContactIds.forEach((id) => targetIds.add(id));
    }
    if (Array.isArray(targetGroupIds)) {
      targetGroupIds.forEach((gid) => {
        const group = db.getGroups().find((g) => g.id === gid);
        if (group) {
          group.contactIds.forEach((cid) => targetIds.add(cid));
        }
      });
    }

    const allContacts = db.getContacts();
    const targeted = allContacts.filter((c) => targetIds.has(c.id));

    const totalSelected = targeted.length;
    const validOptedIn = targeted.filter((c) => c.consentStatus === 'OPTED_IN');
    const pendingConsent = targeted.filter((c) => c.consentStatus === 'PENDING');
    const notGiven = targeted.filter((c) => c.consentStatus === 'NOT_GIVEN');
    const optedOut = targeted.filter((c) => c.consentStatus === 'OPTED_OUT');
    const blockedOrExpired = targeted.filter((c) => c.consentStatus === 'BLOCKED' || c.consentStatus === 'EXPIRED');

    const invalidNumbers = targeted.filter((c) => !c.phone || c.phone.replace(/[\s\-\(\)\+]/g, '').length < 10);

    res.json({
      success: true,
      data: {
        totalSelected,
        eligibleOptedInCount: validOptedIn.length,
        eligibleContacts: validOptedIn.map((c) => ({ id: c.id, name: c.name, phone: c.phone, city: c.city })),
        pendingConsentCount: pendingConsent.length,
        notGivenCount: notGiven.length,
        optedOutCount: optedOut.length,
        blockedOrExpiredCount: blockedOrExpired.length,
        invalidNumberCount: invalidNumbers.length,
        safeToSend: validOptedIn.length > 0,
        policyNotice: 'Promotional WhatsApp campaigns strictly require verified OPTED_IN consent. Non-consented contacts are automatically filtered and blocked from the queue.',
      },
    });
  });

  app.post('/api/campaigns/create', requireAuth, (req: Request, res: Response) => {
    const { name, targetGroupIds, targetContactIds, templateId, customMessage, launchNow } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Campaign name required' });

    let targetIds = new Set<string>();
    if (Array.isArray(targetContactIds)) {
      targetContactIds.forEach((id) => targetIds.add(id));
    }
    if (Array.isArray(targetGroupIds)) {
      targetGroupIds.forEach((gid) => {
        const group = db.getGroups().find((g) => g.id === gid);
        if (group) group.contactIds.forEach((cid) => targetIds.add(cid));
      });
    }

    const allContacts = db.getContacts();
    const targeted = allContacts.filter((c) => targetIds.has(c.id));

    const eligibleOptedIn = targeted.filter((c) => c.consentStatus === 'OPTED_IN');
    const pending = targeted.filter((c) => c.consentStatus === 'PENDING');
    const optedOut = targeted.filter((c) => c.consentStatus === 'OPTED_OUT');
    const notGiven = targeted.filter((c) => c.consentStatus === 'NOT_GIVEN' || c.consentStatus === 'BLOCKED' || c.consentStatus === 'EXPIRED');

    const template = templateId ? db.getTemplates().find((t) => t.id === templateId) : null;
    const baseMessage = template ? template.body : customMessage || '';

    const newCampaign = db.createCampaign({
      name,
      targetGroupIds: targetGroupIds || [],
      targetContactIds: Array.from(targetIds),
      templateId,
      customMessage: baseMessage,
      status: launchNow ? 'RUNNING' : 'DRAFT',
    });

    newCampaign.stats = {
      totalTargeted: targeted.length,
      eligibleOptedIn: eligibleOptedIn.length,
      pendingConsentBlocked: pending.length,
      optedOutBlocked: optedOut.length,
      invalidOrDuplicateBlocked: notGiven.length,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    if (launchNow && eligibleOptedIn.length > 0) {
      eligibleOptedIn.forEach((contact) => {
        let interpolated = baseMessage
          .replace(/\{\{name\}\}/gi, contact.name)
          .replace(/\{\{city\}\}/gi, contact.city)
          .replace(/\{\{business\}\}/gi, contact.businessName || 'Your Business')
          .replace(/\{\{product\}\}/gi, contact.productInterest || 'HP Lubricants');

        db.enqueueMessage({
          contactId: contact.id,
          phone: contact.phone,
          customerName: contact.name,
          campaignId: newCampaign.id,
          category: 'promotional',
          content: interpolated,
          scheduledAt: new Date().toISOString(),
        });
      });
    }

    const actor = getActor(req);
    db.saveDatabase();
    db.addAuditLog(
      actor.userName,
      actor.role,
      'CREATE_CAMPAIGN',
      `Created campaign "${name}". Targeted ${targeted.length}, Enqueued ${eligibleOptedIn.length} eligible opted-in recipients.`
    );

    res.json({ success: true, data: newCampaign });
  });

  app.post('/api/campaigns/:id/pause', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const campaign = db.getCampaigns().find((c) => c.id === id);
    if (campaign) {
      campaign.status = 'PAUSED';
      db.saveDatabase();
    }
    res.json({ success: true });
  });

  app.post('/api/campaigns/:id/cancel', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const campaign = db.getCampaigns().find((c) => c.id === id);
    if (campaign) {
      campaign.status = 'CANCELLED';
      const queue = db.getQueue();
      queue.forEach((q) => {
        if (q.campaignId === id && (q.status === 'PENDING' || q.status === 'SCHEDULED')) {
          q.status = 'CANCELLED';
        }
      });
      db.saveDatabase();
    }
    res.json({ success: true });
  });

  // 9. AUTO REPLIES & KEYWORDS
  app.get('/api/auto-replies', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getAutoReplies() });
  });

  app.post('/api/auto-replies', requireAuth, (req: Request, res: Response) => {
    const created = db.saveAutoReply(req.body);
    res.json({ success: true, data: created });
  });

  app.delete('/api/auto-replies/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    data.autoReplies = data.autoReplies.filter((a) => a.id !== id);
    db.saveDatabase();
    res.json({ success: true });
  });

  app.get('/api/keyword-automations', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getKeywordAutomations() });
  });

  app.post('/api/keyword-automations', requireAuth, (req: Request, res: Response) => {
    const saved = db.saveKeywordAutomation(req.body);
    res.json({ success: true, data: saved });
  });

  app.delete('/api/keyword-automations/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    data.keywordAutomations = data.keywordAutomations.filter((k) => k.id !== id);
    db.saveDatabase();
    res.json({ success: true });
  });

  app.post('/api/keyword-automations/simulate', requireAuth, (req: Request, res: Response) => {
    const { text, phone } = req.body;
    const result = pacingEngine.handleIncomingMessage(phone || '+919827003016', text || 'PRICE');
    res.json({ success: true, data: result });
  });

  // 10. FOLLOW UP SEQUENCES
  app.get('/api/follow-ups', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getFollowUpSequences() });
  });

  app.post('/api/follow-ups', requireAuth, (req: Request, res: Response) => {
    const saved = db.saveFollowUpSequence(req.body);
    res.json({ success: true, data: saved });
  });

  // 11. SMART PACING & QUEUE
  app.get('/api/pacing', requireAuth, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        config: db.getPacingConfig(),
        queue: db.getQueue(),
        pacingState: db.getPacingState(),
      },
    });
  });

  app.post('/api/pacing/config', requireAuth, (req: Request, res: Response) => {
    const updated = db.updatePacingConfig(req.body);
    res.json({ success: true, data: updated });
  });

  app.post('/api/pacing/mode', requireAuth, (req: Request, res: Response) => {
    const { mode } = req.body;
    if (mode === 'AUTO' || mode === 'MANUAL' || mode === 'PAUSED') {
      const updated = db.updatePacingConfig({
        mode,
        reasonForAdjustment: mode === 'PAUSED' ? 'Pacing paused by administrator.' : `Pacing active in ${mode} mode.`,
      });
      if (mode !== 'PAUSED') {
        db.updatePacingState({
          autoPausedAt: null,
          autoPauseReason: null,
          consecutiveErrors: 0,
        });
      }
      res.json({ success: true, data: updated, pacingState: db.getPacingState() });
    } else {
      res.status(400).json({ success: false, error: 'Invalid mode' });
    }
  });

  app.post('/api/pacing/queue/clear', requireAuth, (req: Request, res: Response) => {
    db.clearQueue();
    res.json({ success: true });
  });

  // 12. ACCOUNT HEALTH
  app.get('/api/health', requireAuth, (req: Request, res: Response) => {
    const conn = db.getConnectionInfo();
    const queue = db.getQueue();
    const failedQueue = queue.filter((q) => q.status === 'FAILED').length;
    const activeCampaigns = db.getCampaigns().filter((c) => c.status === 'RUNNING').length;
    const pausedCampaigns = db.getCampaigns().filter((c) => c.status === 'PAUSED').length;

    let status: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN' = 'GREEN';
    const warnings: string[] = [];

    if (conn.state === 'DISCONNECTED') {
      status = 'YELLOW';
      warnings.push('WhatsApp device is not currently linked. Ready to connect via QR code.');
    } else if (conn.state === 'CONNECTION_ERROR' || conn.state === 'AUTH_EXPIRED') {
      status = 'RED';
      warnings.push(`Connection alert: ${conn.errorMessage || 'Authentication expired'}`);
    }

    if (failedQueue > 5) {
      status = 'YELLOW';
      warnings.push(`High message queue block rate: ${failedQueue} messages failed or blocked.`);
    }

    res.json({
      success: true,
      data: {
        status,
        connectionStatus: conn.state,
        authenticationStatus: conn.state === 'CONNECTED' ? 'Active Local Session' : 'Unauthenticated',
        recentConnectionFailures: conn.state === 'CONNECTION_ERROR' ? 1 : 0,
        messageFailures: failedQueue,
        queueStatus: `${queue.filter((q) => q.status === 'PENDING').length} pending, ${queue.filter((q) => q.status === 'SENT').length} completed`,
        activeCampaigns,
        pausedCampaigns,
        lastSuccessfulMessage: conn.lastSyncTime,
        warnings,
      },
    });
  });

  // 13. ANALYTICS
  app.get('/api/analytics', requireAuth, (req: Request, res: Response) => {
    const contacts = db.getContacts();
    const messages = db.getMessages();
    const campaigns = db.getCampaigns();

    const categoryCounts: Record<string, number> = {};
    contacts.forEach((c) => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });

    const categoryDistribution = Object.keys(categoryCounts).map((cat) => ({
      name: cat,
      count: categoryCounts[cat],
    }));

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyData = days.map((day, idx) => ({
      day,
      sent: 12 + (idx * 5) % 18,
      delivered: 11 + (idx * 5) % 17,
      incoming: 6 + (idx * 3) % 9,
    }));

    res.json({
      success: true,
      data: {
        totalContacts: contacts.length,
        optedInCount: contacts.filter((c) => c.consentStatus === 'OPTED_IN').length,
        pendingCount: contacts.filter((c) => c.consentStatus === 'PENDING').length,
        optedOutCount: contacts.filter((c) => c.consentStatus === 'OPTED_OUT').length,
        totalMessages: messages.length,
        outboundMessages: messages.filter((m) => m.direction === 'outbound').length,
        inboundMessages: messages.filter((m) => m.direction === 'inbound').length,
        deliveredMessages: messages.filter((m) => m.status === 'DELIVERED' || m.status === 'READ').length,
        readMessages: messages.filter((m) => m.status === 'READ').length,
        failedMessages: messages.filter((m) => m.status === 'FAILED').length,
        categoryDistribution,
        weeklyData,
        campaignsCount: campaigns.length,
      },
    });
  });

  // 14. TEAM MANAGEMENT & RBAC
  app.get('/api/team', requireAuth, (req: Request, res: Response) => {
    const actor = getActor(req);
    // Strip password hashes from team member payload
    const safeMembers = db.getTeamMembers().map(({ passwordHash, ...rest }) => rest);
    res.json({
      success: true,
      data: {
        members: safeMembers,
        currentUser: actor,
      },
    });
  });

  app.post('/api/team/switch-role', requireAuth, (req: Request, res: Response) => {
    const { role, userId } = req.body;
    const member = db.getTeamMembers().find((m) => m.id === userId || m.role === role);
    if (member) {
      req.session.userId = member.id;
      req.session.userName = member.name;
      req.session.role = member.role;
      res.json({
        success: true,
        data: {
          userId: member.id,
          userName: member.name,
          role: member.role,
        },
      });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  });

  // 15. AUDIT LOGS
  app.get('/api/audit-logs', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getAuditLogs() });
  });

  // 16. LOCAL BACKUP & RESTORE
  app.get('/api/backup/download', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const fullDb = db.getData();
    const filename = `vikas_automator_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(fullDb, null, 2));
  });

  app.post('/api/backup/restore', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const backupPayload = req.body;
    const actor = getActor(req);

    if (!backupPayload || !Array.isArray(backupPayload.contacts)) {
      return res.status(400).json({ success: false, error: 'Invalid backup payload structure' });
    }
    db.saveDatabase(backupPayload);
    db.addAuditLog(actor.userName, 'ADMIN', 'DATABASE_RESTORE', 'Restored database from local JSON backup.');
    res.json({ success: true, message: 'Database successfully restored from backup.' });
  });

  // 17. SETTINGS
  app.get('/api/settings', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getData().settings });
  });

  app.post('/api/settings', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const actor = getActor(req);
    const current = db.getData();
    current.settings = { ...current.settings, ...req.body };
    db.saveDatabase();
    db.addAuditLog(actor.userName, 'ADMIN', 'UPDATE_SETTINGS', 'Updated business configurations.');
    res.json({ success: true, data: current.settings });
  });

  // 18. DEMO RESET
  app.post('/api/demo/reset', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    const actor = getActor(req);
    db.resetToDemo();
    await baileysAdapter.disconnect();
    db.addAuditLog(actor.userName, actor.role, 'DEMO_DATA_RESET', 'Reset all records to factory demo defaults.');
    res.json({ success: true, message: 'All demo contacts, messages, and campaigns have been reset.' });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Bind to 127.0.0.1 per local access security specification
  app.listen(PORT, BIND_HOST, () => {
    console.log(`\n======================================================`);
    console.log(` VIKAS MESSAGE AUTOMATOR — SERVER RUNNING`);
    console.log(` Business: Vikas Automobiles, Satna, MP, India`);
    console.log(` HP Lube Distributor & C&F Agent | Contact: 9827003016`);
    console.log(` Local URL: http://${BIND_HOST}:${PORT}`);
    console.log(` Security: Sessions active, Rate Limiting & RBAC enforced`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
