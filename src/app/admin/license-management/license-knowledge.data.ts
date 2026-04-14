import type {
  LicenseCaseGuide,
  LicenseReferenceLink,
  LicenseTheoryEntry,
  TheoryTopicMeta,
} from "./license-knowledge.types";

export const OFFICIAL_LICENSE_REFERENCE_LINKS: LicenseReferenceLink[] = [
  {
    label: "Vietnam Intellectual Property Law (Consolidated 2025)",
    href: "https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/9/155-vbhn-vpqh.pdf",
  },
  {
    label: "Decree No. 17/2023/ND-CP",
    href: "https://datafiles.chinhphu.vn/cpp/files/vbpq/2023/5/17-cp.signed.pdf",
  },
  {
    label: "WIPO Lex - Treaties applicable to Vietnam",
    href: "https://www.wipo.int/wipolex/en/members/profile/VN",
  },
  {
    label: "Berne Convention (WIPO)",
    href: "https://www.wipo.int/treaties/en/ip/berne/",
  },
  {
    label: "TRIPS Agreement (WTO)",
    href: "https://www.wto.org/english/tratop_e/trips_e/trips_e.htm",
  },
  {
    label: "WIPO Copyright Treaty - WCT",
    href: "https://www.wipo.int/treaties/en/ip/wct/",
  },
];

export const THEORY_TOPIC_META: TheoryTopicMeta[] = [
  { id: "proof", label: "Proof" },
  { id: "authorization", label: "Authorization" },
  { id: "translation", label: "Translation / adaptation" },
  { id: "open_license", label: "Open license" },
  { id: "public_domain", label: "Public domain" },
  { id: "claim", label: "Claim" },
  { id: "scope", label: "Rights scope" },
  { id: "references", label: "Legal references" },
];

export const LICENSE_CASE_GUIDES: LicenseCaseGuide[] = [
  {
    id: "enforcement_blocked",
    title: "Case: Content blocked by enforcement",
    reviewLevel: "blocked",
    summary:
      "When a story is suspended or banned, the license review should not be used to restore publishing immediately. Resolve enforcement first.",
    checklist: [
      "Confirm that the current enforcement status is suspended or banned.",
      "Check whether there is an internal decision, report, or prior violation related to the story.",
      "Verify whether the new license submission actually addresses the reason for the block or only adds surface-level proof.",
    ],
    sourceChecks: [
      "Check moderation logs or the most recent handling context before deciding.",
      "If the new proof does not directly address the enforcement reason, do not use license approval to unblock it.",
    ],
    redFlags: [
      "The proof looks complete, but the real reason for the block is a different violation.",
      "The submitter expects license approval to automatically reopen publishing before enforcement is resolved.",
    ],
    recommendedAction:
      "Keep the case on a non-approval path and coordinate internally to clarify enforcement before finalizing the decision.",
    escalateWhen: [
      "It is unclear why the story was suspended or banned.",
      "The new proof conflicts with a previous moderation decision.",
      "The case carries legal risk or involves a third-party complaint.",
    ],
    rejectTemplates: [
      {
        id: "enforcement-blocked",
        label: "Under enforcement",
        text: "This story is currently restricted due to enforcement status. Please resolve or clarify the enforcement reason before requesting license approval.",
      },
      {
        id: "enforcement-not-resolved",
        label: "Not enough to re-enable publishing",
        text: "The current proof is not sufficient to resolve the story's enforcement status. License approval cannot replace the separate enforcement review step.",
      },
    ],
    theoryTopics: ["claim", "proof", "references"],
  },
  {
    id: "under_claim",
    title: "Case: Content under claim",
    reviewLevel: "blocked",
    summary:
      "When a claim is open, this should not be treated as a normal license submission. The priority is verifying the dispute and the contested rights source.",
    checklist: [
      "Confirm that claim status is open or rights status is under_claim.",
      "Read the claim and reject history carefully to understand who is contesting the rights.",
      "Compare the new proof against the disputed details: rights holder, work, usage scope, and term.",
    ],
    sourceChecks: [
      "Verify whether the proof directly addresses the open claim.",
      "Cross-check title, source, owner, rights scope, and term (if any).",
    ],
    redFlags: [
      "The proof is only a loose screenshot and does not connect directly to the current claim.",
      "The documents are missing the signing party, usage scope, or effective date.",
      "The case shows signs of a dispute between multiple parties claiming the same rights.",
    ],
    recommendedAction:
      "Do not approve too quickly. Prioritize clarifying the dispute and escalate internally if the proof still does not resolve the claim.",
    escalateWhen: [
      "Multiple parties provide conflicting documents.",
      "The claim involves translation, adaptation, or overlapping distribution rights.",
      "The proof appears valid but still is not enough to close the claim safely.",
    ],
    rejectTemplates: [
      {
        id: "claim-not-resolved",
        label: "Claim not clarified",
        text: "This story currently has an open copyright claim. The submitted proof is not sufficient to clarify the rights dispute and cannot be approved yet.",
      },
      {
        id: "claim-proof-insufficient",
        label: "Proof does not address the claim",
        text: "The submitted documents do not directly address the contested details in the current claim. Please provide proof that clearly shows the rightsholder, usage scope, and legal basis for exploitation.",
      },
    ],
    theoryTopics: ["claim", "authorization", "proof", "references"],
  },
  {
    id: "original_self_declaration",
    title: "Case: Original + self declaration",
    reviewLevel: "light",
    summary:
      "This is the lightest case in the current set. The main goal is to verify that the self-declaration is consistent and that there are no clear signs of copying or dispute.",
    checklist: [
      "Confirm that origin type is original and basis is self declaration.",
      "Cross-check the story details against the author profile, notes, and edit history when available.",
      "Look for signs that the work was taken from another source, mirrored, or previously claimed.",
    ],
    sourceChecks: [
      "If there is a source or external link, check whether it unintentionally indicates reposting or adaptation.",
      "If there is prior reject history, check whether the previous issues were resolved.",
    ],
    redFlags: [
      "The author declares the story as original, but the content or art shows signs of coming from another source.",
      "The story has been reported or previously rejected over ownership concerns.",
      "The submission is very thin, but the requester is asking for verified status too early.",
    ],
    recommendedAction:
      "You can approve when the story is consistent, there are no clear red flags, and no claim is open.",
    escalateWhen: [
      "There are signs of copying or mirroring from another platform.",
      "The story is declared original, but a conflicting contract or authorization appears in the submission.",
    ],
    rejectTemplates: [
      {
        id: "self-declaration-mismatch",
        label: "Self-declaration mismatch",
        text: "The current self-declaration is not consistent enough to confirm you are the direct rightsholder. Please provide clearer proof of ownership or creation origin.",
      },
      {
        id: "self-declaration-red-flag",
        label: "Needs clarification",
        text: "This submission shows signs that require clarification about the work’s origin. Please provide documents or images proving direct ownership before resubmitting for review.",
      },
    ],
    theoryTopics: ["proof", "scope", "references"],
  },
  {
    id: "translated",
    title: "Case: Translated content",
    reviewLevel: "strict",
    summary:
      "Translated content should be reviewed strictly. There must be proof allowing translation and exploitation of the translation, not just a source link or images of the original work.",
    checklist: [
      "Confirm that origin type is translated.",
      "Check whether there is documentation allowing translation or exploitation of the original work.",
      "Compare the granting party, original work, usage scope, and effective term.",
      "Check whether the source link or original title matches the submitted story.",
    ],
    sourceChecks: [
      "Source title/source URL must point to the correct original work.",
      "If there is a contract/authorization, the granting party and permitted publishing/distribution scope must be readable.",
    ],
    redFlags: [
      "Only raw screenshots or original cover images are provided, with no translation rights.",
      "The proof talks about general cooperation but never states the right to publish on the platform.",
      "The document is blurry or cropped and hides signatures, seals, or effective dates.",
    ],
    recommendedAction:
      "Treat this as a strict review by default. If there is no proof allowing translation or the exploitation scope is unclear, reject and ask for clearer documentation.",
    escalateWhen: [
      "The contract includes complex territory, exclusivity, or sub-license terms.",
      "The documents mention translation rights but do not clearly state digital platform distribution rights.",
    ],
    rejectTemplates: [
      {
        id: "translated-missing-authorization",
        label: "Missing translation rights",
        text: "This is translated content, but the current proof does not clearly show translation rights or exploitation rights from the original rightsholder. Please provide an authorization letter or a suitable contract.",
      },
      {
        id: "translated-scope-unclear",
        label: "Exploitation scope unclear",
        text: "The submitted documents do not clearly specify the usage scope for the translation on this platform. Please provide proof clearly stating the work, granting party, publishing/distribution scope, and effective term.",
      },
    ],
    theoryTopics: ["translation", "authorization", "proof", "scope"],
  },
  {
    id: "adapted",
    title: "Case: Adapted content",
    reviewLevel: "strict",
    summary:
      "Adaptations carry higher risk because they involve derivative rights. Reviewers should verify explicit permission to adapt, not just repost or use the original work.",
    checklist: [
      "Confirm that origin type is adapted.",
      "Find proof allowing the creation or exploitation of a derivative work based on the original.",
      "Check whether the license covers adaptation, publishing, or distribution.",
    ],
    sourceChecks: [
      "Source title/source URL must show the related original work.",
      "If there is a contract, read carefully to confirm derivative/adaptation rights are included.",
    ],
    redFlags: [
      "The document only allows reposting or general use and says nothing about adaptation.",
      "The story changes plot or characters from another source, but the submission does not mention derivative rights.",
    ],
    recommendedAction:
      "Do not approve if the proof only shows rights to use the original work and not rights to create or exploit the adaptation.",
    escalateWhen: [
      "The legal wording makes it hard to determine whether derivative rights were actually granted.",
      "The case involves multiple source works or multiple granting parties.",
    ],
    rejectTemplates: [
      {
        id: "adapted-derivative-rights",
        label: "Missing derivative rights",
        text: "The current proof does not clearly demonstrate adaptation rights or exploitation rights for the derivative work. Please provide documents explicitly granting these rights before resubmitting.",
      },
      {
        id: "adapted-scope-gap",
        label: "Adaptation scope missing",
        text: "The submitted documents do not clearly state the scope allowing adaptation and publishing on the platform. Please provide an appropriate contract or license.",
      },
    ],
    theoryTopics: ["translation", "authorization", "scope", "references"],
  },
  {
    id: "repost",
    title: "Case: Repost / mirror content",
    reviewLevel: "strict",
    summary:
      "Repost cases need a strict proof standard because the risk of copying already-published content is high. There must be clear permission to repost or redistribute.",
    checklist: [
      "Confirm that origin type is repost.",
      "Look for a license or authorization permitting reposting or redistribution.",
      "Cross-check the title, author, origin source, and allowed platform scope.",
    ],
    sourceChecks: [
      "If there is a source URL, verify it is the original publisher or a legitimate representative.",
      "If the proof is chat/email, the granting party identity and explicit permission must be clear.",
    ],
    redFlags: [
      "There is only a source link or images from another platform but no repost permission.",
      "It is unclear whether the granting party is the rights holder or a lawful representative.",
      "The proof does not clearly state permission to publish on the current platform.",
    ],
    recommendedAction:
      "If there is no clear repost or redistribution permission, reject. A repost should not be approved only because it already exists elsewhere.",
    escalateWhen: [
      "It is unclear whether the granting party has sufficient authority.",
      "The case involves a publisher network or intermediary distributor.",
    ],
    rejectTemplates: [
      {
        id: "repost-no-permission",
        label: "Missing repost rights",
        text: "The current proof does not clearly demonstrate permission to repost or redistribute this content on the platform. Please provide a suitable license or authorization document.",
      },
      {
        id: "repost-source-only",
        label: "Source link only",
        text: "Providing a source link or images from elsewhere is not sufficient to confirm repost rights. Please provide documents clearly showing the granting party and permitted usage scope.",
      },
    ],
    theoryTopics: ["authorization", "proof", "scope"],
  },
  {
    id: "open_license",
    title: "Case: Open license / Creative Commons",
    reviewLevel: "standard",
    summary:
      "An open license does not mean free use for every purpose. Reviewers must verify the exact license type, usage conditions, and any commercial or derivative restrictions.",
    checklist: [
      "Confirm that the story falls under cc/open-license.",
      "Check that both the source URL and license URL exist, are reachable, and point to the correct source.",
      "Read the specific license and verify whether it restricts commercial or derivative use.",
    ],
    sourceChecks: [
      "The license URL must contain the actual license terms, not just a general introduction page.",
      "The source URL must correspond to the exact work being used, not a similar one.",
    ],
    redFlags: [
      "The submission says Creative Commons but provides no specific license link.",
      "The license allows sharing but restricts commercial use, while the story includes monetization elements.",
      "The source does not clearly show which license actually applies to the work.",
    ],
    recommendedAction:
      "You can approve when the source and license reference are clear and the license terms fit how the platform uses the story.",
    escalateWhen: [
      "The license terms are ambiguous for monetization, ads, or derivative use.",
      "The licensing source is unclear or is not the original source of the work.",
    ],
    rejectTemplates: [
      {
        id: "open-license-missing-reference",
        label: "Missing open license reference",
        text: "This story is declared under an open license, but the current proof does not provide sufficient source URL and license URL for verification. Please provide clear links to the source work and the applicable license terms.",
      },
      {
        id: "open-license-incompatible",
        label: "License terms incompatible",
        text: "The current proof does not demonstrate that the open license terms allow the platform’s usage. Please clarify the license type, usage scope, and any relevant restrictions.",
      },
    ],
    theoryTopics: ["open_license", "proof", "scope", "references"],
  },
  {
    id: "public_domain",
    title: "Case: Public domain",
    reviewLevel: "standard",
    summary:
      "Public domain status needs a clear basis and should not rely on intuition. Reviewers should verify the source and the exact public domain status of the specific work.",
    checklist: [
      "Confirm that the story is being submitted as public domain.",
      "Check the source URL or reference proving public domain status.",
      "Verify whether the version being used adds a new layer of rights, such as a new translation, editorial version, or illustration set.",
    ],
    sourceChecks: [
      "The source must clearly identify the specific work/edition that is in the public domain.",
      "If it is a new translation or new editorial version, be cautious because that layer may still be protected.",
    ],
    redFlags: [
      "The original author may be public domain, but the translation or reused version may still be protected.",
      "There is no clear source verifying public domain status.",
    ],
    recommendedAction:
      "Approve only when there is a clear source basis and no overlooked new rights layer.",
    escalateWhen: [
      "It is hard to determine whether the edition or translation in use is still protected.",
      "The case involves multiple layers of rights on top of the original work.",
    ],
    rejectTemplates: [
      {
        id: "public-domain-not-proven",
        label: "Public domain not proven",
        text: "The current proof does not provide sufficient basis to confirm that the work or edition in use is in the public domain. Please provide a clear reference source.",
      },
      {
        id: "public-domain-version-risk",
        label: "Risk of new rights layer",
        text: "The current documents do not clarify whether the translation/editorial/used edition introduces a new rights layer. Please provide clearer information before resubmitting.",
      },
    ],
    theoryTopics: ["public_domain", "proof", "references"],
  },
  {
    id: "authorized_distribution",
    title: "Case: Authorization / distribution contract",
    reviewLevel: "strict",
    summary:
      "This group depends heavily on documents. Reviewers need to verify the correct party, scope, term, and work, not just see a paper that looks legitimate.",
    checklist: [
      "Confirm that basis is owner_authorization or publisher_contract.",
      "Read the granting party, receiving party, work, usage scope, and term clearly.",
      "Check whether the document actually allows publishing or distribution on a digital platform.",
    ],
    sourceChecks: [
      "Cross-check the story name, source title, license name, and granting party identity.",
      "If the document references appendices or additional URLs, review those materials as well.",
    ],
    redFlags: [
      "The contract is missing signature pages, appendices, or the scope clause is cropped out.",
      "There is only a short confirmation letter and it does not describe the actual exploitation rights.",
      "The term has expired or cannot be determined.",
    ],
    recommendedAction:
      "Review strictly and approve only when the document clearly shows the rights scope for this platform.",
    escalateWhen: [
      "The contract is long, has multiple appendices, or contains complex exclusivity or territory clauses.",
      "It is hard to determine whether the granting party is truly the owner or a lawful representative.",
    ],
    rejectTemplates: [
      {
        id: "authorization-scope-missing",
        label: "Rights scope missing",
        text: "The submitted documents do not clearly state the rights scope allowing publishing, distribution, or exploitation on the platform. Please provide a readable license/contract showing parties, scope, and effective term.",
      },
      {
        id: "authorization-expired-or-unclear",
        label: "Validity unclear",
        text: "The current proof does not clearly demonstrate that the license/contract is still valid at the time of submission. Please provide documents with clearer term and validity conditions.",
      },
    ],
    theoryTopics: ["authorization", "proof", "scope", "references"],
  },
  {
    id: "general_review",
    title: "",
    reviewLevel: "standard",
    summary: "",
    checklist: [
      "Check whether the proof file is readable and directly relevant to the right to publish.",
      "Find the matching points between the submission, the story, and the submitter.",
      "Read the reject history to avoid repeating previously noted issues.",
    ],
    sourceChecks: [
      "If there is a source or license reference, verify accessibility and relevance.",
    ],
    redFlags: [],
    recommendedAction: "",
    escalateWhen: [],
    rejectTemplates: [
      {
        id: "general-proof-insufficient",
        label: "Proof not clear enough",
        text: "The current proof is not clear enough to confirm the right to publish or exploit the work on the platform. Please provide documents clearly showing the rightsholder, usage scope, and validity (if any).",
      },
      {
        id: "general-proof-unreadable",
        label: "Unreadable proof",
        text: "The submitted proof is hard to read or missing key details for verification. Please re-upload clearer images or provide more complete documentation before resubmitting.",
      },
    ],
    theoryTopics: ["proof", "authorization", "scope", "references"],
  },
];

export const LICENSE_THEORY_ENTRIES: LicenseTheoryEntry[] = [
  {
    id: "proof-quality",
    title: "What valid proof should include",
    topics: ["proof", "scope"],
    summary:
      "Good proof is readable, directly tied to the work under review, and clearly shows who has what rights for what period.",
    appliesWhen: [
      "All license review cases, especially when proof is submitted via photos, screenshots, email, or chat.",
      "Cases previously rejected due to blurry proof, missing pages, or insufficient verifiable details.",
    ],
    commonMistakes: [
      "Submitting only cover/raw images or source links without any rights basis.",
      "Missing signature pages, dates, appendices, or usage scope.",
      "Submitting many images but none clearly show the granting party.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[1],
    ],
  },
  {
    id: "authorization-scope",
    title: "Authorization must match party, scope, and validity",
    topics: ["authorization", "scope", "proof"],
    summary:
      "When reviewing an authorization document or contract, check three essentials: who grants the rights, which rights are granted, and whether it is still valid.",
    appliesWhen: [
      "Cases with owner authorization or publisher contract.",
      "Cases involving translation, reposting, adaptation, or any submission based on rights granted by a third party.",
    ],
    commonMistakes: [
      "Documents exist but lack publishing/distribution scope for the digital platform.",
      "Documents show logos/headings but the key legal text is not readable.",
      "The term or validity conditions are omitted.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[1],
      OFFICIAL_LICENSE_REFERENCE_LINKS[2],
    ],
  },
  {
    id: "translation-and-adaptation",
    title: "Translation and adaptation require strict review",
    topics: ["translation", "authorization", "scope"],
    summary:
      "Translation and adaptation rights usually cannot be inferred from basic usage rights. Proof must explicitly allow creating or exploiting derivative works.",
    appliesWhen: [
      "Origin type is translated or adapted.",
      "The story comes from another source but has changed language, script, characters, or format.",
    ],
    commonMistakes: [
      "Assuming a source URL alone proves translation rights.",
      "Confusing repost rights with adaptation rights.",
      "Not checking territory, commercial, or derivative-use restrictions.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[3],
      OFFICIAL_LICENSE_REFERENCE_LINKS[4],
      OFFICIAL_LICENSE_REFERENCE_LINKS[5],
    ],
  },
  {
    id: "open-license-fundamentals",
    title: "Open license does not mean unrestricted use",
    topics: ["open_license", "scope", "references"],
    summary:
      "Creative Commons/open licenses must be used under their conditions. Verify the exact license, the exact work, and how the platform exploits the story.",
    appliesWhen: [
      "Cases under cc_licensed or when the backend basis is close to open_license.",
      "When the author submits source URL and license URL instead of a contract/authorization.",
    ],
    commonMistakes: [
      "Not checking non-commercial or no-derivatives conditions.",
      "Providing a general intro link instead of the work’s license link.",
      "Not mapping license terms to the actual monetization model.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[2],
      OFFICIAL_LICENSE_REFERENCE_LINKS[3],
      OFFICIAL_LICENSE_REFERENCE_LINKS[5],
    ],
  },
  {
    id: "public-domain-basics",
    title: "Public domain must match the work and edition",
    topics: ["public_domain", "proof", "references"],
    summary:
      "The original work may be public domain, but translations, editorial versions, or new illustrations can create new rights layers. Review the exact rights layer being exploited.",
    appliesWhen: [
      "Cases marked as public_domain or when the author cites that the original work's protection term has expired.",
      "Stories reusing classic works, archived works, or old editions.",
    ],
    commonMistakes: [
      "Assuming a work is public domain just because it is old.",
      "Not distinguishing the original work from the edition being used.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[2],
    ],
  },
  {
    id: "claim-handling",
    title: "When there is an open claim",
    topics: ["claim", "proof", "authorization"],
    summary:
      "Under-claim cases are not just about missing paperwork. The key is whether the new proof actually resolves the disputed details.",
    appliesWhen: [
      "rights.claimStatus is open or rightsStatus is under_claim.",
      "Cases with reject history, third-party feedback, or signs of a rights dispute.",
    ],
    commonMistakes: [
      "Approving because there is new paperwork without comparing it to the claim details.",
      "Not documenting what the claim contests: party, work, scope, or validity.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[4],
    ],
  },
  {
    id: "legal-foundation",
    title: "Legal foundations and treaties to keep in mind",
    topics: ["references", "scope"],
    summary:
      "This internal guide is only a workflow aid. For sensitive cases, cross-check against Vietnam's IP law, Decree 17/2023/ND-CP, and treaties such as Berne, TRIPS, and WCT.",
    appliesWhen: [
      "Cases with high legal risk or proof that uses complex contract language.",
      "Cases involving derivative rights, cross-platform distribution, or multi-party disputes.",
    ],
    commonMistakes: [
      "Treating the internal guide as the final legal conclusion.",
      "Not relying on official sources when the case exceeds normal triage.",
    ],
    references: OFFICIAL_LICENSE_REFERENCE_LINKS,
  },
];
