import { encryptContent } from "./enc";

export const parseServerResponse = (responseText: string) => {
    const lines = responseText.split("\n");
    const map = Object.fromEntries(
        lines.map(line => line.split(": ").map(part => part.trim())).filter(p => p.length === 2)
    );
    if (!map.url || !map.id || !map.sunset) {
        throw new Error("Failed to parse server response. Unexpected format.");
    }
    return map;
};

export const prepareFormData = async (file: File | null, content: string, password: string, isEncrypted: boolean, sunset?: string) => {
    const formData = new FormData();
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            throw new Error("File size exceeds 2MB limit. Please choose a smaller file.");
        }
        if (password && isEncrypted) {
            const fileContent = await file.arrayBuffer();
            const encryptedContent = await encryptContent(new Uint8Array(fileContent), password);
            formData.append("c", new Blob([encryptedContent], { type: file.type }));
        } else {
            formData.append("c", file);
        }
    } else {
        if (password && isEncrypted) {
            const contentToSubmit = await encryptContent(content, password);
            formData.append("c", new Blob([contentToSubmit], { type: "text/plain" }));
        } else {
            formData.append("c", content);
        }
    }
    if (sunset) {
        formData.append("sunset", sunset);
    }
    return formData;
};