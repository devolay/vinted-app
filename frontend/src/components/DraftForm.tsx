import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent } from "react";

import { resolveImageUrl } from "../api/client";
import type { ItemDraft } from "../types/item";

type FormState = {
    title: string;
    description: string;
    price: string;
    category: string;
    brand: string;
    condition: string;
    size: string;
};

const defaultState: FormState = {
    title: "",
    description: "",
    price: "",
    category: "",
    brand: "",
    condition: "",
    size: "",
};

type DraftFormProps = {
    onSubmit: (formData: FormData) => Promise<ItemDraft | null>;
    submitting: boolean;
    initialDraft: ItemDraft | null;
    onBack: () => void;
};

function DraftForm({ onSubmit, submitting, initialDraft, onBack }: DraftFormProps) {
    const [formState, setFormState] = useState<FormState>(defaultState);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [draftText, setDraftText] = useState("");
    const [localError, setLocalError] = useState("");
    const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!initialDraft) {
            setFormState(defaultState);
            setDraftText("");
            setImageFiles([]);
            setLocalError("");
            return;
        }

        setFormState({
            title: initialDraft.title || "",
            description: initialDraft.description || "",
            price: initialDraft.price ? String(initialDraft.price) : "",
            category: initialDraft.category || "",
            brand: initialDraft.brand || "",
            condition: initialDraft.condition || "",
            size: initialDraft.size || "",
        });
        setDraftText(initialDraft.draft_content || "");
        setImageFiles([]);
        setLocalError("");
    }, [initialDraft]);

    useEffect(() => {
        if (imageFiles.length === 0) {
            setPreviewImageUrls([]);
            return;
        }

        const objectUrls = imageFiles.map((file) => URL.createObjectURL(file));
        setPreviewImageUrls(objectUrls);

        return () => {
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [imageFiles]);

    function updateField(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setFormState((prev) => ({
            ...prev,
            [event.target.name]: event.target.value,
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLocalError("");

        if (imageFiles.length === 0) {
            setLocalError("At least one image is required.");
            return;
        }

        const formData = new FormData();
        imageFiles.forEach((file) => {
            formData.append("images", file);
        });

        const newDraft = await onSubmit(formData);
        if (!newDraft) {
            return;
        }

        setFormState({
            title: newDraft.title || "",
            description: newDraft.description || "",
            price: newDraft.price ? String(newDraft.price) : "",
            category: newDraft.category || "",
            brand: newDraft.brand || "",
            condition: newDraft.condition || "",
            size: newDraft.size || "",
        });
        setDraftText(newDraft.draft_content || "");
    }

    function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files || []);
        setImageFiles(files);
    }

    function openFilePicker() {
        fileInputRef.current?.click();
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setDragActive(false);

        const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
        if (files.length > 0) {
            setImageFiles(files);
            setLocalError("");
        }
    }

    return (
        <form className="panel form-panel editor" onSubmit={handleSubmit}>
            <div className="section-head">
                <h2>Vinted Post Draft</h2>
                <button type="button" className="secondary-btn" onClick={onBack}>
                    Back To Grid
                </button>
            </div>

            <div
                className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openFilePicker();
                    }
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                }}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    id="item-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelection}
                    hidden
                />
                <p className="dropzone-title">Drag and drop images here</p>
                <p className="dropzone-subtitle">or click to browse files</p>
                {imageFiles.length > 0 ? (
                    <div className="picked-files">
                        {imageFiles.map((file) => (
                            <span key={`${file.name}-${file.size}`} className="file-chip">{file.name}</span>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="image-bar">
                <p className="help-text">
                    {imageFiles.length > 0
                        ? `${imageFiles.length} selected (all images used for draft generation)`
                        : "Add at least one image to generate draft fields."}
                </p>
            </div>

            {previewImageUrls.length > 0 ? (
                <div className="editor-image-row" aria-label="Selected images preview">
                    {previewImageUrls.map((previewUrl, index) => (
                        <img
                            key={previewUrl}
                            src={previewUrl}
                            alt={`Selected item ${index + 1}`}
                            className="editor-image-tile"
                        />
                    ))}
                </div>
            ) : initialDraft?.image_url ? (
                <div className="editor-image-row" aria-label="Item image preview">
                    <img
                        src={resolveImageUrl(initialDraft.image_url)}
                        alt={initialDraft.title || "Selected item"}
                        className="editor-image-tile"
                    />
                </div>
            ) : null}

            {localError ? <p className="error-banner">{localError}</p> : null}

            <label>
                Title
                <input
                    name="title"
                    value={formState.title}
                    onChange={updateField}
                    placeholder="90s Denim Jacket"
                />
            </label>

            <label>
                Description
                <textarea
                    name="description"
                    value={formState.description}
                    onChange={updateField}
                    placeholder="Cropped fit, fading on elbows, no holes"
                    rows={4}
                />
            </label>

            <div className="grid-2">
                <label>
                    Price (EUR)
                    <input
                        name="price"
                        value={formState.price}
                        onChange={updateField}
                        type="number"
                        min="0"
                        step="0.01"
                    />
                </label>
                <label>
                    Category
                    <input name="category" value={formState.category} onChange={updateField} />
                </label>
                <label>
                    Brand
                    <input name="brand" value={formState.brand} onChange={updateField} />
                </label>
                <label>
                    Condition
                    <input name="condition" value={formState.condition} onChange={updateField} />
                </label>
                <label>
                    Size
                    <input name="size" value={formState.size} onChange={updateField} />
                </label>
            </div>

            <button type="submit" disabled={submitting || imageFiles.length === 0}>
                {submitting ? "Generating draft..." : "Generate Draft"}
            </button>

            <label>
                Generated Vinted Draft
                <textarea value={draftText} rows={8} readOnly placeholder="Generated draft content appears here." />
            </label>
        </form>
    );
}

export default DraftForm;
