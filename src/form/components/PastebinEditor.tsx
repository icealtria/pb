import { FunctionComponent } from "preact";
import { useState, useCallback } from "preact/hooks";
import { decryptContent } from "../enc";
import { parseServerResponse, prepareFormData } from "../utils";

export const PastebinEditor: FunctionComponent = () => {
    const [content, setContent] = useState("");
    const [sunset, setSunset] = useState("604800");
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pasteShort, setPasteShort] = useState("");
    const [pasteId, setPasteId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [currentUrl, setCurrentUrl] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [download, setDownload] = useState<File | null>(null);

    const clearNotifications = () => {
        setError(null);
        setResult(null);
    };

    const resetState = (clearContent = false) => {
        clearNotifications();
        setCurrentUrl(null);
        setFile(null);
        setDownload(null);
        if (clearContent) {
            setPasteId("");
            setContent("");
            setPasteShort("");
        }
    };

    const handleErrorResponse = async (response: Response, action: string): Promise<never> => {
        throw new Error(`Failed to ${action} paste (${response.status}): ${await response.text() || 'Server Error'}`);
    };

    const handleLoad = async () => {
        if (!pasteShort) return setError("Please enter a paste short code/URL part.");

        if (password) setLoading(true);
        resetState();

        try {
            const fetchUrl = `${window.location.origin}/${pasteShort}`;
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`Failed to load paste (${response.status}): ${await response.text() || 'Not Found or Server Error'}`);

            const contentType = response.headers.get("Content-Type") || "text/plain";

            if (password) {
                const buffer = await response.arrayBuffer();
                const decryptedContent = await decryptContent(buffer, password);
                if (contentType?.startsWith("text/plain")) {
                    setContent(new TextDecoder().decode(decryptedContent));
                } else {
                    const blob = new Blob([decryptedContent]);
                    setDownload(new File([blob], `${pasteShort}`, { type: contentType }));
                    setContent(new TextDecoder().decode(decryptedContent));
                }

                setContent(new TextDecoder().decode(decryptedContent));
            } else {
                if (contentType?.startsWith("text/plain")) {
                    setContent(await response.text());
                } else {
                    const blob = await response.blob();
                    setDownload(new File([blob], `${pasteShort}`, { type: contentType }));
                    setContent(await blob.text())
                }
            }

            setCurrentUrl(fetchUrl);
            setResult("Paste loaded successfully.");
        } catch (err: any) {
            setError(err.message);
            setContent("");
        } finally {
            if (password) setLoading(false);
        }
    };



    const handleUpdate = async () => {
        if (!pasteId) return setError("No Paste ID available for update. Load or create a paste first.");

        if (password) setLoading(true);
        clearNotifications();

        try {
            const formData = await prepareFormData(file, content, password);
            const response = await fetch(`${window.location.origin}/${pasteId}`, {
                method: "PUT",
                body: formData,
            });
            if (!response.ok) await handleErrorResponse(response, "update");

            setResult(await response.text() || "Paste updated successfully.");
            setFile(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (password) setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!download) return setError("No file available for download.");
        const blob = new Blob([download], { type: download.type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = download.name;
        link.click();
    }

    const handleDelete = async () => {
        if (!pasteId) return setError("No Paste ID available for deletion.");
        if (!confirm("Are you sure you want to delete this paste? This cannot be undone.")) return;

        clearNotifications();

        try {
            const response = await fetch(`${window.location.origin}/${pasteId}`, { method: "DELETE" });
            if (!response.ok) await handleErrorResponse(response, "delete");

            setResult(await response.text() || "Paste deleted successfully.");
            resetState(true);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSubmit = async () => {
        if (!file && content.trim() === "") throw new Error("Content cannot be empty. Please type something or upload a file.");

        if (password) setLoading(true);
        clearNotifications();

        try {
            const formData = await prepareFormData(file, content, password, sunset);
            const response = await fetch(window.location.origin.toString(), {
                method: "POST",
                body: formData,
            });
            if (!response.ok) await handleErrorResponse(response, "create");

            const serverResponse = parseServerResponse(await response.text());
            const { url, id } = serverResponse;

            setPasteId(id);
            setPasteShort(url.split("/").pop() || "");
            setCurrentUrl(url);
            setFile(null);

            setResult(url ? `Paste created successfully. URL: ${url}` : "Paste created successfully.");
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (password) setLoading(false);
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

    const handleCopyUrl = async () => {
        if (currentUrl) {
            try {
                await navigator.clipboard.writeText(currentUrl);
                setResult("URL copied to clipboard!");
            } catch (err) {
                setError("Failed to copy URL to clipboard");
            }
        }
    };

    return (
        <div className="pastebin-container">
            <header className="pastebin-header">
                <div>
                    <button onClick={handleTextChange} className={`editor-button ${!file ? 'active' : ''}`}>Text</button>
                    <button onClick={triggerFileInput} className={`editor-button ${file ? 'active' : ''}`}>{"File (Max 2MB)"}</button>
                </div>
                <div className="header-section">
                    <input type="text" value={pasteShort} onInput={(e) => setPasteShort((e.target as HTMLInputElement).value)} placeholder="Paste short" className="header-input" autoComplete="off" />
                    <button onClick={handleLoad} disabled={!pasteShort} className="header-button">Load</button>
                    <button onClick={handleCopyUrl} disabled={!currentUrl} className="header-button">Copy URL</button>
                    <button onClick={handleDownload} disabled={!download} className="header-button">Download</button>
                    <input type="text" value={pasteId} onInput={(e) => setPasteId((e.target as HTMLInputElement).value)} placeholder="Paste ID" className="header-input" autoComplete="off" />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                        placeholder="password"
                        className="header-input"
                        autocomplete="off"
                    />
                    <button onClick={handleSubmit} disabled={!content && !file} className="header-button">Create</button>
                    <button onClick={handleUpdate} disabled={!pasteId} className="header-button">Update</button>
                    <button onClick={handleDelete} disabled={!pasteId} className="header-button">Delete</button>
                </div>
                <div className="header-section">
                    <label htmlFor="sunset-select">Expires in:</label>
                    <select id="sunset-select" value={sunset} onChange={(e) => setSunset((e.target as HTMLSelectElement).value)} className="header-select">
                        <option value="3600">1 hour</option>
                        <option value="86400">1 day</option>
                        <option value="604800">1 week</option>
                        <option value="2592000">1 month</option>
                    </select>
                </div>
                <div className="header-section">
                    {password && loading && <span className="status loading">Working...</span>}
                    {error && <span className="status error">Error: {error}</span>}
                    {result && <span className="status success">{result}</span>}
                    {currentUrl && !result && <span className="status info">Loaded: {currentUrl} {pasteId ? `(ID: ${pasteId})` : '(ID unknown)'}</span>}
                </div>
            </header>
            <main className="pastebin-editor-area">
                {file ?
                    <div>
                        <div className="file-info">
                            <div className="file-name">{file.name}</div>
                            <div className="file-size">{(file.size / 1024).toFixed(2)} KB</div>
                        </div>
                    </div>
                    :
                    <textarea
                        className="pastebin-textarea"
                        value={content}
                        onInput={handleTextChange}
                        placeholder="Enter your text here, or use 'Upload File'..."
                        required={!file}
                        spellcheck={false}
                        disabled={file !== null}
                    />
                }
                <input type="file" id="file-upload" onChange={handleFileChange} style={{ display: 'none' }} accept="*/*" />
            </main>
        </div>
    );
};
