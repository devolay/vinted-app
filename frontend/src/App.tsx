import { useEffect, useMemo, useState } from "react";

import { createDraft, deleteDraft, fetchDrafts, regenerateDraft, scheduleDraft, sellDraft } from "./api/client";
import DraftCard from "./components/DraftCard";
import DraftForm from "./components/DraftForm";
import type { ItemDraft } from "./types/item";

function App() {
    const [drafts, setDrafts] = useState<ItemDraft[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [view, setView] = useState<"grid" | "editor">("grid");
    const [activeDraft, setActiveDraft] = useState<ItemDraft | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "sold" | "scheduled">("all");

    useEffect(() => {
        fetchDrafts()
            .then(setDrafts)
            .catch(() => setError("Could not load existing drafts."));
    }, []);

    async function handleCreateDraft(formData: FormData): Promise<ItemDraft | null> {
        setSubmitting(true);
        setError("");

        try {
            const newDraft = await createDraft(formData);
            setDrafts((prev) => [newDraft, ...prev]);
            setActiveDraft(newDraft);
            return newDraft;
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to create draft.");
            return null;
        } finally {
            setSubmitting(false);
        }
    }

    function openCreateFlow() {
        setActiveDraft(null);
        setView("editor");
    }

    function openItemFlow(draft: ItemDraft) {
        setActiveDraft(draft);
        setView("editor");
    }

    function handleEditItem(itemId: number) {
        const selected = drafts.find((item) => item.id === itemId);
        if (!selected) {
            return;
        }
        openItemFlow(selected);
    }

    function backToGrid() {
        setView("grid");
    }

    async function handleDeleteItem(itemId: number): Promise<void> {
        setError("");
        try {
            await deleteDraft(itemId);
            setDrafts((prev) => prev.filter((item) => item.id !== itemId));
            if (activeDraft?.id === itemId) {
                setActiveDraft(null);
                setView("grid");
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Could not delete item.");
        }
    }

    async function handleCreatePost(itemId: number): Promise<void> {
        setError("");
        try {
            const updated = await scheduleDraft(itemId);
            setDrafts((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
            if (activeDraft?.id === itemId) {
                setActiveDraft(updated);
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Could not create post from draft.");
        }
    }

    async function handleRegenerateDraft(itemId: number): Promise<void> {
        setError("");
        try {
            const updated = await regenerateDraft(itemId);
            setDrafts((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
            if (activeDraft?.id === itemId) {
                setActiveDraft(updated);
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Could not regenerate draft.");
        }
    }

    async function handleMarkSold(itemId: number): Promise<void> {
        setError("");
        try {
            const updated = await sellDraft(itemId);
            setDrafts((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
            if (activeDraft?.id === itemId) {
                setActiveDraft(updated);
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Could not mark item as sold.");
        }
    }

    const filteredDrafts = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return drafts.filter((draft) => {
            const matchesStatus =
                statusFilter === "all"
                    ? true
                    : statusFilter === "active"
                        ? draft.status !== "sold"
                        : draft.status === statusFilter;

            if (!matchesStatus) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            const haystack = [
                draft.title,
                draft.brand,
                draft.category,
                draft.description,
                draft.condition,
                draft.size,
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(normalizedSearch);
        });
    }, [drafts, searchTerm, statusFilter]);

    return (
        <div className="layout">
            <header>
                <p className="eyebrow">Vintage Seller Toolkit</p>
                <h1>Vinted Studio</h1>
                <p className="subtitle">
                    AI-assisted bussines automation tool for Vinted.
                </p>
            </header>

            {error ? <p className="error-banner">{error}</p> : null}

            {view === "grid" ? (
                <section className="grid-view">
                    <div className="section-head">
                        <h2>My Items</h2>
                        <button type="button" onClick={openCreateFlow}>Add New Item</button>
                    </div>
                    <div className="grid-tools panel">
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search title, brand, category..."
                        />
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "sold" | "scheduled")}
                        >
                            <option value="all">All statuses</option>
                            <option value="active">Active (not sold)</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="sold">Sold</option>
                        </select>
                    </div>
                    {filteredDrafts.length === 0 ? (
                        <div className="panel empty-state">No items yet. Click Add New Item to start your first draft.</div>
                    ) : (
                        <div className="draft-grid">
                            {filteredDrafts.map((draft) => (
                                <DraftCard
                                    key={draft.id}
                                    draft={draft}
                                    onClick={() => openItemFlow(draft)}
                                    onEdit={handleEditItem}
                                    onDelete={handleDeleteItem}
                                    onRegenerate={handleRegenerateDraft}
                                    onCreatePost={handleCreatePost}
                                    onMarkSold={handleMarkSold}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <DraftForm
                    onSubmit={handleCreateDraft}
                    submitting={submitting}
                    initialDraft={activeDraft}
                    onBack={backToGrid}
                />
            )}
        </div>
    );
}

export default App;
