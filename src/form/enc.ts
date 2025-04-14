import { Encrypter, Decrypter } from "age-encryption"


export const encryptContent = async (text: string, pass: string) => {
    try {
        const e = new Encrypter()
        e.setPassphrase(pass);
        const encrypted = await e.encrypt(text);
        return encrypted;
    } catch (err) {
        throw new Error("Encryption failed");
    }
};

export const decryptContent = async (text: ArrayBuffer, pass: string) => {
    try {
        const u8 = new Uint8Array(text);
        const d = new Decrypter()
        d.addPassphrase(pass);
        const decrypted = await d.decrypt(u8, "text");
        return decrypted;
    } catch {
        throw new Error("Decryption failed");
    }
};