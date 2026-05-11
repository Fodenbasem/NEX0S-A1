const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiUrl(path: string) {
  return `${BASE}/api${path}`;
}

export type ProjectStatus = "consulting" | "synthesizing" | "scanning" | "deployed" | "failed";

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  language: string;
  stack: string | null;
  blueprint: any;
  synthesis_progress: number;
  created_at: string;
  updated_at: string;
}

export interface AIRequest {
  id: string;
  project_id: string | null;
  user_id: string;
  role: "user" | "ai" | "system";
  content: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  created_at: string;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    try { throw new Error(JSON.parse(text).error || text); }
    catch { throw new Error(text || `API error (${res.status})`); }
  }
  return res;
}

export const api = {
  async listProjects(): Promise<Project[]> {
    const res = await apiFetch("/projects");
    return res.json();
  },

  async createProject(input: { name: string; description?: string; language?: string; stack?: string }): Promise<Project> {
    const res = await apiFetch("/projects", { method: "POST", body: JSON.stringify(input) });
    return res.json();
  },

  async updateProject(id: string, patch: Partial<Project>): Promise<void> {
    await apiFetch(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  async deleteProject(id: string): Promise<void> {
    await apiFetch(`/projects/${id}`, { method: "DELETE" });
  },

  async duplicateProject(id: string): Promise<Project> {
    const res = await apiFetch(`/projects/${id}/duplicate`, { method: "POST" });
    return res.json();
  },

  async exportBlueprint(projectId: string): Promise<{ project: Project; messages: AIRequest[] }> {
    const res = await apiFetch(`/projects/${projectId}/blueprint`);
    return res.json();
  },

  async listAIRequests(projectId: string): Promise<AIRequest[]> {
    const res = await apiFetch(`/projects/${projectId}/messages`);
    return res.json();
  },

  async streamConsultation(
    projectId: string,
    userMessage: string,
    onToken: (chunk: string) => void,
  ): Promise<{ content: string; model: string; latency_ms: number }> {
    const res = await fetch(apiUrl("/ai/stream"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, message: userMessage }),
    });
    if (!res.ok) {
      const text = await res.text();
      try { throw new Error(JSON.parse(text).error || text); }
      catch { throw new Error(text || `AI gateway failed (${res.status})`); }
    }
    if (!res.body) throw new Error("No stream body");

    const model = res.headers.get("x-nex0s-model") ?? "gemini-2.0-flash";
    const t0 = Number(res.headers.get("x-nex0s-t0")) || Date.now();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) { full += delta; onToken(delta); }
        } catch { }
      }
    }

    const latency_ms = Date.now() - t0;
    return { content: full, model, latency_ms };
  },

  async checkWhitelist(email: string): Promise<boolean> {
    try {
      const res = await fetch(apiUrl(`/whitelist/check?email=${encodeURIComponent(email)}`), {
        credentials: "include",
      });
      if (!res.ok) return true;
      const data = await res.json();
      return data.allowed;
    } catch {
      return true;
    }
  },

  async listWhitelist(q?: string): Promise<any[]> {
    const url = q ? `/whitelist?q=${encodeURIComponent(q)}` : "/whitelist";
    const res = await apiFetch(url);
    return res.json();
  },

  async addToWhitelist(email: string, note?: string): Promise<any> {
    const res = await apiFetch("/whitelist", { method: "POST", body: JSON.stringify({ email, note }) });
    return res.json();
  },

  async removeFromWhitelist(id: string): Promise<void> {
    await apiFetch(`/whitelist/${id}`, { method: "DELETE" });
  },

  streamSynthesis(
    projectId: string,
    onStage: (event: { type: string; stage?: string; label?: string; progress: number; content?: string }) => void,
    onDone: () => void,
    onError: (msg: string) => void,
  ): () => void {
    const es = new EventSource(apiUrl(`/synthesis/stream/${projectId}`), { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "done") { onDone(); es.close(); }
        else if (data.type === "error") { onError(data.message); es.close(); }
        else onStage(data);
      } catch { }
    };
    es.onerror = () => { onError("Connection lost"); es.close(); };
    return () => es.close();
  },

  async listSecurityReports(projectId?: string) {
    const url = projectId ? `/security-reports?project_id=${projectId}` : "/security-reports";
    const res = await apiFetch(url);
    return res.json();
  },

  async runSecurityScan(projectId: string) {
    const res = await apiFetch("/security-reports", { method: "POST", body: JSON.stringify({ project_id: projectId }) });
    return res.json();
  },

  async listDeployments(projectId?: string) {
    const url = projectId ? `/deployments?project_id=${projectId}` : "/deployments";
    const res = await apiFetch(url);
    return res.json();
  },

  async createDeployment(projectId: string, projectName: string) {
    const res = await apiFetch("/deployments", { method: "POST", body: JSON.stringify({ project_id: projectId, project_name: projectName }) });
    return res.json();
  },

  async log(projectId: string | null, action: string, metadata?: Record<string, unknown>) {
    apiFetch("/activity", { method: "POST", body: JSON.stringify({ project_id: projectId, action, severity: "info", category: "project", metadata }) }).catch(() => {});
  },

  async dashboardStats() {
    const res = await apiFetch("/dashboard/stats");
    return res.json();
  },

  async aiActivity24h() {
    const res = await apiFetch("/dashboard/ai-activity");
    return res.json();
  },
};
