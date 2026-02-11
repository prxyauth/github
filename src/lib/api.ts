export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/github";
export const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export interface LoginResponse {
  success: boolean;
  message?: string;
  sessionId?: string;
  requires2FA?: boolean;
  challengeType?: string;
  challengeMetadata?: any;
  methods?: string[];
  status?: string;
}

export const githubApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/github/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ username, password }),
    });

    return response.json();
  },

  async submit2FA(sessionId: string, code: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/github/2fa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ sessionId, code }),
    });

    return response.json();
  },

  async switch2FA(sessionId: string, method: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/github/2fa/switch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ sessionId, method }),
    });

    return response.json();
  },
};
