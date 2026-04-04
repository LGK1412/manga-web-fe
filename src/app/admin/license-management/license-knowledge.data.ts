import type {
  LicenseCaseGuide,
  LicenseReferenceLink,
  LicenseTheoryEntry,
  TheoryTopicMeta,
} from "./license-knowledge.types";

export const OFFICIAL_LICENSE_REFERENCE_LINKS: LicenseReferenceLink[] = [
  {
    label: "Luật Sở hữu trí tuệ Việt Nam (VBHN 2025)",
    href: "https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/9/155-vbhn-vpqh.pdf",
  },
  {
    label: "Nghị định số 17/2023/NĐ-CP",
    href: "https://datafiles.chinhphu.vn/cpp/files/vbpq/2023/5/17-cp.signed.pdf",
  },
  {
    label: "WIPO Lex - Các điều ước áp dụng tại Việt Nam",
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
  { id: "proof", label: "Chứng cứ" },
  { id: "authorization", label: "Ủy quyền" },
  { id: "translation", label: "Dịch / chuyển thể" },
  { id: "open_license", label: "Open license" },
  { id: "public_domain", label: "Public domain" },
  { id: "claim", label: "Claim" },
  { id: "scope", label: "Phạm vi quyền" },
  { id: "references", label: "Nguồn luật" },
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
      "Kiểm tra log moderation hoặc bối cảnh xử lý gần nhất trước khi ra quyết định.",
      "Nếu proof mới không liên quan trực tiếp đến lý do enforcement, không dùng approval license để gỡ chặn.",
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
        label: "Đang bị enforcement",
        text: "Story hiện đang bị hạn chế bởi trạng thái enforcement. Vui lòng xử lý hoặc làm rõ nguyên nhân enforcement trước khi tiếp tục yêu cầu duyệt license.",
      },
      {
        id: "enforcement-not-resolved",
        label: "Chưa đủ để mở publish",
        text: "Hồ sơ proof hiện tại chưa đủ để xử lý trạng thái enforcement của story. Approval license không thể thay thế cho bước rà soát enforcement riêng.",
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
      "Kiểm tra rõ proof có trả lời trực tiếp claim đang mở hay không.",
      "Đối chiếu title, source, owner, phạm vi quyền và thời hạn nếu có.",
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
        label: "Claim chưa được làm rõ",
        text: "Story hiện đang trong trạng thái có copyright claim mở. Hồ sơ proof hiện tại chưa đủ để làm rõ tranh chấp quyền và chưa thể được duyệt.",
      },
      {
        id: "claim-proof-insufficient",
        label: "Proof chưa trả lời claim",
        text: "Tài liệu được nộp chưa giải quyết trực tiếp các thông tin đang bị contest trong claim hiện tại. Vui lòng bổ sung hồ sơ thể hiện rõ chủ thể quyền, phạm vi sử dụng và căn cứ khai thác tác phẩm.",
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
      "Nếu có source hoặc external link, kiểm tra xem chúng có vô tình cho thấy story là repost hay adaptation hay không.",
      "Nếu có history reject cũ, kiểm tra lý do cũ đã được giải quyết chưa.",
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
        label: "Tự khai chưa khớp",
        text: "Thông tin tự khai hiện tại chưa đủ nhất quán để xác nhận bạn là chủ thể quyền trực tiếp của tác phẩm. Vui lòng bổ sung chứng cứ rõ hơn về quyền sở hữu hoặc nguồn gốc sáng tác.",
      },
      {
        id: "self-declaration-red-flag",
        label: "Có dấu hiệu cần làm rõ",
        text: "Hồ sơ hiện tại có dấu hiệu cần làm rõ thêm về nguồn gốc tác phẩm. Vui lòng bổ sung tài liệu hoặc hình ảnh chứng minh quyền sở hữu trực tiếp trước khi gửi duyệt lại.",
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
      "Source title/source URL cần trỏ đúng tác phẩm gốc.",
      "Nếu có contract hoặc authorization, phải đọc được bên cấp quyền và phạm vi cho phép đăng tải/phân phối.",
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
        label: "Thiếu quyền dịch",
        text: "Đây là nội dung dịch nhưng hồ sơ hiện tại chưa thể hiện rõ quyền dịch hoặc quyền khai thác từ chủ sở hữu tác phẩm gốc. Vui lòng bổ sung văn bản ủy quyền hoặc hợp đồng phù hợp.",
      },
      {
        id: "translated-scope-unclear",
        label: "Phạm vi khai thác chưa rõ",
        text: "Tài liệu đã nộp chưa làm rõ phạm vi sử dụng cho bản dịch trên nền tảng. Vui lòng bổ sung hồ sơ thể hiện rõ tác phẩm, chủ thể cấp quyền, phạm vi đăng tải/phân phối và thời hạn hiệu lực.",
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
      "Source title/source URL phải cho thấy tác phẩm gốc liên quan.",
      "Nếu có hợp đồng, đọc kỹ xem có quyền derivative/adaptation hay không.",
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
        label: "Thiếu quyền phái sinh",
        text: "Hồ sơ hiện tại chưa chứng minh rõ quyền chuyển thể hoặc khai thác tác phẩm phái sinh từ nguồn gốc. Vui lòng bổ sung văn bản thể hiện rõ quyền này trước khi gửi duyệt lại.",
      },
      {
        id: "adapted-scope-gap",
        label: "Thiếu phạm vi chuyển thể",
        text: "Tài liệu được nộp chưa thể hiện rõ phạm vi cho phép chuyển thể và đăng tải tác phẩm trên nền tảng. Vui lòng bổ sung hợp đồng hoặc giấy phép phù hợp.",
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
      "Nếu có source URL, kiểm tra đó có phải nơi phát hành gốc hoặc nơi đại diện hợp pháp hay không.",
      "Nếu proof là chat/email, cần nhìn rõ danh tính bên cấp quyền và nội dung cho phép.",
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
        label: "Thiếu quyền repost",
        text: "Hồ sơ hiện tại chưa chứng minh rõ quyền đăng lại hoặc phân phối lại nội dung này trên nền tảng. Vui lòng bổ sung giấy phép hoặc văn bản ủy quyền phù hợp.",
      },
      {
        id: "repost-source-only",
        label: "Chỉ có link nguồn",
        text: "Việc cung cấp link nguồn hoặc hình ảnh từ nơi khác chưa đủ để xác nhận quyền repost. Vui lòng bổ sung tài liệu thể hiện rõ chủ thể cấp quyền và phạm vi cho phép sử dụng.",
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
      "License URL phải là nguồn nêu điều khoản, không chỉ là trang giới thiệu chung.",
      "Source URL phải gắn với tác phẩm đang được dùng, không phải tác phẩm khác tương tự.",
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
        label: "Thiếu reference open license",
        text: "Story được khai báo theo open license nhưng hồ sơ hiện tại chưa cung cấp đầy đủ source URL và license URL để đối chiếu. Vui lòng bổ sung liên kết rõ ràng tới tác phẩm nguồn và điều khoản license áp dụng.",
      },
      {
        id: "open-license-incompatible",
        label: "Điều kiện license chưa phù hợp",
        text: "Hồ sơ hiện tại chưa chứng minh rằng điều kiện open license cho phép cách khai thác trên nền tảng. Vui lòng bổ sung hoặc làm rõ loại license, phạm vi sử dụng và các hạn chế liên quan.",
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
      "Source phải chỉ rõ tác phẩm hoặc edition cụ thể đang ở public domain.",
      "Nếu là bản dịch/bản dàn dựng mới, cần cẩn trọng vì phần đó có thể vẫn còn quyền.",
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
        label: "Chưa chứng minh public domain",
        text: "Hồ sơ hiện tại chưa cung cấp đủ căn cứ để xác nhận tác phẩm hoặc phiên bản đang sử dụng thuộc public domain. Vui lòng bổ sung nguồn đối chiếu rõ ràng.",
      },
      {
        id: "public-domain-version-risk",
        label: "Rủi ro lớp quyền mới",
        text: "Tài liệu hiện tại chưa làm rõ liệu bản dịch, bản biên tập hoặc phiên bản đang khai thác có phát sinh lớp quyền mới hay không. Vui lòng bổ sung thông tin rõ hơn trước khi gửi duyệt lại.",
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
      "Đối chiếu tên story, source title, license name và identity của bên cấp quyền.",
      "Nếu giấy tờ dẫn chiếu phụ lục hoặc URL bổ sung, kiểm tra cả tài liệu đó.",
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
        label: "Thiếu phạm vi quyền",
        text: "Tài liệu được nộp chưa làm rõ phạm vi quyền cho phép đăng tải, phân phối hoặc khai thác tác phẩm trên nền tảng. Vui lòng bổ sung giấy phép/hợp đồng đọc được rõ chủ thể, phạm vi và thời hạn hiệu lực.",
      },
      {
        id: "authorization-expired-or-unclear",
        label: "Hiệu lực chưa rõ",
        text: "Hồ sơ hiện tại chưa chứng minh rõ giấy phép hoặc hợp đồng còn hiệu lực tại thời điểm gửi duyệt. Vui lòng bổ sung tài liệu có thông tin thời hạn và điều kiện hiệu lực đầy đủ hơn.",
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
      "Nếu có source hoặc license reference, kiểm tra khả năng truy xuất và tính liên quan.",
    ],
    redFlags: [],
    recommendedAction: "",
    escalateWhen: [],
    rejectTemplates: [
      {
        id: "general-proof-insufficient",
        label: "Proof chưa đủ rõ",
        text: "Hồ sơ hiện tại chưa đủ rõ để xác nhận quyền đăng tải hoặc khai thác tác phẩm trên nền tảng. Vui lòng bổ sung tài liệu thể hiện rõ chủ thể quyền, phạm vi sử dụng và hiệu lực nếu có.",
      },
      {
        id: "general-proof-unreadable",
        label: "Ảnh/chứng cứ khó đọc",
        text: "Proof được nộp hiện khó đọc hoặc chưa đủ thông tin quan trọng để đối chiếu. Vui lòng tải lại ảnh rõ hơn hoặc bổ sung hồ sơ đầy đủ hơn trước khi gửi duyệt lại.",
      },
    ],
    theoryTopics: ["proof", "authorization", "scope", "references"],
  },
];

export const LICENSE_THEORY_ENTRIES: LicenseTheoryEntry[] = [
  {
    id: "proof-quality",
    title: "Chứng cứ hợp lệ cần có gì",
    topics: ["proof", "scope"],
    summary:
      "Chứng cứ tốt là chứng cứ đọc được, gắn trực tiếp với tác phẩm đang review, và thể hiện được ai có quyền gì trong thời hạn nào.",
    appliesWhen: [
      "Mọi case license review, đặc biệt khi proof được nộp bằng ảnh chụp, screenshot, email hoặc chat.",
      "Các case đã từng bị reject vì proof mờ, thiếu trang hoặc không đủ thông tin đối chiếu.",
    ],
    commonMistakes: [
      "Chỉ nộp ảnh bìa, ảnh raw hoặc link nguồn nhưng không nộp căn cứ quyền.",
      "Chụp thiếu phần chữ ký, ngày, phụ lục hoặc phạm vi sử dụng.",
      "Nộp nhiều ảnh nhưng không ảnh nào cho thấy rõ chủ thể cấp quyền.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[1],
    ],
  },
  {
    id: "authorization-scope",
    title: "Ủy quyền phải đúng chủ thể, đúng phạm vi, đúng hiệu lực",
    topics: ["authorization", "scope", "proof"],
    summary:
      "Khi review văn bản ủy quyền hoặc hợp đồng, content cần kiểm tra ba điểm cốt lõi: ai cấp quyền, quyền gì được cấp, và còn hiệu lực hay không.",
    appliesWhen: [
      "Case có owner authorization hoặc publisher contract.",
      "Case dịch, repost, adapted, hoặc bất kỳ hồ sơ nào dựa trên quyền được cấp từ bên khác.",
    ],
    commonMistakes: [
      "Có giấy tờ nhưng thiếu phạm vi đăng tải/phân phối trên nền tảng số.",
      "Giấy tờ còn logo/tiêu đề nhưng không đọc được nội dung pháp lý chính.",
      "Thời hạn hoặc điều kiện hiệu lực bị bỏ sót.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[1],
      OFFICIAL_LICENSE_REFERENCE_LINKS[2],
    ],
  },
  {
    id: "translation-and-adaptation",
    title: "Dịch và chuyển thể là nhóm cần review chặt",
    topics: ["translation", "authorization", "scope"],
    summary:
      "Quyền dịch và quyền chuyển thể thường không thể suy ra chỉ từ quyền sử dụng bản gốc. Cần proof chỉ ra rõ việc được phép tạo hoặc khai thác bản phái sinh.",
    appliesWhen: [
      "Origin type là translated hoặc adapted.",
      "Story lấy từ nguồn khác nhưng đã thay đổi ngôn ngữ, kịch bản, nhân vật, hoặc format.",
    ],
    commonMistakes: [
      "Cho rằng có source URL là đủ để chứng minh quyền dịch.",
      "Nhầm quyền repost với quyền chuyển thể.",
      "Không kiểm tra giới hạn lãnh thổ, thương mại hoặc derivative use.",
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
    title: "Open license không đồng nghĩa với dùng tự do",
    topics: ["open_license", "scope", "references"],
    summary:
      "Creative Commons hoặc open license chỉ dùng được theo đúng điều kiện đi kèm. Content cần kiểm tra license cụ thể, tác phẩm cụ thể và cách nền tảng khai thác story.",
    appliesWhen: [
      "Case cc_licensed hoặc backend trả về basis gần với open_license.",
      "Author nộp source URL và license URL thay cho contract/authorization.",
    ],
    commonMistakes: [
      "Không kiểm tra điều kiện non-commercial hoặc no-derivatives.",
      "Dùng link giới thiệu chung thay cho link license áp dụng cho tác phẩm.",
      "Không đối chiếu license với mô hình monetization thực tế.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[2],
      OFFICIAL_LICENSE_REFERENCE_LINKS[3],
      OFFICIAL_LICENSE_REFERENCE_LINKS[5],
    ],
  },
  {
    id: "public-domain-basics",
    title: "Public domain phải đúng tác phẩm và đúng phiên bản",
    topics: ["public_domain", "proof", "references"],
    summary:
      "Tác phẩm gốc có thể public domain nhưng bản dịch, bản biên tập hoặc bản minh họa mới vẫn có thể phát sinh quyền riêng. Content cần nhìn đúng lớp quyền đang được khai thác.",
    appliesWhen: [
      "Case public_domain hoặc author viện dẫn tác phẩm gốc đã hết thời hạn bảo hộ.",
      "Story dùng lại classic work, archive work hoặc edition cũ.",
    ],
    commonMistakes: [
      "Chỉ dựa vào nhận định cảm tính rằng tác phẩm quá cũ nên chắc chắn public domain.",
      "Không phân biệt tác phẩm gốc với phiên bản đang dùng.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[2],
    ],
  },
  {
    id: "claim-handling",
    title: "Khi có claim đang mở",
    topics: ["claim", "proof", "authorization"],
    summary:
      "Case under claim không chỉ là thiếu giấy tờ. Trọng tâm là xác định proof mới có thực sự trả lời nội dung bị tranh chấp hay không.",
    appliesWhen: [
      "rights.claimStatus là open hoặc rightsStatus là under_claim.",
      "Case có reject history, phản hồi của bên thứ ba, hoặc dấu hiệu tranh chấp quyền.",
    ],
    commonMistakes: [
      "Approve vì nhìn thấy giấy tờ mới nhưng không so với nội dung claim.",
      "Không ghi rõ claim đang contest điều gì: chủ thể, tác phẩm, phạm vi, hay hiệu lực.",
    ],
    references: [
      OFFICIAL_LICENSE_REFERENCE_LINKS[0],
      OFFICIAL_LICENSE_REFERENCE_LINKS[4],
    ],
  },
  {
    id: "legal-foundation",
    title: "Nền luật và điều ước cần nhớ khi review",
    topics: ["references", "scope"],
    summary:
      "Guide nội bộ chỉ là lớp hỗ trợ thao tác. Khi case nhạy cảm, content nên đối chiếu lại với Luật SHTT Việt Nam, Nghị định 17/2023/NĐ-CP và các điều ước như Berne, TRIPS, WCT.",
    appliesWhen: [
      "Case có rủi ro pháp lý cao hoặc proof dùng ngôn ngữ hợp đồng phức tạp.",
      "Case có yếu tố quyền phái sinh, phân phối xuyên nền tảng, hoặc tranh chấp nhiều bên.",
    ],
    commonMistakes: [
      "Dùng guide nội bộ như kết luận pháp lý cuối cùng.",
      "Không bám vào nguồn chính thức khi case vượt quá triage thông thường.",
    ],
    references: OFFICIAL_LICENSE_REFERENCE_LINKS,
  },
];
