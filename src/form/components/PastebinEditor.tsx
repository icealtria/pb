import { FunctionComponent } from "preact";
import { useState, useCallback } from "preact/hooks";

type ResultState = { message: string } | { url: string; id: string; sunset: string } | null;

export const PastebinEditor: FunctionComponent = () => {
    const [content, setContent] = useState("");
    const [sunset, setSunset] = useState("604800");
    const [result, setResult] = useState<ResultState>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pasteShort, setPasteShort] = useState("");
    const [pasteId, setPasteId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [currentUrl, setCurrentUrl] = useState<string | null>(null);

    const clearNotifications = () => {
        setError(null);
        setResult(null);
    };

    const parseServerResponse = (responseText: string) => {
        const lines = responseText.split("\n");
        const map = Object.fromEntries(
            lines.map(line => line.split(": ").map(part => part.trim())).filter(p => p.length === 2)
        );
        if (!map.url || !map.id || !map.sunset) {
            throw new Error("Failed to parse server response. Unexpected format.");
        }
        return map;
    };

    const handleLoad = async () => {
        if (!pasteShort) return setError("Please enter a paste short code/URL part.");

        setLoading(true);
        clearNotifications();
        setPasteId("");
        setCurrentUrl(null);
        setFile(null);

        try {
            const fetchUrl = `${window.location.origin}/${pasteShort}`;
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`Failed to load paste (${response.status}): ${await response.text() || 'Not Found or Server Error'}`);

            setContent(await response.text());
            setCurrentUrl(fetchUrl);
            setResult({ message: "Paste loaded successfully." });
        } catch (err: any) {
            setError(err.message);
            setContent("");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!pasteId) return setError("No Paste ID available for update. Load or create a paste first.");

        setLoading(true);
        clearNotifications();

        try {
            const formData = new FormData();
            if (file) {
                if (file.size > 2 * 1024 * 1024) throw new Error("File size exceeds 2MB limit.");
                formData.append("c", file);
            } else {
                formData.append("c", content);
            }

            const response = await fetch(`${window.location.origin}/${pasteId}`, {
                method: "PUT",
                body: formData,
            });
            if (!response.ok) throw new Error(`Failed to update paste (${response.status}): ${await response.text() || 'Server Error'}`);

            setResult({ message: await response.text() || "Paste updated successfully." });
            setFile(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!pasteId) return setError("No Paste ID available for deletion.");
        if (!confirm("Are you sure you want to delete this paste? This cannot be undone.")) return;

        setLoading(true);
        clearNotifications();

        try {
            const response = await fetch(`${window.location.origin}/${pasteId}`, { method: "DELETE" });
            if (!response.ok) throw new Error(`Failed to delete paste (${response.status}): ${await response.text() || 'Server Error'}`);

            setResult({ message: await response.text() || "Paste deleted successfully." });
            setContent("");
            setPasteId("");
            setPasteShort("");
            setCurrentUrl(null);
            setFile(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        clearNotifications();

        try {
            if (!file && content.trim() === "") throw new Error("Content cannot be empty. Please type something or upload a file.");

            const formData = new FormData();
            if (file) {
                if (file.size > 2 * 1024 * 1024) throw new Error("File size exceeds 2MB limit. Please choose a smaller file.");
                formData.append("c", file);
            } else {
                formData.append("c", content);
            }
            if (sunset) formData.append("sunset", sunset);

            const response = await fetch(window.location.origin.toString(), {
                method: "POST",
                body: formData,
            });
            if (!response.ok) throw new Error(`Failed to create paste (${response.status}): ${await response.text() || 'Server Error'}`);

            const { url, id, sunset: sunsetTimeRaw } = parseServerResponse(await response.text());

            setPasteId(id);
            setPasteShort(url.split("/").pop() || "");
            setCurrentUrl(url);
            setFile(null);

            setResult({ url, id, sunset: sunsetTimeRaw });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTextChange = useCallback((e: Event) => {
        setContent((e.target as HTMLTextAreaElement).value);
        if (file) setFile(null);
    }, [file]);

    const handleFileChange = (e: Event) => {
        const selectedFile = (e.target as HTMLInputElement).files?.[0] || null;

        if (selectedFile?.size && selectedFile.size > 2 * 1024 * 1024) {
            setError("File size exceeds 2MB limit.");
            setFile(null);
            (e.target as HTMLInputElement).value = '';
        } else {
            setFile(selectedFile);
            setContent("");
            clearNotifications();
        }
    };

    const triggerFileInput = () => document.getElementById('file-upload')?.click();

    const formatSunset = (sunsetVal: string) => {
        const date = new Date(sunsetVal);
        return !isNaN(date.getTime()) ? date.toLocaleString() : sunsetVal;
    };

    const handleCopyUrl = async () => {
        if (currentUrl) {
            try {
                await navigator.clipboard.writeText(currentUrl);
                setResult({ message: "URL copied to clipboard!" });
            } catch (err) {
                setError("Failed to copy URL to clipboard");
            }
        }
    };

    return (
        <div className="pastebin-container">
            <header className="pastebin-header">
                <div className="header-section load-section">
                    <input type="text" value={pasteShort} onInput={(e) => setPasteShort((e.target as HTMLInputElement).value)} placeholder="Paste short code to load" disabled={loading} className="header-input" />
                    <button onClick={handleLoad} disabled={loading || !pasteShort} className="header-button">Load</button>
                    {currentUrl && <button onClick={handleCopyUrl} disabled={loading} className="header-button">Copy URL</button>}
                    <input type="text" value={pasteId} onInput={(e) => setPasteId((e.target as HTMLInputElement).value)} placeholder="Enter Paste ID" disabled={loading} className="header-input small-input" title="Enter the Paste ID" />
                </div>
                <div className="header-section action-section">
                    <button onClick={handleSubmit} disabled={loading || (!content && !file)} className="header-button primary-action">{loading && !result ? "Creating..." : "Create"}</button>
                    <button onClick={handleUpdate} disabled={loading || !pasteId} className="header-button">{loading && result?.message?.includes("update") ? "Updating..." : "Update"}</button>
                    <button onClick={handleDelete} disabled={loading || !pasteId} className="header-button danger-action">{loading && result?.message?.includes("delete") ? "Deleting..." : "Delete"}</button>
                </div>
                <div className="header-section options-section">
                    <label htmlFor="sunset-select">Expires in:</label>
                    <select id="sunset-select" value={sunset} onChange={(e) => setSunset((e.target as HTMLSelectElement).value)} disabled={loading} className="header-select">
                        <option value="3600">1 hour</option>
                        <option value="86400">1 day</option>
                        <option value="604800">1 week</option>
                        <option value="2592000">1 month</option>
                    </select>
                    <input type="file" id="file-upload" onChange={handleFileChange} style={{ display: 'none' }} accept="*/*" />
                    <button onClick={triggerFileInput} disabled={loading} className="header-button">{file ? `File: ${file.name}` : "Upload File (Max 2MB)"}</button>
                </div>
                <div className="header-section status-section">
                    {loading && <span className="status loading">Working...</span>}
                    {error && <span className="status error">Error: {error}</span>}
                    {result?.message && <span className="status success">{result.message}</span>}
                    {result && 'url' in result && (
                        <span className="status info">
                            URL: <a href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a> | ID: {result.id} | Expires: {formatSunset(result.sunset)}
                        </span>
                    )}
                    {currentUrl && !result && <span className="status info">Loaded: {currentUrl} {pasteId ? `(ID: ${pasteId})` : '(ID unknown)'}</span>}
                </div>
            </header>
            <main className="pastebin-editor-area">
                <textarea
                    className="pastebin-textarea"
                    value={content}
                    onInput={handleTextChange}
                    placeholder="Enter your text here, or use 'Upload File'..."
                    required={!file}
                    disabled={loading}
                    spellcheck={false}
                />
            </main>
        </div>
    );
};
