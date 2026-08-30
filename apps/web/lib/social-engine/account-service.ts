import { SocialAccountData, SocialPlatform, SocialAccountStatus } from "@ai-social/shared";
const encryptSecret = (str: string) => str;

// In-memory / data access abstraction for social accounts
const accountsStore: SocialAccountData[] = [
  {
    id: "acc-ig-1",
    workspaceId: "ws-1",
    platform: "INSTAGRAM",
    externalAccountId: "ig-1001",
    username: "@tech_account",
    displayName: "Tech Account",
    profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    accountType: "PROFESSIONAL",
    status: "CONNECTED",
    encryptedAccessToken: encryptSecret("mock-ig-token-1"),
    connectedAt: new Date("2026-01-15"),
    updatedAt: new Date(),
    createdAt: new Date("2026-01-15"),
  },
  {
    id: "acc-ig-2",
    workspaceId: "ws-1",
    platform: "INSTAGRAM",
    externalAccountId: "ig-1002",
    username: "@affiliate_account",
    displayName: "Affiliate Hub",
    profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    accountType: "PROFESSIONAL",
    status: "CONNECTED",
    encryptedAccessToken: encryptSecret("mock-ig-token-2"),
    connectedAt: new Date("2026-02-01"),
    updatedAt: new Date(),
    createdAt: new Date("2026-02-01"),
  },
  {
    id: "acc-li-1",
    workspaceId: "ws-1",
    platform: "LINKEDIN",
    externalAccountId: "li-2001",
    username: "Personal Profile",
    displayName: "Studio Member",
    profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    accountType: "PERSONAL",
    status: "CONNECTED",
    encryptedAccessToken: encryptSecret("mock-li-token-1"),
    connectedAt: new Date("2026-03-10"),
    updatedAt: new Date(),
    createdAt: new Date("2026-03-10"),
  },
  {
    id: "acc-yt-1",
    workspaceId: "ws-1",
    platform: "YOUTUBE",
    externalAccountId: "yt-3001",
    username: "Tech Education",
    displayName: "Tech Education Channel",
    profileImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100",
    accountType: "CHANNEL",
    status: "CONNECTED",
    encryptedAccessToken: encryptSecret("mock-yt-token-1"),
    connectedAt: new Date("2026-04-05"),
    updatedAt: new Date(),
    createdAt: new Date("2026-04-05"),
  },
  {
    id: "acc-pin-1",
    workspaceId: "ws-1",
    platform: "PINTEREST",
    externalAccountId: "pin-4001",
    username: "Tech Board",
    displayName: "Tech Inspiration Board",
    profileImageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=100",
    accountType: "BUSINESS",
    status: "CONNECTED",
    encryptedAccessToken: encryptSecret("mock-pin-token-1"),
    connectedAt: new Date("2026-04-12"),
    updatedAt: new Date(),
    createdAt: new Date("2026-04-12"),
  },
];

export interface SafeSocialAccount {
  id: string;
  workspaceId: string;
  platform: SocialPlatform;
  externalAccountId: string;
  username?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
  accountType?: string | null;
  status: SocialAccountStatus;
  connectedAt: Date;
  updatedAt: Date;
}

export function sanitizeAccount(account: SocialAccountData): SafeSocialAccount {
  return {
    id: account.id,
    workspaceId: account.workspaceId,
    platform: account.platform,
    externalAccountId: account.externalAccountId,
    username: account.username,
    displayName: account.displayName,
    profileImageUrl: account.profileImageUrl,
    accountType: account.accountType,
    status: account.status,
    connectedAt: account.connectedAt,
    updatedAt: account.updatedAt,
  };
}

export class SocialAccountService {
  async listWorkspaceAccounts(workspaceId: string): Promise<SafeSocialAccount[]> {
    return accountsStore
      .filter((acc) => acc.workspaceId === workspaceId)
      .map(sanitizeAccount);
  }

  async getAccountById(id: string, workspaceId: string): Promise<SocialAccountData | null> {
    const acc = accountsStore.find((a) => a.id === id && a.workspaceId === workspaceId);
    return acc || null;
  }

  async connectAccount(params: {
    workspaceId: string;
    platform: SocialPlatform;
    externalAccountId: string;
    username: string;
    displayName?: string;
    profileImageUrl?: string;
    accountType?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    metadataJson?: Record<string, unknown> | null;
  }): Promise<SafeSocialAccount> {
    const {
      workspaceId,
      platform,
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      metadataJson,
    } = params;

    // Check unique workspace + platform + externalAccountId
    const existingIndex = accountsStore.findIndex(
      (a) =>
        a.workspaceId === workspaceId &&
        a.platform === platform &&
        a.externalAccountId === externalAccountId
    );

    const newAccount: SocialAccountData = {
      id: existingIndex >= 0 ? accountsStore[existingIndex].id : `acc-${platform.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      platform,
      externalAccountId,
      username,
      displayName: displayName || username,
      profileImageUrl: profileImageUrl || null,
      accountType: accountType || "STANDARD",
      status: "CONNECTED",
      encryptedAccessToken: encryptSecret(accessToken),
      encryptedRefreshToken: refreshToken ? encryptSecret(refreshToken) : null,
      tokenExpiresAt: tokenExpiresAt || null,
      metadataJson: metadataJson || null,
      connectedAt: new Date(),
      updatedAt: new Date(),
      createdAt: existingIndex >= 0 ? accountsStore[existingIndex].createdAt : new Date(),
    };

    if (existingIndex >= 0) {
      accountsStore[existingIndex] = newAccount;
    } else {
      accountsStore.push(newAccount);
    }

    return sanitizeAccount(newAccount);
  }

  async disconnectAccount(id: string, workspaceId: string): Promise<boolean> {
    const index = accountsStore.findIndex((a) => a.id === id && a.workspaceId === workspaceId);
    if (index >= 0) {
      accountsStore[index].status = "DISCONNECTED";
      return true;
    }
    return false;
  }

  async updateAccountStatus(id: string, workspaceId: string, status: SocialAccountStatus): Promise<SafeSocialAccount | null> {
    const acc = accountsStore.find((a) => a.id === id && a.workspaceId === workspaceId);
    if (acc) {
      acc.status = status;
      acc.updatedAt = new Date();
      return sanitizeAccount(acc);
    }
    return null;
  }

  async updateAccountTokens(
    id: string,
    workspaceId: string,
    params: {
      accessToken: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
    }
  ): Promise<SafeSocialAccount | null> {
    const acc = accountsStore.find((a) => a.id === id && a.workspaceId === workspaceId);
    if (acc) {
      acc.encryptedAccessToken = encryptSecret(params.accessToken);
      if (params.refreshToken) {
        acc.encryptedRefreshToken = encryptSecret(params.refreshToken);
      }
      if (params.tokenExpiresAt) {
        acc.tokenExpiresAt = params.tokenExpiresAt;
      }
      acc.status = "CONNECTED";
      acc.updatedAt = new Date();
      return sanitizeAccount(acc);
    }
    return null;
  }
}

export const socialAccountService = new SocialAccountService();
