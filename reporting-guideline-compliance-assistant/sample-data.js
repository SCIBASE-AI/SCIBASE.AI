export const citationLibrary = [
  {
    key: "consort-2010",
    guideline: "CONSORT",
    title: "CONSORT 2010 Statement: updated guidelines for reporting parallel group randomised trials",
    authors: "Schulz KF, Altman DG, Moher D",
    year: 2010,
    url: "https://www.consort-statement.org/",
  },
  {
    key: "prisma-2020",
    guideline: "PRISMA",
    title: "PRISMA 2020 statement: an updated guideline for reporting systematic reviews",
    authors: "Page MJ, McKenzie JE, Bossuyt PM",
    year: 2021,
    url: "https://www.prisma-statement.org/",
  },
  {
    key: "strobe-2007",
    guideline: "STROBE",
    title: "The STROBE statement: guidelines for reporting observational studies",
    authors: "von Elm E, Altman DG, Egger M",
    year: 2007,
    url: "https://www.strobe-statement.org/",
  },
]

export const manuscripts = [
  {
    id: "trial-omega-sleep",
    title: "Omega Sleep Digital Coaching for Insomnia: A Randomized Trial",
    studyDesign: "clinical-trial",
    abstract:
      "A mobile coaching intervention improved sleep scores in adults with insomnia. The manuscript reports the primary endpoint and adverse event monitoring.",
    sections: {
      methods:
        "Adults with insomnia were randomized to digital coaching or usual care. Eligibility criteria and the intervention schedule were recorded. The trial registry identifier was NCT01234567.",
      results:
        "The primary endpoint improved after eight weeks. Two adverse events were reported. The manuscript does not include a participant flow diagram.",
      discussion:
        "The intervention may help patients with persistent insomnia, although longer follow-up is needed.",
    },
    references: ["digital-sleep-2024"],
  },
  {
    id: "review-cardio-ai",
    title: "AI Triage for Cardiology Referrals: A Systematic Review",
    studyDesign: "systematic-review",
    abstract:
      "This review summarizes diagnostic triage models for cardiology referrals and compares reported performance across clinical settings.",
    sections: {
      methods:
        "We searched MEDLINE and arXiv for diagnostic triage studies published through March 2026. Inclusion criteria required an external validation cohort.",
      results:
        "Twenty-six studies met the review criteria. The manuscript lists model families but omits stage-by-stage review flow counts.",
      discussion:
        "External validation remains uncommon. Reporting quality was uneven across included studies.",
    },
    references: ["cardio-triage-2025"],
  },
  {
    id: "cohort-lab-glucose",
    title: "Continuous Glucose Monitoring Alerts in Primary Care: A Cohort Study",
    studyDesign: "observational",
    abstract:
      "A retrospective cohort study compared alert burden and follow-up testing after continuous glucose monitoring deployment.",
    sections: {
      methods:
        "Patients were sampled from three primary care clinics. Eligibility required at least one glucose alert during the observation window.",
      results:
        "Alert burden was higher for patients with more prior visits. Follow-up testing increased in the intervention clinics.",
      discussion:
        "The study may be affected by baseline differences and unmeasured care access factors.",
    },
    references: ["cgm-alerts-2024"],
  },
]
