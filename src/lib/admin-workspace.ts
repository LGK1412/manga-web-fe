type WorkspaceRule = {
  matches: (pathname: string) => boolean;
  section: string;
  title: string | ((pathname: string) => string);
  description: string | ((pathname: string) => string);
};

const STAFF_INBOX_ROLES = [
  "content_moderator",
  "community_manager",
  "financial_manager",
] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  content_moderator: "Content Moderator",
  community_manager: "Community Manager",
  financial_manager: "Financial Manager",
  author: "Author",
  user: "User",
};

const POST_LOGIN_DESTINATIONS: Record<string, string> = {
  admin: "/admin/dashboard",
  content_moderator: "/admin/user",
  community_manager: "/admin/user",
  financial_manager: "/admin/user",
};

const workspaceRules: WorkspaceRule[] = [
  {
    matches: (pathname) => pathname === "/admin/dashboard",
    section: "Overview",
    title: "Dashboard Workspace",
    description:
      "Track platform growth, moderation pressure, and team activity from one shared control surface.",
  },
  {
    matches: (pathname) => pathname === "/admin/user",
    section: "People",
    title: "User Operations",
    description:
      "Review user accounts, staff roles, risk signals, and account-level moderation actions.",
  },
  {
    matches: (pathname) => pathname === "/admin/report",
    section: "Safety",
    title: "Report Review",
    description:
      "Inspect new abuse reports, coordinate follow-up, and keep resolution work moving cleanly.",
  },
  {
    matches: (pathname) => pathname === "/admin/comments",
    section: "Community",
    title: "Comment Moderation",
    description:
      "Scan discussion quality, act on harmful threads, and maintain healthy community spaces.",
  },
  {
    matches: (pathname) => pathname === "/admin/my-notifications",
    section: "Inbox",
    title: "Staff Inbox",
    description:
      "Review the notifications sent to your staff account, mark follow-ups, and keep personal alerts organized.",
  },
  {
    matches: (pathname) =>
      pathname === "/admin/notifications" ||
      pathname === "/admin/notifications/send-general" ||
      pathname === "/admin/notifications/send-policy",
    section: "Messaging",
    title: (pathname) =>
      pathname === "/admin/notifications/send-general"
        ? "Compose General Notification"
        : pathname === "/admin/notifications/send-policy"
          ? "Compose Policy Notification"
          : "Notification Delivery Center",
    description: (pathname) =>
      pathname === "/admin/notifications"
        ? "Monitor sent notifications, delivery state, and follow-up actions for outbound messaging."
        : "Prepare and send admin notifications with the right audience, tone, and moderation context.",
  },
  {
    matches: (pathname) =>
      pathname === "/admin/policies" ||
      pathname === "/admin/policies/new" ||
      /^\/admin\/policies\/[^/]+(?:\/detail)?$/.test(pathname),
    section: "Governance",
    title: (pathname) =>
      pathname === "/admin/policies/new"
        ? "Create Policy"
        : pathname.endsWith("/detail")
          ? "Policy Detail"
          : /^\/admin\/policies\/[^/]+$/.test(pathname)
            ? "Edit Policy"
            : "Policy Library",
    description:
      "Maintain the moderation rulebook, policy references, and operational guidance used by the team.",
  },
  {
    matches: (pathname) => pathname === "/admin/genre" || pathname === "/admin/style",
    section: "Taxonomy",
    title: (pathname) =>
      pathname === "/admin/style" ? "Style Management" : "Genre Management",
    description:
      "Keep discovery taxonomy clean, searchable, and aligned with how readers browse the catalog.",
  },
  {
    matches: (pathname) => pathname === "/admin/manga",
    section: "Catalog",
    title: "Manga Management",
    description:
      "Review publication status, rights context, and high-impact catalog actions from one workspace.",
  },
  {
    matches: (pathname) => pathname === "/admin/license-management",
    section: "Rights",
    title: "License Moderation",
    description:
      "Review ownership proof, verify rights documents, and resolve licensing issues before publication.",
  },
  {
    matches: (pathname) =>
      pathname === "/admin/moderation/queue" ||
      pathname === "/admin/moderation/workspace" ||
      /^\/admin\/moderation\/[^/]+$/.test(pathname),
    section: "Moderation",
    title: (pathname) =>
      pathname === "/admin/moderation/queue"
        ? "Moderation Queue"
        : pathname === "/admin/moderation/workspace"
          ? "Moderation Workspace"
          : "Moderation Record",
    description:
      "Prioritize flagged chapters, inspect AI risk signals, and coordinate review decisions with policy context.",
  },
  {
    matches: (pathname) => pathname === "/admin/audit-logs" || /^\/admin\/audit-logs\/log-details\/[^/]+$/.test(pathname),
    section: "Compliance",
    title: (pathname) =>
      pathname === "/admin/audit-logs" ? "Audit Log Review" : "Audit Log Detail",
    description:
      "Trace operational changes, verify accountability, and inspect sensitive actions with a clear evidence trail.",
  },
  {
    matches: (pathname) => pathname === "/admin/emoji-pack",
    section: "Assets",
    title: "Emoji Pack Management",
    description:
      "Manage reaction assets, keep packs tidy, and maintain the media used in community conversations.",
  },
  {
    matches: (pathname) => pathname === "/admin/payout-profile",
    section: "Finance",
    title: "Payout Profiles",
    description:
      "Validate payout details, review author banking setup, and reduce payment friction before withdrawals.",
  },
  {
    matches: (pathname) => pathname === "/admin/withdraw",
    section: "Finance",
    title: "Withdraw Operations",
    description:
      "Review withdrawal requests, payout readiness, and finance-side approvals in a single queue.",
  },
];

function startCase(segment: string) {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveAdminWorkspaceMeta(pathname: string) {
  const matched = workspaceRules.find((rule) => rule.matches(pathname));
  if (matched) {
    return {
      section: matched.section,
      title:
        typeof matched.title === "function"
          ? matched.title(pathname)
          : matched.title,
      description:
        typeof matched.description === "function"
          ? matched.description(pathname)
          : matched.description,
    };
  }

  const lastSegment = pathname.split("/").filter(Boolean).pop() || "workspace";
  return {
    section: "Workspace",
    title: startCase(lastSegment),
    description:
      "Manage operational tasks for this admin area using the shared workspace controls and page tools below.",
  };
}

export function formatWorkspaceRole(role?: string | null) {
  if (!role) return "Unknown role";
  return ROLE_LABELS[role] ?? startCase(role);
}

export function isStaffInboxRole(role?: string | null) {
  return STAFF_INBOX_ROLES.includes(
    String(role || "").trim().toLowerCase() as (typeof STAFF_INBOX_ROLES)[number],
  );
}

export function resolvePostLoginHref(role?: string | null) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return POST_LOGIN_DESTINATIONS[normalizedRole] ?? "/";
}
