const assert = require('assert');
const {
  evaluateReceiptPrivacy,
  buildSampleBatch
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testSafeReceiptIsDeliverableWithOnlyAllowedMetadata() {
  const result = evaluateReceiptPrivacy(buildSampleBatch());
  const receipt = byId(result.receipts, 'receipt-safe-lab-plan');

  assert.equal(receipt.decision, 'deliver-receipt');
  assert.equal(receipt.findings.length, 0);
  assert.deepEqual(receipt.providerMetadata, {
    accountRef: 'acct-lab-001',
    billingPeriod: '2026-05',
    invoiceRef: 'inv-safe-lab-plan',
    plan: 'lab-pro'
  });
}

function testPrivateResearchContextIsRedactedBeforeReceiptDelivery() {
  const result = evaluateReceiptPrivacy(buildSampleBatch());
  const receipt = byId(result.receipts, 'receipt-private-compute');

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('private-research-context'), true);
  assert.equal(receipt.findings.includes('restricted-dataset-reference'), true);
  assert.equal(receipt.redactedLineItems[0].description, 'AI compute usage for restricted research workspace');
  assert.equal(receipt.redactedLineItems[1].description, 'Restricted dataset storage and processing');
}

function testProviderMetadataAllowlistBlocksOverSpecificFields() {
  const result = evaluateReceiptPrivacy(buildSampleBatch());
  const receipt = byId(result.receipts, 'receipt-private-compute');

  assert.equal(receipt.findings.includes('unsafe-provider-metadata'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(receipt.providerMetadata, 'projectTitle'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(receipt.providerMetadata, 'collaboratorHandle'), false);

  const action = byId(result.remediationActions, 'remediate-receipt-private-compute');
  assert.equal(action.action, 'replace-private-billing-fields-before-delivery');
  assert.equal(action.priority, 'high');
}

function testNestedAllowedMetadataStillScansPrivateContext() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-nested-metadata',
      invoiceId: 'inv-nested-metadata',
      customerId: 'customer-lab-003',
      currency: 'USD',
      totalCents: 45000,
      providerMetadata: {
        accountRef: {
          workspace: 'IRB Alzheimer single-cell workspace',
          billingId: 'acct-lab-003'
        },
        billingPeriod: '2026-05',
        invoiceRef: 'inv-nested-metadata',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-safe-subscription',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 1,
          unit: 'month',
          amountCents: 45000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = byId(result.receipts, 'receipt-nested-metadata');

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('private-research-context'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(receipt.providerMetadata, 'accountRef'), false);
}

function testUnsafeProviderMetadataKeyNamesAreRedacted() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-metadata-key-leak',
      invoiceId: 'inv-metadata-key-leak',
      customerId: 'customer-lab-011',
      currency: 'USD',
      totalCents: 18000,
      providerMetadata: {
        accountRef: 'acct-lab-011',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-metadata-key-leak',
        plan: 'lab-pro',
        'GSE-private-cohort': 'metadata field name carries restricted context'
      },
      lineItems: [
        {
          id: 'line-platform-subscription-f',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 1,
          unit: 'month',
          amountCents: 18000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('restricted-dataset-reference'), true);
  assert.equal(receipt.removedMetadataKeys.includes('metadata-key-redacted-1'), true);
  assert.equal(JSON.stringify(result).includes('GSE-private'), false);
}

function testSettlementProviderMetadataKeyNamesAreRedacted() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-settlement-metadata-key',
      invoiceId: 'inv-settlement-metadata-key',
      customerId: 'customer-safe',
      currency: 'USD',
      totalCents: 25000,
      providerMetadata: {
        accountRef: 'acct-safe',
        billingPeriod: '2026-06',
        invoiceRef: 'inv-settlement-metadata-key',
        plan: 'lab',
        settlementReference: 'IBAN DE89370400440532013000'
      },
      lineItems: [
        {
          id: 'line-safe-compute',
          description: 'AI compute usage',
          projectRef: 'public-project',
          usageCategory: 'ai-compute',
          quantity: 10,
          unit: 'compute-hour',
          amountCents: 25000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('payment-routing-sensitive'), true);
  assert.equal(receipt.findings.includes('unsafe-provider-metadata'), true);
  assert.equal(receipt.removedMetadataKeys.includes('metadata-key-redacted-1'), true);
  assert.equal(JSON.stringify(result).includes('settlementReference'), false);
  assert.equal(JSON.stringify(result).includes('DE89370400440532013000'), false);
}

function testCustomerFacingLineItemFieldsAreRedacted() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-line-field-leak',
      invoiceId: 'inv-line-field-leak',
      customerId: 'customer-lab-004',
      currency: 'USD',
      totalCents: 28000,
      providerMetadata: {
        accountRef: 'acct-lab-004',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-line-field-leak',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-GSE-private-cohort-storage',
          description: 'Storage usage',
          usageCategory: 'storage',
          quantity: 80,
          unit: 'GSE-private gb-month',
          amountCents: 28000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = byId(result.receipts, 'receipt-line-field-leak');
  const lineItem = receipt.customerCopy.lineItems[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('restricted-dataset-reference'), true);
  assert.equal(lineItem.id, 'line-redacted-1');
  assert.equal(lineItem.unit, 'usage-unit');
  assert.equal(lineItem.description, 'Restricted dataset storage and processing');
  assert.equal(JSON.stringify(receipt).includes('GSE-private'), false);
}

function testCustomerFacingReceiptIdentifiersAreRedacted() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-alzheimer-trial-001',
      invoiceId: 'inv-GSE-private-collaborator',
      customerId: 'customer-@private-reviewer',
      currency: 'USD',
      totalCents: 49000,
      providerMetadata: {
        accountRef: 'acct-lab-005',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-public-safe',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-platform-subscription',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 1,
          unit: 'month',
          amountCents: 49000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('private-research-context'), true);
  assert.equal(receipt.findings.includes('restricted-dataset-reference'), true);
  assert.equal(receipt.findings.includes('collaborator-identifier'), true);
  assert.equal(receipt.id, 'receipt-redacted-1');
  assert.equal(receipt.invoiceId, 'invoice-redacted-1');
  assert.equal(receipt.customerId, 'customer-redacted-1');
  assert.equal(receipt.customerCopy.receiptId, 'receipt-redacted-1');
  assert.equal(receipt.customerCopy.customerId, 'customer-redacted-1');
  assert.equal(JSON.stringify(result).includes('alzheimer'), false);
  assert.equal(JSON.stringify(result).includes('GSE-private'), false);
  assert.equal(JSON.stringify(result).includes('@private-reviewer'), false);
}

function testRedactedReceiptIdentifiersRemainDistinct() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-alzheimer-trial-001',
      invoiceId: 'inv-alzheimer-trial-001',
      customerId: 'customer-lab-006',
      currency: 'USD',
      totalCents: 12000,
      providerMetadata: {
        accountRef: 'acct-lab-006',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-public-safe-006',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-platform-subscription-a',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 1,
          unit: 'month',
          amountCents: 12000
        }
      ]
    },
    {
      id: 'receipt-alzheimer-trial-002',
      invoiceId: 'inv-alzheimer-trial-002',
      customerId: 'customer-lab-007',
      currency: 'USD',
      totalCents: 13000,
      providerMetadata: {
        accountRef: 'acct-lab-007',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-public-safe-007',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-platform-subscription-b',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 1,
          unit: 'month',
          amountCents: 13000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);

  assert.deepEqual(result.receipts.map((receipt) => receipt.id), [
    'receipt-redacted-1',
    'receipt-redacted-2'
  ]);
  assert.equal(new Set(result.receipts.map((receipt) => receipt.invoiceId)).size, 2);
}

function testMissingProviderMetadataIsTreatedAsEmptyMetadata() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-missing-provider-metadata',
      invoiceId: 'inv-missing-provider-metadata',
      customerId: 'customer-lab-008',
      currency: 'USD',
      totalCents: 31000,
      lineItems: [
        {
          id: 'line-platform-subscription-c',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 1,
          unit: 'month',
          amountCents: 31000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];

  assert.equal(receipt.decision, 'deliver-receipt');
  assert.deepEqual(receipt.providerMetadata, {});
  assert.deepEqual(receipt.removedMetadataKeys, []);
  assert.equal(receipt.findings.length, 0);
}

function testMissingReceiptListProducesEmptyReviewPacket() {
  const batch = {
    batchId: 'billing-empty-review-20',
    generatedAt: '2026-05-30T12:00:00Z'
  };

  const result = evaluateReceiptPrivacy(batch);

  assert.deepEqual(result.receipts, []);
  assert.deepEqual(result.remediationActions, []);
  assert.equal(result.summary.deliverableReceipts, 0);
  assert.equal(result.summary.heldReceipts, 0);
  assert.equal(result.summary.remediationActions, 0);
  assert.equal(result.summary.totalCentsReviewed, 0);
  assert.ok(result.auditDigest.startsWith('sha256:'));
}

function testMissingLineItemsAreTreatedAsEmptyReceiptLines() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-missing-line-items',
      invoiceId: 'inv-missing-line-items',
      customerId: 'customer-lab-012',
      currency: 'USD',
      totalCents: 9900,
      providerMetadata: {
        accountRef: 'acct-lab-012',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-missing-line-items',
        plan: 'lab-pro'
      }
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];

  assert.equal(receipt.decision, 'deliver-receipt');
  assert.deepEqual(receipt.customerCopy.lineItems, []);
  assert.deepEqual(receipt.redactedLineItems, []);
  assert.equal(result.summary.deliverableReceipts, 1);
  assert.equal(result.summary.heldReceipts, 0);
  assert.equal(result.summary.totalCentsReviewed, 9900);
}

function testCustomerFacingCurrencyLabelsAreRedacted() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-currency-leak',
      invoiceId: 'inv-currency-leak',
      customerId: 'customer-lab-009',
      currency: 'USD GSE-private cohort',
      totalCents: 27000,
      providerMetadata: {
        accountRef: 'acct-lab-009',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-currency-leak',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-platform-subscription-d',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 1,
          unit: 'month',
          amountCents: 27000
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('restricted-dataset-reference'), true);
  assert.equal(receipt.customerCopy.currency, 'XXX');
  assert.equal(JSON.stringify(result).includes('GSE-private'), false);
}

function testCustomerFacingMoneyAndQuantityFieldsAreRedacted() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-amount-leak',
      invoiceId: 'inv-amount-leak',
      customerId: 'customer-lab-010',
      currency: 'USD',
      totalCents: '27000 GSE-private cohort',
      providerMetadata: {
        accountRef: 'acct-lab-010',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-amount-leak',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-platform-subscription-e',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: '1 participant from GSE-private cohort',
          unit: 'month',
          amountCents: '27000 GSE-private cohort'
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];
  const lineItem = receipt.customerCopy.lineItems[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('restricted-dataset-reference'), true);
  assert.equal(receipt.customerCopy.totalCents, null);
  assert.equal(lineItem.quantity, null);
  assert.equal(lineItem.amountCents, null);
  assert.equal(result.summary.totalCentsReviewed, 0);
  assert.equal(JSON.stringify(result).includes('GSE-private'), false);
}

function testMalformedCustomerFacingMoneyAndQuantityFieldsAreHeld() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-malformed-numeric-fields',
      invoiceId: 'inv-malformed-numeric-fields',
      customerId: 'customer-lab-013',
      currency: 'USD',
      totalCents: 'free-form total',
      providerMetadata: {
        accountRef: 'acct-lab-013',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-malformed-numeric-fields',
        plan: 'lab-pro'
      },
      lineItems: [
        {
          id: 'line-malformed-quantity',
          description: 'Lab Pro monthly subscription',
          usageCategory: 'subscription',
          quantity: 'one',
          unit: 'month',
          amountCents: -2500
        }
      ]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];
  const lineItem = receipt.customerCopy.lineItems[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('invalid-billing-amount'), true);
  assert.equal(receipt.findings.includes('invalid-billing-quantity'), true);
  assert.equal(receipt.customerCopy.totalCents, null);
  assert.equal(lineItem.quantity, null);
  assert.equal(lineItem.amountCents, null);
  assert.equal(result.summary.totalCentsReviewed, 0);

  const action = result.remediationActions[0];
  assert.equal(action.action, 'repair-malformed-billing-fields-before-delivery');
  assert.equal(action.priority, 'normal');
}

function testMalformedLineItemEntriesAreHeldInsteadOfCrashing() {
  const batch = buildSampleBatch();
  batch.receipts = [
    {
      id: 'receipt-malformed-line-item',
      invoiceId: 'inv-malformed-line-item',
      customerId: 'customer-lab-014',
      currency: 'USD',
      totalCents: 19900,
      providerMetadata: {
        accountRef: 'acct-lab-014',
        billingPeriod: '2026-05',
        invoiceRef: 'inv-malformed-line-item',
        plan: 'lab-pro'
      },
      lineItems: [null]
    }
  ];

  const result = evaluateReceiptPrivacy(batch);
  const receipt = result.receipts[0];
  const lineItem = receipt.customerCopy.lineItems[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('malformed-line-item'), true);
  assert.equal(lineItem.id, 'line-malformed-1');
  assert.equal(lineItem.quantity, null);
  assert.equal(lineItem.amountCents, null);

  const action = result.remediationActions[0];
  assert.equal(action.action, 'repair-malformed-billing-fields-before-delivery');
  assert.equal(action.priority, 'normal');
}

function testMalformedTopLevelBatchIsHeldInsteadOfCrashing() {
  let result;
  assert.doesNotThrow(() => {
    result = evaluateReceiptPrivacy(null);
  });

  const receipt = result.receipts[0];

  assert.equal(result.batchId, 'malformed-billing-batch');
  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('malformed-billing-batch'), true);
  assert.equal(receipt.customerCopy.receiptId, 'receipt-malformed-batch');
  assert.equal(receipt.customerCopy.totalCents, null);

  const action = result.remediationActions[0];
  assert.equal(action.action, 'repair-malformed-billing-fields-before-delivery');
  assert.equal(action.priority, 'normal');
}

function testCustomerCopyRemainsUsefulAfterRedaction() {
  const result = evaluateReceiptPrivacy(buildSampleBatch());
  const receipt = byId(result.receipts, 'receipt-private-compute');

  assert.equal(receipt.customerCopy.totalCents, 122500);
  assert.equal(receipt.customerCopy.currency, 'USD');
  assert.equal(receipt.customerCopy.lineItems.length, 2);
  assert.equal(receipt.customerCopy.lineItems[0].usageCategory, 'ai-compute');
  assert.equal(receipt.customerCopy.lineItems[1].usageCategory, 'storage');
}

function testNullProviderMetadataIsHeldWithoutCrashing() {
  const result = evaluateReceiptPrivacy({
    batchId: 'batch-null-provider-metadata',
    generatedAt: '2026-05-28T11:30:00Z',
    receipts: [
      {
        id: 'receipt-null-provider-metadata',
        invoiceId: 'invoice-null-provider-metadata',
        customerId: 'customer-public-1',
        totalCents: 9900,
        currency: 'USD',
        providerMetadata: null,
        lineItems: []
      }
    ]
  });

  const receipt = result.receipts[0];
  const action = result.remediationActions[0];

  assert.equal(receipt.decision, 'hold-for-finance-review');
  assert.equal(receipt.findings.includes('unsafe-provider-metadata'), true);
  assert.deepEqual(receipt.providerMetadata, {});
  assert.deepEqual(receipt.removedMetadataKeys, ['provider-metadata-malformed']);
  assert.equal(action.action, 'replace-private-billing-fields-before-delivery');
}

function testAuditDigestIsDeterministicAndPrivateFree() {
  const first = evaluateReceiptPrivacy(buildSampleBatch());
  const second = evaluateReceiptPrivacy(buildSampleBatch());

  assert.equal(first.auditDigest, second.auditDigest);
  assert.ok(first.auditDigest.startsWith('sha256:'));
  assert.equal(first.summary.deliverableReceipts, 1);
  assert.equal(first.summary.heldReceipts, 1);
  assert.equal(JSON.stringify(first).includes('Alzheimer'), false);
  assert.equal(JSON.stringify(first).includes('GSE-private'), false);
}

const tests = [
  testSafeReceiptIsDeliverableWithOnlyAllowedMetadata,
  testPrivateResearchContextIsRedactedBeforeReceiptDelivery,
  testProviderMetadataAllowlistBlocksOverSpecificFields,
  testNestedAllowedMetadataStillScansPrivateContext,
  testUnsafeProviderMetadataKeyNamesAreRedacted,
  testSettlementProviderMetadataKeyNamesAreRedacted,
  testCustomerFacingLineItemFieldsAreRedacted,
  testCustomerFacingReceiptIdentifiersAreRedacted,
  testRedactedReceiptIdentifiersRemainDistinct,
  testMissingProviderMetadataIsTreatedAsEmptyMetadata,
  testMissingReceiptListProducesEmptyReviewPacket,
  testMissingLineItemsAreTreatedAsEmptyReceiptLines,
  testCustomerFacingCurrencyLabelsAreRedacted,
  testCustomerFacingMoneyAndQuantityFieldsAreRedacted,
  testMalformedCustomerFacingMoneyAndQuantityFieldsAreHeld,
  testMalformedLineItemEntriesAreHeldInsteadOfCrashing,
  testMalformedTopLevelBatchIsHeldInsteadOfCrashing,
  testCustomerCopyRemainsUsefulAfterRedaction,
  testNullProviderMetadataIsHeldWithoutCrashing,
  testAuditDigestIsDeterministicAndPrivateFree
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} billing receipt privacy guard tests passed`);
