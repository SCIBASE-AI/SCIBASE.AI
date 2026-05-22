# Enterprise Usage Cost Allocation Guard

As of: 2026-05-22T12:00:00.000Z
Audit digest: `d5139452c6df2c02f396578ad66c0441c4a3238307cf314683161bba42b25da7`

## Totals

- Usage records: 7
- Total usage amount: $1965.00
- Approved amount: $715.00
- Held amount: $940.00
- Reallocated amount: $310.00
- approved: 2
- hold: 2
- private_review: 2
- reallocate: 1

## Allocation Decisions

### usage-001

- Project: proj-vision-atlas
- Lab: lab-neuro
- Grant: grant-nih-r01-vision
- Amount: $620.00
- Status: approved
- Reasons: usage evidence, grant window, cost center, usage type, and owner all match
- Actions: Publish in admin dashboard allocation; Include in grant chargeback export packet

### usage-002

- Project: proj-retina-review
- Lab: lab-neuro
- Grant: grant-nih-r01-vision
- Amount: $260.00
- Status: private_review
- Reasons: private or restricted project usage needs admin visibility review before chargeback
- Actions: Show aggregate spend only; Suppress project title from department dashboard; Require admin approval before grant closeout export

### usage-003

- Project: proj-carbon-sim
- Lab: lab-climate
- Grant: grant-nsf-climate-open
- Amount: $95.00
- Status: approved
- Reasons: usage evidence, grant window, cost center, usage type, and owner all match
- Actions: Publish in admin dashboard allocation; Include in grant chargeback export packet

### usage-004

- Project: proj-carbon-sim
- Lab: lab-climate
- Grant: grant-nsf-climate-open
- Amount: $310.00
- Status: reallocate
- Reasons: grant does not permit this cost center or usage type
- Actions: Remove from grant spend until reallocated; Suggest a permitted lab cost center before dashboard publication

### usage-005

- Project: proj-old-retina
- Lab: lab-neuro
- Grant: grant-nih-r01-vision
- Amount: $420.00
- Status: hold
- Reasons: usage occurred outside the grant funding window
- Actions: Exclude from automated grant chargeback; Route to enterprise finance review

### usage-006

- Project: proj-ocean-private
- Lab: lab-climate
- Grant: grant-nsf-climate-open
- Amount: $180.00
- Status: private_review
- Reasons: private or restricted project usage needs admin visibility review before chargeback
- Actions: Show aggregate spend only; Suppress project title from department dashboard; Require admin approval before grant closeout export

### usage-007

- Project: proj-vision-atlas
- Lab: lab-neuro
- Grant: grant-nih-r01-vision
- Amount: $80.00
- Status: hold
- Reasons: usage record has no immutable job/export evidence
- Actions: Hold chargeback from dashboard totals; Request missing lab, grant, amount, or evidence mapping
