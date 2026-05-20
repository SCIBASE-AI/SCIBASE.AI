'use strict';

const crypto = require('crypto');

const DECISION_RANK = {
  approved: 0,
  needs_review: 1,
  blocked: 2,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function worstDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function addFinding(findings, severity, code, message, evidence) {
  findings.push({
    severity,
    code,
    message,
    evidence,
  });
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPublicSection(block) {
  return block.exportVisibility !== 'internal';
}

function validateDocumentIdentity(document, findings) {
  let decision = 'approved';

  if (!document.id || !document.title) {
    addFinding(findings, 'blocker', 'document_identity_missing', 'Document id and title are required for collaborative review packets.', {
      id: document.id || null,
      title: document.title || null,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (!Array.isArray(document.blocks) || document.blocks.length === 0) {
    addFinding(findings, 'blocker', 'document_blocks_missing', 'The editor document must include at least one reviewable block.', {});
    decision = worstDecision(decision, 'blocked');
  }

  return decision;
}

function validateHeadingOrder(blocks, findings) {
  let decision = 'approved';
  let previousLevel = 0;

  blocks
    .filter((block) => block.type === 'heading')
    .forEach((block) => {
      const level = Number(block.level);
      if (!Number.isInteger(level) || level < 1 || level > 6) {
        addFinding(findings, 'blocker', 'heading_level_invalid', 'Heading block level must be an integer from 1 through 6.', {
          blockId: block.id,
          level: block.level,
        });
        decision = worstDecision(decision, 'blocked');
        return;
      }

      if (previousLevel && level > previousLevel + 1) {
        addFinding(findings, 'warning', 'heading_order_jump', 'Heading order jumps across levels and can confuse screen-reader navigation.', {
          blockId: block.id,
          previousLevel,
          level,
        });
        decision = worstDecision(decision, 'needs_review');
      }
      previousLevel = level;
    });

  return decision;
}

function validateCommonBlock(block, findings) {
  let decision = 'approved';

  if (!block.id || !block.type) {
    addFinding(findings, 'blocker', 'block_identity_missing', 'Each editor block needs an id and type.', {
      blockId: block.id || null,
      type: block.type || null,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (!hasText(block.wysiwygPreview) && !['heading', 'paragraph'].includes(block.type)) {
    addFinding(findings, 'warning', 'wysiwyg_preview_missing', 'Non-text scientific blocks need a plain-language WYSIWYG preview for non-technical collaborators.', {
      blockId: block.id,
      type: block.type,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (!hasText(block.keyboardLabel)) {
    addFinding(findings, 'warning', 'keyboard_label_missing', 'Block lacks a keyboard-accessible label for collaborative editor navigation.', {
      blockId: block.id,
      type: block.type,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function validateEquation(block, findings) {
  let decision = 'approved';

  if (!hasText(block.latex)) {
    addFinding(findings, 'blocker', 'equation_latex_missing', 'Equation block is missing LaTeX source.', {
      blockId: block.id,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (!hasText(block.fallbackText)) {
    addFinding(findings, 'blocker', 'equation_fallback_missing', 'Equation block needs fallback text for WYSIWYG and screen-reader parity.', {
      blockId: block.id,
      label: block.label || null,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (block.referenced && !hasText(block.label)) {
    addFinding(findings, 'warning', 'equation_label_missing', 'Referenced equation is missing a stable label.', {
      blockId: block.id,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function validateFigureOrTable(block, findings) {
  let decision = 'approved';
  const noun = block.type === 'figure' ? 'Figure' : 'Table';

  if (!hasText(block.caption)) {
    addFinding(findings, 'blocker', `${block.type}_caption_missing`, `${noun} block needs a caption before publication review.`, {
      blockId: block.id,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (isPublicSection(block) && !hasText(block.altText)) {
    addFinding(findings, 'blocker', `${block.type}_alt_text_missing`, `${noun} block needs alt text for accessible public export.`, {
      blockId: block.id,
      exportVisibility: block.exportVisibility || 'public',
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (block.referenced && !hasText(block.anchor)) {
    addFinding(findings, 'warning', `${block.type}_anchor_missing`, `${noun} is referenced but lacks a stable cross-reference anchor.`, {
      blockId: block.id,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function validateCodeBlock(block, findings) {
  let decision = 'approved';

  if (!hasText(block.language)) {
    addFinding(findings, 'warning', 'code_language_missing', 'Code block is missing a language for syntax highlighting and WYSIWYG rendering.', {
      blockId: block.id,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (!hasText(block.caption)) {
    addFinding(findings, 'warning', 'code_caption_missing', 'Code block needs a caption or purpose summary for non-technical review.', {
      blockId: block.id,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (block.output && !hasText(block.output.caption)) {
    addFinding(findings, 'warning', 'code_output_caption_missing', 'Code output is present but lacks a caption.', {
      blockId: block.id,
      outputKind: block.output.kind || null,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function validateNotebookCell(block, findings) {
  let decision = 'approved';

  if (!hasText(block.kernel)) {
    addFinding(findings, 'blocker', 'notebook_kernel_missing', 'Notebook cell needs a kernel identifier before collaborative execution review.', {
      blockId: block.id,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (block.executionState === 'stale') {
    addFinding(findings, 'warning', 'notebook_output_stale', 'Notebook output is stale relative to the current source cell.', {
      blockId: block.id,
      lastExecutedAt: block.lastExecutedAt || null,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (block.output && !hasText(block.output.accessibleSummary)) {
    addFinding(findings, 'blocker', 'notebook_output_summary_missing', 'Notebook output needs an accessible summary for collaborators who cannot inspect the rendered output.', {
      blockId: block.id,
      outputKind: block.output.kind || null,
    });
    decision = worstDecision(decision, 'blocked');
  }

  return decision;
}

function validateCitationPreview(block, findings) {
  if (block.type !== 'citation') {
    return 'approved';
  }

  if (!block.previewReady || !hasText(block.formattedPreview)) {
    addFinding(findings, 'warning', 'citation_preview_missing', 'Citation block is missing the formatted preview shown in WYSIWYG mode.', {
      blockId: block.id,
      key: block.key || null,
    });
    return 'needs_review';
  }

  return 'approved';
}

function evaluateBlock(block, findings) {
  let decision = validateCommonBlock(block, findings);

  if (block.type === 'equation') {
    decision = worstDecision(decision, validateEquation(block, findings));
  } else if (block.type === 'figure' || block.type === 'table') {
    decision = worstDecision(decision, validateFigureOrTable(block, findings));
  } else if (block.type === 'code') {
    decision = worstDecision(decision, validateCodeBlock(block, findings));
  } else if (block.type === 'notebook') {
    decision = worstDecision(decision, validateNotebookCell(block, findings));
  } else if (block.type === 'citation') {
    decision = worstDecision(decision, validateCitationPreview(block, findings));
  }

  return {
    id: block.id || null,
    type: block.type || null,
    section: block.section || null,
    decision,
    exportVisibility: block.exportVisibility || 'public',
    digest: digest({
      id: block.id,
      type: block.type,
      section: block.section,
      label: block.label,
      caption: block.caption,
      altText: block.altText,
      fallbackText: block.fallbackText,
      keyboardLabel: block.keyboardLabel,
      wysiwygPreview: block.wysiwygPreview,
    }),
  };
}

function buildReviewerTasks(findings, blockResults) {
  const tasks = [];

  if (findings.some((finding) => finding.code.includes('alt_text') || finding.code.includes('fallback'))) {
    tasks.push('Resolve missing alt text and equation fallback text before public export.');
  }

  if (findings.some((finding) => finding.code.includes('notebook'))) {
    tasks.push('Refresh notebook output summaries and execution metadata before collaborative review.');
  }

  if (findings.some((finding) => finding.code.includes('wysiwyg') || finding.code.includes('keyboard'))) {
    tasks.push('Complete WYSIWYG previews and keyboard labels for non-technical collaborators.');
  }

  if (blockResults.some((block) => block.decision === 'blocked')) {
    tasks.push('Keep affected blocks in review hold until accessibility blockers are cleared.');
  }

  if (tasks.length === 0) {
    tasks.push('Attach this parity packet to the editor release checklist and proceed with collaborative review.');
  }

  return tasks;
}

function evaluateEditorAccessibility(input) {
  const document = input.document || {};
  const findings = [];
  let decision = validateDocumentIdentity(document, findings);
  decision = worstDecision(decision, validateHeadingOrder(document.blocks || [], findings));

  const blocks = (document.blocks || []).map((block) => {
    const result = evaluateBlock(block, findings);
    decision = worstDecision(decision, result.decision);
    return result;
  });

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return {
    documentId: document.id || null,
    title: document.title || null,
    decision,
    summary: {
      totalBlocks: blocks.length,
      blockedBlocks: blocks.filter((block) => block.decision === 'blocked').length,
      reviewBlocks: blocks.filter((block) => block.decision === 'needs_review').length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    blocks,
    blockers,
    warnings,
    reviewerTasks: buildReviewerTasks(findings, blocks),
    releaseHold: decision !== 'approved',
    auditDigest: digest({
      document: {
        id: document.id,
        title: document.title,
        blocks,
      },
      findings,
    }),
  };
}

module.exports = {
  evaluateEditorAccessibility,
  stableStringify,
  digest,
};
