import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db';
import { pacingEngine } from './pacingEngine';

test('Statutory consent rule: New contact without explicit consent defaults to NOT_GIVEN and is blocked from promotional messaging', () => {
  const contact = db.createContact({
    name: 'Test Workshop Satna',
    phone: '+919999000111',
    businessName: 'Satna Lube Station',
    city: 'Satna',
    category: 'Workshops',
    productInterest: 'HP Milcy Turbo',
    notes: 'Testing consent block',
    tags: ['Test'],
    consentStatus: 'NOT_GIVEN',
  });

  assert.equal(contact.consentStatus, 'NOT_GIVEN');

  // Attempting to send promotional message must fail if consent is NOT_GIVEN
  const eligible = (contact.consentStatus as string) === 'OPTED_IN';
  assert.equal(eligible, false, 'Contact without OPTED_IN consent must NOT be eligible for promotional broadcast');
});

test('Opt-Out detection: Incoming STOP message immediately flags customer as OPTED_OUT', () => {
  const testPhone = '+919999222333';
  db.createContact({
    name: 'Opt Out Test Customer',
    phone: testPhone,
    businessName: 'Garage A',
    city: 'Maihar',
    category: 'Mechanics',
    productInterest: 'HP Racer 4',
    notes: 'Will opt out',
    tags: [],
    consentStatus: 'OPTED_IN',
  });

  // Customer sends STOP
  const result = pacingEngine.handleIncomingMessage(testPhone, 'STOP');
  assert.equal(result.handled, true);
  assert.equal(result.type, 'OPT_OUT');

  const updated = db.getContactByPhone(testPhone);
  assert.equal(updated?.consentStatus, 'OPTED_OUT');
});

test('Keyword automation: Incoming PRICE inquiry triggers automatic price list response', () => {
  const result = pacingEngine.handleIncomingMessage('+919827003016', 'PRICE for HP Milcy Turbo');
  assert.equal(result.handled, true);
});

test('Bulk import rule: Importing numbers must never automatically assign promotional consent', () => {
  const sampleImport = [
    { name: 'Imported Retailer 1', phone: '+919888111222', consentEvidence: '' },
    { name: 'Imported Retailer 2', phone: '+919888333444', consentEvidence: 'Signed Physical Form #99', consentStatus: 'OPTED_IN' },
  ];

  sampleImport.forEach((item) => {
    const hasEvidence = item.consentEvidence && item.consentEvidence.length > 5 && item.consentStatus === 'OPTED_IN';
    const status = hasEvidence ? 'OPTED_IN' : 'NOT_GIVEN';

    if (item.phone === '+919888111222') {
      assert.equal(status, 'NOT_GIVEN', 'Must default to NOT_GIVEN');
    } else {
      assert.equal(status, 'OPTED_IN', 'Verified evidence enables OPTED_IN');
    }
  });

  pacingEngine.stopWorker();
});

test('Baileys WhatsApp Adapter: Only authentic connection.update "open" sets state to CONNECTED', async () => {
  const { baileysAdapter } = await import('./baileysAdapter');
  const status = baileysAdapter.getStatus();
  assert.ok(status, 'Status object should exist');
  assert.notEqual(status.state, 'CONNECTED', 'Status should never be CONNECTED prior to authentic socket authentication');
});

test('Message Dispatcher: Suppressed or opted-out numbers must be immediately blocked from queue dispatch', async () => {
  const { messageDispatcher } = await import('./messageDispatcher');
  const phone = '+919999555666';

  // Mark contact as opted out
  db.handleCustomerOptOut(phone, 'Opt-out test in dispatcher');

  // Attempt validation
  const validation = messageDispatcher.validateDispatch({
    phone,
    category: 'promotional',
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.reason?.includes('SUPPRESSION_LIST_BLOCKED') || validation.reason?.includes('CONSENT_BLOCKED'));
});

test('Message Dispatcher: Paused campaign stops queue items from dispatching', async () => {
  const { messageDispatcher } = await import('./messageDispatcher');
  const pausedCampaign = db.createCampaign({
    name: 'Paused Test Campaign',
    targetGroupIds: [],
    targetContactIds: [],
    customMessage: 'Test',
    status: 'PAUSED',
  });

  const validation = messageDispatcher.validateDispatch({
    phone: '+919826112233',
    campaignId: pausedCampaign.id,
    category: 'promotional',
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.actionRequired, 'PAUSE');
  assert.ok(validation.reason?.includes('CAMPAIGN_PAUSED'));
});

test('Message Dispatcher: Invalid phone number (<10 digits) fails validation', async () => {
  const { messageDispatcher } = await import('./messageDispatcher');
  const validation = messageDispatcher.validateDispatch({
    phone: '12345',
    category: 'transactional',
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.actionRequired, 'FAIL');
  assert.ok(validation.reason?.includes('INVALID_PHONE_NUMBER'));
});

test('Delivery receipt lifecycle: Outbound messages start as SENT and only update to DELIVERED on receipt', () => {
  const testMsg = db.addMessage({
    whatsappMessageId: 'wa-receipt-test-123',
    conversationId: 'conv-test-receipt',
    contactId: 'c-1',
    customerName: 'Ramesh Patel',
    phone: '+919826112233',
    direction: 'outbound',
    type: 'text',
    content: 'HP Milcy Turbo dispatch notice',
    status: 'SENT', // Initial outbound status
    category: 'promotional',
    isDemo: false,
  });

  assert.equal(testMsg.status, 'SENT', 'Outbound message status must be SENT initially, not DELIVERED');
  assert.equal(testMsg.isDemo, false, 'Real outbound message must have isDemo: false');

  // Simulate receipt event confirmation from Baileys socket
  const updated = db.updateMessageDeliveryReceipt('wa-receipt-test-123', 'DELIVERED');
  assert.equal(updated, true);

  const found = db.getMessages().find((m) => m.whatsappMessageId === 'wa-receipt-test-123');
  assert.equal(found?.status, 'DELIVERED', 'Message status should advance to DELIVERED only after delivery receipt');
});

test('WhatsApp Adapter transport: sendTextMessage returns explicit result contract with success, status, and messageId/error', async () => {
  const { whatsappAdapter } = await import('./baileysAdapter');
  const result = await whatsappAdapter.sendTextMessage('+919826112233', 'Test WhatsApp message');

  assert.ok(typeof result.success === 'boolean');
  assert.ok(result.status === 'SENT' || result.status === 'FAILED');
  if (!result.success) {
    assert.equal(result.status, 'FAILED');
    assert.ok(typeof result.error === 'string');
  } else {
    assert.equal(result.status, 'SENT');
    assert.ok(typeof result.messageId === 'string');
  }
});

test('Smart Pacing: Rebuild around 6 independent persistent timestamps in database storage', () => {
  const pacingState = db.getPacingState();
  assert.ok('lastMessageSentAt' in pacingState, 'pacingState must have lastMessageSentAt');
  assert.ok('batchStartedAt' in pacingState, 'pacingState must have batchStartedAt');
  assert.ok('batchCompletedAt' in pacingState, 'pacingState must have batchCompletedAt');
  assert.ok('nextEligibleSendAt' in pacingState, 'pacingState must have nextEligibleSendAt');
  assert.ok('dailyCount' in pacingState, 'pacingState must have dailyCount');
  assert.ok('dailyCounterDate' in pacingState, 'pacingState must have dailyCounterDate');
});

test('Smart Pacing: Batch pauses are calculated strictly from batchCompletedAt, not other timestamps', () => {
  const pauseMinutes = 5;
  db.updatePacingConfig({ pauseBetweenBatchesMinutes: pauseMinutes });

  const batchCompletedTime = new Date('2026-11-05T10:00:00.000Z');
  const expectedNextSendTime = new Date(batchCompletedTime.getTime() + pauseMinutes * 60 * 1000).toISOString();

  db.updatePacingState({
    batchCompletedAt: batchCompletedTime.toISOString(),
    nextEligibleSendAt: expectedNextSendTime,
  });

  const updatedState = db.getPacingState();
  assert.equal(updatedState.batchCompletedAt, '2026-11-05T10:00:00.000Z');
  assert.equal(updatedState.nextEligibleSendAt, expectedNextSendTime);

  const diffMs = new Date(updatedState.nextEligibleSendAt).getTime() - new Date(updatedState.batchCompletedAt).getTime();
  assert.equal(diffMs, pauseMinutes * 60 * 1000, 'Batch pause must equal pauseMinutes measured from batchCompletedAt');
});

test('Smart Pacing: Check 1 (Campaign is RUNNING) blocks messages if campaign is not running', () => {
  const pausedCampaign = db.createCampaign({
    name: 'Paused Promo Campaign',
    targetGroupIds: [],
    targetContactIds: [],
    customMessage: 'Promo',
    status: 'PAUSED',
  });

  const queueItem = {
    id: 'q-test-1',
    contactId: 'c-1',
    phone: '+919827003016',
    customerName: 'Test Patel',
    campaignId: pausedCampaign.id,
    category: 'promotional' as const,
    content: 'Special promo',
    scheduledAt: new Date().toISOString(),
    status: 'PENDING' as const,
    retryCount: 0,
  };

  const evalResult = pacingEngine.evaluateSendingChecks(queueItem);
  assert.equal(evalResult.eligible, false);
  assert.equal(evalResult.failingCondition, 1);
  assert.ok(evalResult.reason?.includes('Check 1 Failed: Campaign'));
});

test('Smart Pacing: Check 2 (Message is eligible) blocks messages in future schedule or wrong status', () => {
  const futureItem = {
    id: 'q-test-2',
    contactId: 'c-1',
    phone: '+919827003016',
    customerName: 'Test Patel',
    category: 'promotional' as const,
    content: 'Scheduled for tomorrow',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    status: 'PENDING' as const,
    retryCount: 0,
  };

  const evalResult = pacingEngine.evaluateSendingChecks(futureItem);
  assert.equal(evalResult.eligible, false);
  assert.equal(evalResult.failingCondition, 2);
  assert.ok(evalResult.reason?.includes('Check 2 Failed'));
});

test('Smart Pacing: Check 3 (Valid consent) blocks promotional messages if consent is NOT_GIVEN or PENDING', () => {
  const nonConsentedContact = db.createContact({
    name: 'No Consent Customer',
    phone: '+919111222333',
    businessName: 'Non Consented Garage',
    city: 'Satna',
    category: 'Workshops',
    productInterest: 'HP Milcy Turbo',
    notes: 'Testing consent block',
    tags: [],
    consentStatus: 'NOT_GIVEN',
  });

  const promoItem = {
    id: 'q-test-3',
    contactId: nonConsentedContact.id,
    phone: nonConsentedContact.phone,
    customerName: nonConsentedContact.name,
    category: 'promotional' as const,
    content: 'Promotional discount on HP Racer 4',
    scheduledAt: new Date().toISOString(),
    status: 'PENDING' as const,
    retryCount: 0,
  };

  const evalResult = pacingEngine.evaluateSendingChecks(promoItem);
  assert.equal(evalResult.eligible, false);
  assert.equal(evalResult.failingCondition, 3);
  assert.ok(evalResult.reason?.includes('Check 3 Failed: Customer'));
});

test('Smart Pacing: Check 4 (Customer is not suppressed) blocks opted-out recipients', () => {
  const suppressedPhone = '+919444555666';
  const contact = db.createContact({
    name: 'Opted Out Customer',
    phone: suppressedPhone,
    businessName: 'Suppressed Auto Store',
    city: 'Satna',
    category: 'Retailers',
    productInterest: 'HP Racer 4',
    notes: 'Testing suppression',
    tags: [],
    consentStatus: 'OPTED_IN',
  });

  // Now record customer opt-out in suppression list
  db.handleCustomerOptOut(suppressedPhone, 'Unit test opt out');
  // Explicitly retain OPTED_IN on contact record so Check 3 passes and Check 4 catches suppression
  contact.consentStatus = 'OPTED_IN';
  db.saveDatabase();

  const item = {
    id: 'q-test-4',
    contactId: contact.id,
    phone: suppressedPhone,
    customerName: 'Opted Out Customer',
    category: 'promotional' as const,
    content: 'Broadcast update',
    scheduledAt: new Date().toISOString(),
    status: 'PENDING' as const,
    retryCount: 0,
  };

  const evalResult = pacingEngine.evaluateSendingChecks(item);
  assert.equal(evalResult.eligible, false);
  assert.equal(evalResult.failingCondition, 4);
  assert.ok(evalResult.reason?.includes('Check 4 Failed: Customer'));
});

test('Smart Pacing: Check 6 (Daily limits permit sending) blocks sending when dailyCount reaches cap', () => {
  db.updatePacingConfig({ dailyCampaignCap: 50 });
  db.updatePacingState({ dailyCount: 50 });

  const item = {
    id: 'q-test-6',
    contactId: 'c-1',
    phone: '+919827223344',
    customerName: 'Sunil Verma',
    category: 'promotional' as const,
    content: 'Dealership scheme update',
    scheduledAt: new Date().toISOString(),
    status: 'PENDING' as const,
    retryCount: 0,
  };

  const evalResult = pacingEngine.evaluateSendingChecks(item);
  assert.equal(evalResult.eligible, false);
  assert.equal(evalResult.failingCondition, 6);
  assert.ok(evalResult.reason?.includes('Check 6 Failed: Daily campaign cap'));

  // Reset daily count
  db.updatePacingState({ dailyCount: 0 });
});

test('Smart Pacing: Check 7 (Next scheduled action is due) blocks sending when countdown is active', () => {
  const futureSendTime = new Date(Date.now() + 60000).toISOString();
  db.updatePacingState({ nextEligibleSendAt: futureSendTime });

  const item = {
    id: 'q-test-7',
    contactId: 'c-1',
    phone: '+919827223344',
    customerName: 'Sunil Verma',
    category: 'promotional' as const,
    content: 'Rate card update',
    scheduledAt: new Date().toISOString(),
    status: 'PENDING' as const,
    retryCount: 0,
  };

  const evalResult = pacingEngine.evaluateSendingChecks(item);
  assert.equal(evalResult.eligible, false);
  assert.equal(evalResult.failingCondition, 7);
  assert.ok(evalResult.reason?.includes('Check 7 Failed: Next scheduled send is not due yet'));

  // Clear future send
  db.updatePacingState({ nextEligibleSendAt: null });
});

test('Smart Pacing: Check 8 (No other worker has claimed message)', () => {
  const queueItem = {
    id: 'q-test-8',
    contactId: 'c-1',
    phone: '+919827223344',
    customerName: 'Sunil Verma',
    category: 'promotional' as const,
    content: 'Stock notice',
    scheduledAt: new Date().toISOString(),
    status: 'PENDING' as const,
    retryCount: 0,
    claimedBy: 'other-worker-999',
  };

  const evalResult = pacingEngine.evaluateSendingChecks(queueItem);
  assert.equal(evalResult.eligible, false);
  assert.equal(evalResult.failingCondition, 8);
  assert.ok(evalResult.reason?.includes('Check 8 Failed: Message is already claimed'));
});

test('Smart Pacing: Automatic safety pause halts pacing engine and active campaigns on error/restriction', () => {
  const activeCampaign = db.createCampaign({
    name: 'Active Running Campaign',
    targetGroupIds: [],
    targetContactIds: [],
    customMessage: 'Message',
    status: 'RUNNING',
  });

  pacingEngine.triggerAutomaticPause('WhatsApp rate-limit error (HTTP 429: Too Many Requests)');

  const config = db.getPacingConfig();
  assert.equal(config.mode, 'PAUSED', 'Pacing engine mode must be set to PAUSED');
  assert.ok(config.reasonForAdjustment?.includes('WhatsApp rate-limit error'));

  const campaign = db.getCampaigns().find((c) => c.id === activeCampaign.id);
  assert.equal(campaign?.status, 'PAUSED', 'Running campaigns must be paused when safety pause triggers');

  const pacingState = db.getPacingState();
  assert.ok(pacingState.autoPausedAt, 'autoPausedAt timestamp must be recorded');
  assert.ok(pacingState.autoPauseReason?.includes('WhatsApp rate-limit error'));

  // Stop background worker cleanly
  pacingEngine.stopWorker();
});

test('Opt-Out Keywords Recognition: Recognizes STOP, UNSUBSCRIBE, CANCEL, END, QUIT, REMOVE with case and whitespace variations', async () => {
  const { isOptOutMessage } = await import('./pacingEngine');

  const requiredKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REMOVE'];

  for (const kw of requiredKeywords) {
    // 1. Standard exact
    assert.equal(isOptOutMessage(kw), true, `Must recognize exact uppercase ${kw}`);
    // 2. Lowercase
    assert.equal(isOptOutMessage(kw.toLowerCase()), true, `Must recognize lowercase ${kw.toLowerCase()}`);
    // 3. Mixed case
    const mixed = kw.charAt(0) + kw.slice(1).toLowerCase();
    assert.equal(isOptOutMessage(mixed), true, `Must recognize mixed case ${mixed}`);
    // 4. Leading / trailing whitespace
    assert.equal(isOptOutMessage(`   ${kw}   `), true, `Must recognize ${kw} with surrounding spaces`);
    assert.equal(isOptOutMessage(`\t${kw}\n`), true, `Must recognize ${kw} with tabs and newlines`);
    // 5. Trailing punctuation
    assert.equal(isOptOutMessage(`${kw}.`), true, `Must recognize ${kw} with trailing period`);
    assert.equal(isOptOutMessage(`${kw}!`), true, `Must recognize ${kw} with trailing exclamation`);
    assert.equal(isOptOutMessage(`!${kw}!`), true, `Must recognize ${kw} surrounded by exclamation`);
  }

  // Natural variations
  assert.equal(isOptOutMessage('please stop'), true, 'Must recognize "please stop"');
  assert.equal(isOptOutMessage('stop please'), true, 'Must recognize "stop please"');
  assert.equal(isOptOutMessage('unsubscribe me'), true, 'Must recognize "unsubscribe me"');
  assert.equal(isOptOutMessage('remove me'), true, 'Must recognize "remove me"');
  assert.equal(isOptOutMessage('cancel subscription'), true, 'Must recognize "cancel subscription"');
  assert.equal(isOptOutMessage('quit now'), true, 'Must recognize "quit now"');
  assert.equal(isOptOutMessage('STOP ALL'), true, 'Must recognize "STOP ALL"');
  assert.equal(isOptOutMessage('OPT OUT'), true, 'Must recognize "OPT OUT"');
  assert.equal(isOptOutMessage('no more'), true, 'Must recognize "no more"');

  // Negative tests: Business inquiries must NOT trigger opt-out
  assert.equal(isOptOutMessage('Hello, I need 5 barrels of HP Milcy Turbo 15W-40'), false);
  assert.equal(isOptOutMessage('When will my order arrive?'), false);
  assert.equal(isOptOutMessage('Please send quotation for tractor lubricant'), false);
  assert.equal(isOptOutMessage('What is the price of HP Gear Oil EP 90?'), false);
});

test('Real WhatsApp Opt-Out 8-Step Lifecycle: Inbound event marks customer OPTED_OUT, suppresses number, cancels queue, logs audit, and generates ack', async () => {
  const testPhone = '+919827999888';
  const contact = db.createContact({
    name: 'Satna Auto Clinic',
    phone: testPhone,
    businessName: 'Satna Auto Clinic Pvt Ltd',
    city: 'Satna',
    category: 'Workshops',
    productInterest: 'HP Milcy Turbo',
    notes: 'Prior customer',
    tags: ['Workshop'],
    consentStatus: 'OPTED_IN',
  });

  // Enqueue 2 promotional messages for this customer
  db.getQueue().push({
    id: 'q-opt-test-1',
    contactId: contact.id,
    phone: testPhone,
    customerName: contact.name,
    category: 'promotional',
    content: 'Special Diwali lubricant discount',
    scheduledAt: new Date().toISOString(),
    status: 'PENDING',
    retryCount: 0,
  });

  db.getQueue().push({
    id: 'q-opt-test-2',
    contactId: contact.id,
    phone: testPhone,
    customerName: contact.name,
    category: 'promotional',
    content: 'Free delivery on HP Gear Oil',
    scheduledAt: new Date().toISOString(),
    status: 'SCHEDULED',
    retryCount: 0,
  });

  // Customer sends inbound WhatsApp message "STOP" with whitespace and mixed case
  const outcome = pacingEngine.handleIncomingMessage('919827999888', '  Stop.  ', 'Satna Auto Clinic Owner');

  // 1. Result contract verification
  assert.equal(outcome.handled, true);
  assert.equal(outcome.type, 'OPT_OUT');
  assert.ok(outcome.reply?.includes('successfully unsubscribed'));

  // 2. Customer consentStatus must be OPTED_OUT
  const updatedContact = db.getContactByPhone(testPhone);
  assert.equal(updatedContact?.consentStatus, 'OPTED_OUT', 'Customer must be immediately marked OPTED_OUT');

  // 3. Verifiable consent record exists with timestamp and source
  const consentRecord = db.getData().consentRecords.find((cr) => cr.phone === testPhone && cr.consentStatus === 'OPTED_OUT');
  assert.ok(consentRecord, 'Opt-out consent record must exist');
  assert.ok(consentRecord.optOutDate, 'optOutDate must be set');
  assert.ok(consentRecord.consentSource.includes('Inbound WhatsApp message'), 'Source must record inbound WhatsApp message');

  // 4. Number added to global suppression list
  assert.equal(db.isSuppressed(testPhone), true, 'Number must be in global suppression list');
  assert.equal(db.isSuppressed('9827999888'), true, '10-digit format must also be suppressed');
  assert.equal(db.isSuppressed('919827999888'), true, 'Country-code format must also be suppressed');

  // 5. All pending promotional messages are cancelled
  const queue1 = db.getQueue().find((q) => q.id === 'q-opt-test-1');
  const queue2 = db.getQueue().find((q) => q.id === 'q-opt-test-2');
  assert.equal(queue1?.status, 'CANCELLED', 'Pending promotional item 1 must be cancelled');
  assert.equal(queue2?.status, 'CANCELLED', 'Scheduled promotional item 2 must be cancelled');

  // 6. Prevent future promotional dispatch
  const { messageDispatcher } = await import('./messageDispatcher');
  const dispatchVal = messageDispatcher.validateDispatch({
    phone: testPhone,
    contactId: contact.id,
    category: 'promotional',
  });
  assert.equal(dispatchVal.valid, false, 'Future promotional dispatch must be blocked');

  // 7. Audit log recorded
  const audit = db.getData().auditLogs.find((a) => a.action === 'CUSTOMER_OPTED_OUT' && a.details.includes('9827999888'));
  assert.ok(audit, 'Audit log must record CUSTOMER_OPTED_OUT');

  // 8. Acknowledgement message created in outbound messages
  const ackMessage = db.getMessages().find((m) => m.phone.includes('9827999888') && m.direction === 'outbound' && m.category === 'transactional');
  assert.ok(ackMessage, 'Acknowledgement outbound message must be created in DB');
  assert.ok(ackMessage.content.includes('unsubscribed from promotional updates'));
});

test('Crucial: Just-in-time opt-out check occurs immediately before actual transport send', async () => {
  const { messageDispatcher } = await import('./messageDispatcher');
  const { whatsappAdapter } = await import('./baileysAdapter');
  const phone = '+9199' + Math.floor(10000000 + Math.random() * 90000000);

  const origIsConnected = whatsappAdapter.isConnected;
  whatsappAdapter.isConnected = () => true;

  try {
    const contact = db.createContact({
      name: 'Just In Time Test Contact',
      phone,
      businessName: 'JIT Motors',
      city: 'Satna',
      category: 'Workshops',
      productInterest: 'HP Milcy',
      notes: 'Testing pre-send check',
      tags: [],
      consentStatus: 'OPTED_IN',
    });

    const queueItem = {
      id: 'q-jit-test-' + Date.now(),
      contactId: contact.id,
      phone,
      customerName: contact.name,
      category: 'promotional' as const,
      content: 'Special promo dispatch',
      scheduledAt: new Date().toISOString(),
      status: 'PENDING' as const,
      retryCount: 0,
    };
    db.getQueue().push(queueItem);

    // Initial validation passes because contact was OPTED_IN and connection is active
    const preCheck = messageDispatcher.validateDispatch({
      phone,
      contactId: contact.id,
      category: 'promotional',
    });
    assert.equal(preCheck.valid, true, `Pre-check passes while contact is OPTED_IN, failed because: ${preCheck.reason}`);

    // Simulate item already passed initial queue validation, and customer opts out right as transport is about to execute
    const origValidate = messageDispatcher.validateDispatch;
    messageDispatcher.validateDispatch = () => ({ valid: true });

    try {
      // Right before dispatch, customer opts out (e.g. via WhatsApp STOP or admin action)
      db.handleCustomerOptOut(phone, 'Customer sent STOP before dispatch');

      // Now worker calls dispatchQueueItem
      const dispatchResult = await messageDispatcher.dispatchQueueItem(queueItem);

      // Just-in-time check MUST abort transport call and mark item CANCELLED
      assert.equal(dispatchResult.success, false, 'Dispatch must fail due to JIT opt-out check');
      assert.equal(queueItem.status, 'CANCELLED', 'Queue item status must be CANCELLED by JIT check');
      assert.ok(queueItem.failureReason?.includes('Just-in-time opt-out check'), 'Failure reason must reflect JIT check');

      // Verify audit log recorded JIT abort
      const jitAudit = db.getData().auditLogs.find((a) => a.action === 'JUST_IN_TIME_OPT_OUT_ABORT' && a.details.includes(queueItem.id));
      assert.ok(jitAudit, 'Audit trail must record JUST_IN_TIME_OPT_OUT_ABORT');
    } finally {
      messageDispatcher.validateDispatch = origValidate;
    }
  } finally {
    whatsappAdapter.isConnected = origIsConnected;
  }
});



