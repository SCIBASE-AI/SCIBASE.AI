import React, { useState } from 'react';

export interface BountySubmissionForm {
  title: string;
  category: 'Biology' | 'Physics' | 'Computer Science' | 'Chemistry';
  description: string;
  bountyAmountUsd: number;
  deadlineDays: number;
}

export function ChallengePostingPortal({ onSubmit }: { onSubmit: (data: BountySubmissionForm) => Promise<void> }) {
  const [formData, setFormData] = useState<BountySubmissionForm>({
    title: '',
    category: 'Computer Science',
    description: '',
    bountyAmountUsd: 100,
    deadlineDays: 14,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bounty-portal-card p-6 rounded-xl border border-slate-700 bg-slate-900 text-white space-y-4">
      <h3 className="text-xl font-bold">Post Scientific Bounty</h3>
      <input
        type="text"
        required
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Challenge Title"
        className="w-full p-2.5 rounded bg-slate-800 border border-slate-700 text-sm"
      />
      <textarea
        required
        rows={4}
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Detailed Problem Statement & Acceptance Criteria..."
        className="w-full p-2.5 rounded bg-slate-800 border border-slate-700 text-sm"
      />
      <div className="flex gap-4">
        <label className="text-sm">Bounty (USDT):
          <input
            type="number"
            min={10}
            value={formData.bountyAmountUsd}
            onChange={(e) => setFormData({ ...formData, bountyAmountUsd: Number(e.target.value) })}
            className="ml-2 p-1.5 rounded bg-slate-800 border border-slate-700"
          />
        </label>
      </div>
      <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 rounded font-semibold text-white">
        {submitting ? 'Locking Escrow...' : 'Deploy Bounty to Escrow'}
      </button>
    </form>
  );
}