import { Encrypter, Decrypter } from "age-encryption"


export const encryptContent = async (content: string | Uint8Array , pass: string) => {
    try {
        const e = new Encrypter()
        e.setPassphrase(pass);
        const encrypted = await e.encrypt(content);
        return encrypted;
    } catch (err) {
        throw new Error("Encryption failed");
    }
};

export const decryptContent = async (content: ArrayBuffer, pass: string) => {
    try {
        const u8 = new Uint8Array(content);
        const d = new Decrypter()
        d.addPassphrase(pass);
        const decrypted = await d.decrypt(u8, "uint8array");
        return decrypted;
    } catch {
        throw new Error("Decryption failed");
    }
};
