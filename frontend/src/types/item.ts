export interface ItemDraft {
    id: number;
    title: string;
    description: string;
    price: number;
    category: string;
    brand: string;
    condition: string;
    size: string;
    image_url: string;
    vlm_summary?: string | null;
    draft_content: string;
    status: string;
    created_at: string;
}
