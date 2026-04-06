import { useEffect, useRef, useState } from "react";

import { resolveImageUrl } from "../api/client";
import type { ItemDraft } from "../types/item";

type DraftCardProps = {
    draft: ItemDraft;
    onClick: () => void;
    onEdit: (itemId: number) => void;
    onDelete: (itemId: number) => void;
    onRegenerate: (itemId: number) => void;
    onCreatePost: (itemId: number) => void;
    onMarkSold: (itemId: number) => void;
};

function DraftCard({ draft, onClick, onEdit, onDelete, onRegenerate, onCreatePost, onMarkSold }: DraftCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (!menuRef.current) {
                return;
            }
            if (!menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    return (
        <article className={`panel card item-card ${menuOpen ? "menu-open" : ""}`} onClick={onClick}>
            <img src={resolveImageUrl(draft.image_url)} alt={draft.title} className="card-image" loading="lazy" />
            <div className="card-content">
                <div className="card-top-row">
                    <h3 className="card-title">{draft.title}</h3>
                    <div className="tile-menu" ref={menuRef} onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className="menu-trigger"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                setMenuOpen((prev) => !prev);
                            }}
                            aria-label="Item actions"
                        >
                            ⋮
                        </button>
                        {menuOpen ? (
                            <div className="menu-dropdown">
                                <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onEdit(draft.id);
                                    }}
                                >
                                    <span className="menu-icon" aria-hidden="true">✎</span>
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onRegenerate(draft.id);
                                    }}
                                >
                                    <span className="menu-icon" aria-hidden="true">⟳</span>
                                    Regenerate Draft
                                </button>
                                <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onCreatePost(draft.id);
                                    }}
                                >
                                    <span className="menu-icon" aria-hidden="true">⇪</span>
                                    Create Post
                                </button>
                                <button
                                    type="button"
                                    className="menu-item"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onMarkSold(draft.id);
                                    }}
                                >
                                    <span className="menu-icon" aria-hidden="true">✔</span>
                                    Sold
                                </button>
                                <button
                                    type="button"
                                    className="menu-item danger-item"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onDelete(draft.id);
                                    }}
                                >
                                    <span className="menu-icon" aria-hidden="true">X</span>
                                    Delete
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
                <p className="meta"> Brand: {draft.brand} </p>
                <p className="meta"> Category: {draft.category} </p>
                <p className="meta"> Condition: {draft.condition} </p>
                <p className="meta"> Size: {draft.size} </p>
                <div className="price-status-row">
                    <p className="price">EUR {Number(draft.price).toFixed(2)}</p>
                    <p className="status-pill">{draft.status}</p>
                </div>
            </div>
        </article>
    );
}

export default DraftCard;
