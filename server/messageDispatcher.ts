import { db } from './db';
import { whatsappAdapter } from './baileysAdapter';
import { MessageQueueItem, Contact, Message, MessageType } from '../src/types/index';

export interface DispatchValidationResult {
  valid: boolean;
  reason?: string;
  actionRequired?: 'PAUSE' | 'CANCEL' | 'FAIL';
  contact?: Contact;
}

export interface DispatchResult {
  success: boolean;
  messageId?: string;
  status: 'SENT' | 'FAILED';
  error?: string;
}

export class MessageDispatcher {
  /**
   * Comprehensive validation pipeline:
   * 1. Verify WhatsApp connection
   * 2. Verify recipient number formatting
   * 3. Verify suppression list (opted-out numbers)
   * 4. Verify recipient consent (OPTED_IN strictly required for promotional messages)
   * 5. Verify campaign status (must not be PAUSED, CANCELLED, or COMPLETED)
   */
  public validateDispatch(params: {
    phone: string;
    contactId?: string;
    category?: string;
    campaignId?: string;
  }): DispatchValidationResult {
    const { phone, contactId, category, campaignId } = params;

    // 1. Verify recipient phone number format
    const cleanDigits = (phone || '').replace(/[\s\-\(\)\+]/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      return {
        valid: false,
        actionRequired: 'FAIL',
        reason: `INVALID_PHONE_NUMBER: Phone number "${phone}" is invalid (must have at least 10 digits).`,
      };
    }

    // 2. Check suppression list (Opted-out or blocked numbers must never receive outbound campaigns)
    if (db.isSuppressed(phone)) {
      return {
        valid: false,
        actionRequired: 'CANCEL',
        reason: `SUPPRESSION_LIST_BLOCKED: Recipient ${phone} has opted out or is on the suppression list.`,
      };
    }

    // 3. Verify recipient consent
    const contact = contactId ? db.getContactById(contactId) : db.getContactByPhone(phone);
    if (category === 'promotional') {
      if (!contact || contact.consentStatus !== 'OPTED_IN') {
        const isOptedOut = contact?.consentStatus === 'OPTED_OUT';
        return {
          valid: false,
          actionRequired: isOptedOut ? 'CANCEL' : 'FAIL',
          reason: `CONSENT_BLOCKED: Contact ${contact ? contact.consentStatus : 'NOT_FOUND'}. Promotional messaging strictly prohibited without explicit OPTED_IN permission.`,
          contact,
        };
      }
    }

    // 4. Verify campaign status (if attached to a campaign)
    if (campaignId) {
      const campaign = db.getCampaigns().find((c) => c.id === campaignId);
      if (!campaign) {
        return {
          valid: false,
          actionRequired: 'FAIL',
          reason: `CAMPAIGN_NOT_FOUND: Campaign ${campaignId} does not exist.`,
        };
      }

      if (campaign.status === 'PAUSED') {
        return {
          valid: false,
          actionRequired: 'PAUSE',
          reason: `CAMPAIGN_PAUSED: Campaign "${campaign.name}" is currently paused.`,
        };
      }

      if (campaign.status === 'CANCELLED') {
        return {
          valid: false,
          actionRequired: 'CANCEL',
          reason: `CAMPAIGN_CANCELLED: Campaign "${campaign.name}" has been cancelled.`,
        };
      }

      if (campaign.status === 'COMPLETED') {
        return {
          valid: false,
          actionRequired: 'CANCEL',
          reason: `CAMPAIGN_COMPLETED: Campaign "${campaign.name}" is already completed.`,
        };
      }
    }

    // 5. Verify WhatsApp connection
    if (!whatsappAdapter.isConnected()) {
      return {
        valid: false,
        actionRequired: 'PAUSE',
        reason: 'WhatsApp device is not currently connected via Linked Devices.',
        contact,
      };
    }

    return {
      valid: true,
      contact,
    };
  }

  /**
   * Dispatches a queued message item through the authentic WhatsApp session
   */
  public async dispatchQueueItem(item: MessageQueueItem): Promise<DispatchResult> {
    // Run validation pipeline
    const validation = this.validateDispatch({
      phone: item.phone,
      contactId: item.contactId,
      category: item.category,
      campaignId: item.campaignId,
    });

    if (!validation.valid) {
      if (validation.actionRequired === 'PAUSE') {
        item.status = 'PAUSED';
        item.failureReason = validation.reason;
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: validation.reason };
      }

      if (validation.actionRequired === 'CANCEL') {
        item.status = 'CANCELLED';
        item.failureReason = validation.reason;
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: validation.reason };
      }

      // Mark as permanently failed
      item.status = 'FAILED';
      item.failureReason = validation.reason;

      // Update campaign stats only from confirmed events
      if (item.campaignId) {
        const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
        if (campaign) {
          campaign.stats.failed = (campaign.stats.failed || 0) + 1;
        }
      }

      db.saveDatabase();

      db.addAuditLog(
        'MESSAGE_DISPATCHER',
        'ADMIN',
        'DISPATCH_VALIDATION_BLOCKED',
        `Blocked queue dispatch to ${item.phone}: ${validation.reason}`
      );

      return { success: false, status: 'FAILED', error: validation.reason };
    }

    // Mark as in-flight processing
    item.status = 'PROCESSING';
    db.saveDatabase();

    // CRUCIAL: Final just-in-time opt-out check immediately before each actual transport call
    const isSuppressed = db.isSuppressed(item.phone);
    const latestContact = item.contactId ? db.getContactById(item.contactId) : db.getContactByPhone(item.phone);
    const isPromotional = item.category === 'promotional';

    if (isSuppressed || (isPromotional && latestContact && latestContact.consentStatus !== 'OPTED_IN')) {
      const abortReason = isSuppressed
        ? `Just-in-time opt-out check: Recipient ${item.phone} is on the global suppression list (opted out). Dispatch aborted immediately prior to socket transport.`
        : `Just-in-time opt-out check: Recipient ${item.phone} consent status is ${latestContact?.consentStatus || 'UNKNOWN'} (OPTED_IN required for promotional messages). Dispatch aborted immediately prior to socket transport.`;

      item.status = 'CANCELLED';
      item.failureReason = abortReason;
      db.saveDatabase();

      db.addAuditLog(
        'MESSAGE_DISPATCHER',
        'ADMIN',
        'JUST_IN_TIME_OPT_OUT_ABORT',
        `Aborted socket dispatch for queue item ${item.id} to ${item.phone} immediately prior to send: ${abortReason}`
      );

      return {
        success: false,
        status: 'FAILED',
        error: abortReason,
      };
    }

    // Call authentic WhatsApp transport
    const result = await whatsappAdapter.sendTextMessage(item.phone, item.content);

    if (result.success) {
      // 1. Initial status MUST be SENT, never automatically DELIVERED
      item.status = 'SENT';
      item.connectionResponse = `Dispatched via WhatsApp socket (ID: ${result.messageId})`;
      item.failureReason = undefined;

      // 2. Add real outbound message to DB (isDemo: false)
      db.addMessage({
        whatsappMessageId: result.messageId,
        conversationId: 'conv-' + (validation.contact?.id || item.contactId),
        contactId: validation.contact?.id || item.contactId,
        customerName: item.customerName,
        phone: item.phone,
        direction: 'outbound',
        type: 'text',
        content: item.content,
        status: 'SENT', // Initial outbound status must be SENT, not DELIVERED
        category: item.category,
        campaignId: item.campaignId,
        isDemo: false, // Never mark real outbound as demo
      });

      // 3. Update campaign stats ONLY for confirmed sent event (NOT delivered)
      if (item.campaignId) {
        const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
        if (campaign) {
          campaign.stats.sent = (campaign.stats.sent || 0) + 1;

          // Check if all pending items are now processed
          const remaining = db
            .getQueue()
            .filter((q) => q.campaignId === item.campaignId && (q.status === 'PENDING' || q.status === 'PROCESSING'));
          if (remaining.length === 0) {
            campaign.status = 'COMPLETED';
          }
        }
      }

      db.saveDatabase();

      return {
        success: true,
        messageId: result.messageId,
        status: 'SENT',
      };
    } else {
      // Record socket dispatch failure accurately
      item.status = 'FAILED';
      item.failureReason = result.error || 'WhatsApp socket dispatch failed';

      if (item.campaignId) {
        const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
        if (campaign) {
          campaign.stats.failed = (campaign.stats.failed || 0) + 1;
        }
      }

      db.addAuditLog(
        'MESSAGE_DISPATCHER',
        'ADMIN',
        'DISPATCH_SOCKET_FAILURE',
        `Socket dispatch to ${item.phone} failed: ${result.error}`
      );

      db.saveDatabase();

      return {
        success: false,
        status: 'FAILED',
        error: result.error,
      };
    }
  }

  /**
   * Direct message dispatch (e.g. from 1-on-1 CRM chat or quick send)
   */
  public async dispatchDirectMessage(params: {
    phone: string;
    contactId?: string;
    content: string;
    category?: 'promotional' | 'transactional' | 'support' | 'auto_reply';
    type?: MessageType;
  }): Promise<{ success: boolean; message?: Message; error?: string }> {
    const { phone, contactId, content, category, type } = params;

    const validation = this.validateDispatch({
      phone,
      contactId,
      category: category || 'support',
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    // CRUCIAL: Final JIT check immediately before direct send
    if (category === 'promotional') {
      const isSuppressed = db.isSuppressed(phone);
      const currentContact = contactId ? db.getContactById(contactId) : db.getContactByPhone(phone);
      if (isSuppressed || (currentContact && currentContact.consentStatus !== 'OPTED_IN')) {
        const errorMsg = isSuppressed
          ? `Recipient ${phone} is on suppression list (opted out). Send aborted immediately before transport.`
          : `Recipient ${phone} consent is ${currentContact?.consentStatus || 'UNKNOWN'} (OPTED_IN required). Send aborted.`;
        return {
          success: false,
          error: errorMsg,
        };
      }
    }

    const transportResult = await whatsappAdapter.sendTextMessage(phone, content);

    const contact = validation.contact || (contactId ? db.getContactById(contactId) : db.getContactByPhone(phone));
    const recipientPhone = contact?.phone || phone;

    const created = db.addMessage({
      whatsappMessageId: transportResult.messageId,
      conversationId: 'conv-' + (contact?.id || recipientPhone),
      contactId: contact?.id || recipientPhone,
      customerName: contact?.name || 'Customer',
      phone: recipientPhone,
      direction: 'outbound',
      type: type || 'text',
      content,
      status: transportResult.success ? 'SENT' : 'FAILED',
      failureReason: transportResult.error,
      category: category || 'support',
      isDemo: false, // Never mark as demo on real outbound
    });

    return {
      success: transportResult.success,
      message: created,
      error: transportResult.error,
    };
  }
}

export const messageDispatcher = new MessageDispatcher();
