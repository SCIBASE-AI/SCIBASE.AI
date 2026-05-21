const riskyPacket = {
  accountId: "lab-account-north-42",
  generatedAt: "2026-05-21T09:20:00.000Z",
  orders: [
    {
      id: "order-ai-topup-100",
      accountId: "lab-account-north-42",
      invoiceId: "inv-100",
      provider: "stripe",
      amountDue: 100000,
      currency: "USD",
      status: "open",
      entitlementGrant: {
        plan: "lab-pro",
        aiComputeCredits: 250000,
        seats: 12
      }
    },
    {
      id: "order-institution-200",
      accountId: "university-enterprise-7",
      invoiceId: "inv-200",
      provider: "institutional_invoice",
      amountDue: 500000,
      currency: "USD",
      status: "open",
      entitlementGrant: {
        plan: "institutional",
        aiComputeCredits: 1400000,
        seats: 80
      }
    }
  ],
  existingGrants: [
    {
      grantId: "grant-existing-100",
      orderId: "order-ai-topup-100",
      eventId: "evt-paid-100",
      aiComputeCredits: 250000
    }
  ],
  events: [
    {
      id: "evt-paid-100",
      provider: "stripe",
      type: "invoice.paid",
      orderId: "order-ai-topup-100",
      invoiceId: "inv-100",
      amount: 100000,
      currency: "USD",
      signatureValid: true,
      signatureAgeMinutes: 3,
      livemode: true,
      createdAt: "2026-05-21T09:20:10.000Z"
    },
    {
      id: "evt-paid-100",
      provider: "stripe",
      type: "invoice.paid",
      orderId: "order-ai-topup-100",
      invoiceId: "inv-100",
      amount: 100000,
      currency: "USD",
      signatureValid: true,
      signatureAgeMinutes: 3,
      livemode: true,
      createdAt: "2026-05-21T09:20:15.000Z"
    },
    {
      id: "evt-paid-200",
      provider: "institutional_invoice",
      type: "invoice.approved_paid",
      orderId: "order-institution-200",
      invoiceId: "inv-200",
      amount: 490000,
      currency: "USD",
      signatureValid: true,
      signatureAgeMinutes: 2,
      livemode: true,
      createdAt: "2026-05-21T09:21:00.000Z"
    },
    {
      id: "evt-refund-200",
      provider: "institutional_invoice",
      type: "refund.succeeded",
      orderId: "order-institution-200",
      invoiceId: "inv-200",
      amount: 500000,
      currency: "USD",
      signatureValid: false,
      signatureAgeMinutes: 42,
      livemode: true,
      createdAt: "2026-05-21T09:22:00.000Z"
    }
  ]
};

const cleanPacket = {
  accountId: "lab-account-clean-9",
  generatedAt: "2026-05-21T09:25:00.000Z",
  orders: [
    {
      id: "order-clean-300",
      accountId: "lab-account-clean-9",
      invoiceId: "inv-300",
      provider: "stripe",
      amountDue: 100000,
      currency: "USD",
      status: "open",
      entitlementGrant: {
        plan: "lab-pro",
        aiComputeCredits: 250000,
        seats: 12
      }
    }
  ],
  existingGrants: [],
  events: [
    {
      id: "evt-finalized-300",
      provider: "stripe",
      type: "invoice.finalized",
      orderId: "order-clean-300",
      invoiceId: "inv-300",
      amount: 100000,
      currency: "USD",
      signatureValid: true,
      signatureAgeMinutes: 2,
      livemode: true,
      createdAt: "2026-05-21T09:25:00.000Z"
    },
    {
      id: "evt-paid-300",
      provider: "stripe",
      type: "invoice.paid",
      orderId: "order-clean-300",
      invoiceId: "inv-300",
      amount: 100000,
      currency: "USD",
      signatureValid: true,
      signatureAgeMinutes: 3,
      livemode: true,
      createdAt: "2026-05-21T09:25:30.000Z"
    }
  ]
};

module.exports = { riskyPacket, cleanPacket };
