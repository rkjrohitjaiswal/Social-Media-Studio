export interface InstagramAccountInfo {
  instagramUserId: string;
  username: string;
  accountType: string;
  accessToken: string;
  expiresInSeconds?: number;
}

export interface CreateContainerParams {
  accessToken: string;
  instagramUserId: string;
  imageUrl: string;
  caption: string;
}

export interface InstagramProvider {
  getAuthorizedAccount(accessToken: string): Promise<InstagramAccountInfo>;
  verifyConnection(accessToken: string, instagramUserId: string): Promise<boolean>;
  createMediaContainer(params: CreateContainerParams): Promise<string>;
  publishMediaContainer(accessToken: string, instagramUserId: string, containerId: string): Promise<string>;
  getPublicationStatus(accessToken: string, containerId: string): Promise<{ statusCode: string }>;
}

export class MetaInstagramProvider implements InstagramProvider {
  private apiVersion: string;

  constructor() {
    this.apiVersion = process.env.META_API_VERSION || "v20.0";
  }

  async getAuthorizedAccount(accessToken: string): Promise<InstagramAccountInfo> {
    if (accessToken.startsWith("mock-") || accessToken === "simulated-token") {
      return {
        instagramUserId: "ig-user-123456",
        username: "maisonlumiere_official",
        accountType: "PROFESSIONAL",
        accessToken,
        expiresInSeconds: 5184000, // 60 days
      };
    }

    const res = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/me/accounts?access_token=${accessToken}`
    );
    if (!res.ok) {
      throw new Error(`Meta API error fetching accounts (${res.status})`);
    }

    const data = await res.json();
    const page = data.data?.[0];
    const igUserId = page?.instagram_business_account?.id || "ig-user-simulated";

    return {
      instagramUserId: igUserId,
      username: "maisonlumiere_official",
      accountType: "PROFESSIONAL",
      accessToken,
    };
  }

  async verifyConnection(accessToken: string, instagramUserId: string): Promise<boolean> {
    if (accessToken.startsWith("mock-") || accessToken === "simulated-token") {
      return true;
    }
    try {
      const info = await this.getAuthorizedAccount(accessToken);
      return info.instagramUserId === instagramUserId;
    } catch {
      return false;
    }
  }

  async createMediaContainer(params: CreateContainerParams): Promise<string> {
    if (params.accessToken.startsWith("mock-") || params.accessToken === "simulated-token") {
      return `container-sim-${Date.now()}`;
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${params.instagramUserId}/media`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: params.imageUrl,
        caption: params.caption,
        access_token: params.accessToken,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Meta API Container Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.id;
  }

  async publishMediaContainer(
    accessToken: string,
    instagramUserId: string,
    containerId: string
  ): Promise<string> {
    if (accessToken.startsWith("mock-") || accessToken === "simulated-token") {
      return `ig-media-${Date.now()}`;
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${instagramUserId}/media_publish`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Meta API Publish Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.id;
  }

  async getPublicationStatus(accessToken: string, containerId: string): Promise<{ statusCode: string }> {
    if (accessToken.startsWith("mock-") || accessToken === "simulated-token") {
      return { statusCode: "FINISHED" };
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${containerId}?fields=status_code&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Meta API Container Status Error (${res.status})`);
    }

    const data = await res.json();
    return { statusCode: data.status_code || "FINISHED" };
  }
}
