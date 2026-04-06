import type { ItemDraft } from "../types/item";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function createDraft(payload: FormData): Promise<ItemDraft> {
    const response = await fetch(`${API_BASE}/api/items/draft`, {
        method: "POST",
        body: payload,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" })) as { detail?: string };
        throw new Error(error.detail || "Failed to create draft.");
    }

    return response.json() as Promise<ItemDraft>;
}

export async function fetchDrafts(): Promise<ItemDraft[]> {
    const response = await fetch(`${API_BASE}/api/items`);

    if (!response.ok) {
        throw new Error("Failed to fetch drafts.");
    }

    return response.json() as Promise<ItemDraft[]>;
}

export async function deleteDraft(itemId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Failed to delete item.");
    }
}

export async function scheduleDraft(itemId: number): Promise<ItemDraft> {
    const response = await fetch(`${API_BASE}/api/items/${itemId}/schedule`, {
        method: "POST",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" })) as { detail?: string };
        throw new Error(error.detail || "Failed to create post from draft.");
    }

    return response.json() as Promise<ItemDraft>;
}

export async function regenerateDraft(itemId: number): Promise<ItemDraft> {
    const response = await fetch(`${API_BASE}/api/items/${itemId}/regenerate`, {
        method: "POST",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" })) as { detail?: string };
        throw new Error(error.detail || "Failed to regenerate draft.");
    }

    return response.json() as Promise<ItemDraft>;
}

export async function sellDraft(itemId: number): Promise<ItemDraft> {
    const response = await fetch(`${API_BASE}/api/items/${itemId}/sold`, {
        method: "POST",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" })) as { detail?: string };
        throw new Error(error.detail || "Failed to mark item as sold.");
    }

    return response.json() as Promise<ItemDraft>;
}

export function resolveImageUrl(relativePath: string): string {
    if (!relativePath) {
        return "";
    }
    return `${API_BASE}${relativePath}`;
}
